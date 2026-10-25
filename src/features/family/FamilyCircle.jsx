import { useEffect, useState } from 'react'
import { createCareId } from '../../careStorage'
import { isBreathingActive } from '../../wellbeingStorage'
import {
  loadEncouragements,
  saveEncouragements,
  loadChecklist,
  saveChecklist,
} from '../../familyStorage'
import { buildFamilyAlerts } from './familyAlerts'

const ENCOURAGEMENT_TEMPLATES = [
  {
    time: 'Morning',
    label: "Tell her she's doing great",
    text: "You are doing an incredible job. I'm so proud of you!",
  },
  {
    time: 'Afternoon',
    label: 'Offer 30 minutes of baby duty',
    text: 'Want some quiet time? I can take the baby for a while.',
  },
  {
    time: 'Evening',
    label: "Ask how she's really feeling",
    text: "I love you. How was your heart today? I'm here to listen.",
  },
]

const CHECKLIST_ITEMS = [
  { id: 'eat', label: 'Did she eat properly today? 🍎' },
  { id: 'rest', label: 'Did she get at least 1 hour of rest? 😴' },
  { id: 'baby', label: 'Did someone help with the baby? 👶' },
  { id: 'talk', label: 'Did you talk with her about how she feels? 💬' },
]

const AWARENESS_CARDS = [
  {
    icon: '💡',
    title: 'What is postpartum depression?',
    text: "Postpartum depression is more than the 'baby blues'. It is a common, serious and treatable condition that can bring deep sadness, anxiety and exhaustion that last for weeks.",
  },
  {
    icon: '🌊',
    title: 'Big changes in her body',
    text: 'After birth, hormone levels drop quickly. Together with lack of sleep and a huge life change, this is thought to contribute to strong mood swings.',
  },
  {
    icon: '⚠️',
    title: 'Signs she may be struggling',
    text: "Watch for withdrawing from family, losing interest in food, being unable to sleep even when the baby sleeps, intense irritability, or saying she can't cope.",
  },
  {
    icon: '🤝',
    title: 'How you can help',
    text: 'Offer practical help (meals, dishes, laundry), protect her sleep, make sure she eats, and listen without judging. Encourage her to talk to her doctor if you are worried.',
  },
]

// ---------------------------------------------
// Family: Smart Alerts + encouragement
// ---------------------------------------------

