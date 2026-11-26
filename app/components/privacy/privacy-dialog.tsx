import { useRef } from 'react'
import useModalDialog from '@/hooks/use-modal-dialog'
import { quickEscape } from '@/app/components/quick-exit'
import { buttonClass } from './privacy-form-styles'

export default function PrivacyDialog({ children, onClose, saving }: { children: React.ReactNode, onClose: () => void, saving: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useModalDialog(dialog)
  return <dialog ref={dialog} aria-labelledby='privacy-title' onCancel={(event) => { event.preventDefault(); if (!saving) { onClose() } }} className='m-auto max-h-[90dvh] w-[min(94vw,640px)] overflow-y-auto rounded-2xl bg-[#FBF9F6] p-5 text-left text-[#3D3028] shadow-xl backdrop:bg-black/30 sm:p-6'>
    <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
      <h2 id='privacy-title' className='text-lg font-semibold'>隐私与保存</h2>
      <div className='flex gap-2'>
        <button type='button' onClick={quickEscape} className={buttonClass}>快速离开</button>
        <button type='button' onClick={onClose} disabled={saving} className={buttonClass}>关闭</button>
      </div>
    </div>
    {saving && <p role='status'>正在保存，请稍候</p>}
    {children}
  </dialog>
}
