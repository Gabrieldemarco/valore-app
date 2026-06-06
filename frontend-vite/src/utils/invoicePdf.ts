import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

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

  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFontSize(22)
  doc.setTextColor(40, 40, 40)
  doc.text(tenant.business_name || 'Mi Peluquería', 14, 30)

  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  let y = 38
  if (tenant.business_address) {
    doc.text(tenant.business_address, 14, y)
    y += 5
  }
  if (tenant.business_phone) {
    doc.text(`Tel: ${tenant.business_phone}`, 14, y)
    y += 5
  }
  if (tenant.notification_email) {
    doc.text(tenant.notification_email, 14, y)
    y += 5
  }

  doc.setFontSize(18)
  doc.setTextColor(60, 60, 60)
  doc.text('FACTURA', pageWidth - 14, 30, { align: 'right' })

  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  const invNum = invoice.invoice_number || `#${invoice.id}`
  doc.text(`N°: ${invNum}`, pageWidth - 14, 38, { align: 'right' })
  if (invoice.issue_date) {
    doc.text(`Emisión: ${new Date(invoice.issue_date).toLocaleDateString('es-UY')}`, pageWidth - 14, 44, { align: 'right' })
  }
  doc.text(`Vencimiento: ${new Date(invoice.due_date).toLocaleDateString('es-UY')}`, pageWidth - 14, 50, { align: 'right' })

  const statusLabels: Record<string, string> = { paid: 'Pagada', pending: 'Pendiente', cancelled: 'Anulada', overdue: 'Vencida' }
  doc.text(`Estado: ${statusLabels[invoice.status] || invoice.status}`, pageWidth - 14, 56, { align: 'right' })

  autoTable(doc, {
    startY: 70,
    head: [['Descripción', 'Monto']],
    body: [
      [invoice.description || `Servicio de suscripción`, `$ ${Number(invoice.amount).toLocaleString('es-UY', { minimumFractionDigits: 2 })}`],
    ],
    theme: 'striped',
    headStyles: { fillColor: [60, 60, 60], textColor: 255, fontSize: 10 },
    bodyStyles: { fontSize: 10 },
    columnStyles: { 0: { cellWidth: 140 }, 1: { cellWidth: 40, halign: 'right' } },
  })

  const finalY = (doc as any).lastAutoTable.finalY + 10
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(`Total: $ ${Number(invoice.amount).toLocaleString('es-UY', { minimumFractionDigits: 2 })}`, pageWidth - 14, finalY, { align: 'right' })

  doc.save(`factura-${invNum.replace(/[^a-zA-Z0-9-]/g, '')}.pdf`)
}

export function exportAppointmentsPdf(appointments: any[], tenant: TenantInfo) {
  const doc = new jsPDF()

  doc.setFontSize(18)
  doc.setTextColor(40, 40, 40)
  doc.text(tenant.business_name || 'Mi Peluquería', 14, 20)

  doc.setFontSize(12)
  doc.setTextColor(100, 100, 100)
  doc.text(`Reporte de Turnos - ${new Date().toLocaleDateString('es-UY')}`, 14, 30)

  const body = appointments.map(a => [
    a.client_name,
    a.service_name || a.service || '-',
    a.staff_name || '-',
    a.date || (a.appointment_date ? new Date(a.appointment_date).toLocaleDateString('es-UY') : ''),
    a.time || '',
    a.status || '',
  ])

  autoTable(doc, {
    startY: 40,
    head: [['Cliente', 'Servicio', 'Profesional', 'Fecha', 'Hora', 'Estado']],
    body,
    theme: 'striped',
    headStyles: { fillColor: [60, 60, 60], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8 },
  })

  doc.save(`turnos-${new Date().toISOString().slice(0, 10)}.pdf`)
}
