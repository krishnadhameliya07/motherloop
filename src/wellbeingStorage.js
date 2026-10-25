// Local storage for wellbeing features (daily check-ins).
// Kept separate from careStorage.js so the existing reports,
// calendar and care-card data are never touched.

const CHECKIN_KEY = 'motherloop-checkins-v1'
const MAX_CHECKINS = 90

export const MOODS = [
  { value: 0, emoji: '😢', label: 'Very low' },
  { value: 1, emoji: '😐', label: 'Low' },
  { value: 2, emoji: '🙂', label: 'Okay' },
  { value: 3, emoji: '😊', label: 'Good' },
  { value: 4, emoji: '😍', label: 'Great' },
]

export function moodFor(value) {
  return MOODS.find(mood => mood.value === value) || null
}

function isValidCheckIn(entry) {
  return (
    entry &&
    typeof entry === 'object' &&
    typeof entry.id === 'string' &&
    Number.isInteger(entry.mood) &&
    entry.mood >= 0 &&
    entry.mood <= 4 &&
    Number.isInteger(entry.stress) &&
    entry.stress >= 1 &&
    entry.stress <= 5 &&
    typeof entry.timestamp === 'string'
  )
}

// Returns check-ins, newest first.
export function loadCheckIns() {
  try {
    const stored = window.localStorage.getItem(CHECKIN_KEY)
    if (!stored) return []

    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter(isValidCheckIn)
      .map(entry => ({
        ...entry,
        note: typeof entry.note === 'string' ? entry.note : '',
      }))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  } catch (error) {
    console.error('Could not load MotherLoop check-ins:', error)
    return []
  }
}

export function saveCheckIns(checkIns) {
  try {
    window.localStorage.setItem(
      CHECKIN_KEY,
      JSON.stringify(checkIns.slice(0, MAX_CHECKINS))
    )
    return true
  } catch (error) {
    console.error('Could not save MotherLoop check-ins:', error)
    return false
  }
}

