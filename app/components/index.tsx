'use client'
import type { FC } from 'react'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import useGuestLoginPrompt from '@/hooks/use-guest-login-prompt'
import GuestLoginPrompt from '@/app/components/account/guest-login-prompt'
import { useBoolean } from 'ahooks'
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
  const [isSidebarCollapsed, { toggle: toggleSidebarCollapse }] = useBoolean(true)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [composerHeight, setComposerHeight] = useState(220)
  const { prepareConversation, conversationList, conversationId: currConversationId, chatList, busy, isResponding, failure, send: handleSend, selectConversation, remove: handleDeleteConversation, clearAll: handleClearAll, recover, retry, stop, review, reviewError, debugEnabled, setDebugEnabled } = useChatflow({ authReady: isLoaded, signedIn: Boolean(isSignedIn), onCompleted: guestPrompt.completed })
  const conversationName = conversationList.find(item => item.id === currConversationId)?.name || '和小安聊聊'
  const chatListDomRef = useRef<HTMLDivElement>(null)
  const settingsRef = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    const closeSettings = (event: PointerEvent) => {
      const settings = settingsRef.current
      if (settings && !settings.contains(event.target as Node)) { settings.open = false }
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && settingsRef.current?.open) {
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
    const frame = requestAnimationFrame(() => chatListDomRef.current?.scrollIntoView({ block: 'end' }))
    return () => cancelAnimationFrame(frame)
  }, [chatList, currConversationId])

  useEffect(() => { setPrivacyOpen(false) }, [isSignedIn])

  const openPrivacy = async () => {
    if (busy || !isLoaded || failure?.needsRecovery) { return }
    if (!await prepareConversation()) { return }
    setPrivacyOpen(true)
  }

  const handleConversationIdChange = (id: string) => {
    if (busy) { return }
    setPrivacyOpen(false)
    void selectConversation(id)
    hideSidebar()
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
        list={conversationList}
        onCurrentIdChange={handleConversationIdChange}
        currentId={currConversationId}
        copyRight={APP_INFO.copyright || APP_INFO.title}
        onDeleteConversation={handleDeleteConversation}
        onClearAll={handleClearAll}
        isCollapsed={isMobile ? false : isSidebarCollapsed}
        onToggleCollapse={isMobile ? hideSidebar : toggleSidebarCollapse}
      />
    )
  }

  // Compute input bar edges to fit between sidebar and resource panel
  const panelWidth = isDesktop && hasSetInputs ? (isPanelCollapsed ? 48 : 300) : 0
  const sidebarWidth = !isMobile ? (isSidebarCollapsed ? 48 : 244) : 0
  const inputLeft = sidebarWidth
  const inputRight = panelWidth

  return (
    <div className='figma-chat-shell'>
      <BackExitGuard />
      <Header
        title={APP_INFO.title}
        isMobile={isMobile}
        onShowSideBar={showSidebar}
        onCreateNewChat={() => handleConversationIdChange('-1')}
        onShowResourcePanel={isDesktop ? togglePanelCollapse : showResourcePanel}
        hasSetInputs={hasSetInputs}
        accountControls={<AccountControls onOpenPrivacy={() => void openPrivacy()} />}
        settings={<details ref={settingsRef} className="chat-settings">
          <summary aria-label="对话设置"><AdjustmentsHorizontalIcon /></summary>
          <div className="chat-settings-menu" onClick={() => { if (settingsRef.current) { settingsRef.current.open = false } }}>
            <IncognitoNotice />
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
          <div className='fixed inset-0 z-50' style={{ backgroundColor: 'rgba(35, 56, 118, 0.2)' }} onClick={hideSidebar} >
            <div className='inline-block' onClick={e => e.stopPropagation()}>
              {renderSidebar()}
            </div>
          </div>
        )}
        {/* main + resource panel */}
        <div className='flex min-w-0 flex-1 overflow-hidden'>
          <div className='flex min-w-0 flex-1 flex-col overflow-y-auto'>
            <h1 className="sr-only">{conversationName}</h1>
            <div className='relative grow w-full max-w-[900px] px-4 pt-8 mx-auto mb-3.5' style={{ paddingBottom: composerHeight + 24 }} ref={chatListDomRef}>
              <Chat
                chatList={chatList}
                debugEnabled={debugEnabled}
                onSend={handleSend}
                onReview={isSignedIn ? review : undefined}
                isResponding={isResponding}
                onStop={stop}
                disabled={busy || Boolean(failure?.needsRecovery)}
                checkCanSend={checkCanSend}
                inputLeft={inputLeft}
                inputRight={inputRight}
                onComposerResize={setComposerHeight}
                privacyControls={<PrivacyControls
                  key={isSignedIn ? 'account' : 'guest'}
                  open={privacyOpen}
                  onOpenChange={setPrivacyOpen}
                  conversationId={currConversationId}
                  signedIn={Boolean(isSignedIn)}
                  authReady={isLoaded}
                  busy={busy || Boolean(failure?.needsRecovery)}
                  completedId={chatList.filter(item => item.isAnswer).at(-1)?.id}
                  refreshConversation={() => selectConversation(currConversationId)}
                />}
              />
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
          </div>
          {/* Desktop resource panel */}
          {isDesktop && hasSetInputs && (
            <ResourcePanel
              accumulatedAIText={accumulatedAIText}
              isCollapsed={isPanelCollapsed}
              onToggleCollapse={togglePanelCollapse}
            />
          )}
        </div>
      </div>
      {/* Mobile resource panel overlay */}
      {!isDesktop && (
        <ResourcePanel
          accumulatedAIText={accumulatedAIText}
          isMobileOverlay
          isVisible={isShowResourcePanel}
          onClose={hideResourcePanel}
        />
      )}
    </div>
  )
}

export default React.memo(Main)
