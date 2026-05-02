import { Header } from '@/components/layout/header'
import { BottomNav } from '@/components/layout/bottom-nav'
import { PageTransition } from '@/components/layout/page-transition'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="h-dvh flex flex-col overflow-hidden"
      style={{ background: 'var(--color-page)', color: 'var(--color-ink)' }}
    >
      <Header />
      <main className="flex-1 min-h-0 flex flex-col mt-2 pb-6">
        <PageTransition>{children}</PageTransition>
      </main>
      <BottomNav />
    </div>
  )
}
