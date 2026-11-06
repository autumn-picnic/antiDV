'use client'
import type { FC } from 'react'
import React, { useEffect, useRef } from 'react'
import cn from 'classnames'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import Textarea from 'rc-textarea'
import Answer from './answer'
import Question from './question'
import type { FeedbackFunc } from './type'
import type { DebugChatItem } from '@/types/chatflow'
import AppIcon from '@/app/components/base/app-icon'
import Tooltip from '@/app/components/base/tooltip'
import Toast from '@/app/components/base/toast'
import useModalDialog from '@/hooks/use-modal-dialog'
import { quickEscape } from '@/app/components/quick-exit'
import useSpeechInput from '@/hooks/use-speech-input'

export interface IChatProps {
  chatList: DebugChatItem[]
  feedbackDisabled?: boolean
  isHideSendInput?: boolean
  onFeedback?: FeedbackFunc
  checkCanSend?: () => boolean
  onSend?: (message: string) => void
  onStop?: () => void
  useCurrentUserAvatar?: boolean
  isResponding?: boolean
  disabled?: boolean
  controlClearQuery?: number
  onDeleteMessage?: (id: string) => void
  onReview?: (messageId: string, review: { score: number, comment: string }) => Promise<void>
  inputLeft?: number
  inputRight?: number
  onComposerResize?: (height: number) => void
  privacyControls?: React.ReactNode
  debugEnabled?: boolean
  speechInfoKey?: number
  composerTarget?: HTMLElement | null
  onShowResources?: () => void
  speechResetKey?: string
}

