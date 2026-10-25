import { useState } from 'react'
import {
  SYMPTOMS,
  assessRecovery,
  localDateKey,
  moodFor,
} from '../../wellbeingStorage'
import {
  EPDS_QUESTIONS,
  SELF_HARM_ITEM_INDEX,
  interpretEpds,
} from '../wellbeing/epds'

const PERIODS = [7, 14, 30]

// Neutral wording for a clinician (common EPDS cut-offs).
const EPDS_RANGE_TEXT = {
  low: 'below 10',
  medium: '10–12, possible depression range',
  high: '13 or more, probable depression range',
}

const STRESS_LABELS = {
  1: 'Calm',
  2: 'A little tense',
  3: 'Somewhat stressed',
  4: 'Very stressed',
  5: 'Overwhelmed',
}

// Date helpers that work on local YYYY-MM-DD keys (no time zones).
function keyToDate(key) {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}

function dateToKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function shiftKey(key, days) {
  const date = keyToDate(key)
  date.setDate(date.getDate() + days)
  return dateToKey(date)
}

function formatKey(key, withYear = false) {
  return keyToDate(key).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
  })
}

function formatTime(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value || '')
  if (!match) return ''

  const hour = Number(match[1])
  return `${hour % 12 || 12}:${match[2]} ${hour >= 12 ? 'PM' : 'AM'}`
}

