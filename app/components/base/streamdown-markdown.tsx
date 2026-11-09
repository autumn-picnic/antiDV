'use client'
import { Streamdown } from 'streamdown'
import { AnswerParagraph } from './answer-paragraph'
import styles from './answer-reading.module.css'
import 'katex/dist/katex.min.css'

interface StreamdownMarkdownProps {
  content: string
  className?: string
  answer?: boolean
}

const answerComponents = { p: AnswerParagraph }

export function StreamdownMarkdown({ content, className = '', answer = false }: StreamdownMarkdownProps) {
  return (
    <div className={`streamdown-markdown ${answer ? styles.answer : ''} ${className}`}>
      <Streamdown components={answer ? answerComponents : undefined}>{content}</Streamdown>
    </div>
  )
}

export default StreamdownMarkdown
