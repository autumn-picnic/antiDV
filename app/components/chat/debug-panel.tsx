import type { ChatDebug, GuardDiagnostic } from '@/types/chatflow'

const guardLabels = { allow: '放行', block: '拦截', inconclusive: '无法判定' }

export function GuardSummary({ guard }: { guard?: GuardDiagnostic }) {
  return (
    <span>
      Output Guard: {guard ? `${guard.status}（${guardLabels[guard.status]}）` : '无诊断数据'}
      {' · '}重新生成：{guard ? (guard.regenerated ? '是' : '否') : '未知'}
    </span>
  )
}

const groups = [
  ['timings', '耗时'],
  ['safety', 'Safety 安全判断'],
  ['route', '路由／胶囊'],
  ['ground', 'Ground 知识依据'],
  ['models', '模型'],
  ['output_guard', 'Output Guard 输出检查'],
  ['state', '跨轮状态'],
  ['router_context', '路由上下文'],
  ['redaction', 'PII 脱敏'],
  ['capsule_issues', '胶囊问题'],
] as const

const fieldLabels: Record<string, string> = {
  preprocess_ms: '预处理耗时', safety_ms: 'Safety 耗时', router_ms: 'Router 耗时',
  ground_ms: 'Ground 耗时', response_ttft_ms: '回答模型首字等待',
  first_guarded_delta_ms: '整轮到首个可见片段', response_generation_ms: '回答生成耗时',
  finalize_ms: '收尾耗时', total_ms: '总耗时',
  redacted_text: '脱敏后的输入', pii_tags: 'PII 标签',
  decision: '分类结果', level: '安全等级', response_key: '响应键',
  suspected_crisis_type: '疑似危机类型', clarification_question: '澄清问题',
  bystander: '旁观者', evidence: '判断依据', reason: '判断理由',
  fallback_reason: '回退原因', supplied_context_turns: '传入上下文轮数',
  capsule_id: '胶囊 ID', capsule_title: '胶囊名称', confidence: '路由置信度',
  should_continue_active_capsule: '继续活跃胶囊', method: '路由方式', raw_candidate: '原始候选',
  entry_count: '条目数', node_count: '节点数', loaded: '是否加载', loading_reason: '加载原因',
  selected_branch_numbers: '选中分支', selection_reason: '选择理由',
  resolved_ground: '解析后的引用', warnings: '提示',
  safety: 'Safety 模型', router: 'Router 模型', ground: 'Ground 模型', response: '回答模型',
  status: '检查状态', regenerated: '是否重新生成', passed: '是否通过',
  character_count: '字符数', length_limit: '长度上限', length_limit_enforced: '是否执行长度限制',
  question_count: '问题数', list_item_count: '列表条目数',
  has_previous_response_id: '是否有上一轮响应 ID', previous_response_model: '上一轮回答模型',
  active_capsule_id: '活跃胶囊 ID', ttl_turns: '剩余有效轮数',
  configured_turns: '配置的上下文轮数', supplied_completed_turns: '传入的已完成轮数',
}

function formatValue(value: unknown, key: string): string {
  if (value === null) { return '未提供（null）' }
  if (value === undefined) { return '未提供' }
  if (typeof value === 'boolean') { return value ? '是（true）' : '否（false）' }
  if (typeof value === 'number' && key.endsWith('_ms')) { return `${value} ms` }
  if (typeof value === 'string') { return value || '空字符串（""）' }
  if (typeof value === 'object') { return JSON.stringify(value, null, 2) }
  return String(value)
}

function DebugSection({ name, title, value }: { name: string, title: string, value: unknown }) {
  const entries: [string, unknown][] = value !== null && typeof value === 'object' && !Array.isArray(value)
    ? Object.entries(value) : [[name, value]]
  return (
    <section className="border-t border-gray-200 pt-2">
      <h4 className="mb-1 font-medium text-gray-700">{title}</h4>
      <dl className="space-y-2">
        {entries.length === 0 && <div><dt>{name}</dt><dd>{'{}'}</dd></div>}
        {entries.map(([key, fieldValue]) => (
          <div key={key}>
            <dt className="text-gray-500">{fieldLabels[key] || key}{fieldLabels[key] && <span className="ml-1">({key})</span>}</dt>
            <dd className="mt-0.5 whitespace-pre-wrap font-mono">{formatValue(fieldValue, key)}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export default function DebugPanel({ debug }: { debug: ChatDebug | null | undefined }) {
  const sections = groups.filter(([name]) => debug && Object.hasOwn(debug, name))
  const otherFields = Object.entries(debug || {}).filter(([name]) => !groups.some(([key]) => key === name))
  return (
    <details className="ml-3 mt-2 max-w-full border-l-2 border-gray-300 pl-3 text-xs text-gray-600">
      <summary className="cursor-pointer py-1 font-medium">调试信息</summary>
      <div className="space-y-3 pb-2 break-words [overflow-wrap:anywhere]">
        {!debug && <p>本轮无诊断数据。请使用已授权账号开启 Debug 后发送新消息。</p>}
        {sections.map(([name, title]) => <DebugSection key={name} name={name} title={title} value={debug?.[name]} />)}
        {otherFields.length > 0 && <DebugSection name="other" title="其他诊断" value={Object.fromEntries(otherFields)} />}
      </div>
    </details>
  )
}
