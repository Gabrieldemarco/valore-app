
// Suscripciones: factura subscription:{plan} → al pagar, activar tenant

const SUBSCRIPTION_PREFIX = 'subscription:';

/**
 * @param {string} plan
 * @returns {string}
 */
function subscriptionDescription(plan) {
  return `${SUBSCRIPTION_PREFIX}${plan}`;
}

/**
 * @param {string} description
 * @returns {string | null}
 */
function parseSubscriptionPlan(description) {
  if (!description || !description.startsWith(SUBSCRIPTION_PREFIX)) return null;
  const plan = description.slice(SUBSCRIPTION_PREFIX.length).trim().split(/[|\s]/)[0];
  if (plan === 'pro' || plan === 'enterprise') return plan;
  return null;
}

/**
 * @param {(text: string, params?: any[]) => Promise<any>} query
 * @param {{ description: string, tenant_id: number }} invoice
 * @returns {Promise<boolean>}
 */
async function activateTenantFromPaidInvoice(query: any, invoice: any) {
  const plan = parseSubscriptionPlan(invoice.description);
  if (!plan) return false;

  await query(
    `UPDATE tenants
     SET plan = $1, status = 'active', trial_end_date = NULL,
         last_payment_date = NOW(), updated_at = NOW()
     WHERE id = $2`,
    [plan, invoice.tenant_id]
  );
  return true;
}

/**
 * @param {(text: string, params?: any[]) => Promise<any>} query
 * @returns {Promise<string>}
 */
async function nextInvoiceNumber(query) {
  const count = await query('SELECT COUNT(*) FROM invoices');
  const n = parseInt(count.rows[0].count, 10) + 1;
  return `INV-${new Date().getFullYear()}-${String(n).padStart(3, '0')}`;
}

/**
 * @param {(text: string, params?: any[]) => Promise<any>} query
 * @param {(text: string, params?: any[]) => Promise<any>} queryOne
 * @param {number} tenantId
 * @param {string} plan
 * @param {number|string} planPrice
 * @returns {Promise<Object>}
 */
async function getOrCreateSubscriptionInvoice(query, queryOne, tenantId, plan, planPrice) {
  let invoice = await queryOne(
    `SELECT * FROM invoices
     WHERE tenant_id = $1 AND status = 'pending' AND description LIKE $2
     ORDER BY issue_date DESC LIMIT 1`,
    [tenantId, `${SUBSCRIPTION_PREFIX}%`]
  );

  if (!invoice) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);
    const invoiceNumber = await nextInvoiceNumber(query);
    const result = await query(
      `INSERT INTO invoices (tenant_id, invoice_number, amount, description, due_date, status)
       VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *`,
      [tenantId, invoiceNumber, planPrice, subscriptionDescription(plan), dueDate]
    );
    return result.rows[0];
  }

  const currentPlan = parseSubscriptionPlan(invoice.description);
  if (currentPlan !== plan || parseFloat(invoice.amount) !== parseFloat(planPrice)) {
    await query(
      `UPDATE invoices SET amount = $1, description = $2 WHERE id = $3`,
      [planPrice, subscriptionDescription(plan), invoice.id]
    );
    invoice = await queryOne('SELECT * FROM invoices WHERE id = $1', [invoice.id]);
  }

  return invoice;
}

export {
  SUBSCRIPTION_PREFIX,
  subscriptionDescription,
  parseSubscriptionPlan,
  activateTenantFromPaidInvoice,
  getOrCreateSubscriptionInvoice,
};
