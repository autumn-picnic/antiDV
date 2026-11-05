'use client'
import type { FC } from 'react'
import React from 'react'
import type { IChatItem } from '../type'
import s from '../style.module.css'

import StreamdownMarkdown from '@/app/components/base/streamdown-markdown'
import ImageGallery from '@/app/components/base/image-gallery'

type IQuestionProps = Pick<IChatItem, 'id' | 'content' | 'useCurrentUserAvatar'> & {
  number?: number
  imgSrcs?: string[]
  onDelete?: () => void
}

const Question: FC<IQuestionProps> = ({ id, number = 1, content, useCurrentUserAvatar, imgSrcs, onDelete }) => {
  const userName = ''
  return (
    <article className='flex items-start justify-end' key={id} aria-labelledby={`question-title-${id}`}>
      <h2 id={`question-title-${id}`} className='sr-only'>你，第 {number} 条消息</h2>
      <div className="min-w-0 max-w-[85%]">
        <div className={`${s.question} relative text-sm text-gray-900 group`}>
          {onDelete && (
            <button
              onClick={onDelete}
              className="absolute top-[-10px] left-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 z-10 p-1 rounded-lg bg-white shadow transition-opacity"
              aria-label={`删除你的第 ${number} 条消息`}
              title="删除此消息"
              style={{ color: '#B5A898' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4h6v2" />
              </svg>
            </button>
          )}
          <div
            className='chat-question-bubble'
          >
            {imgSrcs && imgSrcs.length > 0 && (
              <ImageGallery srcs={imgSrcs} />
            )}
            <StreamdownMarkdown content={content} />
          </div>
        </div>
      </div>
    </article>
  )
}

export default React.memo(Question)
