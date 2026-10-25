// Local storage for Family Circle (from Fourth Trimester).
// Mother and Family views share this browser, as in the original app.

const MODE_KEY = 'motherloop-mode-v1'
const ENCOURAGEMENT_KEY = 'motherloop-encouragements-v1'
const CHECKLIST_KEY = 'motherloop-family-checklist-v1'

export function loadMode() {
  try {
    return window.localStorage.getItem(MODE_KEY) === 'family'
      ? 'family'
      : 'mother'
  } catch {
    return 'mother'
  }
}

export function saveMode(mode) {
  try {
    window.localStorage.setItem(MODE_KEY, mode === 'family' ? 'family' : 'mother')
  } catch (error) {
    console.error('Could not save view mode:', error)
  }
}

// Encouragement messages sent by family, shown to mom (oldest first).
export function loadEncouragements() {
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(ENCOURAGEMENT_KEY) || '[]'
    )

    return Array.isArray(parsed)
      ? parsed.filter(
          item =>
            item &&
            typeof item.id === 'string' &&
            typeof item.text === 'string' &&
            item.text.trim() &&
            typeof item.timestamp === 'string'
        )
      : []
  } catch {
    return []
  }
}

export function saveEncouragements(items) {
  try {
    window.localStorage.setItem(
      ENCOURAGEMENT_KEY,
      JSON.stringify(items.slice(-20))
    )
    return true
  } catch (error) {
    console.error('Could not save encouragement:', error)
    return false
  }
}

// Daily care checklist; resets automatically on a new day.
export function loadChecklist(todayKey) {
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(CHECKLIST_KEY) || 'null'
    )

    if (parsed?.date === todayKey && Array.isArray(parsed.checked)) {
      return parsed.checked.filter(id => typeof id === 'string')
    }
  } catch {
    // fall through to an empty list
  }

  return []
}

export function saveChecklist(todayKey, checked) {
  try {
    window.localStorage.setItem(
      CHECKLIST_KEY,
      JSON.stringify({ date: todayKey, checked })
    )
  } catch (error) {
    console.error('Could not save checklist:', error)
  }
}
