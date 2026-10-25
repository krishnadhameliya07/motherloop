import { useState } from 'react'
import { createCareId } from '../../careStorage'
import { MOODS, moodFor, localDateKey } from '../../wellbeingStorage'
import { AFFIRMATIONS, randomAffirmationIndex } from './affirmations'

const STRESS_LABELS = {
  1: 'Calm',
  2: 'A little tense',
  3: 'Somewhat stressed',
  4: 'Very stressed',
  5: 'Overwhelmed',
}

function formatTimestamp(iso) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function DailyCheckIn({ checkIns, todayKey, onSave, onDelete }) {
  const [mood, setMood] = useState(null)
  const [stress, setStress] = useState(3)
  const [note, setNote] = useState('')
  const [status, setStatus] = useState('')
  const [affirmationIndex, setAffirmationIndex] = useState(
    randomAffirmationIndex
  )

  const todaysCheckIns = checkIns.filter(
    entry => localDateKey(entry.timestamp) === todayKey
  )
  const recent = checkIns.slice(0, 7)

  function handleSubmit(event) {
    event.preventDefault()

    if (mood === null) {
      setStatus('Choose how you are feeling before saving.')
      return
    }

    const saved = onSave({
      id: createCareId('checkin'),
      mood,
      stress,
      note: note.trim().slice(0, 2000),
      timestamp: new Date().toISOString(),
    })

    if (!saved) {
      setStatus(
        'MotherLoop could not save this check-in in this browser. Please try again.'
      )
      return
    }

    setMood(null)
    setStress(3)
    setNote('')
    setStatus('Check-in saved. Thank you for taking a moment for yourself. 💗')
  }

  function handleDelete(entry) {
    if (!window.confirm('Delete this check-in?')) return
    onDelete(entry.id)
    setStatus('Check-in deleted.')
  }

  return (
    <section className="checkin-page">
      <span className="eyebrow">YOUR DAILY CHECK-IN</span>
      <h2>How are you today? 🌤️</h2>
      <p className="page-description">
        A quiet minute just for you. Notice how you feel, and write down
        anything on your heart.
      </p>

      <div className="affirmation-card">
        <span className="affirmation-label">TODAY&apos;S AFFIRMATION</span>
        <p>&ldquo;{AFFIRMATIONS[affirmationIndex]}&rdquo;</p>
        <button
          type="button"
          className="text-button"
          onClick={() =>
            setAffirmationIndex(index => (index + 1) % AFFIRMATIONS.length)
          }
        >
          Show another ↻
        </button>
      </div>

      {todaysCheckIns.length > 0 && (
        <p className="checkin-today-note">
          ✓ You checked in today at {formatTime(todaysCheckIns[0].timestamp)}.
          You can add another check-in any time.
        </p>
      )}

      <form className="form-panel checkin-form" onSubmit={handleSubmit}>
        <fieldset className="mood-fieldset">
          <legend>How are you feeling right now?</legend>
          <div className="mood-options">
            {MOODS.map(option => (
              <button
                type="button"
                key={option.value}
                className={`mood-option ${mood === option.value ? 'selected' : ''}`}
                aria-pressed={mood === option.value}
                onClick={() => {
                  setMood(option.value)
                  setStatus('')
                }}
              >
                <span className="mood-emoji" aria-hidden="true">
                  {option.emoji}
                </span>
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </fieldset>

        {mood === 0 && (
          <div className="gentle-support-note" role="note">
            <strong>We&apos;re glad you told us.</strong>
            <p>
              Hard days are common after birth, and you don&apos;t have to
              carry them alone. If low feelings last more than two weeks, or
              you have thoughts of harming yourself or your baby, please
              contact your doctor or local emergency services right away.
            </p>
          </div>
        )}

        <label className="field-label">
          <span className="stress-label-row">
            Stress level
            <strong>
              {stress} · {STRESS_LABELS[stress]}
            </strong>
          </span>
          <input
            type="range"
            min="1"
            max="5"
            step="1"
            value={stress}
            onChange={event => setStress(Number(event.target.value))}
            className="stress-slider"
          />
          <span className="range-ends">
            <span>Calm</span>
            <span>Overwhelmed</span>
          </span>
        </label>

        <label className="field-label">
          Daily reflection (optional)
          <textarea
            rows={4}
            maxLength={2000}
            value={note}
            onChange={event => setNote(event.target.value)}
            placeholder="What's on your heart today?"
          />
        </label>

        <div className="form-actions">
          <button
            className="primary-button"
            type="submit"
            disabled={mood === null}
          >
            Save check-in
          </button>
        </div>

        {status && (
          <p className="status-message" role="status">
            {status}
          </p>
        )}
      </form>

      <section className="checkin-history">
        <div className="report-list-heading">
          <h3>Recent check-ins</h3>
          <span>{checkIns.length} saved</span>
        </div>

        {recent.length === 0 ? (
          <div className="empty-state">
            <span>🌱</span>
            <h4>Your first check-in starts here</h4>
            <p>Your recent moods and reflections will appear here.</p>
          </div>
        ) : (
          <div className="checkin-list">
            {recent.map(entry => {
              const entryMood = moodFor(entry.mood)

              return (
                <article className="checkin-item" key={entry.id}>
                  <span className="checkin-item-emoji" aria-hidden="true">
                    {entryMood?.emoji}
                  </span>
                  <div className="checkin-item-body">
                    <div className="checkin-item-top">
                      <strong>{entryMood?.label}</strong>
                      <span>{formatTimestamp(entry.timestamp)}</span>
                    </div>
                    <span className="checkin-item-stress">
                      Stress {entry.stress}/5 · {STRESS_LABELS[entry.stress]}
                    </span>
                    {entry.note && (
                      <p className="checkin-item-note">{entry.note}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="text-button danger-text"
                    onClick={() => handleDelete(entry)}
                    aria-label={`Delete check-in from ${formatTimestamp(entry.timestamp)}`}
                  >
                    Delete
                  </button>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <p className="storage-note">
        Check-ins are stored only in this browser on this device. This is a
        self-reflection tool, not a medical assessment.
      </p>
    </section>
  )
}
