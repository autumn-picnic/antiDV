'use client'
import { brandAssets } from '@/config/brand-assets'
import type { FC } from 'react'
import type { FeedbackFunc } from '../type'
import type { MessageRating } from '@/types/app'
import type { DebugChatItem } from '@/types/chatflow'
import { HandThumbDownIcon, HandThumbUpIcon } from '@heroicons/react/24/outline'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import ReviewModal from './review-modal'
import DebugPanel from '../debug-panel'
import Button from '@/app/components/base/button'
import StreamdownMarkdown from '@/app/components/base/streamdown-markdown'
import Tooltip from '@/app/components/base/tooltip'
import { randomString } from '@/utils/string'
import LoadingAnim from '../loading-anim'
import s from '../style.module.css'

function OperationBtn({ innerContent, onClick, className }: { innerContent: React.ReactNode, onClick?: () => void, className?: string }) {
  return (
    <div
      className={`relative box-border flex items-center justify-center h-7 w-7 p-0.5 rounded-lg bg-white cursor-pointer text-gray-500 hover:text-gray-800 ${className ?? ''}`}
      style={{ boxShadow: '0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -2px rgba(0, 0, 0, 0.05)' }}
      onClick={onClick && onClick}
    >
      {innerContent}
    </div>
  )
}

const RatingIcon: FC<{ isLike: boolean }> = ({ isLike }) => {
  return isLike ? <HandThumbUpIcon className="w-4 h-4" /> : <HandThumbDownIcon className="w-4 h-4" />
}

const IconWrapper: FC<{ children: React.ReactNode | string }> = ({ children }) => {
  return (
    <div className="rounded-lg h-6 w-6 flex items-center justify-center hover:bg-gray-100">
      {children}
    </div>
  )
}

interface IAnswerProps {
  item: DebugChatItem
  feedbackDisabled: boolean
  onFeedback?: FeedbackFunc
  isResponding?: boolean
  suggestionClick?: (suggestion: string) => void
  onDelete?: () => void
  onReview?: (messageId: string, review: { score: number, comment: string }) => Promise<void>
  debugEnabled?: boolean
}

