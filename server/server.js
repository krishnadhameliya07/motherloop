
import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'

dotenv.config()

const app = express()
const port = 3001

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
  ],
}))

app.use(express.json({ limit: '2mb' }))

app.post('/api/explain-report', async (req, res) => {
  try {
    const { reportText, language = 'English' } = req.body

    if (!reportText || typeof reportText !== 'string') {
      return res.status(400).json({
        error: 'Please provide report text.',
      })
    }

    if (reportText.length > 50000) {
      return res.status(413).json({
        error: 'This report is too long. Please use a shorter report.',
      })
    }

    const response = await fetch(
      'http://localhost:11434/api/generate',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3.2:3b',
          prompt: `You are MotherLoop, a careful postpartum care information assistant.
Explain this medical report in ${language}, using simple, gentle language.

Rules:
- Explain only what the report supports.
- Do not diagnose or prescribe treatment.
- Never invent test values, dates, medicine names, or doses.
- Clearly mention anything unclear or possibly misread.
- Encourage users to confirm important decisions with their clinician.

Report:
${reportText}`,
          stream: false,
        }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Ollama could not explain the report.')
    }

    return res.json({ explanation: data.response })
  } catch (error) {
    console.error('Report explanation failed:', error)

    return res.status(500).json({
      error: error.message || 'MotherLoop could not explain this report.',
    })
  }
})

app.listen(port, () => {
  console.log(`MotherLoop backend running at http://localhost:${port}`)
})
