export interface ExportPage<T> { items: T[], nextOffset: number | null }
export interface ExportConversation { id: string, userId: string | null, createdAt?: number, turnCount: number, reviewCount: number }
export interface ExportTurn { number: number, responseId: string, question: string, answer: string, score: number | null, comment: string | null, reviewedAt?: string | null }
export interface ExportContact { id: string, createdAt: string, message: string, name: string | null, phone: string | null, wechat: string | null, email: string | null }
export interface ExportFailure { id: string, userId: string | null, conversationId: string | null, responseId: string | null, question: string, stage: string, status: number, comment: string, code: string | null, createdAt: string }
export type ExportRow = Record<string, string | number | null>
export interface ExportTable { name: string, headers: string[], rows: ExportRow[], widths: number[] }
type PageLoader = <T>(url: string, signal: AbortSignal) => Promise<ExportPage<T>>

export async function loadExportPage<T>(url: string, signal: AbortSignal): Promise<ExportPage<T>> {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store', signal })
  if (!response.ok) {
    throw new Error(response.status === 401 ? '登录已失效，请重新登录后下载' : response.status === 403 ? '无管理员权限' : '导出数据读取失败，请重试')
  }
  const data = await response.json()
  if (!Array.isArray(data.items) || !(data.nextOffset === null || Number.isSafeInteger(data.nextOffset))) {
    throw new Error('导出数据格式无效')
  }
  return data
}

async function collect<T>(path: string, signal: AbortSignal, load: PageLoader): Promise<T[]> {
  const items: T[] = []
  let offset = 0
  while (true) {
    signal.throwIfAborted()
    const page = await load<T>(`${path}${path.includes('?') ? '&' : '?'}offset=${offset}`, signal)
    items.push(...page.items)
    if (page.nextOffset === null) { return items }
    if (page.nextOffset <= offset) { throw new Error('导出分页异常，请刷新后重试') }
    offset = page.nextOffset
  }
}

export async function collectFeedbackExport(
  section: 'chat' | 'contact', signal: AbortSignal,
  progress: (message: string) => void, load: PageLoader = loadExportPage,
): Promise<ExportTable[]> {
  if (section === 'contact') {
    progress('正在读取全部在线留言…')
    const contacts = await collect<ExportContact>('/api/contact', signal, load)
    const unique = [...new Map(contacts.map(item => [item.id, item])).values()]
    return [{ name: '在线留言', headers: ['id', 'createdAt', 'message', 'name', 'phone', 'wechat', 'email'], widths: [38, 28, 80, 18, 22, 24, 32], rows: unique.map(item => ({
      id: item.id, createdAt: item.createdAt, message: item.message,
      name: item.name, phone: item.phone, wechat: item.wechat, email: item.email,
    })) }]
  }
  progress('正在读取全部会话列表…')
  const list = await collect<ExportConversation>('/api/feedback', signal, load)
  const conversations = [...new Map(list.map(item => [item.id, item])).values()]
  const rows: ExportRow[] = []
  for (const [index, conversation] of conversations.entries()) {
    progress(`正在读取会话 ${index + 1} / ${conversations.length}…`)
    const turns = await collect<ExportTurn>(`/api/feedback?conversationId=${encodeURIComponent(conversation.id)}`, signal, load)
    const unique = [...new Map(turns.map(item => [item.responseId, item])).values()]
    if (unique.length < conversation.turnCount) { throw new Error('会话记录在导出期间发生变化，请刷新后重新下载') }
    rows.push(...unique.map(turn => ({
      会话ID: conversation.id, 用户ID: conversation.userId || '游客',
      轮次: turn.number, 回答ID: turn.responseId, 问题: turn.question, 回答: turn.answer,
      评分: turn.score, 反馈建议: turn.comment, 评价时间: turn.reviewedAt || null,
    })))
  }
  progress('正在读取全部失败记录…')
  const failures = await collect<ExportFailure>('/api/feedback/failures', signal, load)
  const uniqueFailures = [...new Map(failures.map(item => [item.id, item])).values()]
  return [
    { name: '会话汇总', headers: ['会话ID', '用户ID', '创建时间', '对话轮数', '评价条数'], widths: [38, 36, 28, 14, 14], rows: conversations.map(item => ({
      会话ID: item.id, 用户ID: item.userId || '游客',
      创建时间: item.createdAt == null ? null : new Date(item.createdAt * 1000).toISOString(),
      对话轮数: item.turnCount, 评价条数: item.reviewCount,
    })) },
    { name: '聊天评价', headers: ['会话ID', '用户ID', '轮次', '回答ID', '问题', '回答', '评分', '反馈建议', '评价时间'], widths: [38, 36, 10, 38, 60, 90, 10, 60, 28], rows },
    { name: '失败记录', headers: ['记录ID', '会话ID', '用户ID', '回答ID', '用户输入', '失败阶段', '错误状态', '错误代码', '评价（失败原因）', '记录时间', '来源'], widths: [38, 38, 36, 38, 60, 24, 14, 30, 80, 28, 24], rows: uniqueFailures.map(item => ({
      记录ID: item.id, 会话ID: item.conversationId, 用户ID: item.userId || '游客', 回答ID: item.responseId,
      用户输入: item.question, 失败阶段: item.stage === 'create_conversation' ? '建立会话失败' : '生成回答失败',
      错误状态: item.status || null, 错误代码: item.code, '评价（失败原因）': item.comment, 记录时间: item.createdAt, 来源: '浏览器失败报告',
    })) },
  ]
}

/** JSON strings stay string cells, including values beginning with '=' or '+'. */
export async function downloadFeedbackWorkbook(tables: ExportTable[], section: 'chat' | 'contact', signal: AbortSignal) {
  const XLSX = await import('xlsx')
  signal.throwIfAborted()
  const workbook = XLSX.utils.book_new()
  for (const table of tables) {
    if (table.rows.length > 1048575) { throw new Error('记录数量超过 Excel 单表上限，请缩小导出范围') }
    if (table.rows.some(row => Object.values(row).some(value => typeof value === 'string' && value.length > 32767))) {
      throw new Error('记录包含超过 Excel 单格上限的长文本，无法完整导出；请联系维护者处理')
    }
    const sheet = XLSX.utils.json_to_sheet(table.rows, { header: table.headers })
    sheet['!cols'] = table.widths.map(wch => ({ wch }))
    sheet['!autofilter'] = { ref: sheet['!ref']! }
    XLSX.utils.book_append_sheet(workbook, sheet, table.name)
  }
  const time = new Date().toISOString().replace(/[:.]/g, '-')
  XLSX.writeFile(workbook, `小安_${section === 'chat' ? '聊天评价' : '在线留言'}_${time}.xlsx`, { bookType: 'xlsx', compression: true })
}
