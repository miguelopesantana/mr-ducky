import { ChatThread } from '@/components/chat/thread'

export default function ChatPage() {
  return (
    <div className="mx-auto flex h-full w-full max-w-[430px] flex-col px-4 pt-4">
      <div className="flex flex-col gap-2">
        <h1
          className="text-[24px] leading-none"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 500,
            color: 'var(--color-ink)',
          }}
        >
          Chat
        </h1>
        <p
          className="text-[16px] tracking-[-0.3px]"
          style={{ color: '#a3a3a3' }}
        >
          Ask me anything about your finances
        </p>
      </div>

      <div
        className="mt-6 shrink-0"
        style={{ borderTop: '1px solid var(--color-card-border)' }}
      />

      <ChatThread />
    </div>
  )
}
