import { assessRecovery, localDateKey, moodFor } from '../../wellbeingStorage'

const DAY_MS = 24 * 60 * 60 * 1000

// Rule-based Smart Alerts (from Fourth Trimester), built from mom's
// own logs on this device. Returns alerts, most important first.
// No AI is used, and the EPDS score itself is never shown to family.
export function buildFamilyAlerts({
  recoveryLogs,
  checkIns,
  screenings,
  nurseLog,
  todayKey,
  nowMs,
}) {
  const alerts = []

  const todaysRecovery = recoveryLogs.find(log => log.date === todayKey)
  const recovery = todaysRecovery ? assessRecovery(todaysRecovery) : null

  if (recovery?.isUrgent) {
    alerts.push({
      level: 'urgent',
      tag: 'URGENT',
      title: 'Immediate action needed',
      message:
        'She logged fever, heavy bleeding and pain together today. These can be signs of a serious problem after birth.',
      actions: [
        'Help her contact her doctor or maternity unit now',
        'Call the local emergency number if she feels faint or very unwell',
        'Take over all baby duties',
      ],
    })
  } else if (recovery?.hasRedFlag) {
    alerts.push({
      level: 'high',
      tag: 'MEDICAL CAUTION',
      title: recovery.hasFever ? 'Fever logged today' : 'Heavy bleeding logged today',
      message:
        'This can be a warning sign after birth. She should contact her doctor today.',
      actions: [
        'Help her call her doctor or maternity unit today',
        'Check her discharge instructions together',
        'Make sure she is resting and drinking water',
      ],
    })
  }

  if (recovery?.hasSilentSOS) {
    alerts.push({
      level: 'medium',
      tag: 'SILENT SOS',
      title: 'She is hitting a physical limit',
      message: `She logged only ${todaysRecovery.sleepHours} ${todaysRecovery.sleepHours === 1 ? 'hour' : 'hours'} of sleep and is in pain.`,
      actions: [
        'Take the baby for at least 2 hours so she can sleep',
        'Do not wake her unless necessary',
        'Bring her water and something to eat',
      ],
    })
  }

  const recentScreening = screenings.find(
    entry => nowMs - new Date(entry.timestamp).getTime() < 14 * DAY_MS
  )

  if (recentScreening) {
    const selfHarmScore = recentScreening.answers[9]

    if (selfHarmScore > 0 || recentScreening.total >= 13) {
      alerts.push({
        level: selfHarmScore > 0 ? 'urgent' : 'high',
        tag: 'EMOTIONAL SUPPORT',
        title: 'She needs extra emotional support',
        message:
          'Her recent wellness check suggests she is struggling. This is common after birth and treatable, and it is not her fault.',
        actions: [
          'Ask gently how she is really feeling, and listen without judging',
          'Encourage her to talk to her doctor soon, and offer to go with her',
          selfHarmScore > 0
            ? 'Stay with her. If you are worried about her safety, call the local emergency number'
            : 'Take on more of the baby care so she can rest',
        ],
      })
    } else if (recentScreening.total >= 10) {
      alerts.push({
        level: 'medium',
        tag: 'EMOTIONAL SUPPORT',
        title: 'She may be having a hard time',
        message:
          'Her recent wellness check suggests some signs of low mood.',
        actions: [
          'Check in with her emotionally today',
          'Encourage her to mention how she feels to her doctor',
        ],
      })
    }
  }

  if (recovery?.hasPain && !recovery.hasSilentSOS) {
    alerts.push({
      level: 'medium',
      tag: 'PAIN',
      title: 'She is in pain today',
      message: 'She logged C-section/wound or breast pain.',
      actions: [
        'Bring her a heating pad or cold pack, whichever she prefers',
        'Help her follow the pain plan from her doctor',
        'Bring her a glass of water',
      ],
    })
  }

  if (recovery?.lowAppetite) {
    alerts.push({
      level: 'low',
      tag: 'NUTRITION',
      title: 'Low appetite today',
      message: 'Recovery needs fuel, and she is not eating much.',
      actions: [
        'Leave small, easy snacks within reach',
        'Make her a warm, simple meal',
      ],
    })
  }

  // Nurse AI Vision photo check from today (an AI observation only)
  if (
    nurseLog &&
    localDateKey(nurseLog.timestamp) === todayKey &&
    ['caution', 'urgent'].includes(nurseLog.alert_level)
  ) {
    alerts.push({
      level: 'medium',
      tag: 'AI PHOTO CHECK',
      title:
        nurseLog.ai_analysis_type === 'nutrition'
          ? 'Her meal may need a boost'
          : 'She may be very tired',
      message: `From her Nurse AI Vision photo check today (an AI observation, not a diagnosis): "${nurseLog.ai_insight_text}"`,
      actions:
        nurseLog.ai_analysis_type === 'nutrition'
          ? [
              'Make her a balanced meal with some protein',
              'Keep water and snacks within her reach',
            ]
          : [
              'Take over the next feed or baby care so she can sleep',
              'Keep the house calm so she can rest',
            ],
    })
  }

  const latestCheckIn = checkIns.find(
    entry => localDateKey(entry.timestamp) === todayKey
  )

  if (latestCheckIn && latestCheckIn.mood <= 1) {
    alerts.push({
      level: 'low',
      tag: 'MOOD',
      title: `She is feeling ${moodFor(latestCheckIn.mood)?.label.toLowerCase()} today`,
      message: 'She logged a low mood in her daily check-in.',
      actions: [
        'Make her favourite tea or snack',
        'Take the baby for a 30-minute walk',
        'Tell her she is doing a great job',
      ],
    })
  }

  const hasUpdatesToday = Boolean(todaysRecovery || latestCheckIn)

  return { alerts, hasUpdatesToday }
}
