
import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { readPdf } from './readPdf'
import { readImage } from './readImage'
import { saveReport, getReports, deleteReport } from './reportStorage'
import { loadCareData, saveCareData, createCareId } from './careStorage'
import AppShell from './components/AppShell'
import DailyCheckIn from './features/wellbeing/DailyCheckIn'
import RecoveryTracker from './features/wellbeing/RecoveryTracker'
import WellnessCheck from './features/wellbeing/WellnessCheck'
import {
  loadCheckIns,
  saveCheckIns,
  loadRecoveryLogs,
  saveRecoveryLogs,
  loadScreenings,
  saveScreenings,
  moodFor,
  localDateKey,
} from './wellbeingStorage'
import './App.css'
import './shell.css'
import './features/wellbeing/wellbeing.css'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const EXTRACTION_TYPES = [
  'appointment',
  'instruction',
  'medication',
  'follow_up',
  'question',
  'other',
]

function todayISO() {
  const now = new Date()

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-')
}

function parseLocalDate(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null
  }

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day, 12)

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }

  return date
}

function formatDate(value, options = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
}) {
  const date = parseLocalDate(value)
  return date ? date.toLocaleDateString('en-IN', options) : 'Date not set'
}

function formatTime(value) {
  if (!value) return ''

  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value)
  if (!match) return value

  const hour = Number(match[1])
  const minute = match[2]
  const suffix = hour >= 12 ? 'PM' : 'AM'

  return `${hour % 12 || 12}:${minute} ${suffix}`
}

function categoryLabel(category) {
  return {
    instruction: 'Care instruction',
    appointment: 'Appointment',
    task: 'Care task',
    question: 'Question for care team',
  }[category] || 'Care item'
}

function itemStatusLabel(item) {
  if (item.category === 'instruction') return 'Reviewed by you'

  if (item.category === 'question') {
    return item.status === 'resolved' ? 'Resolved' : 'Needs clarification'
  }

  if (item.category === 'appointment') {
    return item.status === 'completed' ? 'Marked attended' : 'Planned'
  }

  return item.status === 'completed' ? 'Completed' : 'To do'
}

function careCategoryFromDraft(kind) {
  if (kind === 'appointment' || kind === 'follow_up') return 'appointment'
  if (kind === 'question') return 'question'
  if (kind === 'other') return 'task'
  return 'instruction'
}

function eventCategoryFromDraft(kind) {
  if (kind === 'appointment') return 'Appointment'
  if (kind === 'follow_up') return 'Follow-up'
  return 'Reminder'
}

function defaultDestination(kind) {
  if (kind === 'appointment' || kind === 'follow_up') return 'both'
  return 'care'
}

function createEmptyCalendarForm(date = todayISO()) {
  return {
    title: '',
    date,
    time: '',
    category: 'Appointment',
    location: '',
    notes: '',
    addToCareCard: true,
  }
}

function createEmptyCareForm(category = 'instruction', source = '') {
  return {
    title: '',
    details: '',
    category,
    source,
    dueDate: '',
    dueTime: '',
    addToCalendar: false,
    sourceConfirmed: false,
  }
}

