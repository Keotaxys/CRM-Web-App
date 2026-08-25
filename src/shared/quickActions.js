export function customerQuickActions(customer) {
  const dialPhone = customer?.phone?.replace(/\s/g, '') ?? '';
  const digits = dialPhone.replace(/\D/g, '');
  const whatsappPhone = digits.startsWith('856') ? digits : digits.startsWith('0') ? `856${digits.slice(1)}` : digits ? `856${digits}` : '';
  return {
    call: dialPhone ? `tel:${dialPhone}` : null,
    whatsapp: whatsappPhone ? `https://wa.me/${whatsappPhone}` : null,
    map: customer?.gps || null,
  };
}
