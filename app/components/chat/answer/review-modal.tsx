'use client'
import { quickEscape } from '@/app/components/quick-exit'
import useModalDialog from '@/hooks/use-modal-dialog'
import { useRef, useState } from 'react'

interface ReviewModalProps {
  messageId: string
  existingReview?: { score: number, comment: string }
  onSubmit: (messageId: string, review: { score: number, comment: string }) => Promise<void>
  onClose: () => void
}

export default function ReviewModal({ messageId, existingReview, onSubmit, onClose }: ReviewModalProps) {
  const [score, setScore] = useState(existingReview?.score ?? 0)
  const [comment, setComment] = useState(existingReview?.comment ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  useModalDialog(dialog)
  async function submit() {
    if (!score || saving) { return }
    setSaving(true)
    setError('')
    try { await onSubmit(messageId, { score, comment: comment.trim() }); onClose() }
    catch (err) { setError(err instanceof Error ? err.message : '保存失败，请重试'); setSaving(false) }
  }
  return <dialog ref={dialog} onCancel={(event) => { event.preventDefault(); if (!saving) { onClose() } }} aria-labelledby='review-title' className='w-[min(90vw,400px)] rounded-xl bg-white p-6 text-gray-900 shadow-xl backdrop:bg-black/30'>
    <button type='button' onClick={quickEscape}>快速离开</button>
    {saving && <p role='status'>正在保存，请稍候</p>}
    <h2 id='review-title' className='text-lg font-semibold'>评价小安的这条回答</h2>
    <fieldset disabled={saving} className='mt-4'>
      <legend>回答对你有多大帮助？</legend>
      <div className='mt-2 flex gap-2'>{[1, 2, 3, 4, 5].map(value => <label key={value} className='flex cursor-pointer flex-col items-center gap-1 rounded border p-2'>
        <input type='radio' name='score' value={value} checked={score === value} onChange={() => setScore(value)} />
        <span>{value} 分</span>
      </label>)}</div>
      <p className='mt-2 text-xs text-gray-600'>1 分：没有帮助；5 分：非常有帮助</p>
      <label htmlFor='review-comment' className='mt-4 block'>希望小安如何改进？（选填）</label>
      <textarea id='review-comment' value={comment} onChange={event => setComment(event.target.value)} maxLength={500} rows={4} className='mt-2 w-full rounded border p-2' />
      <p className='text-xs text-gray-600'>{comment.length}/500 字。评分及建议会供管理员改进服务使用。</p>
    </fieldset>
    {error && <p role='alert' className='mt-3 text-sm text-red-700'>{error}</p>}
    <div className='mt-5 flex justify-end gap-4'>
      <button type='button' disabled={saving} onClick={onClose} className='rounded border px-3 py-2'>取消</button>
      <button type='button' disabled={!score || saving} onClick={() => void submit()} className='rounded bg-orange-800 px-3 py-2 text-white disabled:opacity-40'>{saving ? '正在保存…' : '保存评价'}</button>
    </div>
  </dialog>
}
