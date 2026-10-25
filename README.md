# MotherLoop 💗

**Understand your care. Feel supported. One step at a time.**

MotherLoop is a mother-first postpartum care companion for the "fourth trimester", the first weeks and months after birth. It helps mothers understand their healthcare documents, keep track of appointments and instructions, look after their physical and emotional recovery, and lets their family know when and how to help. Then it brings everything together in one summary for the next doctor visit.

Everything runs **locally**: AI runs on your own computer through Ollama, and all personal data stays in your browser.

> **Important:** MotherLoop is a hackathon prototype, not a medical device or clinical decision-support system. It does not diagnose conditions, prescribe treatment, or replace professional medical care. In an emergency, call your local emergency number.

---

## The loop

1. **Documents in:** upload discharge summaries and reports, and get plain-language explanations.
2. **Daily care:** check-ins, recovery logs, a validated wellness check and calming tools.
3. **Family support:** a Family Circle view with smart alerts and ways to help.
4. **Back to the doctor:** a printable Doctor Visit Summary.

---

## Features

### My care

**Medical Reports**
- Upload PDF, JPG, JPEG and PNG documents. They are saved in the browser and can be reopened or deleted.
- Extract text from text-based PDFs (PDF.js) and from images (Tesseract OCR).
- **Explain My Report:** a plain-language English explanation that streams in as it is written.
- **Extract Instructions:** AI finds appointments, care instructions, medications and questions as *drafts*, with dates, times, source excerpts and ambiguity warnings. Each draft must be reviewed and confirmed before saving to Calendar, My Care Card, or both.
- "Explain simply" for individual instructions, with read-aloud audio.

**Calendar**
- Month view; add, edit, complete and delete appointments, follow-ups and reminders.
- Optional time, location and notes; upcoming events list; links to My Care Card.

**My Care Card**
- Reviewed instructions with their source, appointments, personal care tasks and questions for the care team.
- Plain-language explanations with read-aloud audio.
- Print or save as PDF.

**Doctor Visit Summary**
- One printable page for the last 7, 14 or 30 days:
  - warning signs logged
  - recovery table (symptoms, sleep, appetite)
  - mood and stress trend
  - Wellness Check (EPDS) results, including item 10
  - open questions and upcoming appointments
- Private reflection notes are included only if the mother chooses.

### Wellbeing

**Daily Check-in**
- Five-point mood scale, stress level (1–5), optional reflection note and daily affirmation.
- A gentle support message when she reports a very low mood. Recent history.

**Recovery Tracker**
- One log per day: fever, excess bleeding, C-section/wound pain, breast pain, sleep in the last 24 hours, and appetite.
- Warnings appear as you log:
  - fever or heavy bleeding: contact your doctor
  - fever, bleeding and pain together: get medical help now
  - very little sleep while in pain: ask for help
- **Nurse AI Vision:** take or upload a photo of your face or meal. A local vision model (`llava`) gives a gentle, non-diagnostic observation about visible tiredness or how the meal may support recovery. Photos are never saved.

**Wellness Check (EPDS)**
- The 10-item Edinburgh Postnatal Depression Scale with correct answer options and reverse scoring.
- Score out of 30 with neutral result bands (below 10, 10–12, 13 or more), always labelled as screening, not diagnosis.
- A safety message appears whenever item 10 (thoughts of self-harm) is answered with anything other than "Never".
- One click adds the result to My Care Card as a question for the doctor. Results history.

**Calm Corner**
- Daily affirmations and a guided 4-7-8 breathing coach with an animated breathing circle.

