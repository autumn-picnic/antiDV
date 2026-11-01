'use client'
import type { FC } from 'react'
import React, { useEffect, useRef } from 'react'
import cn from 'classnames'
import { useTranslation } from 'react-i18next'
import Textarea from 'rc-textarea'
import Answer from './answer'
import Question from './question'
import type { FeedbackFunc } from './type'
import type { DebugChatItem } from '@/types/chatflow'
import AppIcon from '@/app/components/base/app-icon'
import Tooltip from '@/app/components/base/tooltip'
import Toast from '@/app/components/base/toast'
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
  const [showAllStarters, setShowAllStarters] = React.useState(false)
  const queryRef = useRef('')
  const submittedQuery = useRef('')
  const permissionDialog = useRef<HTMLDialogElement>(null)
  const speech = useSpeechInput((text) => {
    const current = queryRef.current
    const next = current ? `${current}\n${text}` : text
    if (next.length > 4000) { throw new Error('输入框文字已接近上限，请先发送或整理文字，再重新录音。') }
    queryRef.current = next
    setQuery(next)
    composerRef.current?.querySelector('textarea')?.focus()
  }, speechResetKey, disabled || Boolean(isResponding) || isHideSendInput)

  useEffect(() => {
    if (speech.permissionDenied) { permissionDialog.current?.showModal() }
  }, [speech.permissionDenied])
  useEffect(() => {
    permissionDialog.current?.close()
  }, [speechResetKey, disabled, isResponding])

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

  const handleKeyUp = (e: any) => {
    if (e.code === 'Enter') {
      e.preventDefault()
      // prevent send message when using input method enter
      if (!e.shiftKey && !isUseInputMethod.current) { handleSend() }
    }
  }

  const handleKeyDown = (e: any) => {
    isUseInputMethod.current = e.nativeEvent.isComposing
    if (e.code === 'Enter' && !e.shiftKey) {
      const result = query.replace(/\n$/, '')
      setQuery(result)
      queryRef.current = result
      e.preventDefault()
    }
  }

  const suggestionClick = (suggestion: string) => {
    if (speech.active) { return }
    setQuery(suggestion)
    queryRef.current = suggestion
    handleSend()
  }

  const isWelcome = !chatList.some(item => !item.isOpeningStatement)
  useEffect(() => {
    if (!isWelcome) { setShowAllStarters(false) }
  }, [isWelcome])
  const configuredStarters = chatList.find(item => item.isOpeningStatement)?.suggestedQuestions
  const starterQuestions = configuredStarters?.length
    ? configuredStarters
    : [
      '我遇到的这些，算家暴吗？',
      '怎么让我现在安全一点？',
      '报警、保护令，具体怎么办？',
      '我该留下哪些证据？',
      '我还没想离开，但我很难受',
      '如果我离开了之后怎么办？',
    ]

  /* ── Quick-action chips ──────────────────────────────── */
  const quickActions = [
    {
      label: '报警要怎么说',
      message: '我想报警，但不知道该怎么跟警察说，能帮我准备一下吗？',
      href: '/docs-toolkit',
    },
    {
      label: '如何收集证据',
      message: '我该如何收集家暴的证据？需要保留哪些东西？',
      href: '/resources',
    },
    {
      label: '帮我总结案情',
      message: '请帮我总结一下目前的情况，整理成可以用于报警或法律咨询的描述。',
      href: null,
    },
  ]

  const handleQuickAction = (action: typeof quickActions[0]) => {
    if (speech.active) { return }
    setQuery(action.message)
    queryRef.current = action.message
    handleSend()
    if (action.href) {
      window.open(action.href, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className={cn(!feedbackDisabled && 'px-3.5', 'chat-surface', isWelcome && 'chat-surface-welcome')}>
      {isWelcome && (
        <section className="chat-welcome" aria-labelledby="chat-welcome-title">
          <AppIcon size="hero" rounded className="chat-welcome-avatar" />
          <h1 id="chat-welcome-title">这里是一个安全的空间</h1>
          <p>你可以按照自己的节奏，告诉我任何你想说的</p>
        </section>
      )}
      {/* Chat List */}
      <div className="space-y-9 chat-messages">
        {chatList.filter(item => !item.isOpeningStatement).map((item) => {
          if (item.isAnswer) {
            const isLast = item.id === chatList[chatList.length - 1].id
            return <Answer
              key={item.id}
              item={item}
              feedbackDisabled={feedbackDisabled}
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
              content={item.content}
              useCurrentUserAvatar={useCurrentUserAvatar}
              imgSrcs={(item.message_files && item.message_files?.length > 0) ? item.message_files.map(item => item.url) : []}
              onDelete={onDeleteMessage ? () => onDeleteMessage(item.id) : undefined}
            />
          )
        })}
      </div>
      {
        !isHideSendInput && (
          <div
            ref={composerRef}
            className='chat-composer-dock'
            style={{ left: inputLeft ?? 0, right: inputRight ?? 0 }}
          >
            <div className="chat-composer-inner">
              {isWelcome && (
                <div className="chat-starter-section">
                  <div id="chat-starter-questions" className="chat-starters" aria-label="可以从这些话题开始">
                    {starterQuestions.slice(0, showAllStarters ? undefined : 3).map(question => (
                      <button type="button" key={question} disabled={disabled || isResponding || speech.active} onClick={() => suggestionClick(question)}>
                        <span>{question}</span>
                      </button>
                    ))}
                  </div>
                  {starterQuestions.length > 3 && (
                    <button
                      type="button"
                      className="chat-more-questions"
                      aria-expanded={showAllStarters}
                      aria-controls="chat-starter-questions"
                      onClick={() => setShowAllStarters(value => !value)}
                    >
                      {showAllStarters ? '收起其他问题' : '看看其他问题'}
                      <svg aria-hidden="true" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m6 3 5 5-5 5" /></svg>
                    </button>
                  )}
                </div>
              )}
              {/* Quick-action chips */}
              <div
                style={{
                  display: isWelcome ? 'none' : 'flex',
                  gap: 8,
                  marginBottom: 8,
                  overflowX: 'auto',
                  scrollbarWidth: 'none',
                  WebkitOverflowScrolling: 'touch',
                  msOverflowStyle: 'none',
                  paddingBottom: 2,
                }}
              >
                <style dangerouslySetInnerHTML={{
                  __html: `
                .quick-chip-scroll::-webkit-scrollbar { display: none; }
                .quick-chip:hover { background-color: #F5E6D3 !important; border-color: #E8A87C !important; }
                .quick-chip:active { transform: scale(0.97); }
              `,
                }} />
                {quickActions.map(action => (
                  <button
                    key={action.label}
                    disabled={disabled || isResponding || speech.active}
                    className="quick-chip-scroll quick-chip"
                    onClick={() => handleQuickAction(action)}
                    style={{
                      flexShrink: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '6px 14px',
                      fontSize: 13,
                      fontWeight: 500,
                      color: '#5C4D3E',
                      backgroundColor: 'rgba(255,255,255,0.85)',
                      border: '1px solid #E6DDD5',
                      borderRadius: 20,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      transition: 'background-color 150ms, border-color 150ms, transform 100ms',
                      lineHeight: 1.4,
                    }}
                  >
                    {action.label}
                    {action.href && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#B5A898" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 2 }}>
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
              <div className='chat-composer relative p-2 max-h-[200px] overflow-y-auto'>
                <Textarea
                  className={`
                  block w-full bg-transparent pl-5 pr-28 py-[7px] leading-5 max-h-none text-base text-gray-700 outline-none appearance-none resize-none
                `}
                  placeholder="你可以从任何地方开始说起。"
                  aria-label="和小安说说话"
                  value={query}
                  maxLength={4000}
                  onChange={handleContentChange}
                  onKeyUp={handleKeyUp}
                  onKeyDown={handleKeyDown}
                  autoSize
                />
                <div className="absolute bottom-1 right-3 flex items-center h-11">
                  <button
                    type="button"
                    className="chat-microphone"
                    aria-label={speech.phase === 'recording' ? '松开转写' : '按住说话，松开转写'}
                    title={'按住说话，松开后转写到输入框，确认后手动发送'}
                    aria-pressed={speech.phase === 'recording'}
                    disabled={disabled || isResponding}
                    aria-busy={speech.phase === 'transcribing'}
                    onPointerDown={event => {
                      if (event.button !== 0 || !event.isPrimary) { return }
                      event.preventDefault()
                      event.currentTarget.setPointerCapture(event.pointerId)
                      void speech.start()
                    }}
                    onPointerUp={() => { void speech.finish() }}
                    onPointerCancel={speech.cancel}
                    onLostPointerCapture={() => { void speech.finish() }}
                    onContextMenu={event => event.preventDefault()}
                    onKeyDown={event => {
                      if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); if (!event.repeat) { void speech.start() } }
                    }}
                    onKeyUp={event => {
                      if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); void speech.finish() }
                    }}
                    onBlur={() => { if (speech.phase === 'recording') { speech.cancel() } }}
                    onClick={event => event.preventDefault()}
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
                        : <svg width="28" height="22" viewBox="0 0 28 22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11h21M16 3l8 8-8 8" /></svg>}</span></button>
                  </Tooltip>
                </div>
              </div>
              <p className="chat-speech-status">按住说话，松开转写，核对后点击发送；提交的录音会保存供反馈管理员核对。</p>
              {speech.active && <div className="chat-speech-controls">
                {speech.phase === 'recording' && <span className="chat-recording-time">录音中 {speech.seconds} / 55 秒</span>}
                <button type="button" className="chat-speech-cancel" onClick={speech.cancel}>取消{speech.phase === 'recording' ? '录音' : '转写'}</button>
              </div>}
              {speech.message && <p className="chat-speech-status" role="status" aria-live="polite">{speech.message}</p>}
              <dialog onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation() } }} ref={permissionDialog} className="speech-permission-dialog" aria-labelledby="speech-permission-title" aria-describedby="speech-permission-description">
                <h2 id="speech-permission-title">{speech.permissionDenied ? '开启麦克风权限' : '使用语音输入'}</h2>
                <p id="speech-permission-description">按住麦克风说话，松开后转写到输入框，确认后手动发送。首次会直接请求浏览器麦克风权限，授权完成后请重新按住录音。</p>
                {speech.permissionDenied && <p>如果之前已拒绝，请点击地址栏旁的网站设置或权限图标，将「麦克风」改为「允许」；手机上也可在浏览器的系统设置中开启麦克风，再回来重试。网页无法代替你修改已封锁的权限。</p>}
                <p>提交转写的录音和识别文字会保存，供指定反馈管理员查看和播放，独立于聊天保存期限，目前不自动到期；取消尚未提交的录音不会上传。</p>
                <div className="speech-permission-actions">
                  <button type="button" className="speech-permission-button" onClick={() => permissionDialog.current?.close()}>暂不使用</button>
                  <button type="button" className="speech-permission-button speech-permission-confirm" disabled={disabled || isResponding || speech.active} onClick={() => { permissionDialog.current?.close(); void speech.start(true) }}>{speech.permissionDenied ? '已设置，重新尝试' : '请求麦克风权限'}</button>
                </div>
              </dialog>
              {privacyControls}
              <p className="chat-disclaimer">小安是AI助手，回答可能有误。</p>
            </div>
          </div>
        )
      }
    </div>
  )
}

export default React.memo(Chat)