const Chat: FC<IChatProps> = ({
  chatList,
  feedbackDisabled = false,
  isHideSendInput = false,
  onFeedback,
  checkCanSend,
  onSend = () => { },
  onStop,
  useCurrentUserAvatar,
  isResponding,
  disabled = false,
  controlClearQuery,
  onDeleteMessage,
  onReview,
  inputLeft,
  inputRight,
  debugEnabled,
  onComposerResize,
  privacyControls,
  speechInfoKey = 0,
  composerTarget,
  onShowResources,
  speechResetKey = '',
}) => {
  const { t } = useTranslation()
  const { notify } = Toast
  const isUseInputMethod = useRef(false)

  const composerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const element = composerRef.current
    if (!element || !onComposerResize) { return }
    const observer = new ResizeObserver(() => onComposerResize(element.getBoundingClientRect().height))
    observer.observe(element)
    return () => observer.disconnect()
  }, [isHideSendInput, onComposerResize])

  const [query, setQuery] = React.useState('')
  const queryRef = useRef('')
  const submittedQuery = useRef('')
  const permissionDialog = useRef<HTMLDialogElement>(null)
  const recordingMode = 'hold' as const
  const [speechInfoOpen, setSpeechInfoOpen] = React.useState(false)
  useEffect(() => { if (speechInfoKey > 0) { setSpeechInfoOpen(true) } }, [speechInfoKey])
  const speechInformed = useRef(false)
  const speech = useSpeechInput((text) => {
    const current = queryRef.current
    const next = current ? `${current}\n${text}` : text
    if (next.length > 4000) { throw new Error('输入框文字已接近上限，请先发送或整理文字，再重新录音。') }
    queryRef.current = next
    setQuery(next)
    if (composerRef.current?.contains(document.activeElement)) { composerRef.current.querySelector('textarea')?.focus() }
  }, speechResetKey, disabled || Boolean(isResponding) || isHideSendInput)

  useEffect(() => {
    if (speech.permissionDenied) { setSpeechInfoOpen(true) }
  }, [speech.permissionDenied])
  useEffect(() => {
    setSpeechInfoOpen(false)
  }, [speechResetKey, disabled, isResponding])

  useModalDialog(permissionDialog, speechInfoOpen)
  const beginRecording = () => {
    if (!speechInformed.current) { setSpeechInfoOpen(true); return }
    void speech.start(false, recordingMode)
  }
  const microphoneLabel = speech.phase === 'permission' ? '等待麦克风授权'
    : speech.phase === 'transcribing' ? '正在转写'
      : speech.phase === 'recording' ? '松开转写' : '按住说话，松开转写'

  const handleContentChange = (e: any) => {
    const value = e.target.value
    setQuery(value)
    queryRef.current = value
  }

  const logError = (message: string) => {
    notify({ type: 'error', message, duration: 3000 })
  }

  const valid = () => {
    const query = queryRef.current
    if (!query || query.trim() === '') {
      logError(t('app.errorMessage.valueOfVarRequired'))
      return false
    }
    return true
  }

  useEffect(() => {
    if (controlClearQuery) {
      setQuery('')
      queryRef.current = ''
    }
  }, [controlClearQuery])
  const handleSend = () => {
    if (disabled || isResponding || speech.active || !valid() || (checkCanSend && !checkCanSend())) { return }
    speech.cancel()
    submittedQuery.current = queryRef.current
    onSend(queryRef.current)
    setQuery('')
    queryRef.current = ''
  }

  const handleStop = () => {
    onStop?.()
    // Preserve any next question already drafted while the answer was streaming.
    if (!queryRef.current.trim()) {
      setQuery(submittedQuery.current)
      queryRef.current = submittedQuery.current
    }
    composerRef.current?.querySelector('textarea')?.focus()
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && !isUseInputMethod.current && event.keyCode !== 229) {
      event.preventDefault()
      if (!event.repeat) { handleSend() }
    }
  }

  const suggestionClick = (suggestion: string) => {
    if (speech.active) { return }
    setQuery(suggestion)
    queryRef.current = suggestion
    composerRef.current?.querySelector('textarea')?.focus()
  }

  const isWelcome = !chatList.some(item => !item.isOpeningStatement)
  const starterQuestions = [
    { label: '算家暴吗？', message: '我遇到的这些，算家暴吗？' },
    { label: '梳理经历', message: '我想梳理一下自己的经历，可以帮我吗？' },
    { label: '报警保护令', message: '报警、保护令，具体怎么办？' },
    { label: '支持资源', message: '' },
  ]

  const composer = (

          <div
            ref={composerRef}
            className='chat-composer-dock'
            style={{ left: inputLeft ?? 0, right: inputRight ?? 0 }}
          >
            <div className="chat-composer-inner">
              {isWelcome && <div className="chat-starters" aria-label="可以从这些话题开始">
                {starterQuestions.map(question => <button type="button" key={question.label} data-resource-trigger={!question.message || undefined} disabled={disabled || isResponding || speech.active}
                  onClick={() => question.message ? suggestionClick(question.message) : onShowResources?.()}>{question.label}</button>)}
              </div>}
              <div className='chat-composer relative p-2 max-h-[200px] overflow-y-auto'>
                <Textarea
                  id="chat-input"
                  aria-describedby="chat-input-help"
                  onCompositionStart={() => { isUseInputMethod.current = true }}
                  onCompositionEnd={() => { isUseInputMethod.current = false }}
                  className={`
                  block w-full bg-transparent pl-5 pr-28 py-[7px] leading-5 max-h-none text-base text-gray-700 outline-none appearance-none resize-none
                `}
                  placeholder="你可以从任何地方说起…"
                  aria-label="和小安说说话"
                  value={query}
                  maxLength={4000}
                  onChange={handleContentChange}
                  onKeyDown={handleKeyDown}
                  autoSize={{ minRows: 1, maxRows: 5 }}
                />
                <div className="absolute bottom-1 right-3 flex items-center h-11">
                  <button
                    type="button"
                    className="chat-microphone"
                    aria-label={microphoneLabel}
                    title={microphoneLabel}
                    disabled={disabled || isResponding || speech.phase === 'transcribing'}
                    aria-busy={speech.phase === 'permission' || speech.phase === 'transcribing'}
                    onPointerDown={event => {
                      if (event.button !== 0 || !event.isPrimary) { return }
                      event.preventDefault()
                      event.currentTarget.setPointerCapture(event.pointerId)
                      beginRecording()
                    }}
                    onPointerUp={() => { void speech.finish() }}
                    onPointerCancel={() => { speech.cancel() }}
                    onKeyDown={event => {
                      if ((event.key === ' ' || event.key === 'Enter')) {
                        event.preventDefault(); if (!event.repeat) { beginRecording() }
                      }
                    }}
                    onKeyUp={event => {
                      if ((event.key === ' ' || event.key === 'Enter')) { event.preventDefault(); void speech.finish() }
                    }}
                    onBlur={() => { if (speech.phase === 'recording') { speech.cancel() } }}

                  >
                    {speech.phase === 'recording'
                      ? <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><rect x="4" y="4" width="12" height="12" rx="2" /></svg>
                      : <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8" /></svg>}
                  </button>
                  <Tooltip
                    selector='send-tip'
                    htmlContent={
                      isResponding ? <div>停止回复</div> : <div>
                        <div>{t('common.operation.send')} Enter</div>
                        <div>{t('common.operation.lineBreak')} Shift Enter</div>
                      </div>
                    }
                  >
                    <button
                      type="button"
                      className="chat-send"
                      aria-label={isResponding ? '停止回复' : '发送消息'}
                      disabled={isResponding ? !onStop : disabled || speech.active || !query.trim()}
                      onClick={isResponding ? handleStop : handleSend}
                    ><span aria-hidden="true">{isResponding
                        ? <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor"><rect x="2" y="2" width="14" height="14" rx="1" /></svg>
                        : <svg width="28" height="22" viewBox="0 0 28 22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 20V2M6 10l8-8 8 8" /></svg>}</span></button>
                  </Tooltip>
                </div>
              </div>
              <p id="chat-input-help" className="sr-only">Enter 发送，Shift+Enter 换行。语音转写后，请核对文字再发送。</p>
              {speech.active && <div className="chat-speech-controls">
                {speech.phase === 'recording' && <span className="chat-recording-time">录音中 {speech.seconds} / 55 秒</span>}
                <button type="button" className="chat-speech-cancel" onClick={() => { speech.cancel() }}>取消{speech.phase === 'recording' ? '录音' : '转写'}</button>
              </div>}
              <p className="chat-speech-status" role="status" aria-live="polite" aria-atomic="true">{speech.message}</p>
              <dialog onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation() } }} onCancel={event => { event.preventDefault(); setSpeechInfoOpen(false) }} ref={permissionDialog} className="speech-permission-dialog" aria-labelledby="speech-permission-title" aria-describedby="speech-permission-description">
                <button type="button" onClick={quickEscape}>快速离开</button>
                <h2 id="speech-permission-title">{speech.permissionDenied ? '开启麦克风权限' : '使用语音输入'}</h2>
                <p id="speech-permission-description">按住麦克风说话，松开后转成文字。转写到输入框后，请核对文字再手动发送。首次授权只准备设备，授权完成后请再次开始录音。</p>
                {speech.permissionDenied && <p>如果之前已拒绝，请点击地址栏旁的网站设置或权限图标，将「麦克风」改为「允许」；手机上也可在浏览器的系统设置中开启麦克风，再回来重试。网页无法代替你修改已封锁的权限。</p>}
                <p>提交转写的录音和识别文字会保存，供指定反馈管理员查看和播放，独立于聊天保存期限，目前不自动到期；取消尚未提交的录音不会上传。</p>
                <div className="speech-permission-actions">
                  <button type="button" className="speech-permission-button" autoFocus onClick={() => setSpeechInfoOpen(false)}>暂不使用</button>
                  <button type="button" className="speech-permission-button speech-permission-confirm" disabled={disabled || isResponding || speech.active} onClick={() => { speechInformed.current = true; setSpeechInfoOpen(false); void speech.start(true, recordingMode) }}>{speech.permissionDenied ? '已设置，重新尝试' : '请求麦克风权限'}</button>
                </div>
              </dialog>
              <div className="chat-composer-footer"><p className="chat-disclaimer">小安是AI助手，回答可能有误。</p><a href="/safety-pack">查看安全包</a></div>
              <div className="chat-privacy-dialog-host">{privacyControls}</div>
            </div>
          </div>

  )

  return (
    <div className={cn(!feedbackDisabled && 'px-3.5', 'chat-surface', isWelcome && 'chat-surface-welcome')}>
      {isWelcome && (
        <section className="chat-welcome" aria-labelledby="chat-welcome-title">
          <AppIcon size="hero" rounded className="chat-welcome-avatar" />
          <h2 id="chat-welcome-title">从你想说的地方开始</h2>
          <p>这里不用急着找到答案。<br />你可以慢慢说，也可以先看看。</p>
        </section>
      )}
      {/* Chat List */}
      <div id="chat-content" role="region" aria-label="对话内容" tabIndex={-1} className="space-y-9 chat-messages">
        {chatList.filter(item => !item.isOpeningStatement).map((item, index) => {
          if (item.isAnswer) {
            const isLast = item.id === chatList[chatList.length - 1].id
            return <Answer
              key={item.id}
              item={item}
              number={Math.floor(index / 2) + 1}
              feedbackDisabled={feedbackDisabled || Boolean(item.fallback)}
              onFeedback={onFeedback}
              isResponding={isResponding && isLast}
              suggestionClick={suggestionClick}
              onDelete={onDeleteMessage ? () => onDeleteMessage(item.id) : undefined}
              onReview={onReview}
              debugEnabled={debugEnabled}
            />
          }
          return (
            <Question
              key={item.id}
              id={item.id}
              number={Math.floor(index / 2) + 1}
              content={item.content}
              useCurrentUserAvatar={useCurrentUserAvatar}
              imgSrcs={(item.message_files && item.message_files?.length > 0) ? item.message_files.map(item => item.url) : []}
              onDelete={onDeleteMessage ? () => onDeleteMessage(item.id) : undefined}
            />
          )
        })}
      </div>
      {!isHideSendInput && (composerTarget ? createPortal(composer, composerTarget) : composer)}
    </div>
  )
}

export default React.memo(Chat)
