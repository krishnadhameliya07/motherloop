import { useState } from 'react'
import { createCareId } from '../../careStorage'
import {
  EPDS_QUESTIONS,
  EPDS_CITATION,
  SELF_HARM_ITEM_INDEX,
  interpretEpds,
} from './epds'

function formatTimestamp(iso) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// First-person wording for the note saved to My Care Card.
const CARE_CARD_SUMMARY = {
  low: 'The result did not suggest depression.',
  medium: 'The result suggested some signs of depression.',
  high: 'The result suggested I may be experiencing postnatal depression.',
}

function emptyAnswers() {
  return Array(EPDS_QUESTIONS.length).fill(null)
}

export default function WellnessCheck({
  screenings,
  onSave,
  onDelete,
  onAddCareQuestion,
}) {
  const [phase, setPhase] = useState('intro')
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState(emptyAnswers)
  const [result, setResult] = useState(null)
  const [addedToCareCard, setAddedToCareCard] = useState(false)
  const [status, setStatus] = useState('')

  const question = EPDS_QUESTIONS[step]

  function start() {
    setAnswers(emptyAnswers())
    setStep(0)
    setResult(null)
    setAddedToCareCard(false)
    setStatus('')
    setPhase('questions')
  }

  function chooseAnswer(score) {
    const next = [...answers]
    next[step] = score
    setAnswers(next)

    if (step < EPDS_QUESTIONS.length - 1) {
      setStep(step + 1)
      return
    }

    const entry = {
      id: createCareId('epds'),
      timestamp: new Date().toISOString(),
      answers: next,
      total: next.reduce((sum, value) => sum + value, 0),
    }

    const saved = onSave(entry)

    setStatus(
      saved
        ? ''
        : 'Your result could not be saved in this browser, but you can still read it below.'
    )
    setResult(entry)
    setPhase('result')
  }

  function addToCareCard() {
    if (!result || addedToCareCard) return

    const interpretation = interpretEpds(
      result.total,
      result.answers[SELF_HARM_ITEM_INDEX]
    )

    const added = onAddCareQuestion({
      title: 'Discuss my wellness check result',
      details: `On ${formatTimestamp(result.timestamp)} I completed the Edinburgh Postnatal Depression Scale (EPDS) in MotherLoop. My score was ${result.total} out of 30. ${CARE_CARD_SUMMARY[interpretation.level]}${
        interpretation.selfHarmFlag
          ? ' I answered that the thought of harming myself has occurred to me.'
          : ''
      } I would like to talk about how I have been feeling.`,
      source: 'MotherLoop wellness check (EPDS)',
    })

    if (added) {
      setAddedToCareCard(true)
      setStatus('Added to My Care Card as a question for your care team.')
    } else {
      setStatus('Could not add this to My Care Card. Please try again.')
    }
  }

  function handleDelete(entry) {
    if (!window.confirm('Delete this wellness check result?')) return
    onDelete(entry.id)
  }

  const interpretation = result
    ? interpretEpds(result.total, result.answers[SELF_HARM_ITEM_INDEX])
    : null

  return (
    <section className="checkin-page wellness-page">
      <span className="eyebrow">YOUR EMOTIONAL WELLBEING</span>
      <h2>Wellness Check 🌸</h2>
      <p className="page-description">
        Ten short questions about how you have felt over the past 7 days.
        It takes about two minutes.
      </p>

      {phase === 'intro' && (
        <div className="form-panel wellness-intro">
          <h3>Before you start</h3>
          <ul>
            <li>
              This is the Edinburgh Postnatal Depression Scale (EPDS), a
              questionnaire widely used by health professionals after birth.
            </li>
            <li>
              Choose the answer that comes closest to how you have felt in the
              <strong> past 7 days</strong>, not just today.
            </li>
            <li>
              It is a screening tool, <strong>not a diagnosis</strong>. Only a
              health professional can diagnose postnatal depression.
            </li>
            <li>Your answers are stored only in this browser.</li>
          </ul>
          <button type="button" className="primary-button" onClick={start}>
            Start the wellness check
          </button>
        </div>
      )}

      {phase === 'questions' && (
        <div className="form-panel wellness-question">
          <div className="wellness-progress-row">
            <span>
              Question {step + 1} of {EPDS_QUESTIONS.length}
            </span>
            <span>In the past 7 days…</span>
          </div>

          <div
            className="wellness-progress"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={EPDS_QUESTIONS.length}
            aria-valuenow={step + 1}
          >
            <span
              style={{
                width: `${((step + 1) / EPDS_QUESTIONS.length) * 100}%`,
              }}
            />
          </div>

          <h3 className="wellness-statement">{question.text}</h3>

          <div className="wellness-options">
            {question.options.map(option => (
              <button
                type="button"
                key={option.label}
                className={`wellness-option ${
                  answers[step] === option.score ? 'selected' : ''
                }`}
                aria-pressed={answers[step] === option.score}
                onClick={() => chooseAnswer(option.score)}
              >
                {option.label}
                <span aria-hidden="true">›</span>
              </button>
            ))}
          </div>

          <div className="wellness-nav">
            <button
              type="button"
              className="text-button"
              disabled={step === 0}
              onClick={() => setStep(step - 1)}
            >
              ← Back
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() => setPhase('intro')}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {phase === 'result' && result && interpretation && (
        <div className="wellness-result">
          {interpretation.selfHarmFlag && (
            <div className="recovery-alert alert-urgent" role="alert">
              <strong>You deserve support right now</strong>
              <p>
                You said the thought of harming yourself has occurred to you.
                Please talk to your doctor today. If you feel you might act on
                these thoughts, call your local emergency number or go to the
                nearest emergency department now. If you can, tell someone you
                trust and don&apos;t stay alone.
              </p>
            </div>
          )}

          <div className={`form-panel wellness-score score-${interpretation.level}`}>
            <span className="wellness-score-number">
              {result.total}
              <small>/30</small>
            </span>
            <div>
              <h3>{interpretation.title}</h3>
              <p>{interpretation.message}</p>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="primary-button"
              onClick={addToCareCard}
              disabled={addedToCareCard}
            >
              {addedToCareCard
                ? '✓ Added to My Care Card'
                : 'Add to My Care Card to discuss'}
            </button>
            <button type="button" className="secondary-button" onClick={start}>
              Take it again
            </button>
          </div>

          {status && (
            <p className="status-message" role="status">
              {status}
            </p>
          )}
        </div>
      )}

      {phase !== 'result' && status && (
        <p className="status-message" role="status">
          {status}
        </p>
      )}

      <section className="checkin-history">
        <div className="report-list-heading">
          <h3>Past results</h3>
          <span>{screenings.length} saved</span>
        </div>

        {screenings.length === 0 ? (
          <div className="empty-state">
            <span>🌸</span>
            <h4>No results yet</h4>
            <p>
              Repeating the check every couple of weeks can help you and your
              doctor notice changes.
            </p>
          </div>
        ) : (
          <div className="checkin-list">
            {screenings.slice(0, 5).map(entry => {
              const entryResult = interpretEpds(
                entry.total,
                entry.answers[SELF_HARM_ITEM_INDEX]
              )

              return (
                <article className="checkin-item" key={entry.id}>
                  <span className={`wellness-mini-score score-${entryResult.level}`}>
                    {entry.total}
                  </span>
                  <div className="checkin-item-body">
                    <div className="checkin-item-top">
                      <strong>{formatTimestamp(entry.timestamp)}</strong>
                    </div>
                    <span className="checkin-item-stress">
                      {entryResult.title}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="text-button danger-text"
                    onClick={() => handleDelete(entry)}
                    aria-label={`Delete result from ${formatTimestamp(entry.timestamp)}`}
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
        Results are stored only in this browser on this device. MotherLoop does
        not diagnose conditions.
        <br />
        Scale: {EPDS_CITATION}
      </p>
    </section>
  )
}
