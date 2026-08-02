export function normalizePhoneToInternational(phone: string): string {
  if (!phone) return '';
  let digits = phone.replace(/[^0-9]/g, '');
  if (digits.startsWith('0')) digits = `598${digits.slice(1)}`;
  else if (!digits.startsWith('598')) digits = `598${digits}`;
  return digits;
}

export function buildWhatsAppUrl(phone: string, text?: string): string {
  const normalized = normalizePhoneToInternational(phone);
  if (!normalized) return '';
  const base = `https://wa.me/${normalized}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
