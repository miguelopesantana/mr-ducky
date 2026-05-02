import { Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export type MessageRole = 'user' | 'assistant'

export interface ChatMessage {
  id: string
  role: MessageRole
  text: string
  createdAt?: string
}

function formatTime(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function ChatBubble({
  role,
  text,
  createdAt,
}: {
  role: MessageRole
  text: string
  createdAt?: string
}) {
  const isUser = role === 'user'
  const time = formatTime(createdAt)

  if (isUser) {
    return (
      <div
        className="ml-auto max-w-[85%] rounded-2xl px-4 py-3"
        style={{ background: '#FFFBE6', color: '#0f0f0f' }}
      >
        <p className="whitespace-pre-wrap text-base leading-6">{text}</p>
        {time && (
          <p className="mt-1.5 text-xs" style={{ color: 'rgba(15,15,15,0.6)' }}>
            {time}
          </p>
        )}
      </div>
    )
  }

  return (
    <div
      className="rounded-2xl px-4 py-3"
      style={{ background: 'var(--color-card)' }}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <Sparkles size={16} style={{ color: 'var(--color-brand)' }} fill="currentColor" />
        <span
          className="text-sm"
          style={{ color: 'var(--color-ink)', fontWeight: 600 }}
        >
          Mr Ducky
        </span>
      </div>
      <div
        className="text-base leading-6 [&_a]:underline [&_code]:rounded [&_code]:bg-black/5 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.9em] [&_em]:italic [&_li]:my-0.5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_strong]:font-semibold [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
        style={{ color: 'var(--color-ink)' }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
      </div>
      {time && (
        <p className="mt-2 text-xs" style={{ color: 'var(--color-ink-faint)' }}>
          {time}
        </p>
      )}
    </div>
  )
}
