'use client'

import { useCallback, useEffect, useState } from 'react'

import type { ChatMessage, MessageRole } from '@/components/chat/message'

const STORAGE_KEY = 'mrducky.chat.conversationId'

export interface ChatTrace {
  name: string
  input: Record<string, unknown>
  output?: Record<string, unknown> | null
  error?: string | null
  durationMs: number
}

export interface PendingAction {
  id: string
  tool: string
  summary: string
  args: Record<string, unknown>
  expiresAt: string
}

interface ChatApiResponse {
  message: string
  conversationId: string
  traces: ChatTrace[]
  pendingActions: PendingAction[]
}

let _id = 0
const nextId = () => `m_${++_id}`

const append = (role: MessageRole, text: string): ChatMessage => ({
  id: nextId(),
  role,
  text,
  createdAt: new Date().toISOString(),
})

interface UseChatOptions {
  initialMessages?: ChatMessage[]
}

export function useChat(options: UseChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>(options.initialMessages ?? [])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored) setConversationId(stored)
  }, [])

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || loading) return
      setError(null)
      setMessages((prev) => [...prev, append('user', trimmed)])
      setLoading(true)
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: trimmed,
            conversationId: conversationId ?? undefined,
          }),
        })
        if (!res.ok) {
          throw new Error(`Request failed (${res.status})`)
        }
        const data = (await res.json()) as ChatApiResponse
        setConversationId(data.conversationId)
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(STORAGE_KEY, data.conversationId)
        }
        setMessages((prev) => [...prev, append('assistant', data.message)])
        setPendingActions(data.pendingActions ?? [])
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Something went wrong.'
        setError(msg)
        setMessages((prev) => [
          ...prev,
          append('assistant', "I couldn't reach the backend just now. Try again in a moment."),
        ])
      } finally {
        setLoading(false)
      }
    },
    [conversationId, loading],
  )

  const reset = useCallback(() => {
    setMessages(options.initialMessages ?? [])
    setConversationId(null)
    setPendingActions([])
    setError(null)
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }, [options.initialMessages])

  return { messages, loading, error, conversationId, pendingActions, send, reset }
}
