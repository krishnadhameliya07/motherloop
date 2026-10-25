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
  recovery: (
    <>
      <path d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 5.65-7 10-7 10z" />
      <path d="M7.5 12h2.5l1.2-2 1.8 4 1.2-2h2.3" />
    </>
  ),
  wellness: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2.5" />
      <path d="M9 4.5V3h6v1.5" />
      <path d="M9 11l2 2 4-4" />
      <path d="M9 17h6" />
    </>
  ),
  calm: (
    <>
      <path d="M3 9h11a3 3 0 1 0-3-3" />
      <path d="M3 13h15a3 3 0 1 1-3 3" />
      <path d="M3 17h7" />
    </>
  ),
  community: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15.5 14.2A4.5 4.5 0 0 1 21 18.5" />
    </>
  ),
  alerts: (
    <>
      <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z" />
      <path d="M12 8v4" />
      <path d="M12 15.5h.01" />
    </>
  ),
  checklist: (
    <>
      <path d="M9 6h11" />
      <path d="M9 12h11" />
      <path d="M9 18h11" />
      <path d="M3.5 6l1.5 1.5L7.5 5" />
      <path d="M3.5 12l1.5 1.5L7.5 11" />
      <path d="M3.5 18l1.5 1.5L7.5 17" />
    </>
  ),
  learn: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
      <path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" />
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