function App() {
  const [activeTab, setActiveTab] = useState('Home')

  // Existing reports and explanations
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [extractedText, setExtractedText] = useState('')
  const [explanation, setExplanation] = useState('')
  const [currentReportName, setCurrentReportName] = useState('')

  // AI extraction and draft review
  const [extractingInstructions, setExtractingInstructions] = useState(false)
  const [draftItems, setDraftItems] = useState([])
  const [extractionMessage, setExtractionMessage] = useState('')
  const [explainingDraftIds, setExplainingDraftIds] = useState([])

  // AI explanations for saved care-card items
  const [explainingCareIds, setExplainingCareIds] = useState([])
  const [careExplanationErrors, setCareExplanationErrors] = useState({})

  // Browser audio playback
  const [speakingId, setSpeakingId] = useState(null)

  // Calendar and care-card persistence
  const [initialCareData] = useState(() => loadCareData())
  const [careItems, setCareItems] = useState(initialCareData.careItems)
  const [calendarEvents, setCalendarEvents] = useState(
    initialCareData.calendarEvents
  )
  const [storageWarning, setStorageWarning] = useState('')

  // Daily check-ins (stored separately from care data)
  const [checkIns, setCheckIns] = useState(() => loadCheckIns())

  // Recovery tracker logs (one per day)
  const [recoveryLogs, setRecoveryLogs] = useState(() => loadRecoveryLogs())

  // Wellness check (EPDS) results
  const [screenings, setScreenings] = useState(() => loadScreenings())

  // Calendar
  const [selectedDate, setSelectedDate] = useState(todayISO)
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const date = new Date()
    return new Date(date.getFullYear(), date.getMonth(), 1)
  })
  const [showCalendarForm, setShowCalendarForm] = useState(false)
  const [editingEventId, setEditingEventId] = useState(null)
  const [calendarForm, setCalendarForm] = useState(
    () => createEmptyCalendarForm()
  )

  // Care card
  const [showCareForm, setShowCareForm] = useState(false)
  const [editingCareId, setEditingCareId] = useState(null)
  const [careForm, setCareForm] = useState(
    () => createEmptyCareForm()
  )

  useEffect(() => {
    loadReports()
  }, [])

  useEffect(() => {
    const saved = saveCareData({ careItems, calendarEvents })

    setStorageWarning(
      saved
        ? ''
        : 'MotherLoop could not save your care data in this browser. Please record important information separately.'
    )
  }, [careItems, calendarEvents])

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  async function loadReports() {
    try {
      const saved = await getReports()

      saved.sort(
        (a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)
      )

      setReports(saved)
    } catch (error) {
      console.error('Loading reports failed:', error)
      setMessage('Could not load reports. Please refresh the page.')
    }
  }

  async function handleUpload(event) {
    const files = Array.from(event.target.files || [])
    event.target.value = ''

    if (!files.length) return

    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
    ]

    const validFiles = files.filter(file =>
      allowedTypes.includes(file.type) ||
      /\.(pdf|jpe?g|png)$/i.test(file.name)
    )

    if (validFiles.length !== files.length) {
      setMessage('Some files were skipped. Choose PDF, JPG, or PNG files.')
    } else {
      setMessage('')
    }

    if (!validFiles.length) return

    setLoading(true)

    try {
      let count = 0

      for (const file of validFiles) {
        await saveReport(file)
        count++
      }

      await loadReports()
      setMessage(`${count} report(s) saved successfully! 💗`)
    } catch (error) {
      console.error('Upload failed:', error)
      setMessage('Could not save reports. Please try smaller files.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteReport(id) {
    if (!window.confirm('Delete this saved report?')) return

    const report = reports.find(item => item.id === id)

    try {
      await deleteReport(id)
      await loadReports()

      if (report?.name === currentReportName) {
        setExtractedText('')
        setExplanation('')
        setCurrentReportName('')
        setDraftItems([])
        setExtractionMessage('')
      }

      setMessage('Report deleted successfully.')
    } catch (error) {
      console.error('Delete report failed:', error)
      setMessage('Could not delete this report.')
    }
  }

  async function handleReadReport(report) {
    setLoading(true)
    setMessage('Reading your report... 💗')
    setExtractedText('')
    setExplanation('')
    setCurrentReportName('')
    setDraftItems([])
    setExtractionMessage('')

    try {
      const text = /\.pdf$/i.test(report.name)
        ? await readPdf(report.file)
        : await readImage(report.file)

      if (!text || !text.trim()) {
        setMessage(
          'No readable text was found. Try a clearer document or image.'
        )
        return
      }

      setExtractedText(text)
      setCurrentReportName(report.name)
      setMessage('')
    } catch (error) {
      console.error('Reading report failed:', error)
      setMessage(error.message || 'Could not read this report.')
    } finally {
      setLoading(false)
    }
  }

  async function handleExplainReport() {
    if (!extractedText.trim()) {
      setMessage('Please read a report first.')
      return
    }

    setLoading(true)
    setMessage('MotherLoop is explaining your report... 💗')
    setExplanation('')

    try {
      const response = await fetch(
        'http://127.0.0.1:3001/api/explain-report',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reportText: extractedText,
            language: 'English',
          }),
        }
      )

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || 'Could not explain the report.')
      }

      if (
        typeof data.explanation !== 'string' ||
        !data.explanation.trim()
      ) {
        throw new Error('The AI returned an empty explanation.')
      }

      setExplanation(data.explanation)
      setMessage('')
    } catch (error) {
      console.error('Report explanation failed:', error)
      setMessage(error.message || 'Could not connect to MotherLoop AI.')
    } finally {
      setLoading(false)
    }
  }

  function openReport(report) {
    const url = URL.createObjectURL(report.file)
    const newWindow = window.open(url, '_blank')

    if (!newWindow) {
      URL.revokeObjectURL(url)
      setMessage('Allow pop-ups in your browser to open this report.')
      return
    }

    setTimeout(() => URL.revokeObjectURL(url), 60000)
  }

  // --------------------------------------------------
  // AUDIO: Explain aloud using the browser's speech engine
  // --------------------------------------------------

  function handleListen(text, itemId) {
    if (!text || !text.trim()) {
      setMessage('There is no text available to read aloud.')
      return
    }

    if (!('speechSynthesis' in window)) {
      setMessage(
        'Audio playback is not supported in this browser. Please read the text or use your device’s read-aloud feature.'
      )
      return
    }

    if (speakingId === itemId) {
      window.speechSynthesis.cancel()
      setSpeakingId(null)
      return
    }

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-IN'
    utterance.rate = 0.92
    utterance.pitch = 1

    utterance.onstart = () => {
      setSpeakingId(itemId)
    }

    utterance.onend = () => {
      setSpeakingId(null)
    }

    utterance.onerror = () => {
      setSpeakingId(null)
      setMessage(
        'Audio playback could not be completed. You can still read the explanation.'
      )
    }

    setSpeakingId(itemId)

    try {
      window.speechSynthesis.speak(utterance)
      setMessage('')
    } catch (error) {
      console.error('Speech synthesis failed:', error)
      setSpeakingId(null)
      setMessage('Unable to start audio playback in this browser.')
    }
  }

  // --------------------------------------------------
  // STRUCTURED EXTRACTION
  // --------------------------------------------------

  async function handleExtractInstructions() {
    if (!extractedText.trim()) {
      setExtractionMessage('Read a report before extracting instructions.')
      return
    }

    setExtractingInstructions(true)
    setDraftItems([])
    setExtractionMessage('Extracting appointment and care-information drafts...')

    try {
      const response = await fetch(
        'http://127.0.0.1:3001/api/extract-instructions',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reportText: extractedText }),
        }
      )

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || 'Instruction extraction failed.')
      }

      if (!Array.isArray(data.items)) {
        throw new Error('The extraction response did not contain an item list.')
      }

      const drafts = data.items.map((item, index) => ({
        ...item,
        draftId: createCareId(`draft-${index}`),
        selectedDestination: defaultDestination(item.kind),
        reviewed: false,
        clarificationResolved: false,
        explanation: '',
        explanationError: '',
      }))

      setDraftItems(drafts)

      setExtractionMessage(
        drafts.length
          ? `${drafts.length} draft item(s) found. Review each against the original document before saving.`
          : 'No relevant appointments or instructions were detected. You can still add items manually.'
      )
    } catch (error) {
      console.error('Structured extraction failed:', error)
      setExtractionMessage(
        error.message || 'Could not extract instructions. You can add items manually.'
      )
    } finally {
      setExtractingInstructions(false)
    }
  }

  function updateDraft(draftId, changes) {
    setDraftItems(previous =>
      previous.map(item => {
        if (item.draftId !== draftId) return item

        const sourceChanged =
          (
            Object.prototype.hasOwnProperty.call(changes, 'original_text') &&
            changes.original_text !== item.original_text
          ) ||
          (
            Object.prototype.hasOwnProperty.call(changes, 'title') &&
            changes.title !== item.title
          )

        return {
          ...item,
          ...changes,
          ...(sourceChanged
            ? {
                explanation: '',
                explanationError: '',
              }
            : {}),
        }
      })
    )
  }

  function dismissDraft(draftId) {
    setDraftItems(previous =>
      previous.filter(item => item.draftId !== draftId)
    )
    setExtractionMessage('Draft removed. Nothing was saved.')
  }

  async function explainDraft(draftId) {
    const draft = draftItems.find(item => item.draftId === draftId)

    if (!draft) return

    if (!draft.original_text?.trim()) {
      updateDraft(draftId, {
        explanationError: 'Add the original source text before explaining.',
      })
      return
    }

    setExplainingDraftIds(previous =>
      previous.includes(draftId)
        ? previous
        : [...previous, draftId]
    )

    updateDraft(draftId, { explanationError: '' })

    try {
      const response = await fetch(
        'http://127.0.0.1:3001/api/explain-instruction',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: draft.title,
            originalText: draft.original_text,
          }),
        }
      )

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || 'Could not explain this instruction.')
      }

      if (
        typeof data.explanation !== 'string' ||
        !data.explanation.trim()
      ) {
        throw new Error('The AI returned an empty explanation.')
      }

      updateDraft(draftId, {
        explanation: data.explanation.trim(),
        explanationError: '',
      })
    } catch (error) {
      console.error('Draft explanation failed:', error)

      updateDraft(draftId, {
        explanationError:
          error.message || 'Could not explain this instruction.',
      })
    } finally {
      setExplainingDraftIds(previous =>
        previous.filter(id => id !== draftId)
      )
    }
  }

  function saveDraftItem(draftId) {
    const draft = draftItems.find(item => item.draftId === draftId)

    if (!draft) return

    if (!draft.reviewed) {
      setExtractionMessage(
        'Review the item against the original report and check the confirmation box before saving.'
      )
      return
    }

    if (draft.needs_clarification) {
      setExtractionMessage(
        'This item still needs clarification. Check the source document and resolve the ambiguity before saving it as confirmed.'
      )
      return
    }

    const title = (draft.title || '').trim()
    const originalText = (draft.original_text || '').trim()

    if (!title || !originalText) {
      setExtractionMessage(
        'A title and original source text are required before saving.'
      )
      return
    }

    const destination = draft.selectedDestination
    const saveToCalendar =
      destination === 'calendar' || destination === 'both'
    const saveToCare =
      destination === 'care' || destination === 'both'

    if (!saveToCalendar && !saveToCare) {
      setExtractionMessage('Choose Calendar, My Care Card, or both.')
      return
    }

    if (
      saveToCalendar &&
      (!draft.date || !parseLocalDate(draft.date))
    ) {
      setExtractionMessage(
        'A valid, reviewed date is required for calendar events. Choose My Care Card if no confirmed date is available.'
      )
      return
    }

    if (
      saveToCalendar &&
      draft.time &&
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.time)
    ) {
      setExtractionMessage('Please correct the extracted time.')
      return
    }

    const careId = saveToCare ? createCareId('care') : null
    const eventId = saveToCalendar ? createCareId('event') : null
    const careCategory = careCategoryFromDraft(draft.kind)

    const newCareItem = saveToCare
      ? {
          id: careId,
          title,
          details: originalText,
          explanation: draft.explanation || '',
          category: careCategory,
          source: draft.source_page
            ? `${currentReportName}, page ${draft.source_page}`
            : currentReportName || 'Extracted report',
          dueDate: draft.date || '',
          dueTime: draft.time || '',
          status:
            careCategory === 'question'
              ? 'open'
              : careCategory === 'appointment'
                ? 'planned'
                : 'reviewed',
          sourceConfirmed: true,
          calendarEventId: eventId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      : null

    const newEvent = saveToCalendar
      ? {
          id: eventId,
          title,
          date: draft.date,
          time: draft.time || '',
          category: eventCategoryFromDraft(draft.kind),
          location: '',
          notes: originalText,
          completed: false,
          careItemId: careId,
          createdAt: new Date().toISOString(),
        }
      : null

    if (newCareItem) {
      setCareItems(previous => [newCareItem, ...previous])
    }

    if (newEvent) {
      setCalendarEvents(previous => [newEvent, ...previous])

      setSelectedDate(draft.date)

      const date = parseLocalDate(draft.date)

      setVisibleMonth(
        new Date(date.getFullYear(), date.getMonth(), 1)
      )
    }

    setDraftItems(previous =>
      previous.filter(item => item.draftId !== draftId)
    )

    setExtractionMessage(
      'Confirmed item saved successfully. You can find it in the selected section.'
    )
  }

  // --------------------------------------------------
  // Explain a saved care-card item and retain the result
  // --------------------------------------------------

  async function explainCareItem(item) {
    if (!item.details?.trim()) {
      setCareExplanationErrors(previous => ({
        ...previous,
        [item.id]: 'There is no original text to explain.',
      }))
      return
    }

    setExplainingCareIds(previous =>
      previous.includes(item.id) ? previous : [...previous, item.id]
    )

    setCareExplanationErrors(previous => ({
      ...previous,
      [item.id]: '',
    }))

    try {
      const response = await fetch(
        'http://127.0.0.1:3001/api/explain-instruction',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: item.title,
            originalText: item.details,
          }),
        }
      )

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || 'Could not explain this item.')
      }

      if (
        typeof data.explanation !== 'string' ||
        !data.explanation.trim()
      ) {
        throw new Error('The AI returned an empty explanation.')
      }

      setCareItems(previous =>
        previous.map(entry =>
          entry.id === item.id
            ? {
                ...entry,
                explanation: data.explanation.trim(),
                explanationUpdatedAt: new Date().toISOString(),
              }
            : entry
        )
      )

      setCareExplanationErrors(previous => ({
        ...previous,
        [item.id]: '',
      }))
    } catch (error) {
      console.error('Care-card explanation failed:', error)

      setCareExplanationErrors(previous => ({
        ...previous,
        [item.id]:
          error.message || 'Could not explain this item.',
      }))
    } finally {
      setExplainingCareIds(previous =>
        previous.filter(id => id !== item.id)
      )
    }
  }

  // --------------------------------------------------
  // Calendar
  // --------------------------------------------------

  function openNewCalendarForm() {
    setEditingEventId(null)
    setCalendarForm(createEmptyCalendarForm(selectedDate))
    setShowCalendarForm(true)
    setMessage('')
  }

  function editCalendarEvent(event) {
    setEditingEventId(event.id)

    setCalendarForm({
      title: event.title || '',
      date: event.date || todayISO(),
      time: event.time || '',
      category: event.category || 'Appointment',
      location: event.location || '',
      notes: event.notes || '',
      addToCareCard: Boolean(event.careItemId),
    })

    setShowCalendarForm(true)
    setMessage('')
  }

  function handleCalendarFormChange(event) {
    const { name, value, checked, type } = event.target

    setCalendarForm(previous => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  function handleCalendarSubmit(event) {
    event.preventDefault()

    const title = calendarForm.title.trim()
    const date = calendarForm.date

    if (!title || !parseLocalDate(date)) {
      setMessage('Please enter a valid event title and date.')
      return
    }

    const oldEvent = calendarEvents.find(
      item => item.id === editingEventId
    )

    const eventId = oldEvent?.id || createCareId('event')
    let careItemId = oldEvent?.careItemId || null
    let nextCareItems = [...careItems]

    if (calendarForm.addToCareCard) {
      if (careItemId) {
        nextCareItems = nextCareItems.map(item =>
          item.id === careItemId
            ? {
                ...item,
                title,
                dueDate: date,
                dueTime: calendarForm.time,
                details: calendarForm.notes.trim() || item.details,
                calendarEventId: eventId,
                explanation:
                  title === item.title &&
                  (!calendarForm.notes.trim() ||
                    calendarForm.notes.trim() === item.details)
                    ? item.explanation || ''
                    : '',
              }
            : item
        )
      } else {
        careItemId = createCareId('care')

        nextCareItems.unshift({
          id: careItemId,
          title,
          details: calendarForm.notes.trim() || 'Added from My Calendar.',
          explanation: '',
          category: ['Appointment', 'Follow-up'].includes(calendarForm.category)
            ? 'appointment'
            : 'task',
          source: 'Added manually in My Calendar',
          dueDate: date,
          dueTime: calendarForm.time,
          status: ['Appointment', 'Follow-up'].includes(calendarForm.category)
            ? 'planned'
            : 'pending',
          sourceConfirmed: false,
          calendarEventId: eventId,
          createdAt: new Date().toISOString(),
        })
      }
    } else if (careItemId) {
      nextCareItems = nextCareItems.map(item =>
        item.id === careItemId
          ? { ...item, calendarEventId: null }
          : item
      )

      careItemId = null
    }

    const updatedEvent = {
      id: eventId,
      title,
      date,
      time: calendarForm.time,
      category: calendarForm.category,
      location: calendarForm.location.trim(),
      notes: calendarForm.notes.trim(),
      completed: oldEvent?.completed || false,
      careItemId,
      createdAt: oldEvent?.createdAt || new Date().toISOString(),
    }

    setCareItems(nextCareItems)

    setCalendarEvents(previous =>
      oldEvent
        ? previous.map(item =>
            item.id === eventId ? updatedEvent : item
          )
        : [updatedEvent, ...previous]
    )

    setSelectedDate(date)

    const parsed = parseLocalDate(date)

    setVisibleMonth(
      new Date(parsed.getFullYear(), parsed.getMonth(), 1)
    )

    setShowCalendarForm(false)
    setEditingEventId(null)
    setCalendarForm(createEmptyCalendarForm(date))
    setMessage(oldEvent ? 'Calendar event updated.' : 'Calendar event added.')
  }

  function deleteCalendarEvent(event) {
    if (!window.confirm(`Delete "${event.title}" from the calendar?`)) {
      return
    }

    setCalendarEvents(previous =>
      previous.filter(item => item.id !== event.id)
    )

    if (event.careItemId) {
      setCareItems(previous =>
        previous.map(item =>
          item.id === event.careItemId
            ? { ...item, calendarEventId: null }
            : item
        )
      )
    }

    setShowCalendarForm(false)
    setEditingEventId(null)
    setMessage('Calendar event deleted.')
  }

  function toggleCalendarEvent(event) {
    const completed = !event.completed

    setCalendarEvents(previous =>
      previous.map(item =>
        item.id === event.id ? { ...item, completed } : item
      )
    )

    if (event.careItemId) {
      setCareItems(previous =>
        previous.map(item =>
          item.id === event.careItemId
            ? { ...item, status: completed ? 'completed' : 'planned' }
            : item
        )
      )
    }

    setMessage(
      completed ? 'Event marked as complete.' : 'Event reopened.'
    )
  }

  function changeMonth(offset) {
    const next = new Date(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth() + offset,
      1
    )

    setVisibleMonth(next)

    setSelectedDate([
      next.getFullYear(),
      String(next.getMonth() + 1).padStart(2, '0'),
      '01',
    ].join('-'))
  }

  // --------------------------------------------------
  // Care card
  // --------------------------------------------------

  function openNewCareForm(category = 'instruction') {
    setEditingCareId(null)

    setCareForm(
      createEmptyCareForm(
        category,
        currentReportName ? `Report: ${currentReportName}` : ''
      )
    )

    setShowCareForm(true)
    setMessage('')
  }

  function editCareItem(item) {
    setEditingCareId(item.id)

    setCareForm({
      title: item.title || '',
      details: item.details || '',
      category: item.category || 'instruction',
      source: item.source || '',
      dueDate: item.dueDate || '',
      dueTime: item.dueTime || '',
      addToCalendar: Boolean(item.calendarEventId),
      sourceConfirmed: Boolean(item.sourceConfirmed),
    })

    setShowCareForm(true)
    setMessage('')
  }

  function handleCareFormChange(event) {
    const { name, value, checked, type } = event.target

    setCareForm(previous => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  function handleCareFormSubmit(event) {
    event.preventDefault()

    const title = careForm.title.trim()
    const details = careForm.details.trim()
    const category = careForm.category
    const source = careForm.source.trim()
    const addToCalendar =
      category !== 'question' && careForm.addToCalendar

    if (!title || !details) {
      setMessage('Please provide a title and details.')
      return
    }

    if (
      ['instruction', 'appointment'].includes(category) &&
      !careForm.sourceConfirmed
    ) {
      setMessage(
        'Check the information against your source and confirm before saving.'
      )
      return
    }

    if (category === 'instruction' && !source) {
      setMessage('Add the source of this instruction.')
      return
    }

    if (
      category === 'appointment' &&
      !parseLocalDate(careForm.dueDate)
    ) {
      setMessage('Please add a valid appointment date.')
      return
    }

    if (addToCalendar && !parseLocalDate(careForm.dueDate)) {
      setMessage('Enter a valid date before adding it to the calendar.')
      return
    }

    const existing = careItems.find(item => item.id === editingCareId)
    const itemId = existing?.id || createCareId('care')

    let calendarEventId = existing?.calendarEventId || null
    let nextEvents = [...calendarEvents]

    if (addToCalendar) {
      const existingEvent = nextEvents.find(
        item => item.id === calendarEventId
      )

      const eventId = calendarEventId || createCareId('event')
      calendarEventId = eventId

      const linkedEvent = {
        id: eventId,
        title,
        date: careForm.dueDate,
        time: careForm.dueTime,
        category: category === 'appointment' ? 'Appointment' : 'Reminder',
        location: '',
        notes: details,
        completed: existingEvent?.completed || false,
        careItemId: itemId,
        createdAt: existingEvent?.createdAt || new Date().toISOString(),
      }

      nextEvents = existingEvent
        ? nextEvents.map(item =>
            item.id === eventId ? linkedEvent : item
          )
        : [linkedEvent, ...nextEvents]
    } else if (calendarEventId) {
      nextEvents = nextEvents.filter(
        item => item.id !== calendarEventId
      )

      calendarEventId = null
    }

    const status =
      category === 'instruction'
        ? 'reviewed'
        : category === 'question'
          ? existing?.status === 'resolved' ? 'resolved' : 'open'
          : category === 'appointment'
            ? existing?.status === 'completed' ? 'completed' : 'planned'
            : existing?.status === 'completed' ? 'completed' : 'pending'

    const sourceTextChanged =
      !existing ||
      existing.title !== title ||
      existing.details !== details

    const updatedItem = {
      id: itemId,
      title,
      details,
      explanation: sourceTextChanged ? '' : existing.explanation || '',
      category,
      source,
      dueDate: careForm.dueDate,
      dueTime: careForm.dueTime,
      status,
      sourceConfirmed: Boolean(careForm.sourceConfirmed),
      calendarEventId,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    setCareItems(previous =>
      existing
        ? previous.map(item =>
            item.id === itemId ? updatedItem : item
          )
        : [updatedItem, ...previous]
    )

    setCalendarEvents(nextEvents)

    if (addToCalendar && careForm.dueDate) {
      setSelectedDate(careForm.dueDate)

      const date = parseLocalDate(careForm.dueDate)

      setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1))
    }

    setCareForm(createEmptyCareForm())
    setShowCareForm(false)
    setEditingCareId(null)
    setMessage(existing ? 'Care card item updated.' : 'Care card item saved.')
  }

  function deleteCareItem(item) {
    if (!window.confirm(`Delete "${item.title}" from your care card?`)) {
      return
    }

    setCareItems(previous =>
      previous.filter(entry => entry.id !== item.id)
    )

    if (item.calendarEventId) {
      setCalendarEvents(previous =>
        previous.filter(event => event.id !== item.calendarEventId)
      )
    }

    setShowCareForm(false)
    setEditingCareId(null)

    setCareExplanationErrors(previous => {
      const next = { ...previous }
      delete next[item.id]
      return next
    })

    setMessage('Care card item deleted.')
  }

  function toggleCareCompletion(item) {
    const completed = item.status !== 'completed'

    setCareItems(previous =>
      previous.map(entry =>
        entry.id === item.id
          ? {
              ...entry,
              status: completed
                ? 'completed'
                : item.category === 'appointment'
                  ? 'planned'
                  : 'pending',
            }
          : entry
      )
    )

    if (item.calendarEventId) {
      setCalendarEvents(previous =>
        previous.map(event =>
          event.id === item.calendarEventId
            ? { ...event, completed }
            : event
        )
      )
    }

    setMessage(completed ? 'Item completed.' : 'Item reopened.')
  }

  function toggleQuestionResolved(item) {
    const resolved = item.status !== 'resolved'

    setCareItems(previous =>
      previous.map(entry =>
        entry.id === item.id
          ? { ...entry, status: resolved ? 'resolved' : 'open' }
          : entry
      )
    )

    setMessage(resolved ? 'Question marked resolved.' : 'Question reopened.')
  }

  // --------------------------------------------------
  // Derived calendar data
  // --------------------------------------------------

  const year = visibleMonth.getFullYear()
  const month = visibleMonth.getMonth()

  const firstWeekday =
    (new Date(year, month, 1).getDay() + 6) % 7

  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const calendarCells = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ]

  while (calendarCells.length % 7 !== 0) {
    calendarCells.push(null)
  }

  const compareEvents = (a, b) =>
    a.date.localeCompare(b.date) ||
    (a.time || '').localeCompare(b.time || '')

  const eventsForSelectedDate = calendarEvents
    .filter(event => event.date === selectedDate)
    .sort(compareEvents)

  const upcomingEvents = calendarEvents
    .filter(event => event.date >= todayISO() && !event.completed)
    .sort(compareEvents)
    .slice(0, 5)

  const upcomingAppointments = calendarEvents.filter(
    event =>
      event.date >= todayISO() &&
      !event.completed &&
      ['Appointment', 'Follow-up'].includes(event.category)
  ).length

  const openQuestions = careItems.filter(
    item => item.category === 'question' && item.status !== 'resolved'
  ).length

  // Tab ids are unchanged from the original navigation, so every
  // existing `activeTab === '...'` check keeps working.
  const navGroups = [
    {
      label: 'Today',
      items: [
        { id: 'Home', label: 'Home', icon: 'home', primary: true },
        {
          id: 'Check-in',
          label: 'Daily Check-in',
          shortLabel: 'Check-in',
          icon: 'checkin',
          primary: true,
        },
      ],
    },
    {
      label: 'My care',
      items: [
        {
          id: 'My Reports',
          label: 'My Reports',
          shortLabel: 'Reports',
          icon: 'reports',
          primary: true,
        },
        {
          id: 'Calendar',
          label: 'Calendar',
          icon: 'calendar',
          primary: true,
        },
        {
          id: 'My Care Card',
          label: 'My Care Card',
          shortLabel: 'Care Card',
          icon: 'careCard',
          badge: openQuestions || null,
        },
      ],
    },
    {
      label: 'Wellbeing',
      items: [
        {
          id: 'Recovery',
          label: 'Recovery Tracker',
          shortLabel: 'Recovery',
          icon: 'recovery',
        },
        {
          id: 'Wellness',
          label: 'Wellness Check',
          shortLabel: 'Wellness',
          icon: 'wellness',
        },
      ],
    },
  ]

  function handleSaveCheckIn(entry) {
    const next = [entry, ...checkIns]
    const saved = saveCheckIns(next)

    if (saved) setCheckIns(next)
    return saved
  }

  function handleDeleteCheckIn(id) {
    const next = checkIns.filter(entry => entry.id !== id)

    if (saveCheckIns(next)) setCheckIns(next)
  }

  function handleSaveRecoveryLog(log) {
    const next = [
      log,
      ...recoveryLogs.filter(entry => entry.date !== log.date),
    ].sort((a, b) => b.date.localeCompare(a.date))
    const saved = saveRecoveryLogs(next)

    if (saved) setRecoveryLogs(next)
    return saved
  }

  function handleDeleteRecoveryLog(id) {
    const next = recoveryLogs.filter(entry => entry.id !== id)

    if (saveRecoveryLogs(next)) setRecoveryLogs(next)
  }

  function handleSaveScreening(entry) {
    const next = [entry, ...screenings]
    const saved = saveScreenings(next)

    if (saved) setScreenings(next)
    return saved
  }

  function handleDeleteScreening(id) {
    const next = screenings.filter(entry => entry.id !== id)

    if (saveScreenings(next)) setScreenings(next)
  }

  // Lets wellbeing features add a question to My Care Card,
  // using the same item shape as the care-card form.
  function handleAddCareQuestion({ title, details, source }) {
    const now = new Date().toISOString()

    setCareItems(previous => [
      {
        id: createCareId('care'),
        title,
        details,
        explanation: '',
        category: 'question',
        source,
        dueDate: '',
        dueTime: '',
        status: 'open',
        sourceConfirmed: false,
        calendarEventId: null,
        createdAt: now,
        updatedAt: now,
      },
      ...previous,
    ])

    return true
  }

  const todaysCheckIn = checkIns.find(
    entry => localDateKey(entry.timestamp) === todayISO()
  )
  const todaysMood = todaysCheckIn ? moodFor(todaysCheckIn.mood) : null

  function handleNavigate(tab) {
    setActiveTab(tab)
    setMessage('')
    if (tab === 'My Reports') loadReports()
    window.scrollTo({ top: 0 })
  }

  return (
    <AppShell
      navGroups={navGroups}
      activeTab={activeTab}
      onNavigate={handleNavigate}
      className={activeTab === 'My Care Card' ? 'printing-care-card' : ''}
    >
      <main className="content">
        {message && activeTab !== 'My Reports' && (
          <p className="status-message global-message" role="status">
            {message}
          </p>
        )}

        {storageWarning && (
          <p className="status-message warning-message" role="status">
            {storageWarning}
          </p>
        )}

        {/* HOME */}

        {activeTab === 'Home' && (
          <>
            <section className="hero">
              <div className="hero-text">
                <span className="eyebrow">YOUR POSTPARTUM CARE SPACE</span>
                <h2>Hello, Mama! 💗</h2>
                <p>
                  Your reports, appointments, and care instructions
                  — all in one loving space.
                </p>
                <button
                  className="primary-button"
                  onClick={() => setActiveTab('My Reports')}
                >
                  Explore My Reports →
                </button>
              </div>

              <div className="hero-art">
                <span className="sun">☀️</span>
                <span className="flower flower-one">✿</span>
                <span className="flower flower-two">✿</span>
                <div className="mother-emoji">🤱🏻</div>
                <div className="hero-note">You are doing great, Mama! ♡</div>
              </div>
            </section>

            <section className="home-checkin">
              <span className="home-checkin-emoji" aria-hidden="true">
                {todaysMood ? todaysMood.emoji : '🌤️'}
              </span>
              <div>
                <h3>
                  {todaysMood
                    ? `Today you're feeling ${todaysMood.label.toLowerCase()}`
                    : 'How are you feeling today?'}
                </h3>
                <p>
                  {todaysMood
                    ? 'Thank you for checking in with yourself.'
                    : 'Take a quiet minute for a daily check-in.'}
                </p>
              </div>
              <button
                className="primary-button"
                onClick={() => handleNavigate('Check-in')}
              >
                {todaysMood ? 'Open check-in' : 'Check in now'}
              </button>
            </section>

            <section className="section-heading">
              <h2>Your care, at a glance</h2>
              <p>Everything important, right where you need it.</p>
            </section>

            <section className="cards">
              <article className="card report-card">
                <div className="card-icon">📄</div>
                <span className="card-tag">YOUR DOCUMENTS</span>
                <h3>My Reports</h3>
                <p>Keep your medical reports together in one place.</p>
                <button onClick={() => setActiveTab('My Reports')}>
                  Open reports →
                </button>
              </article>

              <article className="card calendar-card">
                <div className="card-icon">🗓️</div>
                <span className="card-tag">STAY ON TRACK</span>
                <h3>My Calendar</h3>
                <p>{upcomingAppointments} upcoming appointment(s).</p>
                <button onClick={() => setActiveTab('Calendar')}>
                  View calendar →
                </button>
              </article>

              <article className="card care-card">
                <div className="card-icon">💗</div>
                <span className="card-tag">MADE FOR YOU</span>
                <h3>My Care Card</h3>
                <p>
                  {careItems.length} saved item(s), including {openQuestions}
                  {' '}unresolved question(s).
                </p>
                <button onClick={() => setActiveTab('My Care Card')}>
                  View care card →
                </button>
              </article>
            </section>

            <section className="love-note">
              <span>🌷</span>
              <div>
                <h3>A gentle reminder</h3>
                <p>You deserve care, rest, and support, too.</p>
              </div>
              <span className="love-heart">♡</span>
            </section>
          </>
        )}

        {/* DAILY CHECK-IN */}

        {activeTab === 'Check-in' && (
          <DailyCheckIn
            checkIns={checkIns}
            todayKey={todayISO()}
            onSave={handleSaveCheckIn}
            onDelete={handleDeleteCheckIn}
          />
        )}

        {/* RECOVERY TRACKER */}

        {activeTab === 'Recovery' && (
          <RecoveryTracker
            logs={recoveryLogs}
            todayKey={todayISO()}
            onSave={handleSaveRecoveryLog}
            onDelete={handleDeleteRecoveryLog}
          />
        )}

        {/* WELLNESS CHECK (EPDS) */}

        {activeTab === 'Wellness' && (
          <WellnessCheck
            screenings={screenings}
            onSave={handleSaveScreening}
            onDelete={handleDeleteScreening}
            onAddCareQuestion={handleAddCareQuestion}
          />
        )}

        {/* REPORTS */}

        {activeTab === 'My Reports' && (
          <section className="reports-page">
            <span className="eyebrow">YOUR PERSONAL DOCUMENT LIBRARY</span>
            <h2>My Medical Reports 📄</h2>
            <p className="page-description">
              Keep your reports safe and easy to find on this device.
            </p>

            <label className="upload-area">
              <span className="upload-icon">📤</span>
              <strong>{loading ? 'Processing...' : 'Upload a medical report'}</strong>
              <span>Choose PDF, JPG, or PNG files</span>

              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                multiple
                onChange={handleUpload}
                disabled={loading}
              />

              <span className="upload-button">
                {loading ? 'Please wait...' : '+ Choose files'}
              </span>
            </label>

            {message && (
              <p className="status-message" role="status">{message}</p>
            )}

            {extractedText && (
              <section className="extracted-text">
                <h3>Extracted Report Text 📄</h3>

                <div className="extracted-report-content">
                  {extractedText.split(/\n{2,}/).map((paragraph, index) => (
                    <p key={`${index}-${paragraph.slice(0, 12)}`}>
                      {paragraph.trim()}
                    </p>
                  ))}
                </div>

                <div className="explanation-controls">
                  <p className="language-note">
                    Report explanations are currently available in English.
                  </p>

                  <div className="report-action-buttons">
                    <button
                      className="primary-button"
                      onClick={handleExplainReport}
                      disabled={loading || extractingInstructions}
                    >
                      {loading ? 'Please wait...' : '✨ Explain My Report'}
                    </button>

                    <button
                      className="secondary-button"
                      onClick={handleExtractInstructions}
                      disabled={loading || extractingInstructions}
                    >
                      {extractingInstructions
                        ? 'Extracting...'
                        : '📋 Extract Instructions'}
                    </button>
                  </div>
                </div>

                {explanation && (
                  <div className="report-explanation">
                    <h3>💗 Your Report Explained</h3>
                    <div className="explanation-content">
                      <ReactMarkdown>{explanation}</ReactMarkdown>
                    </div>
                  </div>
                )}

                {(extractionMessage || draftItems.length > 0) && (
                  <section className="draft-review">
                    <div className="draft-review-heading">
                      <span className="eyebrow">REVIEW BEFORE SAVING</span>
                      <h3>Extracted care information</h3>
                      <p>
                        These are AI-generated drafts, not confirmed medical
                        instructions. Check each item against the original
                        report before saving it.
                      </p>
                    </div>

                    {extractionMessage && (
                      <p className="status-message" role="status">
                        {extractionMessage}
                      </p>
                    )}

                    {draftItems.map((item, index) => {
                      const isExplaining = explainingDraftIds.includes(item.draftId)
                      const speechId = `draft:${item.draftId}`
                      const isSpeaking = speakingId === speechId

                      return (
                        <article className="draft-card" key={item.draftId}>
                          <div className="draft-card-heading">
                            <div>
                              <span className="draft-index">Draft {index + 1}</span>
                              <h4>{item.title || 'Untitled item'}</h4>
                            </div>
                            <span className="status-pill status-warning">
                              Not confirmed
                            </span>
                          </div>

                          <label className="field-label">
                            Title
                            <input
                              value={item.title || ''}
                              maxLength={160}
                              onChange={event =>
                                updateDraft(item.draftId, {
                                  title: event.target.value,
                                })
                              }
                            />
                          </label>

                          <label className="field-label">
                            Item type
                            <select
                              value={item.kind || 'other'}
                              onChange={event =>
                                updateDraft(item.draftId, {
                                  kind: event.target.value,
                                })
                              }
                            >
                              {EXTRACTION_TYPES.map(kind => (
                                <option value={kind} key={kind}>
                                  {kind.replace('_', ' ')}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="field-label">
                            Original source text
                            <textarea
                              rows={3}
                              value={item.original_text || ''}
                              maxLength={3000}
                              onChange={event =>
                                updateDraft(item.draftId, {
                                  original_text: event.target.value,
                                })
                              }
                            />
                          </label>

                          <div className="form-grid two-columns">
                            <label className="field-label">
                              Extracted date
                              <input
                                type="date"
                                value={item.date || ''}
                                onChange={event =>
                                  updateDraft(item.draftId, {
                                    date: event.target.value || null,
                                  })
                                }
                              />
                            </label>

                            <label className="field-label">
                              Extracted time
                              <input
                                type="time"
                                value={item.time || ''}
                                onChange={event =>
                                  updateDraft(item.draftId, {
                                    time: event.target.value || null,
                                  })
                                }
                              />
                            </label>
                          </div>

                          <p className="draft-source-note">
                            Source: {currentReportName || 'Current report'}
                            {item.source_page
                              ? ` · Page ${item.source_page}`
                              : ' · Page not identified'}
                          </p>

                          {item.needs_clarification && (
                            <div className="draft-warning">
                              <strong>⚠️ Clarification required</strong>
                              <p>
                                {item.clarification_reason ||
                                  'The extracted information may be incomplete or ambiguous.'}
                              </p>

                              <label className="checkbox-field">
                                <input
                                  type="checkbox"
                                  checked={Boolean(item.clarificationResolved)}
                                  onChange={event => {
                                    const resolved = event.target.checked

                                    updateDraft(item.draftId, {
                                      clarificationResolved: resolved,
                                      needs_clarification: !resolved,
                                    })
                                  }}
                                />
                                I checked the original document and corrected
                                or resolved this ambiguity.
                              </label>
                            </div>
                          )}

                          {/* New plain-language explanation workflow */}

                          <div className="instruction-explanation-panel">
                            <div className="instruction-explanation-heading">
                              <h4>Understand this instruction</h4>
                              <p>
                                Get a simple English explanation of this
                                specific item. Compare it with the original
                                before relying on it.
                              </p>
                            </div>

                            <button
                              className="secondary-button"
                              type="button"
                              disabled={isExplaining}
                              onClick={() => explainDraft(item.draftId)}
                            >
                              {isExplaining
                                ? 'Explaining...'
                                : item.explanation
                                  ? 'Refresh explanation'
                                  : '✨ Explain simply'}
                            </button>

                            {item.explanationError && (
                              <p className="status-message" role="status">
                                {item.explanationError}
                              </p>
                            )}

                            {item.explanation && (
                              <div className="plain-explanation">
                                <div className="plain-explanation-label">
                                  <span>PLAIN-LANGUAGE EXPLANATION</span>
                                  <span className="status-pill status-pending">
                                    AI-generated
                                  </span>
                                </div>

                                <div className="plain-explanation-content">
                                  <ReactMarkdown>
                                    {item.explanation}
                                  </ReactMarkdown>
                                </div>

                                <button
                                  type="button"
                                  className="secondary-button listen-button"
                                  onClick={() =>
                                    handleListen(item.explanation, speechId)
                                  }
                                >
                                  {isSpeaking ? '■ Stop audio' : '🔊 Listen'}
                                </button>

                                <p className="explanation-disclaimer">
                                  This explanation is AI-generated. Check it
                                  against the original instruction and ask your
                                  healthcare professional about anything unclear.
                                </p>
                              </div>
                            )}
                          </div>

                          <label className="field-label">
                            Where should this item be saved?
                            <select
                              value={item.selectedDestination || 'care'}
                              onChange={event =>
                                updateDraft(item.draftId, {
                                  selectedDestination: event.target.value,
                                })
                              }
                            >
                              <option value="care">My Care Card only</option>
                              <option value="calendar">Calendar only</option>
                              <option value="both">
                                Both Calendar and My Care Card
                              </option>
                            </select>
                          </label>

                          <label className="checkbox-field draft-confirmation">
                            <input
                              type="checkbox"
                              checked={Boolean(item.reviewed)}
                              onChange={event =>
                                updateDraft(item.draftId, {
                                  reviewed: event.target.checked,
                                })
                              }
                            />
                            I reviewed this information against the original
                            source and corrected it where necessary.
                          </label>

                          <div className="draft-actions">
                            <button
                              className="primary-button"
                              onClick={() => saveDraftItem(item.draftId)}
                              disabled={isExplaining || extractingInstructions}
                            >
                              Confirm and save
                            </button>

                            <button
                              className="secondary-button"
                              onClick={() => dismissDraft(item.draftId)}
                            >
                              Discard draft
                            </button>
                          </div>
                        </article>
                      )
                    })}
                  </section>
                )}
              </section>
            )}

            <div className="report-list-heading">
              <h3>Saved reports</h3>
              <span>{reports.length} file(s)</span>
            </div>

            {reports.length === 0 ? (
              <div className="empty-reports">
                <span>🗂️</span>
                <h3>No reports yet</h3>
                <p>Upload your first report to start your personal library.</p>
              </div>
            ) : (
              <div className="report-list">
                {reports.map(report => (
                  <article className="report-item" key={report.id}>
                    <div className="report-file-icon">
                      {/\.pdf$/i.test(report.name) ? '📕' : '🖼️'}
                    </div>

                    <div className="report-info">
                      <strong>{report.name}</strong>
                      <span>
                        Uploaded {new Date(report.uploadedAt).toLocaleDateString()}
                      </span>
                      <span>
                        {(report.size / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </div>

                    <button
                      className="open-report-button"
                      onClick={() => openReport(report)}
                    >
                      Open
                    </button>

                    <button
                      className="open-report-button"
                      onClick={() => handleReadReport(report)}
                      disabled={loading || extractingInstructions}
                    >
                      Read Report
                    </button>

                    <button
                      className="delete-report-button"
                      onClick={() => handleDeleteReport(report.id)}
                      aria-label={`Delete ${report.name}`}
                    >
                      🗑️
                    </button>
                  </article>
                ))}
              </div>
            )}

            <p className="storage-note">
              Reports are stored in this browser on this device. They are not
              backed up to the cloud.
            </p>
          </section>
        )}

        {/* CALENDAR */}

        {activeTab === 'Calendar' && (
          <section className="calendar-page">
            <span className="eyebrow">YOUR PERSONAL CARE SPACE</span>
            <h2>Your Care Calendar 🗓️</h2>

            <p className="page-description">
              Keep appointments, follow-ups, and personal reminders together.
            </p>

            <div className="calendar-summary">
              <div className="summary-card">
                <span className="summary-icon">📅</span>
                <div>
                  <strong>{upcomingAppointments}</strong>
                  <span>Upcoming appointments</span>
                </div>
              </div>

              <div className="summary-card">
                <span className="summary-icon">🌷</span>
                <div>
                  <strong>
                    {
                      calendarEvents.filter(
                        event => event.date >= todayISO() && !event.completed
                      ).length
                    }
                  </strong>
                  <span>Upcoming events</span>
                </div>
              </div>
            </div>

            <div className="calendar-toolbar">
              <div>
                <h3>
                  {visibleMonth.toLocaleDateString('en-IN', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </h3>
                <p>Select a day to view its events.</p>
              </div>

              <div className="month-navigation">
                <button
                  className="secondary-button"
                  onClick={() => changeMonth(-1)}
                  aria-label="Previous month"
                >
                  ←
                </button>

                <button
                  className="secondary-button"
                  onClick={() => {
                    const date = new Date()
                    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1))
                    setSelectedDate(todayISO())
                  }}
                >
                  Today
                </button>

                <button
                  className="secondary-button"
                  onClick={() => changeMonth(1)}
                  aria-label="Next month"
                >
                  →
                </button>
              </div>
            </div>

            <div className="calendar-grid">
              {WEEKDAYS.map(day => (
                <div className="weekday-label" key={day}>{day}</div>
              ))}

              {calendarCells.map((day, index) => {
                if (day === null) {
                  return (
                    <div
                      className="calendar-day empty-day"
                      key={`empty-${index}`}
                    />
                  )
                }

                const dateKey = [
                  year,
                  String(month + 1).padStart(2, '0'),
                  String(day).padStart(2, '0'),
                ].join('-')

                const dayEvents = calendarEvents.filter(
                  event => event.date === dateKey
                )

                return (
                  <button
                    key={dateKey}
                    className={[
                      'calendar-day',
                      selectedDate === dateKey ? 'selected-day' : '',
                      todayISO() === dateKey ? 'today-day' : '',
                      dayEvents.length ? 'has-events' : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => setSelectedDate(dateKey)}
                    aria-label={`${formatDate(dateKey)}, ${dayEvents.length} events`}
                  >
                    <span className="day-number">{day}</span>
                    {dayEvents.length > 0 && (
                      <span className="day-event-count">
                        {dayEvents.length} event(s)
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="selected-date-heading">
              <div>
                <h3>
                  {formatDate(selectedDate, {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </h3>
                <p>
                  {eventsForSelectedDate.length
                    ? `${eventsForSelectedDate.length} event(s) scheduled`
                    : 'Nothing scheduled for this day.'}
                </p>
              </div>

              <button className="primary-button" onClick={openNewCalendarForm}>
                + Add event
              </button>
            </div>

            {showCalendarForm && (
              <form className="form-panel" onSubmit={handleCalendarSubmit}>
                <div className="form-heading">
                  <div>
                    <h3>{editingEventId ? 'Edit event' : 'Add a calendar event'}</h3>
                    <p>Enter the details you want to remember.</p>
                  </div>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => {
                      setShowCalendarForm(false)
                      setEditingEventId(null)
                    }}
                    aria-label="Close event form"
                  >
                    ×
                  </button>
                </div>

                <label className="field-label">
                  Event title *
                  <input
                    name="title"
                    value={calendarForm.title}
                    onChange={handleCalendarFormChange}
                    placeholder="e.g. Post-discharge follow-up"
                    maxLength={120}
                    required
                  />
                </label>

                <div className="form-grid two-columns">
                  <label className="field-label">
                    Date *
                    <input
                      type="date"
                      name="date"
                      value={calendarForm.date}
                      onChange={handleCalendarFormChange}
                      required
                    />
                  </label>

                  <label className="field-label">
                    Time (optional)
                    <input
                      type="time"
                      name="time"
                      value={calendarForm.time}
                      onChange={handleCalendarFormChange}
                    />
                  </label>
                </div>

                <div className="form-grid two-columns">
                  <label className="field-label">
                    Event type
                    <select
                      name="category"
                      value={calendarForm.category}
                      onChange={handleCalendarFormChange}
                    >
                      <option>Appointment</option>
                      <option>Follow-up</option>
                      <option>Reminder</option>
                      <option>Other</option>
                    </select>
                  </label>

                  <label className="field-label">
                    Location (optional)
                    <input
                      name="location"
                      value={calendarForm.location}
                      onChange={handleCalendarFormChange}
                      placeholder="Clinic or location"
                      maxLength={160}
                    />
                  </label>
                </div>

                <label className="field-label">
                  Notes (optional)
                  <textarea
                    name="notes"
                    value={calendarForm.notes}
                    onChange={handleCalendarFormChange}
                    rows={3}
                    maxLength={2000}
                  />
                </label>

                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    name="addToCareCard"
                    checked={calendarForm.addToCareCard}
                    onChange={handleCalendarFormChange}
                  />
                  Also show this item on My Care Card
                </label>

                <div className="form-actions">
                  <button className="primary-button" type="submit">
                    {editingEventId ? 'Save changes' : 'Add event'}
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => {
                      setShowCalendarForm(false)
                      setEditingEventId(null)
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="event-list">
              <h3>Events for this day</h3>

              {eventsForSelectedDate.length === 0 ? (
                <div className="empty-state">
                  <span>🌼</span>
                  <h4>A little room in your day</h4>
                  <p>Add an appointment, follow-up, or reminder when needed.</p>
                </div>
              ) : (
                eventsForSelectedDate.map(event => (
                  <article
                    className={`event-card ${event.completed ? 'event-completed' : ''}`}
                    key={event.id}
                  >
                    <div className="event-time">
                      {event.time ? formatTime(event.time) : 'All day'}
                    </div>

                    <div className="event-details">
                      <div className="event-title-row">
                        <span className={`event-dot ${
                          event.category === 'Appointment'
                            ? 'dot-appointment'
                            : event.category === 'Follow-up'
                              ? 'dot-followup'
                              : 'dot-reminder'
                        }`} />
                        <h4>{event.title}</h4>
                      </div>

                      <span className="event-type">{event.category}</span>

                      {event.location && (
                        <p className="event-meta">📍 {event.location}</p>
                      )}

                      {event.notes && (
                        <p className="event-notes">{event.notes}</p>
                      )}

                      {event.completed && (
                        <span className="status-pill status-complete">
                          Completed
                        </span>
                      )}

                      <div className="event-actions no-print">
                        <button
                          className="text-button"
                          onClick={() => toggleCalendarEvent(event)}
                        >
                          {event.completed
                            ? 'Undo'
                            : ['Appointment', 'Follow-up'].includes(event.category)
                              ? 'Mark attended'
                              : 'Mark complete'}
                        </button>
                        <button
                          className="text-button"
                          onClick={() => editCalendarEvent(event)}
                        >
                          Edit
                        </button>
                        <button
                          className="text-button danger-text"
                          onClick={() => deleteCalendarEvent(event)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>

            <section className="upcoming-section">
              <h3>Coming up</h3>

              {upcomingEvents.length === 0 ? (
                <p className="muted-text">No upcoming incomplete events.</p>
              ) : (
                <div className="upcoming-list">
                  {upcomingEvents.map(event => (
                    <button
                      className="upcoming-item"
                      key={event.id}
                      onClick={() => {
                        const date = parseLocalDate(event.date)
                        setSelectedDate(event.date)
                        setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1))
                      }}
                    >
                      <span className="upcoming-date">
                        {formatDate(event.date, { day: 'numeric', month: 'short' })}
                      </span>
                      <span className="upcoming-info">
                        <strong>{event.title}</strong>
                        <span>
                          {event.category}
                          {event.time ? ` · ${formatTime(event.time)}` : ''}
                        </span>
                      </span>
                      <span aria-hidden="true">→</span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <p className="storage-note">
              Calendar events are stored in this browser. They are not
              automatically added to your phone's calendar.
            </p>
          </section>
        )}

        {/* MY CARE CARD */}

        {activeTab === 'My Care Card' && (
          <section className="care-card-page">
            <div className="care-card-top no-print">
              <div>
                <span className="eyebrow">YOUR PERSONAL CARE SPACE</span>
                <h2>My Care Card 💗</h2>
                <p className="page-description">
                  Keep your reviewed instructions, care tasks, appointments,
                  and questions together.
                </p>
              </div>

              <button
                className="primary-button"
                onClick={() => window.print()}
              >
                Print / Save as PDF
              </button>
            </div>

            <div className="care-card-notice">
              <span>🔎</span>
              <p>
                AI-extracted instructions remain drafts until you review and
                confirm them. Explanations are aids to understanding, not
                medical advice.
              </p>
            </div>

            <div className="care-card-actions no-print">
              <button
                className="primary-button"
                onClick={() => openNewCareForm('instruction')}
              >
                + Add instruction
              </button>
              <button
                className="secondary-button"
                onClick={() => openNewCareForm('appointment')}
              >
                + Add appointment
              </button>
              <button
                className="secondary-button"
                onClick={() => openNewCareForm('question')}
              >
                + Add question
              </button>
            </div>

            {showCareForm && (
              <form className="form-panel no-print" onSubmit={handleCareFormSubmit}>
                <div className="form-heading">
                  <div>
                    <h3>{editingCareId ? 'Edit care card item' : 'Add to My Care Card'}</h3>
                    <p>Enter information you want to keep for your reference.</p>
                  </div>
                  <button
                    className="icon-button"
                    type="button"
                    onClick={() => {
                      setShowCareForm(false)
                      setEditingCareId(null)
                    }}
                    aria-label="Close form"
                  >
                    ×
                  </button>
                </div>

                <label className="field-label">
                  Item type
                  <select
                    name="category"
                    value={careForm.category}
                    onChange={handleCareFormChange}
                  >
                    <option value="instruction">Clinician-provided instruction</option>
                    <option value="appointment">Appointment</option>
                    <option value="task">Personal care task</option>
                    <option value="question">Question for care team</option>
                  </select>
                </label>

                <label className="field-label">
                  Title *
                  <input
                    name="title"
                    value={careForm.title}
                    onChange={handleCareFormChange}
                    maxLength={120}
                    required
                  />
                </label>

                <label className="field-label">
                  Original details *
                  <textarea
                    name="details"
                    value={careForm.details}
                    onChange={handleCareFormChange}
                    rows={4}
                    maxLength={5000}
                    required
                  />
                </label>

                <label className="field-label">
                  Source or reference
                  <input
                    name="source"
                    value={careForm.source}
                    onChange={handleCareFormChange}
                    placeholder="e.g. discharge summary, page 2"
                    maxLength={240}
                  />
                </label>

                {['instruction', 'appointment'].includes(careForm.category) && (
                  <label className="checkbox-field source-confirmation">
                    <input
                      type="checkbox"
                      name="sourceConfirmed"
                      checked={careForm.sourceConfirmed}
                      onChange={handleCareFormChange}
                      required
                    />
                    I checked this information against my original source or notes.
                  </label>
                )}

                <div className="form-grid two-columns">
                  <label className="field-label">
                    Date
                    <input
                      type="date"
                      name="dueDate"
                      value={careForm.dueDate}
                      onChange={handleCareFormChange}
                    />
                  </label>
                  <label className="field-label">
                    Time
                    <input
                      type="time"
                      name="dueTime"
                      value={careForm.dueTime}
                      onChange={handleCareFormChange}
                    />
                  </label>
                </div>

                {careForm.category !== 'question' && (
                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      name="addToCalendar"
                      checked={careForm.addToCalendar}
                      onChange={handleCareFormChange}
                    />
                    Also add this item to My Calendar
                  </label>
                )}

                <div className="form-actions">
                  <button className="primary-button" type="submit">
                    {editingCareId ? 'Save changes' : 'Save to care card'}
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => {
                      setShowCareForm(false)
                      setEditingCareId(null)
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="care-card-summary">
              <div className="care-summary-tile">
                <span>📋</span>
                <strong>{careItems.length}</strong>
                <small>Saved items</small>
              </div>
              <div className="care-summary-tile">
                <span>❓</span>
                <strong>{openQuestions}</strong>
                <small>Open questions</small>
              </div>
              <div className="care-summary-tile">
                <span>🗓️</span>
                <strong>{upcomingAppointments}</strong>
                <small>Upcoming appointments</small>
              </div>
            </div>

            <div className="care-items-heading">
              <h3>Your saved care information</h3>
              <p>Only items you add or confirm appear here.</p>
            </div>

            {careItems.length === 0 ? (
              <div className="empty-state">
                <span>💗</span>
                <h3>Your care card starts with you</h3>
                <p>
                  Add a reviewed instruction, appointment, personal task,
                  or question for your care team.
                </p>
                <button
                  className="primary-button no-print"
                  onClick={() => openNewCareForm('instruction')}
                >
                  Add your first item
                </button>
              </div>
            ) : (
              <div className="care-items-list">
                {careItems.map(item => {
                  const isExplaining = explainingCareIds.includes(item.id)
                  const speechId = `care:${item.id}`
                  const isSpeaking = speakingId === speechId
                  const explanationError = careExplanationErrors[item.id]

                  return (
                    <article className="care-item-card" key={item.id}>
                      <div className="care-item-header">
                        <div className="care-item-icon">
                          {item.category === 'instruction'
                            ? '📋'
                            : item.category === 'appointment'
                              ? '🗓️'
                              : item.category === 'question'
                                ? '❓'
                                : '🌷'}
                        </div>

                        <div className="care-item-title">
                          <span className="care-item-category">
                            {categoryLabel(item.category)}
                          </span>
                          <h4>{item.title}</h4>
                        </div>

                        <span className={`status-pill ${
                          item.category === 'question'
                            ? item.status === 'resolved'
                              ? 'status-complete'
                              : 'status-warning'
                            : ['completed', 'reviewed'].includes(item.status)
                              ? 'status-complete'
                              : 'status-pending'
                        }`}>
                          {itemStatusLabel(item)}
                        </span>
                      </div>

                      <div className="care-original-section">
                        <span className="care-content-label">
                          {item.category === 'question'
                            ? 'YOUR QUESTION'
                            : 'ORIGINAL INFORMATION'}
                        </span>
                        <p className="care-item-details">{item.details}</p>
                      </div>

                      {item.explanation && (
                        <div className="saved-explanation">
                          <div className="plain-explanation-label">
                            <span>PLAIN-LANGUAGE EXPLANATION</span>
                            <span className="status-pill status-pending">
                              AI-generated
                            </span>
                          </div>

                          <div className="plain-explanation-content">
                            <ReactMarkdown>{item.explanation}</ReactMarkdown>
                          </div>

                          <div className="explanation-actions no-print">
                            <button
                              type="button"
                              className="secondary-button listen-button"
                              onClick={() =>
                                handleListen(item.explanation, speechId)
                              }
                            >
                              {isSpeaking ? '■ Stop audio' : '🔊 Listen'}
                            </button>

                            {item.category !== 'question' && (
                              <button
                                type="button"
                                className="text-button"
                                disabled={isExplaining}
                                onClick={() => explainCareItem(item)}
                              >
                                {isExplaining ? 'Refreshing...' : 'Refresh explanation'}
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {!item.explanation && item.category !== 'question' && (
                        <div className="care-explanation-action no-print">
                          <button
                            type="button"
                            className="secondary-button"
                            disabled={isExplaining}
                            onClick={() => explainCareItem(item)}
                          >
                            {isExplaining ? 'Explaining...' : '✨ Explain simply'}
                          </button>
                        </div>
                      )}

                      {explanationError && (
                        <p className="status-message" role="status">
                          {explanationError}
                        </p>
                      )}

                      {item.source && (
                        <p className="care-item-meta">
                          <strong>Source:</strong> {item.source}
                        </p>
                      )}

                      {item.dueDate && (
                        <p className="care-item-meta">
                          <strong>
                            {item.category === 'appointment' ? 'Appointment' : 'Date'}:
                          </strong>{' '}
                          {formatDate(item.dueDate)}
                          {item.dueTime ? ` · ${formatTime(item.dueTime)}` : ''}
                        </p>
                      )}

                      {item.calendarEventId && (
                        <p className="care-item-meta linked-event-note">
                          ✓ Also saved in My Calendar
                        </p>
                      )}

                      <div className="care-item-actions no-print">
                        {item.category === 'question' && (
                          <button
                            className="text-button"
                            onClick={() => toggleQuestionResolved(item)}
                          >
                            {item.status === 'resolved'
                              ? 'Reopen question'
                              : 'Mark resolved'}
                          </button>
                        )}

                        {['appointment', 'task'].includes(item.category) && (
                          <button
                            className="text-button"
                            onClick={() => toggleCareCompletion(item)}
                          >
                            {item.status === 'completed'
                              ? 'Reopen'
                              : item.category === 'appointment'
                                ? 'Mark attended'
                                : 'Mark complete'}
                          </button>
                        )}

                        <button
                          className="text-button"
                          onClick={() => editCareItem(item)}
                        >
                          Edit
                        </button>

                        <button
                          className="text-button danger-text"
                          onClick={() => deleteCareItem(item)}
                        >
                          Delete
                        </button>
                      </div>

                      {(item.explanation || item.category !== 'question') && (
                        <p className="explanation-disclaimer">
                          AI explanations may be incomplete or incorrect.
                          Compare them with the original text and clarify
                          medical uncertainties with your healthcare professional.
                        </p>
                      )}
                    </article>
                  )
                })}
              </div>
            )}

            <div className="care-card-disclaimer">
              <strong>Remember</strong>
              <p>
                This card organizes information you entered and reviewed.
                It is not a medical record, diagnosis, or substitute for advice
                from your healthcare professional.
              </p>
            </div>

            <div className="care-print-footer">
              <p>MotherLoop · Your care, organized with care.</p>
              <p>Generated on {new Date().toLocaleDateString('en-IN')}</p>
            </div>
          </section>
        )}
      </main>
    </AppShell>
  )
}

export default App
