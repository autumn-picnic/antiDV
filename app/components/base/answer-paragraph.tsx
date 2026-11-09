import { Children, cloneElement, isValidElement } from 'react'
import type { ReactNode } from 'react'
import styles from './answer-reading.module.css'

// Only complete, explicitly parenthesized legal references become notes.
// Leave partial streaming references and ordinary parentheses untouched.
export function annotateLegalReferences(children: ReactNode): ReactNode {
  return Children.map(children, (child) => {
    if (typeof child === 'string') {
      return child.split(/((?:（《[^（）()\n]+》[^（）()\n]*）|\(《[^（）()\n]+》[^（）()\n]*\))。?)/g).map((text, index) =>
        /^(?:（|\()《/.test(text)
          ? <span key={index} className={styles.reference} role="note" aria-label="法条出处">{text}</span>
          : text,
      )
    }
    if (!isValidElement<{ children?: ReactNode }>(child) || ['a', 'code', 'pre'].includes(String(child.type))) {
      return child
    }
    return cloneElement(child, undefined, annotateLegalReferences(child.props.children))
  })
}

export function AnswerParagraph({ children }: { children?: ReactNode }) {
  return <p>{annotateLegalReferences(children)}</p>
}
