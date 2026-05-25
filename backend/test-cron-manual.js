// backend/test-cron-manual.js
require('dotenv').config();
const { initDB } = require('./database');

// 🔍 DEBUG: Limpiar caché y forzar recarga del módulo
delete require.cache[require.resolve('./cron-billing')];
const cronBilling = require('./cron-billing');

console.log('🔍 Funciones exportadas desde cron-billing:', Object.keys(cronBilling));
console.log('🔍 Tipo de suspendExpiredFreeTrials:', typeof cronBilling.suspendExpiredFreeTrials);

// Verificar cada función antes de usarla
const functionsToTest = [
  'generateMonthlyInvoices',
  'sendPaymentReminders',
  'suspendOverdueTenants',
  'suspendExpiredFreeTrials'
];

functionsToTest.forEach(fnName => {
  if (typeof cronBilling[fnName] !== 'function') {
    console.error(`❌ ERROR: ${fnName} NO es una función`);
    console.error(`   Tipo: ${typeof cronBilling[fnName]}`);
  } else {
    console.log(`✅ ${fnName}: OK`);
  }
});

// Extraer funciones (solo si existen)
const {
  generateMonthlyInvoices,
  sendPaymentReminders,
  suspendOverdueTenants,
  suspendExpiredFreeTrials
} = cronBilling;

(async () => {
  await initDB();

  console.log('\n=== 🧪 PRUEBA MANUAL DE CRON JOBS ===\n');

  // 1️⃣ Suspensión de trials free vencidos
  if (typeof suspendExpiredFreeTrials === 'function') {
    console.log('1️⃣ Probando suspendExpiredFreeTrials...');
    console.log(await suspendExpiredFreeTrials());
  } else {
    console.error('❌ Saltando suspendExpiredFreeTrials: no es una función');
  }

  // 2️⃣ Facturación mensual
  console.log('\n2️⃣ Probando generateMonthlyInvoices...');
  console.log(await generateMonthlyInvoices());

  // 3️⃣ Recordatorios de pago
  console.log('\n3️⃣ Probando sendPaymentReminders...');
  console.log(await sendPaymentReminders());

  // 4️⃣ Suspensión de vencidos
  console.log('\n4️⃣ Probando suspendOverdueTenants...');
  console.log(await suspendOverdueTenants());

  console.log('\n✅ Todas las pruebas completadas');
  process.exit(0);
})();