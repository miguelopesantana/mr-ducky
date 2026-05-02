import { ChatThread } from '@/components/chat/thread'
import { PageHeader } from '@/components/layout/page-header'

export default function ChatPage() {
  return (
    <div className="mx-auto flex h-full w-full max-w-[430px] flex-col px-4 pt-6">
      <PageHeader title="Chat" subtitle="Ask me anything about your finances" />
      <ChatThread />
    </div>
  )
}
