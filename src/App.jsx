
import { readPdf } from './readPdf'
import { readImage } from './readImage'
import { useState, useEffect } from 'react'
import './App.css'
import { saveReport, getReports, deleteReport } from './reportStorage'
import ReactMarkdown from 'react-markdown'

function App() {
  const [activeTab, setActiveTab] = useState('Home')
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [extractedText, setExtractedText] = useState('')
  const [explanation, setExplanation] = useState('')
  const [language, setLanguage] = useState('English')

  async function loadReports() {
    try {
      const savedReports = await getReports()
      savedReports.sort(
        (a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)
      )
      setReports(savedReports)
    } catch (error) {
      console.error('Loading reports failed:', error)
      setMessage('Could not load reports. Please refresh the page.')
    }
  }

  useEffect(() => {
    loadReports()
  }, [])

  async function handleUpload(event) {
    const files = Array.from(event.target.files || [])
    event.target.value = ''

    if (!files.length) return

    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
    ]

    const validFiles = files.filter(
      file =>
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
      let savedCount = 0

      for (const file of validFiles) {
        await saveReport(file)
        savedCount++
      }

      await loadReports()
      setMessage(`${savedCount} report(s) saved successfully! 💗`)
    } catch (error) {
      console.error('Saving reports failed:', error)
      setMessage('Could not save reports. Please try smaller files.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this report?')) {
      return
    }

    try {
      await deleteReport(id)
      await loadReports()
      setMessage('Report deleted successfully.')
    } catch (error) {
      console.error('Deleting report failed:', error)
      setMessage('Could not delete this report.')
    }
  }

  
async function handleReadReport(report) {
  try {
    setMessage('Reading your report... 💗')

    let text = ''

    if (report.name.toLowerCase().endsWith('.pdf')) {
      text = await readPdf(report.file)
    } else {
      text = await readImage(report.file)
    }

    if (!text) {
      setMessage(
        'No readable text found. Please try a clearer report.'
      )
      return
    }

    setExtractedText(text)
    setMessage('')
  } catch (error) {
    console.error('Report reading failed:', error)
    setMessage('Could not read this report. Please try again.')
  }
}


async function handleExplainReport() {
  if (!extractedText) {
    setMessage('Please read a report first.')
    return
  }

  try {
    setMessage('MotherLoop is explaining your report... 💗')
    setExplanation('')

    const response = await fetch(
      'http://localhost:3001/api/explain-report',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportText: extractedText,
          language,
        }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Could not explain the report.')
    }

    setExplanation(data.explanation)
    setMessage('')
  } catch (error) {
    console.error('Explanation failed:', error)
    setMessage(
      error.message || 'Could not connect to MotherLoop AI.'
    )
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

  const tabs = ['Home', 'My Reports', 'Calendar', 'My Care Card']

  return (
    <div className="app">
      <header className="header">
        <h1>🌸 MotherLoop</h1>
        <p>Your little companion through motherhood</p>
      </header>

      <nav className="navigation">
        {tabs.map(tab => (
          <button
            key={tab}
            className={activeTab === tab ? 'active' : ''}
            onClick={() => {
              setActiveTab(tab)
              setMessage('')
              if (tab === 'My Reports') loadReports()
            }}
          >
            {tab}
          </button>
        ))}
      </nav>

      <main className="content">
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
                <div className="hero-note">
                  You are doing great, Mama! ♡
                </div>
              </div>
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
                <p>Keep track of past visits and upcoming checkups.</p>
                <button onClick={() => setActiveTab('Calendar')}>
                  View calendar →
                </button>
              </article>

              <article className="card care-card">
                <div className="card-icon">💗</div>
                <span className="card-tag">MADE FOR YOU</span>
                <h3>My Care Card</h3>
                <p>Find your important care instructions in one place.</p>
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

        {activeTab === 'My Reports' && (
          <section className="reports-page">
            <span className="eyebrow">YOUR PERSONAL DOCUMENT LIBRARY</span>
            <h2>My Medical Reports 📄</h2>
            <p className="page-description">
              Keep your reports safe and easy to find on this device.
            </p>

            <label className="upload-area">
              <span className="upload-icon">📤</span>
              <strong>
                {loading ? 'Saving reports...' : 'Upload a medical report'}
              </strong>
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
              <p className="status-message" role="status">
                {message}
              </p>
            )}
  
{extractedText && (
  <section className="extracted-text">
    <h3>Extracted Report Text 📄</h3>
    <pre>{extractedText}</pre>

    <div className="explanation-controls">
      <label htmlFor="report-language">
        Choose explanation language
      </label>

      <select
        id="report-language"
        value={language}
        onChange={event => setLanguage(event.target.value)}
      >
        <option value="English">English</option>
        <option value="Hindi">हिन्दी (Hindi)</option>
        <option value="Kannada">ಕನ್ನಡ (Kannada)</option>
        <option value="Tamil">தமிழ் (Tamil)</option>
      </select>

      <button
        className="primary-button"
        onClick={handleExplainReport}
      >
        ✨ Explain My Report
      </button>

      {explanation && (
  <div className="report-explanation">
    <h3>💗 Your Report Explained</h3>
    <div className="explanation-content">
      <ReactMarkdown>{explanation}</ReactMarkdown>
    </div>
  </div>
)}
    </div>
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
                <p>
                  Upload your first report to start your personal library.
                </p>
              </div>
            ) : (
              <div className="report-list">
                {reports.map(report => (
                  <article className="report-item" key={report.id}>
                    <div className="report-file-icon">
                      {report.type === 'application/pdf' ||
                      /\.pdf$/i.test(report.name)
                        ? '📕'
                        : '🖼️'}
                    </div>

                    <div className="report-info">
                      <strong>{report.name}</strong>
                      <span>
                        Uploaded{' '}
                        {new Date(report.uploadedAt).toLocaleDateString()}
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
                    
{(/\.(pdf|jpe?g|png)$/i).test(report.name) && (
  <button
    className="open-report-button"
    onClick={() => handleReadReport(report)}
  >
    Read Report
  </button>
)}


                    <button
                      className="delete-report-button"
                      onClick={() => handleDelete(report.id)}
                      aria-label={`Delete ${report.name}`}
                      title="Delete report"
                    >
                      🗑️
                    </button>
                  </article>
                ))}
              </div>
            )}

            <p className="storage-note">
              Reports are stored in this browser on this device.
              They are not backed up to the cloud.
            </p>
          </section>
        )}

        {activeTab === 'Calendar' && (
          <section className="selected-section">
            <span className="eyebrow">YOUR PERSONAL CARE SPACE</span>
            <h2>Your Care Calendar 🗓️</h2>
            <p>
              Automatic date detection and appointment scheduling
              will be added next.
            </p>
            <button
              className="primary-button"
              onClick={() => setActiveTab('Home')}
            >
              ← Back to Home
            </button>
          </section>
        )}

        {activeTab === 'My Care Card' && (
          <section className="selected-section">
            <span className="eyebrow">YOUR PERSONAL CARE SPACE</span>
            <h2>Your Care Card 💗</h2>
            <p>
              Your confirmed care instructions will appear here.
            </p>
            <button
              className="primary-button"
              onClick={() => setActiveTab('Home')}
            >
              ← Back to Home
            </button>
          </section>
        )}
      </main>

      <footer className="footer">
        Made with love for every mama 🌷
      </footer>
    </div>
  )
}

export default App
