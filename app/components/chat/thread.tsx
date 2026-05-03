'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Loader2, MessageSquare, Sparkles, X } from 'lucide-react'

import { ChatBubble, type ChatMessage } from './message'
import { useChat, type ProgressItem } from '@/lib/chat-client'
import { T } from '@/lib/theme'

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
  const { messages, loading, error, progress, send } = useChat({ initialMessages })
  const [draft, setDraft] = useState('')
  const [introTime, setIntroTime] = useState<string | undefined>()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIntroTime(new Date().toISOString())
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, loading, progress])

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
  const last = displayed[displayed.length - 1]
  const awaitingFirstToken =
    loading && last?.role === 'assistant' && last.text.length === 0

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-5">
        <div className="flex flex-col gap-4">
          {displayed.map((m, i) => {
            if (loading && m.role === 'assistant' && m.text.length === 0) return null
            return (
              <ChatBubble
                key={m.id}
                role={m.role}
                text={m.text}
                createdAt={m.createdAt}
                showTime={i > 0}
              />
            )
          })}

          {awaitingFirstToken && (
            <ProgressBlock items={progress} />
          )}

          {error && !loading && (
            <div className="text-sm" style={{ color: T.danger }}>
              {error}
            </div>
          )}
        </div>
      </div>

      {isEmpty && !loading && (
        <div className="flex flex-col gap-3 pb-4">
          <p className="text-[13px]" style={{ color: T.inkMuted }}>
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
                  background: T.card,
                  borderColor: T.border,
                  color: T.ink,
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
        style={{ borderTop: `1px solid ${T.border}` }}
      >
        <div className="flex items-center gap-2">
          <div
            className="flex flex-1 items-center gap-2.5 rounded-[10px] border-[1.5px] px-4 py-3"
            style={{ borderColor: T.border }}
          >
            <MessageSquare size={18} strokeWidth={2.25} style={{ color: T.ink }} />
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
              style={{ color: T.ink }}
            />
          </div>

          <button
            type="button"
            aria-label="Send"
            onClick={() => submit()}
            disabled={loading || !draft.trim()}
            className="flex size-12 shrink-0 items-center justify-center rounded-xl transition-opacity disabled:opacity-50"
            style={{ background: T.brand, color: T.inkOnBrand }}
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

const DUCKY_PHRASES = [
  'Mr Ducky is thinking',
  'Mr Ducky is paddling around',
  'Mr Ducky is fidgeting',
  'Mr Ducky is preening',
  'Mr Ducky is pondering',
  'Mr Ducky is checking the books',
  'Mr Ducky is tallying receipts',
  'Mr Ducky is rummaging through ledgers',
  'Mr Ducky is balancing the abacus',
  'Mr Ducky is dusting off receipts',
  'Mr Ducky is straightening his bowtie',
  'Mr Ducky is sharpening his pencil',
  'Mr Ducky is sniffing out savings',
  'Mr Ducky is consulting the butler manual',
  'Mr Ducky is counting quietly',
]

const pickPhrase = (current?: string): string => {
  if (DUCKY_PHRASES.length <= 1) return DUCKY_PHRASES[0]
  let next = current
  while (next === current) {
    next = DUCKY_PHRASES[Math.floor(Math.random() * DUCKY_PHRASES.length)]
  }
  return next as string
}

function ProgressBlock({ items }: { items: ProgressItem[] }) {
  const [phrase, setPhrase] = useState<string>(() => pickPhrase())

  useEffect(() => {
    const id = window.setInterval(() => {
      setPhrase((prev) => pickPhrase(prev))
    }, 3500)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="rounded-2xl px-4 py-3" style={{ background: T.card }}>
      <div className="mb-2 flex items-center gap-2">
        <Sparkles size={16} style={{ color: T.brand }} fill="currentColor" />
        <span className="text-sm italic" style={{ color: T.inkMuted }}>
          {phrase}…
        </span>
        <Loader2
          size={14}
          className="ml-auto animate-spin"
          style={{ color: T.inkMuted }}
        />
      </div>
      {items.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {items.map((p) => (
            <ProgressRow key={p.id} item={p} />
          ))}
          {items.every((p) => p.status !== 'running') && (
            <ProgressRow
              item={{ id: '_composing', label: 'Composing reply', status: 'running' }}
            />
          )}
        </ul>
      )}
    </div>
  )
}

function ProgressRow({ item }: { item: ProgressItem }) {
  const color =
    item.status === 'error'
      ? T.danger
      : item.status === 'done'
      ? T.inkMuted
      : T.ink
  const text =
    item.status === 'running'
      ? `${item.label}…`
      : item.status === 'error'
      ? `${item.label} — failed`
      : item.label
  return (
    <li className="flex items-center gap-2 text-sm" style={{ color }}>
      {item.status === 'running' && <Loader2 size={14} className="animate-spin" />}
      {item.status === 'done' && <Check size={14} style={{ color: T.brand }} />}
      {item.status === 'error' && <X size={14} style={{ color: T.danger }} />}
      <span className={item.status === 'running' ? 'italic' : undefined}>{text}</span>
    </li>
  )
}