// The component needs to maintain its own state to control whether to display input component
const Answer: FC<IAnswerProps> = ({
  item,
  feedbackDisabled = false,
  onFeedback,
  isResponding,
  suggestionClick = () => { },
  onDelete,
  onReview,
  debugEnabled,
}) => {
  const { id, content, feedback, suggestedQuestions = [] } = item
  const [showReviewModal, setShowReviewModal] = useState(false)

  const { t } = useTranslation()

  /**
   * Render feedback results (distinguish between users and administrators)
   * User reviews cannot be cancelled in Console
   * @param rating feedback result
   * @param isUserFeedback Whether it is user's feedback
   * @returns comp
   */
  const renderFeedbackRating = (rating: MessageRating | undefined) => {
    if (!rating) { return null }

    const isLike = rating === 'like'
    const ratingIconClassname = isLike ? 'text-primary-600 bg-primary-100 hover:bg-primary-200' : 'text-red-600 bg-red-100 hover:bg-red-200'
    // The tooltip is always displayed, but the content is different for different scenarios.
    return (
      <Tooltip
        selector={`user-feedback-${randomString(16)}`}
        content={isLike ? '取消赞同' : '取消反对'}
      >
        <div
          className="relative box-border flex items-center justify-center h-7 w-7 p-0.5 rounded-lg bg-white cursor-pointer text-gray-500 hover:text-gray-800"
          style={{ boxShadow: '0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -2px rgba(0, 0, 0, 0.05)' }}
          onClick={async () => {
            await onFeedback?.(id, { rating: null })
          }}
        >
          <div className={`${ratingIconClassname} rounded-lg h-6 w-6 flex items-center justify-center`}>
            <RatingIcon isLike={isLike} />
          </div>
        </div>
      </Tooltip>
    )
  }

  /**
   * Different scenarios have different operation items.
   * @returns comp
   */
  const renderItemOperation = () => {
    const userOperation = () => {
      return feedback?.rating
        ? null
        : (
          <div className="flex gap-1">
            <Tooltip selector={`user-feedback-${randomString(16)}`} content={t('common.operation.like') as string}>
              {OperationBtn({ innerContent: <IconWrapper><RatingIcon isLike={true} /></IconWrapper>, onClick: () => onFeedback?.(id, { rating: 'like' }) })}
            </Tooltip>
            <Tooltip selector={`user-feedback-${randomString(16)}`} content={t('common.operation.dislike') as string}>
              {OperationBtn({ innerContent: <IconWrapper><RatingIcon isLike={false} /></IconWrapper>, onClick: () => onFeedback?.(id, { rating: 'dislike' }) })}
            </Tooltip>
          </div>
        )
    }

    const reviewOperation = () => {
      if (isResponding || !onReview) { return null }
      return (
        <Tooltip selector={`review-${randomString(16)}`} content={item.userReview ? '修改评价' : '评价此回复'}>
          <button type="button" aria-label={item.userReview ? '修改评分与反馈' : '评分与反馈'} onClick={() => setShowReviewModal(true)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 shadow-sm hover:text-orange-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-800">
              <IconWrapper>
                <svg width="14" height="14" viewBox="0 0 24 24" fill={item.userReview ? '#FBBF24' : 'none'} stroke={item.userReview ? '#FBBF24' : 'currentColor'} strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
              </IconWrapper>
          </button>
        </Tooltip>
      )
    }

    return (
      <div className="flex gap-2">
        {onFeedback && userOperation()}
        {reviewOperation()}
      </div>
    )
  }

  return (
    <div key={id}>
      {showReviewModal && (
        <ReviewModal
          messageId={id}
          existingReview={item.userReview}
          onSubmit={async (msgId, review) => { if (!onReview) { throw new Error('评价不可用') }; await onReview(msgId, review) }}
          onClose={() => setShowReviewModal(false)}
        />
      )}
      <div className="flex items-start">
        <div className={`${s.answerIcon} w-10 h-10 shrink-0`} style={{ backgroundImage: `url(${brandAssets.avatar})`, backgroundSize: brandAssets.avatarSize, backgroundPosition: 'center' }} role="img" aria-label="小安">
          {isResponding
            && (
              <div className={s.typeingIcon}>
                <LoadingAnim type="avatar" />
              </div>
            )}
        </div>
        <div className={`${s.answerWrap} min-w-0 max-w-[calc(100%-3rem)]`}>
          <div className={`${s.answer} relative text-sm text-gray-900`}>
            <div className="chat-answer-bubble ml-3 px-5 py-4 overflow-x-auto">
              {isResponding && !content
                ? <div className="flex items-center justify-center w-6 h-5"><LoadingAnim type="text" /></div>
                : <StreamdownMarkdown content={content} />}
              {suggestedQuestions.length > 0 && (
                <div className="mt-3">
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {suggestedQuestions.map((suggestion, index) => (
                      <div key={index} className="flex items-center gap-1">
                        <Button className="text-sm" type="link" onClick={() => suggestionClick(suggestion)}>{suggestion}</Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {item.userReview && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 border-t border-gray-200 pt-2">
                  <span className="flex shrink-0">
                    {Array.from({ length: 5 }, (_, i) => (
                      <svg key={i} className={`w-3.5 h-3.5 ${i < item.userReview!.score ? 'text-yellow-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                      </svg>
                    ))}
                  </span>
                  {item.userReview.comment && (
                    <span className="truncate max-w-[200px]">{item.userReview.comment}</span>
                  )}
                </div>
              )}
            </div>
            {debugEnabled && !isResponding && <DebugPanel debug={item.debug} />}
            <div className="absolute top-[-14px] right-[-14px] flex flex-row justify-end gap-1">
              {!feedbackDisabled && !item.feedbackDisabled && renderItemOperation()}
              {/* User feedback must be displayed */}
              {!feedbackDisabled && renderFeedbackRating(feedback?.rating)}
              {onDelete && !isResponding && (
                <Tooltip selector={`delete-answer-${id}`} content="刪除此回覆">
                  {OperationBtn({
                    innerContent: (
                      <IconWrapper>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14H6L5 6" />
                          <path d="M10 11v6M14 11v6" />
                          <path d="M9 6V4h6v2" />
                        </svg>
                      </IconWrapper>
                    ),
                    onClick: onDelete,
                  })}
                </Tooltip>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
export default React.memo(Answer)
