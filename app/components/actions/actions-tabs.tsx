import { T } from '@/lib/theme'

export type ActionTab = 'calls' | 'routines'

export function ActionsTabs({
  tab,
  onChange,
}: {
  tab: ActionTab
  onChange: (next: ActionTab) => void
}) {
  return (
    <div
      className="flex p-1 rounded-[8px]"
      style={{ background: T.card, border: `1px solid ${T.border}` }}
      role="tablist"
    >
      <TabButton
        active={tab === 'routines'}
        onClick={() => onChange('routines')}
        label="Routines"
      />
      <TabButton active={tab === 'calls'} onClick={() => onChange('calls')} label="Calls" />
    </div>
  )
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className="flex-1 py-2 rounded-[8px] text-[16px] transition-colors"
      style={{
        background: active ? T.brand : 'transparent',
        color: active ? '#1A1A1A' : T.ink,
        fontWeight: 500,
        fontFamily: T.display,
      }}
    >
      {label}
    </button>
  )
}
