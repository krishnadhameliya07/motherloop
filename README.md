# MotherLoop 💗

**Understand your care. One step at a time.**

MotherLoop is a mother-first postpartum care companion designed to help women understand and organize information from their existing healthcare documents.

It combines document text extraction, AI-assisted explanations, structured instruction extraction, a personal care card, and a calendar for follow-up appointments and care tasks.

> **Important:** MotherLoop is a hackathon prototype, not a medical device or clinical decision-support system. It does not diagnose conditions, prescribe treatment, or replace professional medical care.

## Current Features

### Medical Reports
- Upload PDF, JPG, JPEG, and PNG documents.
- Extract embedded text from text-based PDFs.
- Extract English text from images using OCR.
- Save reports in the browser and reopen or delete them.
- Display extracted text with improved paragraph formatting.
- Generate plain-language English report explanations.

### AI-Assisted Instruction Extraction
- Extract appointment and care-instruction candidates from document text.
- Identify dates, times, source excerpts, and potential ambiguities.
- Edit the extracted information before saving.
- Review and explicitly confirm each draft.
- Save selected items to Calendar, My Care Card, or both.
- Generate a plain-language English explanation for an individual instruction.

### My Calendar
- Navigate between months and select dates.
- Add, edit, and delete appointments, follow-ups, and reminders.
- Record optional time, location, and notes.
- Mark events complete or attended.
- View upcoming events.
- Link selected calendar events to My Care Card.

### My Care Card
- Save clinician-provided instructions and their source references.
- Record appointments and personal care tasks.
- Create questions for a healthcare professional.
- Edit or delete saved items.
- Mark tasks complete and questions resolved.
- Generate plain-language explanations for saved items.
- Listen to explanations using supported browser speech synthesis.
- Print or save the care card as a PDF.

### Local Data
- Report files are stored in browser IndexedDB.
- Calendar and care-card entries are stored in browser local storage.
- No cloud synchronization is currently implemented.

## Technology Stack

- React
- Vite
- JavaScript
- CSS
- Node.js and Express
- Ollama local model API
- Llama 3 8B
- PDF.js for PDF text extraction
- Tesseract.js for image OCR
- React Markdown for rendering AI explanations
- Browser storage for local persistence
- Browser speech synthesis for audio playback

## Requirements

Install the following before running the application:

- Node.js and npm
- Ollama
- The `llama3:8b` model, or another model configured for this application

The project currently uses the following local services:

- Frontend: Vite, typically at `http://localhost:5173`
- Backend: Express at `http://127.0.0.1:3001`
- Ollama: `http://127.0.0.1:11434`

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/krishnadhameliya07/motherloop.git
cd motherloop
```

You must have access to the private repository to clone it.

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Ollama

Verify that Ollama is installed:

```bash
ollama --version
```

Check the installed models:

```bash
ollama list
```

If the model is not installed, download it:

```bash
ollama pull llama3:8b
```

Verify that the model responds:

```bash
ollama run llama3:8b "Explain this sentence in simple English."
```

### 4. Configure environment variables

Create a local `.env` file in the project root, beside `package.json`.

Use the following settings:

```dotenv
OLLAMA_MODEL=llama3:8b
OLLAMA_BASE_URL=http://127.0.0.1:11434
PORT=3001
```

Do not commit `.env` or private credentials. Use `.env.example` as a safe template.

### 5. Start the backend

Open a terminal in the project root:

```bash
npm run server
```

Keep this terminal running.

### 6. Start the frontend

Open a second terminal in the project root:

```bash
npm run dev
```

Open the local URL printed by Vite.

### 7. Verify the backend

Open:

```text
http://127.0.0.1:3001/api/health
```

The response should report whether the backend, Ollama service, and configured model are available.

## Main API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Check backend and Ollama availability |
| POST | `/api/explain-report` | Explain extracted report text in English |
| POST | `/api/extract-instructions` | Extract structured instruction drafts |
| POST | `/api/explain-instruction` | Explain an individual instruction in English |

The AI API runs locally through Ollama in the current development setup.

## Testing the Application

Build the frontend:

```bash
npm run build
```

Manually test the following workflows:

1. Upload and open a synthetic postpartum discharge summary.
2. Verify that the extracted text is readable.
3. Generate an English report explanation.
4. Extract appointment and care-instruction drafts.
5. Edit, review, and confirm a draft.
6. Save a confirmed appointment to Calendar and My Care Card.
7. Create, edit, complete, and delete a calendar event.
8. Add and edit care-card instructions and questions.
9. Generate an individual instruction explanation and test audio playback.
10. Refresh the browser and verify that saved data persists.
11. Test ambiguous or conflicting dates and verify that uncertainty is surfaced.
12. Print or save My Care Card as a PDF.

Use synthetic documents for development and testing. Never rely on generated explanations as medical advice.

## Current Limitations

- English is the currently supported explanation language.
- Hindi and Kannada interface localization and explanation support are planned.
- Hindi and Kannada audio support is planned; current speech playback depends on installed browser voices.
- Scanned PDF pages do not yet have a complete PDF-page-to-image OCR workflow.
- Image OCR language support is currently limited.
- AI extraction can make mistakes. Review source text and confirm extracted details before saving.
- The calendar is local to the current browser and does not synchronize with Google Calendar or phone calendars.
- Calendar and care-card data use browser storage, which is not encrypted medical-record storage.
- There is no production-grade account system, cross-device synchronization, or clinical integration.

## Safety and Privacy

MotherLoop organizes existing information; it does not replace the advice of a healthcare professional.

- Never invent missing medical instructions.
- Do not change prescribed medication or treatment based on AI output.
- Verify dates and instructions against the original source.
- Use clinician guidance to resolve ambiguous or conflicting instructions.
- Avoid using real medical records in demos.
- Do not upload `.env`, credentials, or sensitive medical documents to GitHub.

## Contributing

1. Clone the private repository.
2. Create your own working branch or coordinate changes with the team.
3. Test your changes before committing.
4. Keep credentials and sensitive data out of Git.
5. Document new features and their limitations.

## Project Status

**Current milestone:** Functional local MVP with report upload, text extraction, English AI explanations, structured instruction drafts, Calendar, and My Care Card.

**Next milestone:** Add English, Hindi, and Kannada language settings across the interface and AI-generated explanations, followed by localized audio playback.

Built for recHERsion'26 💗
