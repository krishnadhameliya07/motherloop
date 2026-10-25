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