// Local calendar date (YYYY-MM-DD) for an ISO timestamp.
export function localDateKey(isoString) {
  const date = new Date(isoString)

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

// --------------------------------------------------
// Recovery tracker (physical check-in), one log per day
// --------------------------------------------------

const RECOVERY_KEY = 'motherloop-recovery-v1'
const MAX_RECOVERY_LOGS = 90

export const SYMPTOMS = [
  { id: 'fever', label: 'Fever', emoji: '🤒' },
  { id: 'bleeding', label: 'Excess bleeding', emoji: '🩸' },
  { id: 'pain_c', label: 'C-section / wound pain', emoji: '🤕' },
  { id: 'pain_b', label: 'Breast pain', emoji: '🤱' },
]

export const APPETITE_LEVELS = ['None', 'Low', 'Normal', 'Good']

const SYMPTOM_IDS = new Set(SYMPTOMS.map(symptom => symptom.id))

function isValidRecoveryLog(entry) {
  return (
    entry &&
    typeof entry === 'object' &&
    typeof entry.id === 'string' &&
    typeof entry.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(entry.date) &&
    Array.isArray(entry.symptoms) &&
    Number.isInteger(entry.sleepHours) &&
    entry.sleepHours >= 0 &&
    entry.sleepHours <= 12 &&
    APPETITE_LEVELS.includes(entry.appetite)
  )
}

// Returns recovery logs, newest date first.
export function loadRecoveryLogs() {
  try {
    const stored = window.localStorage.getItem(RECOVERY_KEY)
    if (!stored) return []

    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter(isValidRecoveryLog)
      .map(entry => ({
        ...entry,
        symptoms: entry.symptoms.filter(id => SYMPTOM_IDS.has(id)),
      }))
      .sort((a, b) => b.date.localeCompare(a.date))
  } catch (error) {
    console.error('Could not load MotherLoop recovery logs:', error)
    return []
  }
}

export function saveRecoveryLogs(logs) {
  try {
    window.localStorage.setItem(
      RECOVERY_KEY,
      JSON.stringify(logs.slice(0, MAX_RECOVERY_LOGS))
    )
    return true
  } catch (error) {
    console.error('Could not save MotherLoop recovery logs:', error)
    return false
  }
}

// Rule-based flags, carried over from Fourth Trimester.
// Shared by the mother's tracker and (later) the family alerts.
export function assessRecovery(log) {
  const symptoms = log?.symptoms || []
  const hasFever = symptoms.includes('fever')
  const hasBleeding = symptoms.includes('bleeding')
  const hasPain =
    symptoms.includes('pain_c') || symptoms.includes('pain_b')
  const sleepHours = Number.isInteger(log?.sleepHours) ? log.sleepHours : null
  const isExhausted = sleepHours !== null && sleepHours <= 3

  return {
    hasFever,
    hasBleeding,
    hasPain,
    // Fever + bleeding + pain together (Fourth Trimester "urgent" rule)
    isUrgent: hasFever && hasBleeding && hasPain,
    // Fever or bleeding on its own is still a warning sign
    hasRedFlag: hasFever || hasBleeding,
    // "Silent SOS": very little sleep while in pain
    hasSilentSOS: isExhausted && hasPain,
    isExhausted,
    lowAppetite: log?.appetite === 'None' || log?.appetite === 'Low',
  }
}

// --------------------------------------------------
// Wellness check (EPDS) results
// --------------------------------------------------

const SCREENING_KEY = 'motherloop-screenings-v1'
const MAX_SCREENINGS = 30

function isValidScreening(entry) {
  return (
    entry &&
    typeof entry === 'object' &&
    typeof entry.id === 'string' &&
    typeof entry.timestamp === 'string' &&
    Array.isArray(entry.answers) &&
    entry.answers.length === 10 &&
    entry.answers.every(
      score => Number.isInteger(score) && score >= 0 && score <= 3
    )
  )
}

// Returns screening results, newest first. The total is always
// recalculated from the answers so it can never be inconsistent.
export function loadScreenings() {
  try {
    const stored = window.localStorage.getItem(SCREENING_KEY)
    if (!stored) return []

    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter(isValidScreening)
      .map(entry => ({
        id: entry.id,
        timestamp: entry.timestamp,
        answers: entry.answers,
        total: entry.answers.reduce((sum, score) => sum + score, 0),
      }))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  } catch (error) {
    console.error('Could not load MotherLoop wellness checks:', error)
    return []
  }
}

export function saveScreenings(screenings) {
  try {
    window.localStorage.setItem(
      SCREENING_KEY,
      JSON.stringify(screenings.slice(0, MAX_SCREENINGS))
    )
    return true
  } catch (error) {
    console.error('Could not save MotherLoop wellness checks:', error)
    return false
  }
}

// --------------------------------------------------
// Breathing session status (lets Family Circle see
// "Mom is practising mindfulness", as in Fourth Trimester)
// --------------------------------------------------

const BREATHING_KEY = 'motherloop-breathing-v1'
const BREATHING_STALE_MS = 15 * 60 * 1000

export function setBreathingActive(active) {
  try {
    window.localStorage.setItem(
      BREATHING_KEY,
      JSON.stringify({ active: Boolean(active), updatedAt: Date.now() })
    )
  } catch (error) {
    console.error('Could not save breathing status:', error)
  }
}

// A session left "active" (e.g. the tab was closed mid-exercise)
// is treated as finished after 15 minutes.
export function isBreathingActive() {
  try {
    const stored = JSON.parse(
      window.localStorage.getItem(BREATHING_KEY) || 'null'
    )

    return Boolean(
      stored &&
        stored.active === true &&
        typeof stored.updatedAt === 'number' &&
        Date.now() - stored.updatedAt < BREATHING_STALE_MS
    )
  } catch {
    return false
  }
}

// --------------------------------------------------
// Latest Nurse AI Vision result (the photo itself is never stored)
// --------------------------------------------------

const NURSE_KEY = 'motherloop-nurse-v1'

export function saveNurseLog(result) {
  try {
    window.localStorage.setItem(
      NURSE_KEY,
      JSON.stringify({ ...result, timestamp: new Date().toISOString() })
    )
  } catch (error) {
    console.error('Could not save nurse check:', error)
  }
}

export function loadNurseLog() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(NURSE_KEY) || 'null')

    if (
      stored &&
      typeof stored.timestamp === 'string' &&
      typeof stored.ai_insight_text === 'string' &&
      ['stable', 'caution', 'urgent'].includes(stored.alert_level)
    ) {
      return stored
    }
  } catch {
    // ignore unreadable data
  }

  return null
}
