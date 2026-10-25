import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { CellInput, RowInput } from 'jspdf-autotable'
import i18n from '../i18n'
import { getAppointmentStatusLabel } from './appointmentStatus'

interface InvoiceData {
  id: number
  invoice_number?: string
  amount: number
  status: string
  due_date: string
  issue_date?: string
  description?: string
}

interface TenantInfo {
  business_name?: string
  business_address?: string
  business_phone?: string
  notification_email?: string
}

export function exportInvoicePdf(invoice: InvoiceData, tenant: TenantInfo) {
  const doc = new jsPDF()
  const locale = i18n.resolvedLanguage || i18n.language
  const formatDate = (date: string) => new Date(date).toLocaleDateString(locale)
  const formatAmount = (amount: number) => amount.toLocaleString(locale, { minimumFractionDigits: 2 })

  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFontSize(22)
  doc.setTextColor(40, 40, 40)
  doc.text(tenant.business_name || i18n.t('staffDashboard.pdfBusinessDefault'), 14, 30)

  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  let y = 38
  if (tenant.business_address) {
    doc.text(tenant.business_address, 14, y)
    y += 5
  }
  if (tenant.business_phone) {
    doc.text(`${i18n.t('landing.phonePrefix')}: ${tenant.business_phone}`, 14, y)
    y += 5
  }
  if (tenant.notification_email) {
    doc.text(tenant.notification_email, 14, y)
  }

  doc.setFontSize(18)
  doc.setTextColor(60, 60, 60)
  doc.text(i18n.t('staffDashboard.pdfInvoiceTitle'), pageWidth - 14, 30, { align: 'right' })

  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  const invNum = invoice.invoice_number || `#${invoice.id}`
  doc.text(i18n.t('staffDashboard.pdfInvoiceNumber', { number: invNum }), pageWidth - 14, 38, { align: 'right' })
  if (invoice.issue_date) {
    doc.text(i18n.t('staffDashboard.pdfIssueDate', { date: formatDate(invoice.issue_date) }), pageWidth - 14, 44, { align: 'right' })
  }
  doc.text(i18n.t('staffDashboard.pdfDueDate', { date: formatDate(invoice.due_date) }), pageWidth - 14, 50, { align: 'right' })

  const statusKeys: Record<string, string> = {
    paid: 'invoiceStatusPaid',
    pending: 'invoiceStatusPending',
    cancelled: 'invoiceStatusCancelled',
    overdue: 'invoiceStatusOverdue',
  }
  const status = statusKeys[invoice.status]
    ? i18n.t(`staffDashboard.${statusKeys[invoice.status]}`)
    : invoice.status
  doc.text(i18n.t('staffDashboard.pdfStatusLabel', { status }), pageWidth - 14, 56, { align: 'right' })

  autoTable(doc, {
    startY: 70,
    head: [[i18n.t('staffDashboard.pdfInvoiceDescription'), i18n.t('staffDashboard.pdfInvoiceAmount')]],
    body: [
      [invoice.description || i18n.t('staffDashboard.pdfSubscriptionService'), `$ ${formatAmount(Number(invoice.amount))}`],
    ],
    theme: 'striped',
    headStyles: { fillColor: [60, 60, 60], textColor: 255, fontSize: 10 },
    bodyStyles: { fontSize: 10 },
    columnStyles: { 0: { cellWidth: 140 }, 1: { cellWidth: 40, halign: 'right' } },
  })

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(i18n.t('staffDashboard.pdfTotal', { amount: formatAmount(Number(invoice.amount)) }), pageWidth - 14, finalY, { align: 'right' })

  doc.save(`${i18n.t('staffDashboard.pdfInvoiceFilename')}-${invNum.replace(/[^a-zA-Z0-9-]/g, '')}.pdf`)
}

export function exportAppointmentsPdf(appointments: Record<string, unknown>[], tenant: TenantInfo) {
  const doc = new jsPDF()
  const locale = i18n.resolvedLanguage || i18n.language
  const formatStatus = (status: unknown) => {
    if (typeof status !== 'string') return ''
    return getAppointmentStatusLabel(status, key => i18n.t(key))
  }

  doc.setFontSize(18)
  doc.setTextColor(40, 40, 40)
  doc.text(tenant.business_name || i18n.t('staffDashboard.pdfBusinessDefault'), 14, 20)

  doc.setFontSize(12)
  doc.setTextColor(100, 100, 100)
  doc.text(i18n.t('staffDashboard.pdfAppointmentsTitle', { date: new Date().toLocaleDateString(locale) }), 14, 30)

  const body: RowInput[] = appointments.map(a => ([
    a.client_name,
    a.service_name || a.service || '-',
    a.staff_name || '-',
    a.date || (a.appointment_date ? new Date(a.appointment_date as string).toLocaleDateString(locale) : ''),
    a.time || '',
    formatStatus(a.status),
  ] as CellInput[]))

  autoTable(doc, {
    startY: 40,
    head: [[
      i18n.t('staffDashboard.pdfColumnClient'),
      i18n.t('staffDashboard.pdfColumnService'),
      i18n.t('staffDashboard.pdfColumnProfessional'),
      i18n.t('staffDashboard.pdfColumnDate'),
      i18n.t('staffDashboard.pdfColumnTime'),
      i18n.t('staffDashboard.pdfColumnStatus'),
    ]],
    body,
    theme: 'striped',
    headStyles: { fillColor: [60, 60, 60], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8 },
  })

  doc.save(`${i18n.t('staffDashboard.pdfAppointmentsFilename')}-${new Date().toISOString().slice(0, 10)}.pdf`)
}
