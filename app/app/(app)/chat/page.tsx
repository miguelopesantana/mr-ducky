import { ChatThread } from '@/components/chat/thread'
import { PageHeader } from '@/components/page-header'

export default function ChatPage() {
  return (
    <div className="mx-auto flex h-full w-full max-w-[430px] flex-col px-4 pt-2">
      <div className="pb-5">
        <PageHeader
          title="Chat"
          description="Ask me anything about your finances"
        />
      </div>

      <div
        className="mt-6 shrink-0"
        style={{ borderTop: '1px solid var(--color-card-border)' }}
      />

      <ChatThread />
    </div>
  )
}