**Community**
- Anonymous posts with topics (#selfcare, #breastfeeding, #mentalhealth, #recovery, #newborn), cheers and replies.
- *Preview mode:* posts are stored only on this device and are not yet shared between users.

**3AM AI Companion**
- A warm, always-available chat on every page, powered by a local model.
- Replies stream in word by word.
- A fixed safety message appears whenever self-harm is mentioned, independent of the AI's reply.
- Instructed never to diagnose or give medication advice.

### Family Circle

Switch between **🤱 Mother** and **🛡️ Family** view at the bottom of the sidebar (top-right on mobile).

- **Smart Alerts:** rule-based alerts built from the mother's own logs, each with concrete ways to help:
  - urgent symptoms, fever or bleeding
  - "Silent SOS" (very little sleep and pain)
  - emotional support needed (the EPDS score itself is never shown to family)
  - pain, low appetite, low mood, and Nurse AI photo checks
- A banner when she is doing a breathing exercise.
- **Send her some love:** ready-made or custom messages that appear on her screen.
- **Daily Care Checklist** that resets each day.
- **Understanding Postpartum** awareness cards.

### Design

- One unified interface: grouped sidebar on desktop; bottom tab bar with a "More" sheet on mobile.
- Light, warm colour palette; printable pages; reduced-motion support.

---

## Technology Stack

- **Frontend:** React 19, Vite, JavaScript, CSS (no UI framework)
- **Backend:** Node.js, Express
- **AI (local):** Ollama
  - Text: `llama3:8b` or `llama3.2:3b` (configurable)
  - Chat: optional separate, faster model
  - Vision: `llava`
- **Documents:** PDF.js (PDF text), Tesseract.js (image OCR), React Markdown
- **Storage:** browser IndexedDB (report files) and localStorage (everything else)
- **Audio:** browser speech synthesis

---

## Requirements

- Node.js and npm
- Ollama
- Models (download with `ollama pull`):
  - a text model: `llama3:8b`, or the faster `llama3.2:3b` for laptops
  - `llava` for Nurse AI Vision

| Service | Address |
|---|---|
| Frontend (Vite) | http://localhost:5173 |
| Backend (Express) | http://127.0.0.1:3001 |
| Ollama | http://127.0.0.1:11434 |

---

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/krishnadhameliya07/motherloop.git
cd motherloop
```

You need access to the private repository.

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Ollama

```bash
ollama --version
ollama pull llama3:8b      # or: ollama pull llama3.2:3b
ollama pull llava
ollama list
```

### 4. Configure environment variables

Copy `.env.example` to `.env` in the project root (beside `package.json`):

```bash
copy .env.example .env      # Windows
cp .env.example .env        # macOS / Linux
```

| Variable | Purpose | Default |
|---|---|---|
| `OLLAMA_MODEL` | Model for reports and instructions | `llama3:8b` |
| `OLLAMA_CHAT_MODEL` | Optional faster model for the 3AM Companion | same as `OLLAMA_MODEL` |
| `OLLAMA_VISION_MODEL` | Model for Nurse AI Vision | `llava` |
| `OLLAMA_BASE_URL` | Ollama address | `http://127.0.0.1:11434` |
| `OLLAMA_TIMEOUT_MS` | How long to wait for the AI to *start* answering | `600000` (10 min) |
| `PORT` | Backend port | `3001` |

**On a laptop without a strong graphics card**, set `OLLAMA_MODEL=llama3.2:3b` for much faster replies.

Never commit `.env`.

### 5. Start the backend (terminal 1)

```bash
npm run server
```

It should print the configured text, chat and vision models. Keep it running.

### 6. Start the frontend (terminal 2)

```bash
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

### 7. Verify

Open http://127.0.0.1:3001/api/health. It should show `"ollama":"online"` and `true` for `modelAvailable`, `chatModelAvailable` and `visionModelAvailable`.

---

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Backend, Ollama and model availability |
| POST | `/api/explain-report` | Plain-language report explanation (streamed text) |
| POST | `/api/extract-instructions` | Structured instruction drafts (JSON) |
| POST | `/api/explain-instruction` | Plain-language explanation of one instruction |
| POST | `/api/companion-chat` | 3AM Companion reply (streamed text) |
| POST | `/api/nurse-vision` | Photo observation from the vision model (JSON) |

All AI calls go to the local Ollama server. The AI may take as long as it needs while it is still producing text; requests only time out if it never starts or goes silent mid-reply.

---

## Testing

```bash
npm run lint
npm run build
```

Manual test checklist (use **synthetic documents only**):

1. Upload a discharge summary, Read Report, Explain My Report (text appears gradually).
2. Extract Instructions, review a draft, confirm, and save to Calendar and My Care Card.
3. Create, edit, complete and delete calendar events and care-card items; print the Care Card.
4. Daily Check-in with a very low mood; the support message appears.
5. Recovery Tracker: tick fever and pain, set sleep to 2 h, save; warnings appear. Upload a photo to Nurse AI Vision.
6. Wellness Check: complete all 10 questions and add the result to My Care Card.
7. Calm Corner: one full breathing cycle.
8. Community: post, cheer and reply.
9. 3AM Companion: send a message; test that a self-harm phrase shows the safety message.
10. Switch to Family: alerts match the logs; send encouragement; switch back and see the message.
11. Doctor Visit Summary: change the period, print or save as PDF.
12. Refresh the browser and confirm data persists.

---

## Current Limitations

- English only for explanations; Hindi and Kannada are planned.
- Local AI can be slow on laptops without a GPU; smaller models are faster but may be less accurate.
- AI extraction and photo observations can be wrong. Always review against the original source.
- Mother and Family views share one browser; there are no accounts or cross-device sync.
- Community posts stay on the device (preview mode).
- Scanned PDFs do not yet have full page-to-image OCR.
- The calendar does not sync with Google or phone calendars.
- Browser storage is not encrypted medical-record storage.

---

## Safety and Privacy

- MotherLoop organises information; it does not replace a healthcare professional.
- Warning-sign and self-harm safety messages are rule-based and always shown, independent of the AI.
- AI output is labelled and must be reviewed; nothing extracted is saved without confirmation.
- Photos are never stored. All data stays in the browser on this device.
- Use synthetic documents in demos. Never commit `.env`, credentials or real medical records.

---

## Credits

- **EPDS:** Cox, J.L., Holden, J.M., and Sagovsky, R. (1987). Detection of postnatal depression: Development of the 10-item Edinburgh Postnatal Depression Scale. *British Journal of Psychiatry*, 150, 782–786.
- Third-party license notices: see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

---

## Contributing

1. Create a working branch from `main`.
2. Test with `npm run lint` and `npm run build` before committing.
3. Keep credentials and sensitive data out of Git.
4. Open a pull request and document new features and their limitations.

---

## Project Status

**Current milestone:** a unified postpartum companion covering:
- reports, AI explanations and instruction extraction
- Calendar, Care Card and Doctor Visit Summary
- daily check-ins, recovery tracking with Nurse AI Vision, the EPDS wellness check and Calm Corner
- Community and the 3AM AI Companion
- Family Circle

**Next milestones:**
- Hindi and Kannada support with localised audio
- secure accounts and sync, so Family Circle and Community work across devices
- clinic integration

Built for recHERsion'26 💗
