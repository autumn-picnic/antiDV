import { Children, cloneElement, isValidElement } from 'react'
import type { ReactNode } from 'react'
import styles from './answer-reading.module.css'

const articleNumber = '[零〇一二三四五六七八九十百千万兩两\\d]+'
const article = `第${articleNumber}[条條](?:之${articleNumber})?`
const referenceBody = `(?:《[^《》（）()\\n]+》)?${article}(?:[、，,]${article})*`
const contextBreak = /《|建议|建議|清单|清單|列表|步骤|步驟/
const statuteTitle = /(?:法|法律|法典|条例|條例|规定|規定|办法|辦法|解释|解釋|规则|規則)$/

// Shorthand context stays inside uninterrupted text in one paragraph. This is
// a presentation heuristic, not validation of the source or article number.
export function annotateLegalReferences(children: ReactNode): ReactNode {
  let hasStatuteContext = false
  return Children.map(children, (child) => {
    if (typeof child === 'string') {
      const references = new RegExp(`（${referenceBody}）。?|\\(${referenceBody}\\)。?`, 'g')
      const parts: ReactNode[] = []
      let offset = 0
      for (const match of child.matchAll(references)) {
        const preceding = child.slice(offset, match.index)
        if (contextBreak.test(preceding)) { hasStatuteContext = false }
        parts.push(preceding)
        const title = match[0].match(/《([^《》]+)》/)
        if (title) { hasStatuteContext = statuteTitle.test(title[1]) }
        parts.push(hasStatuteContext
          ? <span key={match.index} className={styles.reference} role="note" aria-label="法条出处">{match[0]}</span>
          : match[0])
        offset = match.index + match[0].length
      }
      const remaining = child.slice(offset)
      if (contextBreak.test(remaining)) { hasStatuteContext = false }
      parts.push(remaining)
      return parts
    }
    hasStatuteContext = false
    if (!isValidElement<{ children?: ReactNode, node?: { tagName?: string } }>(child)) {
      return child
    }
    const tag = child.props.node?.tagName ?? String(child.type)
    if (['a', 'code', 'pre'].includes(tag)) {
      return child
    }
    return cloneElement(child, undefined, annotateLegalReferences(child.props.children))
  })
}

export function AnswerParagraph({ children }: { children?: ReactNode }) {
  return <p>{annotateLegalReferences(children)}</p>
}
