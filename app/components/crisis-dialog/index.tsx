'use client'
import useModalDialog from '@/hooks/use-modal-dialog'
import { useRef } from 'react'
import { quickEscape } from '@/app/components/quick-exit'

export default function CrisisDialog({ onContinue, onExit }: { onContinue: () => void, onExit: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useModalDialog(dialog)
  return (
    <dialog ref={dialog} aria-labelledby="crisis-title" aria-describedby="crisis-description"
      onCancel={(event) => { event.preventDefault(); onContinue() }}
      className="crisis-dialog w-[calc(100%-2rem)] max-w-md rounded-2xl border border-stone-200 bg-[#fffdf8] p-6 text-gray-800 shadow-xl backdrop:bg-black/40">
      <button type="button" onClick={quickEscape} className="mb-5 min-h-[44px] rounded-lg border border-gray-500 px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2">快速离开此页面</button>
      <h2 id="crisis-title" className="text-xl font-semibold">你可以选择接下来怎么做</h2>
      <p id="crisis-description" className="mt-3 text-sm leading-6">你可以退出聊天查看生存安全包，或留在这里继续聊。查看安全包不会清除聊天或浏览记录。</p>
      <div className="mt-6 flex flex-col gap-3">
        <button type="button" onClick={onExit} className="min-h-[48px] rounded-xl bg-[#446555] px-4 py-3 font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">查看安全包</button>
        <button data-modal-autofocus type="button" onClick={onContinue} className="min-h-[48px] rounded-xl border border-[#446555] px-4 py-3 font-semibold text-[#304b3d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">继续聊天</button>
      </div>
    </dialog>
  )
}
