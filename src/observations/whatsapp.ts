// Only explicit international numbers become WhatsApp recipients. No provider
// call, delivery claim or student/contact data is written to diagnostic storage.
export function whatsappNumber(value: string): string | null {
  const clean = value.trim().replace(/[\s().-]/g, '');
  return /^\+[1-9]\d{7,14}$/.test(clean) ? clean.slice(1) : null;
}
export function whatsappLink(phone: string, message: string): string | null {
  const number = whatsappNumber(phone);
  if (!number || !message.trim() || message.length > 10000) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
export function feedbackMessage(academy: string, student: string, batch: string, note: string) {
  return `${academy}\nFeedback for ${student}${batch ? ` · ${batch}` : ''}\n\n${note.trim()}\n\n— Your coach`;
}
