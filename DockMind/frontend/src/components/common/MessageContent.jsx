import React from 'react'

/**
 * MessageContent — renders AI chat message text as real React elements.
 *
 * The backend asks the model never to use markdown, but a small local model
 * won't always comply — this renders whatever it produces cleanly either
 * way: real line breaks, "- "/"1. " lines become an actual list, "**bold**"
 * and `code` become real emphasis, "#"/"##" become subheadings.
 */

const renderInline = (text, keyPrefix) => {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter((p) => p !== '')
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={`${keyPrefix}-${i}`} className="bg-bg px-1 py-0.5 rounded text-xs font-mono">
          {part.slice(1, -1)}
        </code>
      )
    }
    return <React.Fragment key={`${keyPrefix}-${i}`}>{part}</React.Fragment>
  })
}

const MessageContent = ({ text }) => {
  if (!text) return null

  const lines = text.split('\n')
  const blocks = []
  let listItems = []

  const flushList = (key) => {
    if (listItems.length) {
      blocks.push(
        <ul key={`list-${key}`} className="list-disc list-inside space-y-1 my-1.5">
          {listItems.map((item, i) => (
            <li key={i}>{renderInline(item, `li-${key}-${i}`)}</li>
          ))}
        </ul>
      )
      listItems = []
    }
  }

  lines.forEach((rawLine, i) => {
    const line = rawLine.trim()

    if (!line) {
      flushList(i)
      return
    }

    const heading = line.match(/^#{1,6}\s+(.*)/)
    if (heading) {
      flushList(i)
      blocks.push(
        <p key={`h-${i}`} className="font-semibold mt-2 first:mt-0">
          {renderInline(heading[1], `h-${i}`)}
        </p>
      )
      return
    }

    const bullet = line.match(/^[-*]\s+(.*)/)
    const numbered = line.match(/^\d+[.)]\s+(.*)/)
    if (bullet || numbered) {
      listItems.push((bullet || numbered)[1])
      return
    }

    flushList(i)
    blocks.push(
      <p key={`p-${i}`} className="mt-1.5 first:mt-0">
        {renderInline(line, `p-${i}`)}
      </p>
    )
  })
  flushList('end')

  return <div>{blocks}</div>
}

export default MessageContent
