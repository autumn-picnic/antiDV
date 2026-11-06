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
import useBreakpoints, { MediaType } from '@/hooks/use-breakpoints'
import useChatflow from '@/hooks/use-chatflow'
import AccountControls from '@/app/components/account/account-controls'
import PrivacyControls from '@/app/components/privacy/privacy-controls'
import { isFeedbackAdminEmail } from '@/lib/auth/policy'
import { GuardSummary } from '@/app/components/chat/debug-panel'
import { setLocaleOnClient } from '@/i18n/client'
import { APP_INFO } from '@/config'
import '@/app/styles/figma-chat.css'
import '@/app/styles/chat-redesign.css'

export interface IMainProps { params?: unknown }

const Main: FC<IMainProps> = () => {
  const { user, isLoaded, isSignedIn } = useUser()
  const automaticDebug = Boolean(isSignedIn && isFeedbackAdminEmail(user?.primaryEmailAddress?.emailAddress, user?.primaryEmailAddress?.verification?.status === 'verified'))
  const guestPrompt = useGuestLoginPrompt(Boolean(isSignedIn))
  const media = useBreakpoints()
  const isMobile = media === MediaType.mobile
  const isDesktop = media === MediaType.pc
  const hasSetInputs = true
  const [isShowSidebar, { setFalse: hideSidebar }] = useBoolean(false)
  const [isShowResourcePanel, { setTrue: showResourcePanel, setFalse: hideResourcePanel }] = useBoolean(false)
  const [isPanelCollapsed, { toggle: togglePanelCollapse, setTrue: collapsePanel }] = useBoolean(true)
  const [isSidebarCollapsed, { toggle: toggleSidebarCollapse, setTrue: collapseSidebar }] = useBoolean(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [composerTarget, setComposerTarget] = useState<HTMLDivElement | null>(null)
  const { operation, prepareConversation, conversationList, conversationId: currConversationId, chatList, busy, isResponding, failure, send: handleSend, selectConversation, remove: handleDeleteConversation, clearAll: handleClearAll, recover, retry, stop, review, reviewError, debugEnabled } = useChatflow({ authReady: isLoaded, signedIn: Boolean(isSignedIn), debug: automaticDebug, onCompleted: guestPrompt.completed })
  const conversationName = conversationList.find(item => item.id === currConversationId)?.name || '和小安聊聊'
  const crisisPrompt = useCrisisPrompt(currConversationId, operation)
  const chatListDomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLElement>(null)
  const followLatest = useRef(true)
  const [announcement, setAnnouncement] = useState('')
  const [fullAnnouncement, setFullAnnouncement] = useState('')
  const notified = useRef('')

  useEffect(() => {
    const closeOutside = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) { return }
      document.querySelectorAll<HTMLDetailsElement>('.chat-toolbar[open], .chat-settings[open], .chat-account-menu[open]').forEach(menu => {
        if (!menu.contains(target)) { menu.open = false }
      })
      // Dialog actions belong to the active overlay; keep their owners mounted.
      if (target.closest('dialog[open]')) { return }
      if (!target.closest('#history-content, [aria-label="打开历史对话"]')) { collapseSidebar() }
      if (!target.closest('.resource-panel-slide, [data-resource-trigger], [aria-label="打开支持资源"]')) { collapsePanel() }
    }
    document.addEventListener('click', closeOutside)
    return () => {
      document.removeEventListener('click', closeOutside)
    }
  }, [collapsePanel, collapseSidebar])

  useEffect(() => {
    document.title = APP_INFO.title
    setLocaleOnClient(APP_INFO.default_language, true)
  }, [])

  useEffect(() => {
    const element = scrollRef.current
    if (!element || !chatList.some(item => !item.isOpeningStatement)) { return }
    if (followLatest.current) { element.scrollTop = element.scrollHeight }
  }, [chatList, isResponding, operation])

  useEffect(() => {
    if (!operation) { setFullAnnouncement(''); return }
    const key = `${operation.id}:${operation.kind}`
    if (notified.current === key && operation.kind !== 'failed') { return }
    notified.current = key
    if (operation.kind === 'sending') {
      setFullAnnouncement('')
      setAnnouncement('消息已发送，小安正在回复。')
    }
    if (operation.kind === 'completed') {
      setAnnouncement('小安已回复。')
      setFullAnnouncement('')
    }
    if (operation.kind === 'stopped') { setAnnouncement('已停止回复，已生成的内容仍可阅读。') }
    if (operation.kind === 'failed') {
      setAnnouncement(failure?.fallback ? '小安暂时无法完成回复，已显示固定支持信息和三个求助资源。' : '')
      setFullAnnouncement('')
    }
  }, [operation, failure?.fallback])

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
    setFullAnnouncement('')
    setAnnouncement(id === '-1' ? '已建立新对话。' : `已切换到${conversationList.find(item => item.id === id)?.name || '历史对话'}。`)
    requestAnimationFrame(() => {
      document.getElementById(id === '-1' ? 'chat-input' : 'conversation-title')?.focus()
    })
  }
  const checkCanSend = () => !busy && !failure?.needsRecovery
  const accumulatedAIText = useMemo(() => chatList.filter(item => item.isAnswer && !item.fallback).map(item => item.content).join(' '), [chatList])

  const renderSidebar = () => {
    return (
      <Sidebar
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
        accountControls={<AccountControls onOpenPrivacy={() => void openPrivacy()} />}

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
            }}
            onFocusCapture={event => {
              if ((event.target as HTMLElement).closest('#chat-content article')) { followLatest.current = false }
            }}
            style={{ scrollPaddingBottom: 24 }}>

            <h1 id="conversation-title" tabIndex={-1} className="sr-only">{conversationName}</h1>
            <div className='chat-content-container relative grow w-full max-w-[900px] px-4 pt-8 mx-auto mb-3.5' style={{ paddingBottom: 24 }} ref={chatListDomRef}>
              <Chat
                composerTarget={composerTarget}
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
                  completedId={chatList.filter(item => item.isAnswer && !item.fallback).at(-1)?.id}
                  refreshConversation={async () => { await selectConversation(currConversationId) }}
                />}
              />
              {(operation?.kind === 'stopped' || (operation?.kind === 'failed' && !failure?.fallback)) && operation.content && (
                <article id="interrupted-answer" tabIndex={-1} aria-label="小安未完成的回答" className="chat-answer-bubble p-4">
                  <h2>小安未完成的回答</h2><StreamdownMarkdown content={operation.content} />
                  <p>此回答未完成，仅供核对。</p>
                </article>
              )}

              {failure && (!failure.fallback || failure.needsRecovery) && (
                <div role='alert' className='my-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-gray-800'>
                  <p>{failure.fallback ? '请先刷新会话记录，确认这次回复是否已保存。' : failure.message}</p>
                  {debugEnabled && failure.guard && <p className="mt-2"><GuardSummary guard={failure.guard} /></p>}
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
          {hasSetInputs && (
            <ResourcePanel
              accumulatedAIText={accumulatedAIText}
              isCollapsed={!isDesktop || isPanelCollapsed}
              onToggleCollapse={() => {
                if (!isDesktop) { showResourcePanel(); return }
                togglePanelCollapse()
                requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-label="展开资源面板"]')?.focus())
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
