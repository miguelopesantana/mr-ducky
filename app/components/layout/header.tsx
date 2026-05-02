function SearchIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12.8645 11.3208H12.0515L11.7633 11.0429C12.7719 9.86964 13.3791 8.34648 13.3791 6.68954C13.3791 2.99485 10.3842 0 6.68954 0C2.99485 0 0 2.99485 0 6.68954C0 10.3842 2.99485 13.3791 6.68954 13.3791C8.34648 13.3791 9.86964 12.7719 11.0429 11.7633L11.3208 12.0515V12.8645L16.4666 18L18 16.4666L12.8645 11.3208ZM6.68954 11.3208C4.12693 11.3208 2.05832 9.25214 2.05832 6.68954C2.05832 4.12693 4.12693 2.05832 6.68954 2.05832C9.25214 2.05832 11.3208 4.12693 11.3208 6.68954C11.3208 9.25214 9.25214 11.3208 6.68954 11.3208Z"
        fill="#FFFBE6"
      />
    </svg>
  )
}

function BellUnreadIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 22C11.45 22 10.9792 21.8042 10.5875 21.4125C10.1958 21.0208 10 20.55 10 20H14C14 20.55 13.8042 21.0208 13.4125 21.4125C13.0208 21.8042 12.55 22 12 22ZM4 19V17H6V10C6 8.61667 6.41667 7.3875 7.25 6.3125C8.08333 5.2375 9.16667 4.53333 10.5 4.2V3.5C10.5 3.08333 10.6458 2.72917 10.9375 2.4375C11.2292 2.14583 11.5833 2 12 2C12.4167 2 12.7708 2.14583 13.0625 2.4375C13.3542 2.72917 13.5 3.08333 13.5 3.5V3.825C13.3167 4.19167 13.1833 4.56667 13.1 4.95C13.0167 5.33333 12.9833 5.725 13 6.125C12.8333 6.09167 12.6708 6.0625 12.5125 6.0375C12.3542 6.0125 12.1833 6 12 6C10.9 6 9.95833 6.39167 9.175 7.175C8.39167 7.95833 8 8.9 8 10V17H16V10.575C16.3 10.7083 16.6208 10.8125 16.9625 10.8875C17.3042 10.9625 17.65 11 18 11V17H20V19H4Z"
        fill="#FFFBE6"
      />
      <path
        d="M18 9C17.1667 9 16.4583 8.70833 15.875 8.125C15.2917 7.54167 15 6.83333 15 6C15 5.16667 15.2917 4.45833 15.875 3.875C16.4583 3.29167 17.1667 3 18 3C18.8333 3 19.5417 3.29167 20.125 3.875C20.7083 4.45833 21 5.16667 21 6C21 6.83333 20.7083 7.54167 20.125 8.125C19.5417 8.70833 18.8333 9 18 9Z"
        fill="#FF2929"
      />
    </svg>
  )
}

export function Header() {
  return (
    <header
      className="flex items-center justify-between h-[60px] px-4 border-b shrink-0"
      style={{ background: 'var(--color-card)', borderColor: 'var(--color-card-border)' }}
    >
      {/* ── Left: brand ── */}
      <div className="flex items-center gap-2 min-w-0 align-middle">
        <div
          className="size-8 rounded-[12px] flex items-center justify-center shrink-0"
          style={{ background: 'var(--color-brand)' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/duck.svg" alt="" width={20} height={20} className="size-5" />
        </div>
        <span
          className="text-[18px] leading-7 tracking-[-0.44px] truncate"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            color: 'var(--color-ink)',
          }}
        >
          Mr Ducky
        </span>
      </div>

      {/* ── Right: actions ── */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          aria-label="Search"
          className="size-8 rounded-lg flex items-center justify-center hover:bg-white/5 active:bg-white/10 transition-colors"
        >
          <SearchIcon />
        </button>
        <button
          aria-label="Notifications"
          className="size-8 rounded-lg flex items-center justify-center hover:bg-white/5 active:bg-white/10 transition-colors"
        >
          <BellUnreadIcon />
        </button>
      </div>
    </header>
  )
}
