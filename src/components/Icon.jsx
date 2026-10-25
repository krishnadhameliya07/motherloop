// Small inline SVG icon set (no extra dependency).
// All icons use a 24x24 viewBox and inherit the current text colour.

const PATHS = {
  home: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
    </>
  ),
  reports: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
    </>
  ),
  careCard: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M12 15.5s-3.5-2-3.5-4.2A1.8 1.8 0 0 1 12 10.3a1.8 1.8 0 0 1 3.5 1c0 2.2-3.5 4.2-3.5 4.2z" />
    </>
  ),
  checkin: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.8 14.2a4 4 0 0 0 6.4 0" />
      <path d="M9.5 10h.01" />
      <path d="M14.5 10h.01" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </>
  ),
  close: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </>
  ),
}

export default function Icon({ name, size = 20, className = '' }) {
  const content = PATHS[name]

  if (!content) return null

  return (
    <svg
      className={`icon ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {content}
    </svg>
  )
}
