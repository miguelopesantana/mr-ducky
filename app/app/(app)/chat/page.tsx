import { ChatThread } from '@/components/chat/thread'

export default function ChatPage() {
  return (
    <div className="mx-auto flex h-full w-full max-w-[430px] flex-col px-4 pt-2">
      <div className="flex flex-col gap-1 pb-5">
        <h1
          className="text-[2.25rem] leading-tight"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            color: 'var(--color-ink)',
          }}
        >
          Chat
        </h1>
        <p className="text-base" style={{ color: 'var(--color-ink-muted)' }}>
          Ask me anything about your finances
        </p>
      </div>

      <div
        className="shrink-0"
        style={{ borderTop: '1px solid var(--color-card-border)' }}
      />

      <ChatThread />
    </div>
  )
}
