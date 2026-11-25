/** Extract a short title from the user's own words, without inferring a diagnosis or intent. */
export function summarizeConversationTitle(message: string): string {
  const text = message
    .replace(/https?:\/\/\S+/gi, '链接')
    .replace(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gi, '[邮箱]')
    .replace(/(?<!\d)1[3-9]\d{9}(?!\d)/g, '[电话]')
    .replace(/(?<!\d)\d{17}[\dXx](?!\d)/g, '[证件号]')
    .replace(/<[^>]*>/g, '')
    .replace(/[#*_`>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) { return '新对话' }
  // Omit a standalone greeting, but preserve negations and the user's question.
  const withoutGreeting = text.replace(/^(?:(?:你好|小安)(?:[，,。！!：:\s]+|$)|请问[，,\s]*)/, '').trim() || text
  const firstSentence = withoutGreeting.match(/^[^。！？!?\n]+[。！？!?]?/)?.[0] || withoutGreeting
  const title = firstSentence.replace(/[。！!]+$/, '').trim()
  const characters = Array.from(title)
  return characters.length > 24 ? `${characters.slice(0, 24).join('')}…` : title || '新对话'
}
