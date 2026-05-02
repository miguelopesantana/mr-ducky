'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, MessageSquare, Sparkles } from 'lucide-react'

import { ChatBubble, type ChatMessage } from './message'
import { useChat } from '@/lib/chat-client'

interface ChatThreadProps {
  initialMessages?: ChatMessage[]
  placeholder?: string
}

const SUGGESTIONS = [
  'How much did I spend on food this month?',
  "What's my biggest expense category?",
  'Show me my spending trend',
  'Can you give me some advice on tax optimization?',
]

const INTRO_TEXT =
  "Hi! I'm your AI financial assistant. I can help you understand your spending, set budgets, and find ways to save money. What would you like to know?"

export function ChatThread({
  initialMessages = [],
  placeholder = 'Search...',
}: ChatThreadProps) {
  const { messages, loading, error, send } = useChat({ initialMessages })
  const [draft, setDraft] = useState('')
  const [introTime, setIntroTime] = useState<string | undefined>()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIntroTime(new Date().toISOString())
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, loading])

  const submit = (text?: string) => {
    const value = (text ?? draft).trim()
    if (!value || loading) return
    void send(value)
    setDraft('')
  }

  const isEmpty = messages.length === 0
  const intro = useMemo<ChatMessage>(
    () => ({ id: 'intro', role: 'assistant', text: INTRO_TEXT, createdAt: introTime }),
    [introTime],
  )
  const displayed = isEmpty ? [intro] : messages

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-5">
        <div className="flex flex-col gap-4">
          {displayed.map((m, i) => (
            <ChatBubble key={m.id} role={m.role} text={m.text} createdAt={m.createdAt} showTime={i > 0} />
          ))}

          {loading && (
            <div
              className="flex items-center gap-2"
              style={{ color: 'var(--color-ink-faint)' }}
            >
              <Loader2 size={14} className="animate-spin" />
              <Sparkles size={14} style={{ color: 'var(--color-brand)' }} />
              <span className="text-sm">Mr Ducky is thinking…</span>
            </div>
          )}

          {error && !loading && (
            <div className="text-sm" style={{ color: 'var(--color-danger)' }}>
              {error}
            </div>
          )}
        </div>
      </div>

      {isEmpty && !loading && (
        <div className="flex flex-col gap-3 pb-4">
          <p className="text-[13px]" style={{ color: 'var(--color-ink-muted)' }}>
            Try asking:
          </p>
          <div className="flex flex-col items-start gap-2.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => submit(s)}
                className="flex items-center rounded-[10px] border-[1.5px] px-3 py-2 text-left text-[13px] font-medium leading-tight transition-colors hover:bg-white/5 active:bg-white/10"
                style={{
                  background: '#1A1A1A',
                  borderColor: 'var(--color-card-border)',
                  color: 'var(--color-ink)',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div
        className="shrink-0 pt-3 pb-4"
        style={{ borderTop: '1px solid var(--color-card-border)' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="flex flex-1 items-center gap-2.5 rounded-[10px] border-[1.5px] px-4 py-3"
            style={{ borderColor: 'var(--color-card-border)' }}
          >
            <MessageSquare
              size={18}
              strokeWidth={2.25}
              style={{ color: 'var(--color-ink)' }}
            />
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  submit()
                }
              }}
              disabled={loading}
              placeholder={placeholder}
              className="flex-1 bg-transparent text-base font-medium outline-none placeholder:opacity-100 disabled:opacity-50"
              style={{ color: 'var(--color-ink)' }}
            />
          </div>

          <button
            type="button"
            aria-label="Send"
            onClick={() => submit()}
            disabled={loading || !draft.trim()}
            className="flex size-12 shrink-0 items-center justify-center rounded-xl transition-opacity disabled:opacity-50"
            style={{ background: 'var(--color-brand)', color: '#0f0f0f' }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2.5 20L2.5 4L21.5 12L2.5 20ZM4.5 17L16.35 12L4.5 7V10.5L10.5 12L4.5 13.5L4.5 17ZM4.5 17L4.5 7V13.5L4.5 17Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
