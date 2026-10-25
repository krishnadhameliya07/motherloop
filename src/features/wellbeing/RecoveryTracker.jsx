import { useState } from 'react'
import { createCareId } from '../../careStorage'
import NurseVision from './NurseVision'
import {
  SYMPTOMS,
  APPETITE_LEVELS,
  assessRecovery,
} from '../../wellbeingStorage'

function formatDay(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number)

  return new Date(year, month - 1, day, 12).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function sleepLabel(hours) {
  return hours >= 12 ? '12+ hours' : `${hours} ${hours === 1 ? 'hour' : 'hours'}`
}

export default function RecoveryTracker({ logs, todayKey, onSave, onDelete }) {
  const todaysLog = logs.find(log => log.date === todayKey) || null

  const [symptoms, setSymptoms] = useState(() => todaysLog?.symptoms || [])
  const [sleepHours, setSleepHours] = useState(
    () => todaysLog?.sleepHours ?? 4
  )
  const [appetite, setAppetite] = useState(
    () => todaysLog?.appetite || 'Normal'
  )
  const [status, setStatus] = useState('')

  const assessment = assessRecovery({ symptoms, sleepHours, appetite })
  const recent = logs.slice(0, 7)

  function toggleSymptom(id) {
    setStatus('')
    setSymptoms(previous =>
      previous.includes(id)
        ? previous.filter(item => item !== id)
        : [...previous, id]
    )
  }

  function handleSubmit(event) {
    event.preventDefault()

    const log = {
      id: todaysLog?.id || createCareId('recovery'),
      date: todayKey,
      symptoms: SYMPTOMS.map(item => item.id).filter(id =>
        symptoms.includes(id)
      ),
      sleepHours,
      appetite,
      updatedAt: new Date().toISOString(),
    }

    if (!onSave(log)) {
      setStatus('MotherLoop could not save this log in this browser. Please try again.')
      return
    }

    setStatus(
      todaysLog
        ? "Today's recovery log was updated."
        : "Today's recovery log was saved. 💗"
    )
  }

  function handleDelete(log) {
    if (!window.confirm(`Delete the recovery log for ${formatDay(log.date)}?`)) {
      return
    }

    onDelete(log.id)

    if (log.date === todayKey) {
      setSymptoms([])
      setSleepHours(4)
      setAppetite('Normal')
    }

    setStatus('Recovery log deleted.')
  }

  return (
    <section className="checkin-page recovery-page">
      <span className="eyebrow">YOUR BODY IS HEALING</span>
      <h2>Recovery Tracker 🌿</h2>
      <p className="page-description">
        Log how your body feels today. Keeping track makes it easier to notice
        changes and to describe them to your doctor.
      </p>

      <NurseVision />

      {assessment.hasRedFlag && (
        <div
          className={`recovery-alert ${assessment.isUrgent ? 'alert-urgent' : 'alert-red'}`}
          role="alert"
        >
          <strong>
            {assessment.isUrgent
              ? 'Please get medical help now'
              : 'Please contact your doctor today'}
          </strong>
          <p>
            {assessment.isUrgent
              ? 'Fever, heavy bleeding and pain together can be a sign of a serious problem after birth. Contact your doctor or maternity unit immediately, or call your local emergency number.'
              : 'Fever or heavy bleeding after birth can be a warning sign. Contact your doctor or maternity unit promptly. If bleeding is very heavy, or you feel faint or very unwell, call your local emergency number.'}
          </p>
        </div>
      )}

      {assessment.hasSilentSOS && (
        <div className="recovery-alert alert-amber" role="note">
          <strong>You are running on very little sleep while in pain</strong>
          <p>
            That is a lot for your body to carry. It&apos;s okay to ask someone
            to take over with the baby so you can rest, and to tell your doctor
            if the pain isn&apos;t easing.
          </p>
        </div>
      )}

      {todaysLog && (
        <p className="checkin-today-note">
          ✓ You logged your recovery today. Changes below will update
          today&apos;s log.
        </p>
      )}

      <form className="form-panel checkin-form" onSubmit={handleSubmit}>
        <fieldset className="mood-fieldset">
          <legend>Are you noticing any of these today?</legend>
          <div className="symptom-options">
            {SYMPTOMS.map(item => {
              const selected = symptoms.includes(item.id)

              return (
                <button
                  type="button"
                  key={item.id}
                  className={`symptom-option ${selected ? 'selected' : ''}`}
                  aria-pressed={selected}
                  onClick={() => toggleSymptom(item.id)}
                >
                  <span aria-hidden="true">{item.emoji}</span>
                  {item.label}
                  <span className="symptom-check" aria-hidden="true">
                    {selected ? '✓' : ''}
                  </span>
                </button>
              )
            })}
          </div>
          <p className="field-hint">
            Leave all unselected if you have none of these.
          </p>
        </fieldset>

        <label className="field-label">
          <span className="stress-label-row">
            Sleep in the last 24 hours 😴
            <strong>{sleepLabel(sleepHours)}</strong>
          </span>
          <input
            type="range"
            min="0"
            max="12"
            step="1"
            value={sleepHours}
            onChange={event => {
              setSleepHours(Number(event.target.value))
              setStatus('')
            }}
            className="stress-slider"
          />
          <span className="range-ends">
            <span>0 h</span>
            <span>12+ h</span>
          </span>
        </label>

        <fieldset className="mood-fieldset">
          <legend>Appetite today 🍽️</legend>
          <div className="appetite-options">
            {APPETITE_LEVELS.map(level => (
              <button
                type="button"
                key={level}
                className={`mood-option ${appetite === level ? 'selected' : ''}`}
                aria-pressed={appetite === level}
                onClick={() => {
                  setAppetite(level)
                  setStatus('')
                }}
              >
                {level}
              </button>
            ))}
          </div>
        </fieldset>

        {assessment.lowAppetite && (
          <p className="field-hint">
            Your body needs fuel to heal. Small, easy snacks and plenty of water
            can help. Mention a poor appetite to your doctor if it continues.
          </p>
        )}

        <div className="form-actions">
          <button className="primary-button" type="submit">
            {todaysLog ? "Update today's log" : "Save today's log"}
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
          <h3>Last 7 logs</h3>
          <span>{logs.length} saved</span>
        </div>

        {recent.length === 0 ? (
          <div className="empty-state">
            <span>🌿</span>
            <h4>No recovery logs yet</h4>
            <p>Your daily logs will appear here so you can spot patterns.</p>
          </div>
        ) : (
          <div className="checkin-list">
            {recent.map(log => {
              const flags = assessRecovery(log)
              const logSymptoms = SYMPTOMS.filter(item =>
                log.symptoms.includes(item.id)
              )

              return (
                <article className="checkin-item recovery-item" key={log.id}>
                  <div className="checkin-item-body">
                    <div className="checkin-item-top">
                      <strong>{formatDay(log.date)}</strong>
                      {log.date === todayKey && <span>Today</span>}
                      {flags.hasRedFlag && (
                        <span className="status-pill status-warning">
                          Warning sign logged
                        </span>
                      )}
                    </div>

                    <div className="sleep-bar-row">
                      <span>Sleep</span>
                      <span
                        className="sleep-bar"
                        aria-label={sleepLabel(log.sleepHours)}
                      >
                        <span
                          style={{ width: `${(log.sleepHours / 12) * 100}%` }}
                          className={flags.isExhausted ? 'low' : ''}
                        />
                      </span>
                      <span>{sleepLabel(log.sleepHours)}</span>
                    </div>

                    <span className="checkin-item-stress">
                      Appetite: {log.appetite} ·{' '}
                      {logSymptoms.length
                        ? logSymptoms.map(item => item.label).join(', ')
                        : 'No symptoms logged'}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="text-button danger-text"
                    onClick={() => handleDelete(log)}
                    aria-label={`Delete recovery log for ${formatDay(log.date)}`}
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
        Recovery logs are stored only in this browser on this device. MotherLoop
        does not diagnose conditions. If you are worried about any symptom,
        contact your healthcare professional.
      </p>
    </section>
  )
}
