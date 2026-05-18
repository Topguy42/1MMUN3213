"use client"

import { FiCopy, FiCheck } from "react-icons/fi"
import { useState } from "react"
import ReactMarkdown from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism"
import styles from "./message.module.css"

export default function ChatMessage({ message, onCopy }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    onCopy()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const markdownComponents = {
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || "")
      if (inline) {
        return <code className={styles.inlineCode}>{children}</code>
      }
      return (
        <div className={styles.codeBlock}>
          <SyntaxHighlighter
            language={match ? match[1] : "text"}
            style={oneDark}
            {...props}
          >
            {String(children).replace(/\n$/, "")}
          </SyntaxHighlighter>
        </div>
      )
    },
    pre({ children }) {
      return <>{children}</>
    },
    p({ children }) {
      return <p className={styles.paragraph}>{children}</p>
    },
    ul({ children }) {
      return <ul className={styles.list}>{children}</ul>
    },
    ol({ children }) {
      return <ol className={styles.orderedList}>{children}</ol>
    },
    li({ children }) {
      return <li className={styles.listItem}>{children}</li>
    },
    h1({ children }) {
      return <h1 className={styles.h1}>{children}</h1>
    },
    h2({ children }) {
      return <h2 className={styles.h2}>{children}</h2>
    },
    h3({ children }) {
      return <h3 className={styles.h3}>{children}</h3>
    },
    blockquote({ children }) {
      return <blockquote className={styles.blockquote}>{children}</blockquote>
    },
  }

  return (
    <div className={`${styles.message} ${styles[message.role]}`}>
      <div className={styles.content}>
        <ReactMarkdown components={markdownComponents}>
          {message.content}
        </ReactMarkdown>
      </div>
      {message.role === "assistant" && (
        <button
          onClick={handleCopy}
          className={styles.copyBtn}
          title="Copy message"
        >
          {copied ? (
            <FiCheck size={16} className={styles.checkIcon} />
          ) : (
            <FiCopy size={16} />
          )}
        </button>
      )}
    </div>
  )
}