function average(values) {
  if (!values.length) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export default function VisitSummary({
  todayKey,
  checkIns,
  recoveryLogs,
  screenings,
  careItems,
  calendarEvents,
}) {
  const [days, setDays] = useState(14)
  const [includeNotes, setIncludeNotes] = useState(false)

  const fromKey = shiftKey(todayKey, -(days - 1))
  const inRange = key => key >= fromKey && key <= todayKey

  // Recovery (oldest first reads naturally in a report)
  const logs = recoveryLogs
    .filter(log => inRange(log.date))
    .sort((a, b) => a.date.localeCompare(b.date))
  const warningLogs = logs.filter(log => assessRecovery(log).hasRedFlag)
  const avgSleep = average(logs.map(log => log.sleepHours))
  const symptomCounts = SYMPTOMS.map(symptom => ({
    ...symptom,
    count: logs.filter(log => log.symptoms.includes(symptom.id)).length,
  })).filter(symptom => symptom.count > 0)

  // Mood
  const moods = checkIns
    .filter(entry => inRange(localDateKey(entry.timestamp)))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  const avgMood = average(moods.map(entry => entry.mood))
  const avgStress = average(moods.map(entry => entry.stress))
  const lowMoodDays = new Set(
    moods
      .filter(entry => entry.mood <= 1)
      .map(entry => localDateKey(entry.timestamp))
  ).size

  // EPDS
  const epds = screenings
    .filter(entry => inRange(localDateKey(entry.timestamp)))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))

  // Care card + calendar
  const openQuestions = careItems.filter(
    item => item.category === 'question' && item.status !== 'resolved'
  )
  const upcoming = calendarEvents
    .filter(event => event.date >= todayKey && !event.completed)
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        (a.time || '').localeCompare(b.time || '')
    )
    .slice(0, 5)

  const hasAnyData =
    logs.length || moods.length || epds.length || openQuestions.length

  return (
    <section className="summary-page">
      <div className="summary-toolbar no-print">
        <div>
          <span className="eyebrow">CLOSE THE LOOP</span>
          <h2>Doctor Visit Summary 🩺</h2>
          <p className="page-description">
            One page that brings together your recovery, mood, wellness checks
            and questions, ready to show or print for your next appointment.
          </p>
        </div>

        <div className="summary-controls">
          <div className="period-switch" role="group" aria-label="Period">
            {PERIODS.map(period => (
              <button
                type="button"
                key={period}
                className={days === period ? 'active' : ''}
                aria-pressed={days === period}
                onClick={() => setDays(period)}
              >
                Last {period} days
              </button>
            ))}
          </div>

          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={includeNotes}
              onChange={event => setIncludeNotes(event.target.checked)}
            />
            Include my private reflection notes
          </label>

          <button
            type="button"
            className="primary-button"
            onClick={() => window.print()}
          >
            Print / Save as PDF
          </button>
        </div>
      </div>

      <article className="summary-sheet">
        <header className="summary-header">
          <div>
            <h3>Postpartum visit summary</h3>
            <span>
              {formatKey(fromKey, true)} – {formatKey(todayKey, true)} ·{' '}
              {days} days
            </span>
          </div>
          <strong>MotherLoop</strong>
        </header>

        {!hasAnyData && (
          <p className="summary-empty">
            No check-ins, recovery logs, wellness checks or open questions in
            this period yet. Use MotherLoop for a few days and your summary will
            fill in here.
          </p>
        )}

        {warningLogs.length > 0 && (
          <section className="summary-section summary-warning">
            <h4>⚠️ Warning signs logged</h4>
            <ul>
              {warningLogs.map(log => {
                const flags = assessRecovery(log)
                return (
                  <li key={log.id}>
                    {formatKey(log.date)}:{' '}
                    {[
                      flags.hasFever && 'fever',
                      flags.hasBleeding && 'excess bleeding',
                    ]
                      .filter(Boolean)
                      .join(' and ')}
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        <section className="summary-section">
          <h4>Physical recovery</h4>
          {logs.length === 0 ? (
            <p className="summary-muted">No recovery logs in this period.</p>
          ) : (
            <>
              <div className="summary-stats">
                <div>
                  <strong>{logs.length}</strong>
                  <span>days logged</span>
                </div>
                <div>
                  <strong>{avgSleep.toFixed(1)} h</strong>
                  <span>average sleep / 24 h</span>
                </div>
                <div>
                  <strong>
                    {logs.filter(log => assessRecovery(log).lowAppetite).length}
                  </strong>
                  <span>days with low appetite</span>
                </div>
              </div>

              <p className="summary-line">
                <b>Symptoms reported:</b>{' '}
                {symptomCounts.length
                  ? symptomCounts
                      .map(
                        symptom =>
                          `${symptom.label} (${symptom.count} ${symptom.count === 1 ? 'day' : 'days'})`
                      )
                      .join(', ')
                  : 'none'}
              </p>

              <table className="summary-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Symptoms</th>
                    <th>Sleep</th>
                    <th>Appetite</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td>{formatKey(log.date)}</td>
                      <td>
                        {SYMPTOMS.filter(symptom =>
                          log.symptoms.includes(symptom.id)
                        )
                          .map(symptom => symptom.label)
                          .join(', ') || '—'}
                      </td>
                      <td>
                        {log.sleepHours >= 12 ? '12+' : log.sleepHours} h
                      </td>
                      <td>{log.appetite}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </section>

        <section className="summary-section">
          <h4>Mood and stress</h4>
          {moods.length === 0 ? (
            <p className="summary-muted">No daily check-ins in this period.</p>
          ) : (
            <>
              <div className="summary-stats">
                <div>
                  <strong>{moods.length}</strong>
                  <span>check-ins</span>
                </div>
                <div>
                  <strong>{moodFor(Math.round(avgMood))?.label}</strong>
                  <span>typical mood</span>
                </div>
                <div>
                  <strong>{avgStress.toFixed(1)} / 5</strong>
                  <span>
                    average stress ({STRESS_LABELS[Math.round(avgStress)]})
                  </span>
                </div>
                <div>
                  <strong>{lowMoodDays}</strong>
                  <span>days with low mood</span>
                </div>
              </div>

              <div
                className="mood-strip"
                aria-label="Mood for each check-in, oldest first"
              >
                {moods.map(entry => (
                  <span
                    key={entry.id}
                    title={`${new Date(entry.timestamp).toLocaleDateString('en-IN')}: ${moodFor(entry.mood)?.label}`}
                  >
                    {moodFor(entry.mood)?.emoji}
                  </span>
                ))}
              </div>

              {includeNotes &&
                moods.some(entry => entry.note) && (
                  <div className="summary-notes">
                    <b>My reflection notes:</b>
                    <ul>
                      {moods
                        .filter(entry => entry.note)
                        .map(entry => (
                          <li key={entry.id}>
                            <span>
                              {formatKey(localDateKey(entry.timestamp))}:
                            </span>{' '}
                            {entry.note}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
            </>
          )}
        </section>

        <section className="summary-section">
          <h4>Wellness check (EPDS)</h4>
          {epds.length === 0 ? (
            <p className="summary-muted">
              No Edinburgh Postnatal Depression Scale checks in this period.
            </p>
          ) : (
            <ul className="summary-list">
              {epds.map(entry => {
                const result = interpretEpds(
                  entry.total,
                  entry.answers[SELF_HARM_ITEM_INDEX]
                )
                const item10 = EPDS_QUESTIONS[SELF_HARM_ITEM_INDEX].options.find(
                  option =>
                    option.score === entry.answers[SELF_HARM_ITEM_INDEX]
                )

                return (
                  <li key={entry.id}>
                    <b>
                      {formatKey(localDateKey(entry.timestamp))}: score{' '}
                      {entry.total}/30
                    </b>{' '}
                    ({EPDS_RANGE_TEXT[result.level]}). Item 10 (thoughts of
                    self-harm):{' '}
                    <span className={result.selfHarmFlag ? 'summary-flag' : ''}>
                      &ldquo;{item10?.label}&rdquo;
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="summary-section">
          <h4>My questions for the doctor</h4>
          {openQuestions.length === 0 ? (
            <p className="summary-muted">
              No open questions. Add some in My Care Card.
            </p>
          ) : (
            <ol className="summary-list">
              {openQuestions.map(item => (
                <li key={item.id}>
                  <b>{item.title}</b>
                  {item.details && item.details !== item.title
                    ? ` · ${item.details}`
                    : ''}
                </li>
              ))}
            </ol>
          )}
        </section>

        {upcoming.length > 0 && (
          <section className="summary-section">
            <h4>Upcoming appointments</h4>
            <ul className="summary-list">
              {upcoming.map(event => (
                <li key={event.id}>
                  <b>{formatKey(event.date)}</b>
                  {event.time ? ` · ${formatTime(event.time)}` : ''} ·{' '}
                  {event.title}
                  {event.location ? ` (${event.location})` : ''}
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="summary-footer">
          Self-reported by the patient in MotherLoop. This is not a medical
          record or diagnosis. EPDS: Cox, J.L., Holden, J.M., and Sagovsky, R.
          (1987), British Journal of Psychiatry, 150, 782–786.
        </footer>
      </article>
    </section>
  )
}
