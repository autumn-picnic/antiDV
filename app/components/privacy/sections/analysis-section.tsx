import { useEffect, useState } from 'react'
import { requestAnalysisConsent } from '@/service/analysis-consent'
import { buttonClass } from '../privacy-form-styles'

export default function AnalysisSection({ signedIn, disabled, reload, mutate }: {
  signedIn: boolean, disabled: boolean, reload: number, mutate: (action: (signal: AbortSignal) => Promise<void>) => Promise<void>
}) {
  const [status, setStatus] = useState<Awaited<ReturnType<typeof requestAnalysisConsent>> | null>(null)
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(false)
  useEffect(() => {
    if (!signedIn) { return }
    const controller = new AbortController()
    setStatus(null)
    setError('')
    void requestAnalysisConsent(controller.signal).then(value => {
      if (!controller.signal.aborted) { setStatus(value) }
    }).catch(() => {
      if (!controller.signal.aborted) { setError('团队分析授权暂时无法读取。请刷新状态。') }
    })
    return () => controller.abort()
  }, [signedIn, reload])

  return <section className='mt-6 space-y-3 border-t border-[#E6DDD5] pt-4' aria-labelledby='analysis-consent-title'>
    <h3 id='analysis-consent-title' className='font-semibold'>团队分析授权</h3>
    {!signedIn ? <p className='text-sm'>注册或登录时勾选同意后，授权才会生效。</p>
      : error ? <p role='alert' className='text-sm'>{error}</p>
        : !status ? <p role='status' className='text-sm'>正在读取授权状态…</p>
          : !status.granted ? <p role='status' className='text-sm'>当前没有团队分析授权。</p>
            : <>
              <p className='text-sm'>团队分析授权已开启。</p>
              {confirm ? <>
                <p className='text-sm'>撤回后，团队将无法在分析后台查看相关对话。你仍可继续使用这些对话。团队已导出的分析结果，以及你已经提交的评分和建议，会继续保留。</p>
                <div className='flex flex-wrap gap-2'>
                  <button type='button' className={buttonClass} disabled={disabled} autoFocus onClick={() => setConfirm(false)}>取消</button>
                  <button type='button' className={buttonClass} disabled={disabled} onClick={() => void mutate(async (signal) => {
                    const updated = await requestAnalysisConsent(signal, true)
                    if (!signal.aborted) { setStatus(updated); setConfirm(false) }
                  })}>确认撤回</button>
                </div>
              </> : <button type='button' className={buttonClass} disabled={disabled} onClick={() => setConfirm(true)}>撤回授权</button>}
            </>}
  </section>
}
