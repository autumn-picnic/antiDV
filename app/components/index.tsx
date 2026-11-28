'use client'
import type { FC } from 'react'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import useGuestLoginPrompt from '@/hooks/use-guest-login-prompt'
import GuestLoginPrompt from '@/app/components/account/guest-login-prompt'
import AnalysisConsentCompletion from '@/app/components/account/analysis-consent-completion'
import StreamdownMarkdown from '@/app/components/base/streamdown-markdown'
import Sidebar from '@/app/components/sidebar'
import Header from '@/app/components/header'
import ChatDrawer from '@/app/components/chat/drawer'
import Chat from '@/app/components/chat'
import ResourcePanel from '@/app/components/resource-panel'
import BackExitGuard from '@/app/components/back-exit-guard'
import useChatflow from '@/hooks/use-chatflow'
import MemoryManager from '@/app/components/memory/memory-manager'
import AccountControls from '@/app/components/account/account-controls'
import PrivacyControls from '@/app/components/privacy/privacy-controls'
import { isFeedbackAdminEmail } from '@/lib/auth/policy'
import DebugPanel, { GuardSummary } from '@/app/components/chat/debug-panel'
import { setLocaleOnClient } from '@/i18n/client'
import { APP_INFO } from '@/config'
import '@/app/styles/figma-chat.css'
import '@/app/styles/chat-redesign.css'
import '@/app/styles/chat-approved-layout.css'

export interface IMainProps { params?: unknown }

const Main: FC<IMainProps> = () => {
  const { user, isLoaded, isSignedIn } = useUser()
  const automaticDebug = Boolean(isSignedIn && isFeedbackAdminEmail(user?.primaryEmailAddress?.emailAddress, user?.primaryEmailAddress?.verification?.status === 'verified'))
  const guestPrompt = useGuestLoginPrompt(Boolean(isSignedIn))
  const [drawer, setDrawer] = useState<'history' | 'resources' | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [memoryOpen, setMemoryOpen] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [composerTarget, setComposerTarget] = useState<HTMLDivElement | null>(null)
  const { operation, prepareConversation, conversationList, conversationId: currConversationId, chatList, busy, isResponding, failure, send: handleSend, selectConversation, remove: handleDeleteConversation, clearAll: handleClearAll, recover, retry, stop, review, reviewError, debugEnabled } = useChatflow({ authReady: isLoaded, signedIn: Boolean(isSignedIn), debug: automaticDebug, onCompleted: guestPrompt.completed, historyOpen: drawer === 'history', authKey: user?.id })
  const conversationName = conversationList.find(item => item.id === currConversationId)?.name || '和小安聊聊'
  const chatListDomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLElement>(null)
  const followLatest = useRef(true)
  const [announcement, setAnnouncement] = useState('')
  const [fullAnnouncement, setFullAnnouncement] = useState('')
  const notified = useRef('')

  useEffect(() => { if (contentRef.current) { contentRef.current.inert = drawer !== null } }, [drawer])
  useEffect(() => { setDrawer(null) }, [isSignedIn, user?.id])

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

  useEffect(() => { setPrivacyOpen(false); setMemoryOpen(false) }, [isSignedIn])

  const openPrivacy = async () => {
    if (busy || !isLoaded || failure?.needsRecovery) { return }
    if (!await prepareConversation()) { return }
    setDrawer(null)
    setPrivacyOpen(true)
  }

  const handleConversationIdChange = async (id: string) => {
    if (busy) { return }
    setPrivacyOpen(false)
    setMemoryOpen(false)
    const selected = await selectConversation(id)
    if (!selected) { return }
    setDrawer(null)
    followLatest.current = true
    setFullAnnouncement('')
    setAnnouncement(id === '-1' ? '已建立新对话。' : `已切换到${conversationList.find(item => item.id === id)?.name || '历史对话'}。`)
    requestAnimationFrame(() => {
      document.getElementById(id === '-1' ? 'chat-input' : 'conversation-title')?.focus()
    })
  }
  const checkCanSend = () => !busy && !failure?.needsRecovery
  const accumulatedAIText = useMemo(() => chatList.filter(item => item.isAnswer && !item.fallback).map(item => item.content).join(' '), [chatList])

  return (
    <div className='figma-chat-shell'>
      <div className="chat-skip-links"><a href="#chat-content">跳到对话内容</a><a href="#chat-input">跳到输入框</a></div>
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only"><span key={`${operation?.id}:${operation?.kind}:${announcement}`}>{announcement}</span></div>
      <div aria-live="polite" aria-atomic="true" className="sr-only">{fullAnnouncement}</div>
      {memoryOpen && isSignedIn && <MemoryManager key={currConversationId} conversationId={currConversationId} conversationName={conversationName} disabled={busy || isResponding || Boolean(failure?.needsRecovery)} onClose={() => setMemoryOpen(false)} onSend={text => { setMemoryOpen(false); void handleSend(text) }} />}
      <BackExitGuard />
      <Header
        title={APP_INFO.title}
        isSidebarOpen={drawer === 'history'}
        isResourceOpen={drawer === 'resources'}
        onShowSideBar={() => setDrawer(value => value === 'history' ? null : 'history')}
        onShowResourcePanel={() => setDrawer(value => value === 'resources' ? null : 'resources')}
        onCreateNewChat={() => void handleConversationIdChange('-1')}
        hasSetInputs
        accountControls={<AccountControls onMenuOpen={() => setDrawer(null)} onRegister={guestPrompt.open} onOpenPrivacy={() => { setMemoryOpen(false); void openPrivacy() }} onOpenMemory={() => { setPrivacyOpen(false); setMemoryOpen(true) }} />}

      />
      {isLoaded && isSignedIn && <AnalysisConsentCompletion key={user?.id} />}
      {guestPrompt.visible && isLoaded && <GuestLoginPrompt onContinue={guestPrompt.dismiss} conversationId={currConversationId} />}
      <div ref={contentRef} className="flex min-h-0 flex-1 overflow-hidden">
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
                onOpenPrivacy={() => void openPrivacy()}
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
                  {debugEnabled && !failure.fallback && failure.debug && <DebugPanel debug={failure.debug} />}
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
        </div>
      </div>
      {drawer === 'history' && <ChatDrawer id="chat-history-drawer" label="历史对话" side="left" onClose={() => setDrawer(null)}>
        <Sidebar list={conversationList} currentId={currConversationId} onCurrentIdChange={handleConversationIdChange}
          onDeleteConversation={handleDeleteConversation} onClearAll={handleClearAll} disabled={busy}
          copyRight={APP_INFO.copyright || APP_INFO.title} />
      </ChatDrawer>}
      {drawer === 'resources' && <ChatDrawer id="chat-resources-drawer" label="支持资源" side="right" onClose={() => setDrawer(null)}>
        <ResourcePanel accumulatedAIText={accumulatedAIText} />
      </ChatDrawer>}

    </div>
  )
}

export default React.memo(Main)
