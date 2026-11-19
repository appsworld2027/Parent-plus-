export function visibleFeedback(entries) {
  return entries.filter(({ status }) => status === 'published');
}
