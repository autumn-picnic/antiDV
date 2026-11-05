'use client'
import type { FC } from 'react'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import useGuestLoginPrompt from '@/hooks/use-guest-login-prompt'
import GuestLoginPrompt from '@/app/components/account/guest-login-prompt'
import { useBoolean } from 'ahooks'
import Modal from '@/app/components/base/modal'
import CrisisDialog from '@/app/components/crisis-dialog'
import useCrisisPrompt from '@/hooks/use-crisis-prompt'
import StreamdownMarkdown from '@/app/components/base/streamdown-markdown'
import Sidebar from '@/app/components/sidebar'
import Header from '@/app/components/header'
import Chat from '@/app/components/chat'
import ResourcePanel from '@/app/components/resource-panel'
import BackExitGuard from '@/app/components/back-exit-guard'
import IncognitoNotice from '@/app/components/incognito-notice'
import Toast from '@/app/components/base/toast'
import useBreakpoints, { MediaType } from '@/hooks/use-breakpoints'
import useChatflow from '@/hooks/use-chatflow'
import AccountControls from '@/app/components/account/account-controls'
import PrivacyControls from '@/app/components/privacy/privacy-controls'
import { AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline'
import { GuardSummary } from '@/app/components/chat/debug-panel'
import { setLocaleOnClient } from '@/i18n/client'
import { APP_INFO } from '@/config'
import '@/app/styles/figma-chat.css'
import '@/app/styles/chat-redesign.css'

export interface IMainProps { params?: unknown }

const Main: FC<IMainProps> = () => {
  const { isLoaded, isSignedIn } = useUser()
  const guestPrompt = useGuestLoginPrompt(Boolean(isSignedIn))
  const media = useBreakpoints()
  const isMobile = media === MediaType.mobile
  const isDesktop = media === MediaType.pc
  const hasSetInputs = true
  const [isShowSidebar, { setTrue: showSidebar, setFalse: hideSidebar }] = useBoolean(false)
  const [isShowResourcePanel, { setTrue: showResourcePanel, setFalse: hideResourcePanel }] = useBoolean(false)
  const [isPanelCollapsed, { toggle: togglePanelCollapse }] = useBoolean(true)
  const [isSidebarCollapsed, { toggle: toggleSidebarCollapse, setTrue: collapseSidebar }] = useBoolean(false)
  const [speechInfoKey, setSpeechInfoKey] = useState(0)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [composerTarget, setComposerTarget] = useState<HTMLDivElement | null>(null)
  const { operation, prepareConversation, conversationList, conversationId: currConversationId, chatList, busy, isResponding, failure, send: handleSend, selectConversation, remove: handleDeleteConversation, clearAll: handleClearAll, recover, retry, stop, review, reviewError, debugEnabled, setDebugEnabled } = useChatflow({ authReady: isLoaded, signedIn: Boolean(isSignedIn), onCompleted: guestPrompt.completed })
  const conversationName = conversationList.find(item => item.id === currConversationId)?.name || '和小安聊聊'
  const crisisPrompt = useCrisisPrompt(currConversationId, operation)
  const chatListDomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLElement>(null)
  const followLatest = useRef(true)
  const [hasNewReply, setHasNewReply] = useState(false)
  const [autoRead, setAutoRead] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const [fullAnnouncement, setFullAnnouncement] = useState('')
  const notified = useRef('')
  const settingsRef = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    const closeSettings = (event: PointerEvent) => {
      const settings = settingsRef.current
      if (settings && !settings.contains(event.target as Node)) { settings.open = false }
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.isComposing && !document.querySelector('dialog[open]') && settingsRef.current?.open) {
        event.preventDefault()
        event.stopPropagation()
        settingsRef.current.open = false
        settingsRef.current.querySelector('summary')?.focus()
      }
    }
    document.addEventListener('pointerdown', closeSettings, true)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('pointerdown', closeSettings, true)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  useEffect(() => {
    document.title = APP_INFO.title
    setLocaleOnClient(APP_INFO.default_language, true)
  }, [])

  useEffect(() => {
    const element = scrollRef.current
    if (!element || !chatList.some(item => !item.isOpeningStatement)) { return }
    if (followLatest.current) { element.scrollTop = element.scrollHeight }
    else if (isResponding || operation?.kind === 'completed') { setHasNewReply(true) }
  }, [chatList, isResponding, operation])

  useEffect(() => {
    if (!operation) { setFullAnnouncement(''); return }
    const key = `${operation.id}:${operation.kind}`
    if (notified.current === key) { return }
    notified.current = key
    if (operation.kind === 'sending') {
      setFullAnnouncement('')
      setAnnouncement('消息已发送，小安正在回复。')
    }
    if (operation.kind === 'completed') {
      setAnnouncement('小安已回复。可选择“阅读最新回答”。')
      setFullAnnouncement(autoRead ? operation.content || '' : '')
    }
    if (operation.kind === 'stopped') { setAnnouncement('已停止回复，已生成的内容仍可阅读。') }
    // Failures already have a persistent alert; do not announce them twice.
    if (operation.kind === 'failed') { setAnnouncement(''); setFullAnnouncement('') }
  }, [operation, autoRead])

  const readLatest = () => {
    const answers = document.querySelectorAll<HTMLElement>('#chat-content article[id^="answer-"]')
    const last = document.getElementById('interrupted-answer') || answers[answers.length - 1]
    if (last) { last.focus({ preventScroll: true }); last.scrollIntoView({ block: 'start' }) }
    followLatest.current = true
    setHasNewReply(false)
  }

  useEffect(() => { setPrivacyOpen(false) }, [isSignedIn])

  const openPrivacy = async () => {
    if (busy || !isLoaded || failure?.needsRecovery) { return }
    if (!await prepareConversation()) { return }
    setPrivacyOpen(true)
  }

  const handleConversationIdChange = async (id: string) => {
    if (busy) { return }
    setPrivacyOpen(false)
    const selected = await selectConversation(id)
    if (!selected) { return }
    hideSidebar()
    followLatest.current = true
    setHasNewReply(false)
    setFullAnnouncement('')
    setAnnouncement(id === '-1' ? '已建立新对话。' : `已切换到${conversationList.find(item => item.id === id)?.name || '历史对话'}。`)
    requestAnimationFrame(() => {
      document.getElementById(id === '-1' ? 'chat-input' : 'conversation-title')?.focus()
    })
  }
  const checkCanSend = () => !busy && !failure?.needsRecovery
  const accumulatedAIText = useMemo(() => chatList.filter(item => item.isAnswer).map(item => item.content).join(' '), [chatList])

  const handleExport = async () => {
    if (busy || !chatList.length) { return }
    try {
      const XLSX = await import('xlsx')
      const rows = chatList.map((item, index) => ({ 序号: index + 1, 角色: item.isAnswer ? '小安' : '用户', 内容: item.content }))
      const sheet = XLSX.utils.json_to_sheet(rows)
      sheet['!cols'] = [{ wch: 6 }, { wch: 8 }, { wch: 70 }]
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, sheet, '聊天记录')
      XLSX.writeFile(workbook, `小安聊天记录_${new Date().toISOString().slice(0, 10)}.xlsx`)
    }
    catch { Toast.notify({ type: 'error', message: '导出失败，请重试' }) }
  }

  const renderSidebar = () => {
    return (
      <Sidebar
        accountControls={<AccountControls onOpenPrivacy={() => void openPrivacy()} />}
        list={conversationList}
        onCurrentIdChange={handleConversationIdChange}
        currentId={currConversationId}
        copyRight={APP_INFO.copyright || APP_INFO.title}
        onDeleteConversation={async id => {
          await handleDeleteConversation(id)
          requestAnimationFrame(() => {
            const target = document.querySelector<HTMLElement>('.history-select') || document.getElementById('history-new-chat')
            target?.focus()
          })
        }}
        onClearAll={handleClearAll}
        isCollapsed={isMobile ? false : isSidebarCollapsed}
        onToggleCollapse={isMobile ? hideSidebar : toggleSidebarCollapse}
      />
    )
  }

  return (
    <div className='figma-chat-shell'>
      <div className="chat-skip-links"><a href="#chat-content">跳到对话内容</a><a href="#chat-input">跳到输入框</a></div>
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only"><span key={`${operation?.id}:${operation?.kind}:${announcement}`}>{announcement}</span></div>
      <div aria-live="polite" aria-atomic="true" className="sr-only">{fullAnnouncement}</div>
      <BackExitGuard />
      {crisisPrompt.visible && <CrisisDialog onContinue={crisisPrompt.dismiss} onExit={() => { crisisPrompt.dismiss(); window.location.assign('/safety-pack') }} />}
      <Header
        title={APP_INFO.title}
        isMobile={isMobile}
        onShowSideBar={isMobile ? showSidebar : toggleSidebarCollapse}
        onCreateNewChat={() => handleConversationIdChange('-1')}
        onShowResourcePanel={isDesktop ? togglePanelCollapse : showResourcePanel}
        hasSetInputs={hasSetInputs}
        accountControls={<AccountControls onOpenPrivacy={() => void openPrivacy()} />}
        settings={<details ref={settingsRef} className="chat-settings">
          <summary aria-label="对话设置"><AdjustmentsHorizontalIcon /></summary>
          <div className="chat-settings-menu">
            <IncognitoNotice />
            <button type="button" onClick={event => { event.currentTarget.closest('details')?.removeAttribute('open'); setSpeechInfoKey(key => key + 1) }}>语音使用与保存说明</button>
            <label className="auto-read-option"><input type="checkbox" checked={autoRead} onChange={event => { setAutoRead(event.target.checked); setFullAnnouncement('') }} />回复完成后自动通知全文</label>
            <p className="chat-speech-status">通过你的读屏软件播报，仅本分页面有效；刷新后关闭。</p>
            <button type="button" disabled={busy || !chatList.some(item => !item.isOpeningStatement)} onClick={() => void handleExport()}>导出聊天记录 (.xlsx)</button>
            <button type="button" aria-pressed={debugEnabled} onClick={() => setDebugEnabled(!debugEnabled)}>调试信息：{debugEnabled ? '开启' : '关闭'}</button>
          </div>
        </details>}
      />
      {guestPrompt.visible && isLoaded && <GuestLoginPrompt onContinue={guestPrompt.dismiss} />}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* sidebar */}
        {!isMobile && renderSidebar()}
        {isMobile && isShowSidebar && (
          <Modal title="历史对话" onClose={hideSidebar} className="history-modal">
            {renderSidebar()}
          </Modal>
        )}
        {/* main + resource panel */}
        <div className='flex min-w-0 flex-1 overflow-hidden'>
          <div className="chat-center-column">
          <main ref={scrollRef} className='chat-scroll-area flex min-w-0 flex-1 flex-col overflow-y-auto'
            onScroll={event => {
              const element = event.currentTarget
              followLatest.current = element.scrollHeight - element.scrollTop - element.clientHeight <= 80
              if (followLatest.current) { setHasNewReply(false) }
            }}
            onFocusCapture={event => {
              if ((event.target as HTMLElement).closest('#chat-content article')) { followLatest.current = false }
            }}
            onPointerDown={event => {
              const target = event.target as Element
              if (!isMobile && event.currentTarget.contains(target) && !target.closest('button, a, input, textarea, select, summary, [contenteditable="true"]')) { collapseSidebar() }
            }}
            style={{ scrollPaddingBottom: 24 }}>

            <h1 id="conversation-title" tabIndex={-1} className="sr-only">{conversationName}</h1>
            <div className='chat-content-container relative grow w-full max-w-[900px] px-4 pt-8 mx-auto mb-3.5' style={{ paddingBottom: 24 }} ref={chatListDomRef}>
              <Chat
                speechInfoKey={speechInfoKey}
                composerTarget={composerTarget}
                onShowResources={isDesktop ? togglePanelCollapse : showResourcePanel}
                speechResetKey={`${currConversationId}:${isSignedIn ? 'account' : 'guest'}`}
                chatList={chatList}
                debugEnabled={debugEnabled}
                onSend={handleSend}
                onReview={review}
                isResponding={isResponding}
                onStop={stop}
                disabled={busy || Boolean(failure?.needsRecovery)}
                checkCanSend={checkCanSend}
                privacyControls={<PrivacyControls
                  key={isSignedIn ? 'account' : 'guest'}
                  open={privacyOpen}
                  onOpenChange={setPrivacyOpen}
                  conversationId={currConversationId}
                  signedIn={Boolean(isSignedIn)}
                  authReady={isLoaded}
                  busy={busy || Boolean(failure?.needsRecovery)}
                  completedId={chatList.filter(item => item.isAnswer).at(-1)?.id}
                  refreshConversation={async () => { await selectConversation(currConversationId) }}
                />}
              />
              {(operation?.kind === 'stopped' || operation?.kind === 'failed') && operation.content && (
                <article id="interrupted-answer" tabIndex={-1} aria-label="小安未完成的回答" className="chat-answer-bubble p-4">
                  <h2>小安未完成的回答</h2><StreamdownMarkdown content={operation.content} />
                  <p>此回答未完成，仅供核对。</p>
                </article>
              )}
              {(chatList.some(item => item.isAnswer) || operation?.content) && <button type="button" className="read-latest" onClick={readLatest}>{hasNewReply ? '有新回复，阅读最新回答' : '阅读最新回答'}</button>}

              {failure && (
                <div role='alert' className='my-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-gray-800'>
                  <p>{failure.message}</p>
                  {debugEnabled && failure.guard && <p className="mt-2"><GuardSummary guard={failure.guard} /></p>}
                  {failure.query && <p className='mt-2 whitespace-pre-wrap'>未完成的消息：{failure.query}</p>}
                  <button type='button' disabled={busy} onClick={() => void recover()} className='mr-4 mt-2 underline'>刷新会话记录</button>
                  {failure.query && !failure.needsRecovery && <button type='button' disabled={busy} onClick={retry} className='mt-2 underline'>重试这条消息</button>}
                </div>
              )}
              {reviewError && <p role='alert' className='my-3 text-sm text-amber-800'>{reviewError}</p>}
            </div>
          </main>
          <div className="chat-composer-slot" ref={setComposerTarget} />
          </div>
          {/* Desktop resource panel */}
          {isDesktop && hasSetInputs && !isPanelCollapsed && (
            <ResourcePanel
              accumulatedAIText={accumulatedAIText}
              isCollapsed={isPanelCollapsed}
              onToggleCollapse={() => {
                togglePanelCollapse()
                requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-label="打开支持资源"]')?.focus())
              }}
            />
          )}
        </div>
      </div>
      {/* Mobile resource panel overlay */}
      {!isDesktop && isShowResourcePanel && (
        <Modal title="支持资源" onClose={hideResourcePanel}>
          <ResourcePanel accumulatedAIText={accumulatedAIText} />
        </Modal>
      )}
    </div>
  )
}

export default React.memo(Main)
