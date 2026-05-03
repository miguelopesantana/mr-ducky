'use client'

import { useCallback, useEffect, useState } from 'react'

import type { ChatMessage, MessageRole } from '@/components/chat/message'

const STORAGE_KEY = 'mrducky.chat.conversationId'

export interface PendingAction {
  id: string
  tool: string
  summary: string
  args: Record<string, unknown>
  expiresAt: string
}

export interface ProgressItem {
  id: string
  label: string
  status: 'running' | 'done' | 'error'
}

interface UseChatOptions {
  initialMessages?: ChatMessage[]
}

type StreamEvent =
  | { type: 'token'; text: string }
  | { type: 'toolStart'; name: string; args: Record<string, unknown> }
  | {
      type: 'toolEnd'
      name: string
      output: Record<string, unknown> | null
      error: string | null
      durationMs: number
    }
  | { type: 'pendingAction'; action: PendingAction }
  | { type: 'done'; message: string; conversationId: string }
  | { type: 'error'; message: string; conversationId: string }

const humanizeTool = (name: string): string => {
  const words = name.replace(/_/g, ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

let _id = 0
const nextId = () => `m_${++_id}`

const baseMessage = (role: MessageRole, text: string): ChatMessage => ({
  id: nextId(),
  role,
  text,
  createdAt: new Date().toISOString(),
})

export function useChat(options: UseChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>(options.initialMessages ?? [])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([])
  const [progress, setProgress] = useState<ProgressItem[]>([])

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

      const assistantId = nextId()
      setMessages((prev) => [
        ...prev,
        baseMessage('user', trimmed),
        { id: assistantId, role: 'assistant', text: '', createdAt: new Date().toISOString() },
      ])
      setProgress([])
      setLoading(true)

      const appendDelta = (delta: string) =>
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, text: m.text + delta } : m)),
        )

      const setAssistantText = (full: string) =>
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, text: full } : m)),
        )

      try {
        const res = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
          body: JSON.stringify({
            message: trimmed,
            conversationId: conversationId ?? undefined,
          }),
        })
        if (!res.ok || !res.body) {
          throw new Error(`Request failed (${res.status})`)
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        const sessionPending: PendingAction[] = []
        let buf = ''
        let finalConversationId: string | null = null
        let finalMessage: string | null = null
        let streamError: string | null = null
        let progressSeq = 0

        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          let sep = buf.indexOf('\n\n')
          while (sep !== -1) {
            const frame = buf.slice(0, sep)
            buf = buf.slice(sep + 2)
            sep = buf.indexOf('\n\n')

            const dataLine = frame
              .split('\n')
              .find((l) => l.startsWith('data:'))
            if (!dataLine) continue
            const json = dataLine.slice(5).trim()
            if (!json) continue
            let evt: StreamEvent
            try {
              evt = JSON.parse(json) as StreamEvent
            } catch {
              continue
            }

            if (evt.type === 'token') {
              appendDelta(evt.text)
            } else if (evt.type === 'toolStart') {
              const id = `${evt.name}-${++progressSeq}`
              setProgress((prev) => [
                ...prev,
                { id, label: humanizeTool(evt.name), status: 'running' },
              ])
            } else if (evt.type === 'toolEnd') {
              const label = humanizeTool(evt.name)
              const status: ProgressItem['status'] = evt.error ? 'error' : 'done'
              setProgress((prev) => {
                const idx = prev.findIndex(
                  (p) => p.status === 'running' && p.label === label,
                )
                if (idx === -1) return prev
                const next = prev.slice()
                next[idx] = { ...next[idx], status }
                return next
              })
            } else if (evt.type === 'pendingAction') {
              sessionPending.push(evt.action)
            } else if (evt.type === 'done') {
              finalConversationId = evt.conversationId
              finalMessage = evt.message
            } else if (evt.type === 'error') {
              finalConversationId = evt.conversationId
              streamError = evt.message
            }
          }
        }

        if (finalConversationId) {
          setConversationId(finalConversationId)
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(STORAGE_KEY, finalConversationId)
          }
        }

        if (streamError) {
          setAssistantText(streamError)
          setError(streamError)
        } else if (finalMessage !== null) {
          setAssistantText(finalMessage)
        }

        setPendingActions(sessionPending)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Something went wrong.'
        setError(msg)
        setAssistantText("I couldn't reach the backend just now. Try again in a moment.")
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
    setProgress([])
    setError(null)
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }, [options.initialMessages])

  return {
    messages,
    loading,
    error,
    conversationId,
    pendingActions,
    progress,
    send,
    reset,
  }
}