export function FamilyAlerts({
  checkIns,
  recoveryLogs,
  screenings,
  todayKey,
  onRefresh,
}) {
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [breathing, setBreathing] = useState(() => isBreathingActive())
  const [custom, setCustom] = useState('')
  const [status, setStatus] = useState('')

  // Refresh when mom updates data in another tab, and every 30 seconds.
  useEffect(() => {
    function refresh() {
      onRefresh()
      setBreathing(isBreathingActive())
      setNowMs(Date.now())
    }

    window.addEventListener('storage', refresh)
    const timer = window.setInterval(refresh, 30000)
    // Re-check right after opening, once the previous page has
    // finished closing (e.g. Calm Corner clearing its status).
    const firstCheck = window.setTimeout(refresh, 0)

    return () => {
      window.removeEventListener('storage', refresh)
      window.clearInterval(timer)
      window.clearTimeout(firstCheck)
    }
  }, [onRefresh])

  const { alerts, hasUpdatesToday } = buildFamilyAlerts({
    recoveryLogs,
    checkIns,
    screenings,
    todayKey,
    nowMs,
  })

  const [primary, ...others] = alerts

  function sendEncouragement(text) {
    const trimmed = text.trim().slice(0, 300)
    if (!trimmed) return

    const saved = saveEncouragements([
      ...loadEncouragements(),
      {
        id: createCareId('love'),
        text: trimmed,
        timestamp: new Date().toISOString(),
      },
    ])

    setStatus(
      saved
        ? "Sent! She'll see it at the top of her MotherLoop. 🌸"
        : 'Could not send. Please try again.'
    )

    if (saved) setCustom('')
  }

  return (
    <section className="checkin-page family-page">
      <span className="eyebrow">FAMILY CIRCLE</span>
      <h2>How is she doing? 🛡️</h2>
      <p className="page-description">
        Smart alerts from her own recovery logs, check-ins and wellness checks,
        with simple ways you can help.
      </p>

      {breathing && (
        <div className="family-breathing" role="status">
          🕊️ <strong>She is doing a breathing exercise right now.</strong>{' '}
          Please keep things calm and quiet.
        </div>
      )}

      {primary ? (
        <article className={`family-alert level-${primary.level}`}>
          <span className="family-alert-tag">{primary.tag}</span>
          <h3>{primary.title}</h3>
          <p>{primary.message}</p>
          <span className="family-actions-label">HOW YOU CAN HELP</span>
          <ul>
            {primary.actions.map(action => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </article>
      ) : (
        <article className="family-alert level-ok">
          <span className="family-alert-tag">
            {hasUpdatesToday ? 'STABLE' : 'NO UPDATES YET'}
          </span>
          <h3>
            {hasUpdatesToday ? 'Doing well today' : 'No updates from her today'}
          </h3>
          <p>
            {hasUpdatesToday
              ? "Nothing concerning in today's logs. She's doing an amazing job, and so are you."
              : "She hasn't logged a check-in or recovery update today. A kind message or a cup of tea is always a good idea."}
          </p>
        </article>
      )}

      {others.length > 0 && (
        <div className="family-others">
          <h3>Also noted today</h3>
          {others.map(alert => (
            <article
              className={`family-mini-alert level-${alert.level}`}
              key={alert.tag + alert.title}
            >
              <strong>{alert.title}</strong>
              <p>{alert.message}</p>
              <span>Try: {alert.actions[0]}</span>
            </article>
          ))}
        </div>
      )}

      <section className="form-panel family-encourage">
        <h3>Send her some love 💌</h3>
        <p className="field-hint">
          Messages appear at the top of her MotherLoop screen.
        </p>

        <div className="encourage-list">
          {ENCOURAGEMENT_TEMPLATES.map(item => (
            <div className="encourage-item" key={item.time}>
              <div>
                <span>{item.time}</span>
                <strong>{item.label}</strong>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={() => sendEncouragement(item.text)}
              >
                Send
              </button>
            </div>
          ))}
        </div>

        <div className="reply-composer">
          <input
            value={custom}
            maxLength={300}
            onChange={event => setCustom(event.target.value)}
            placeholder="Or write your own message…"
            aria-label="Your own message"
          />
          <button
            type="button"
            className="primary-button"
            disabled={!custom.trim()}
            onClick={() => sendEncouragement(custom)}
          >
            Send
          </button>
        </div>

        {status && (
          <p className="status-message" role="status">
            {status}
          </p>
        )}
      </section>

      <p className="storage-note">
        Alerts are rule-based and come from information she entered on this
        device. They are not a diagnosis. In an emergency, call your local
        emergency number.
      </p>
    </section>
  )
}

// ---------------------------------------------
// Family: daily care checklist
// ---------------------------------------------

export function FamilyChecklist({ todayKey }) {
  const [checked, setChecked] = useState(() => loadChecklist(todayKey))

  function toggle(id) {
    const next = checked.includes(id)
      ? checked.filter(item => item !== id)
      : [...checked, id]

    setChecked(next)
    saveChecklist(todayKey, next)
  }

  const done = CHECKLIST_ITEMS.filter(item => checked.includes(item.id)).length
  const percent = Math.round((done / CHECKLIST_ITEMS.length) * 100)

  return (
    <section className="checkin-page family-page">
      <span className="eyebrow">FAMILY CIRCLE</span>
      <h2>Daily Care Checklist ✅</h2>
      <p className="page-description">
        Small things that make a big difference. Resets every day.
      </p>

      <div className="form-panel">
        <div className="checklist-progress-row">
          <strong>{percent}% done today</strong>
          <span>
            {done} of {CHECKLIST_ITEMS.length}
          </span>
        </div>
        <div className="wellness-progress" aria-hidden="true">
          <span style={{ width: `${percent}%` }} />
        </div>

        <div className="checklist-items">
          {CHECKLIST_ITEMS.map(item => {
            const isChecked = checked.includes(item.id)

            return (
              <button
                type="button"
                key={item.id}
                className={`symptom-option ${isChecked ? 'selected' : ''}`}
                aria-pressed={isChecked}
                onClick={() => toggle(item.id)}
              >
                {item.label}
                <span className="symptom-check" aria-hidden="true">
                  {isChecked ? '✓' : ''}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------
// Family: awareness cards
// ---------------------------------------------

export function FamilyLearn() {
  return (
    <section className="checkin-page family-page">
      <span className="eyebrow">FAMILY CIRCLE</span>
      <h2>Understanding Postpartum 📖</h2>
      <p className="page-description">
        What she may be going through, and how to support her.
      </p>

      <div className="awareness-grid">
        {AWARENESS_CARDS.map(card => (
          <article className="awareness-card" key={card.title}>
            <span aria-hidden="true">{card.icon}</span>
            <h3>{card.title}</h3>
            <p>{card.text}</p>
          </article>
        ))}
      </div>

      <p className="storage-note">
        General information only, not medical advice. If you are worried about
        her, encourage her to contact her doctor.
      </p>
    </section>
  )
}

// ---------------------------------------------
// Mother: messages received from Family Circle
// ---------------------------------------------

export function EncouragementBanner() {
  const [messages, setMessages] = useState(() => loadEncouragements())

  useEffect(() => {
    function refresh() {
      setMessages(loadEncouragements())
    }

    window.addEventListener('storage', refresh)
    return () => window.removeEventListener('storage', refresh)
  }, [])

  if (!messages.length) return null

  const current = messages[0]

  function dismiss() {
    const next = loadEncouragements().filter(item => item.id !== current.id)
    saveEncouragements(next)
    setMessages(next)
  }

  return (
    <div className="encouragement-banner no-print" role="status">
      <div>
        <span>💗 LOVE FROM YOUR FAMILY CIRCLE</span>
        <p>&ldquo;{current.text}&rdquo;</p>
        {messages.length > 1 && (
          <small>
            +{messages.length - 1} more{' '}
            {messages.length - 1 === 1 ? 'message' : 'messages'}
          </small>
        )}
      </div>
      <button
        type="button"
        className="icon-button"
        onClick={dismiss}
        aria-label="Dismiss message"
      >
        ×
      </button>
    </div>
  )
}
