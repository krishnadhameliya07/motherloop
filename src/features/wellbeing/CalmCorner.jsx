import { useEffect, useState } from 'react'
import { setBreathingActive } from '../../wellbeingStorage'
import { AFFIRMATIONS, randomAffirmationIndex } from './affirmations'

// 4-7-8 breathing: breathe in 4s, hold 7s, breathe out 8s.
const STAGES = {
  in: { label: 'Breathe in', seconds: 4, next: 'hold' },
  hold: { label: 'Hold', seconds: 7, next: 'out' },
  out: { label: 'Breathe out', seconds: 8, next: 'in' },
}

const START_STATE = { stage: 'in', secondsLeft: STAGES.in.seconds, cycles: 0 }

export default function CalmCorner() {
  const [affirmationIndex, setAffirmationIndex] = useState(
    randomAffirmationIndex
  )
  const [isBreathing, setIsBreathing] = useState(false)
  const [breath, setBreath] = useState(START_STATE)

  // Advance the breathing timer once per second while active.
  useEffect(() => {
    if (!isBreathing) return undefined

    const timer = window.setInterval(() => {
      setBreath(current => {
        if (current.secondsLeft > 1) {
          return { ...current, secondsLeft: current.secondsLeft - 1 }
        }

        const nextStage = STAGES[current.stage].next

        return {
          stage: nextStage,
          secondsLeft: STAGES[nextStage].seconds,
          cycles: current.stage === 'out' ? current.cycles + 1 : current.cycles,
        }
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [isBreathing])

  // Always clear the shared "breathing" status when leaving the page.
  useEffect(() => () => setBreathingActive(false), [])

  function startBreathing() {
    setBreath(START_STATE)
    setIsBreathing(true)
    setBreathingActive(true)
  }

  function stopBreathing() {
    setIsBreathing(false)
    setBreath(START_STATE)
    setBreathingActive(false)
  }

  const stage = STAGES[breath.stage]

  return (
    <section className="checkin-page calm-page">
      <span className="eyebrow">A PAUSE JUST FOR YOU</span>
      <h2>Calm Corner 🕊️</h2>
      <p className="page-description">
        A gentle affirmation and a slow breathing exercise for the hard
        moments, including the ones at 3 AM.
      </p>

      <div className="affirmation-card calm-affirmation">
        <span className="affirmation-label">DAILY AFFIRMATION</span>
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

      <div className="form-panel breathing-panel">
        <h3>Pause &amp; breathe</h3>
        <p className="breathing-intro">
          4-7-8 breathing: in through your nose for 4, hold for 7, and out
          slowly through your mouth for 8.
        </p>

        <div className="breathing-stage" aria-live="polite">
          <div
            className={`breath-circle ${isBreathing ? `stage-${breath.stage}` : 'idle'}`}
          >
            {isBreathing ? (
              <span className="breath-text">
                <strong>{stage.label}</strong>
                <span>{breath.secondsLeft}</span>
              </span>
            ) : (
              <button
                type="button"
                className="breath-start"
                onClick={startBreathing}
              >
                Start
              </button>
            )}
          </div>
        </div>

        {isBreathing ? (
          <div className="breathing-footer">
            <span>
              {breath.cycles === 0
                ? 'First breath…'
                : `${breath.cycles} ${breath.cycles === 1 ? 'cycle' : 'cycles'} complete`}
            </span>
            <button
              type="button"
              className="secondary-button"
              onClick={stopBreathing}
            >
              Stop exercise
            </button>
          </div>
        ) : (
          <p className="field-hint breathing-hint">
            Try about four cycles. If you feel light-headed, stop and breathe
            normally.
          </p>
        )}
      </div>
    </section>
  )
}
