
const STORAGE_KEY = 'motherloop-care-data-v1'

function emptyCareData() {
  return {
    careItems: [],
    calendarEvents: [],
  }
}

export function loadCareData() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)

    if (!stored) {
      return emptyCareData()
    }

    const parsed = JSON.parse(stored)

    return {
      careItems: Array.isArray(parsed.careItems)
        ? parsed.careItems
        : [],
      calendarEvents: Array.isArray(parsed.calendarEvents)
        ? parsed.calendarEvents
        : [],
    }
  } catch (error) {
    console.error('Could not load MotherLoop care data:', error)
    return emptyCareData()
  }
}

export function saveCareData(data) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        careItems: Array.isArray(data.careItems)
          ? data.careItems
          : [],
        calendarEvents: Array.isArray(data.calendarEvents)
          ? data.calendarEvents
          : [],
      })
    )

    return true
  } catch (error) {
    console.error('Could not save MotherLoop care data:', error)
    return false
  }
}

export function createCareId(prefix = 'item') {
  const uniquePart =
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`

  return `${prefix}-${uniquePart}`
}
