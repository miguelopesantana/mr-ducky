export function Header() {
  return (
    <header className="flex items-center justify-between px-4 pt-5 pb-4 bg-background">
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{ background: 'var(--color-brand)' }}
        >
          🦆
        </div>
        <span className="text-2xl font-bold text-foreground">Mr Ducky</span>
      </div>

      <div className="flex items-center gap-4">
        <button aria-label="Toggle theme" className="text-muted-foreground">
          <span className="material-symbols-outlined" style={{ fontSize: 24 }}>
            wb_sunny
          </span>
        </button>
        <button aria-label="Notifications" className="relative text-muted-foreground">
          <span className="material-symbols-outlined" style={{ fontSize: 24 }}>
            notifications
          </span>
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-destructive rounded-full border-2 border-background" />
        </button>
      </div>
    </header>
  )
}
