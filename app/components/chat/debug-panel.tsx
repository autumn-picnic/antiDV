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

export default function DebugPanel({ debug }: { debug: ChatDebug | null | undefined }) {
  return (
    <details className="ml-3 mt-2 max-w-full border-l-2 border-gray-300 pl-3 text-xs text-gray-600">
      <summary className="cursor-pointer py-1 font-medium">调试信息</summary>
      <div className="space-y-1 pb-2 break-words [overflow-wrap:anywhere]">
        <p><GuardSummary guard={debug?.output_guard} /></p>
        {debug?.output_guard?.warnings?.length ? <p>Guard 提示：{debug.output_guard.warnings.join('；')}</p> : null}
        {debug?.safety && <p>安全判断：{debug.safety.decision || '未知'}（{debug.safety.level || '未知'}）</p>}
        {debug?.route && <p>路由：{debug.route.capsule_id || '未知'}{debug.route.capsule_title ? ` · ${debug.route.capsule_title}` : ''}{typeof debug.route.confidence === 'number' ? ` · ${debug.route.confidence.toFixed(2)}` : ''}{debug.route.method ? ` · ${debug.route.method}` : ''}</p>}
        {debug?.route?.fallback_reason && <p>路由回退：{debug.route.fallback_reason}</p>}
        {debug?.ground && <p>Ground：{debug.ground.loaded ? '已加载' : '未加载'}{debug.ground.selected_branch_numbers?.length ? ` · 分支 ${debug.ground.selected_branch_numbers.join(', ')}` : ''}{debug.ground.resolved_ground?.length ? ` · 引用 ${debug.ground.resolved_ground.join(', ')}` : ''}</p>}
        {debug?.models && <p>模型：{Object.entries(debug.models).map(([role, model]) => `${role} ${model}`).join(' · ')}</p>}
        {debug?.timings && <p>总耗时：{typeof debug.timings.total_ms === 'number' ? `${Math.round(debug.timings.total_ms)} ms` : '未知'}</p>}
      </div>
    </details>
  )
}
