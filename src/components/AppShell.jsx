import { useEffect, useState } from 'react'
import Icon from './Icon'

// Unified application shell:
// - Desktop: fixed left sidebar with grouped navigation.
// - Mobile: compact top bar + bottom tab bar. Items that do not fit in
//   the bottom bar are reachable through a "More" sheet.
//
// The shell only renders navigation. It never owns feature state, so
// existing tabs keep working exactly as before.

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="22" height="22">
        <path
          d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 5.65-7 10-7 10z"
          fill="currentColor"
        />
      </svg>
    </span>
  )
}

// Switch between Mother view and Family Circle view.
function ModeSwitch({ mode, onModeChange }) {
  return (
    <div className="mode-switch" role="group" aria-label="View as">
      <button
        type="button"
        className={mode === 'mother' ? 'active' : ''}
        aria-pressed={mode === 'mother'}
        onClick={() => onModeChange('mother')}
      >
        🤱 Mother
      </button>
      <button
        type="button"
        className={mode === 'family' ? 'active' : ''}
        aria-pressed={mode === 'family'}
        onClick={() => onModeChange('family')}
      >
        🛡️ Family
      </button>
    </div>
  )
}

export default function AppShell({
  navGroups,
  activeTab,
  onNavigate,
  className = '',
  mode,
  onModeChange,
  children,
}) {
  const [moreOpen, setMoreOpen] = useState(false)

  const allItems = navGroups.flatMap(group => group.items)
  const primaryItems = allItems.filter(item => item.primary).slice(0, 4)
  const hasOverflow = allItems.length > primaryItems.length
  const activeItem = allItems.find(item => item.id === activeTab)
  const activeIsOverflow =
    hasOverflow && !primaryItems.some(item => item.id === activeTab)

  useEffect(() => {
    if (!moreOpen) return undefined

    function handleKey(event) {
      if (event.key === 'Escape') setMoreOpen(false)
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [moreOpen])

  function navigate(id) {
    setMoreOpen(false)
    onNavigate(id)
  }

  return (
    <div className={`app shell ${className}`.trim()}>
      <aside className="sidebar no-print" aria-label="Main navigation">
        <div className="sidebar-brand">
          <BrandMark />
          <div>
            <strong>MotherLoop</strong>
            <span>Postpartum care companion</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navGroups.map(group => (
            <div className="nav-group" key={group.label}>
              <span className="nav-group-label">{group.label}</span>

              {group.items.map(item => (
                <button
                  type="button"
                  key={item.id}
                  className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                  aria-current={activeTab === item.id ? 'page' : undefined}
                  onClick={() => navigate(item.id)}
                >
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                  {item.badge ? (
                    <span className="nav-badge">{item.badge}</span>
                  ) : null}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {onModeChange && (
          <ModeSwitch mode={mode} onModeChange={onModeChange} />
        )}

        <div className="sidebar-footer">
          <span className="privacy-dot" aria-hidden="true" />
          Your data stays in this browser
        </div>
      </aside>

      <div className="shell-main">
        <header className="topbar no-print">
          <div className="topbar-brand">
            <BrandMark />
            <strong>MotherLoop</strong>
          </div>
          {onModeChange ? (
            <ModeSwitch mode={mode} onModeChange={onModeChange} />
          ) : (
            <span className="topbar-title">{activeItem?.label}</span>
          )}
        </header>

        {children}

        <footer className="footer no-print">
          Made with love for every mama 🌷
        </footer>
      </div>

      <nav className="bottom-nav no-print" aria-label="Main navigation">
        {primaryItems.map(item => (
          <button
            type="button"
            key={item.id}
            className={activeTab === item.id ? 'active' : ''}
            aria-current={activeTab === item.id ? 'page' : undefined}
            onClick={() => navigate(item.id)}
          >
            <Icon name={item.icon} size={22} />
            <span>{item.shortLabel || item.label}</span>
          </button>
        ))}

        {hasOverflow && (
          <button
            type="button"
            className={activeIsOverflow || moreOpen ? 'active' : ''}
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen(open => !open)}
          >
            <Icon name={moreOpen ? 'close' : 'menu'} size={22} />
            <span>More</span>
          </button>
        )}
      </nav>

      {moreOpen && (
        <div
          className="more-sheet-backdrop no-print"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="more-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="All sections"
            onClick={event => event.stopPropagation()}
          >
            {navGroups.map(group => (
              <div className="nav-group" key={group.label}>
                <span className="nav-group-label">{group.label}</span>
                {group.items.map(item => (
                  <button
                    type="button"
                    key={item.id}
                    className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                    onClick={() => navigate(item.id)}
                  >
                    <Icon name={item.icon} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
