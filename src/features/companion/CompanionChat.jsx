import { useEffect, useRef, useState } from 'react'

const API_URL = 'http://127.0.0.1:3001/api/companion-chat'
const MAX_MESSAGE_LENGTH = 2000

// Phrases that always show a fixed safety message, independent of
// whatever the AI model replies.
const CRISIS_PATTERNS = [
  /\bkill(ing)? myself\b/i,
  /\bsuicid/i,
  /\bend(ing)? my life\b/i,
  /\b(harm|hurt)(ing)? (myself|my ?self)\b/i,
  /\b(harm|hurt)(ing)? (my|the) baby\b/i,
  /\bwant to die\b/i,
  /\bdon'?t want to (live|be here)\b/i,
  /\bself[- ]harm/i,
]

function needsSafetyMessage(text) {
  return CRISIS_PATTERNS.some(pattern => pattern.test(text))
}

export default function CompanionChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showSafety, setShowSafety] = useState(false)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading, showSafety])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  async function sendMessage(event) {
    event.preventDefault()

    const text = input.trim().slice(0, MAX_MESSAGE_LENGTH)
    if (!text || loading) return

    const nextMessages = [...messages, { role: 'user', content: text }]

    setMessages(nextMessages)
    setInput('')
    setError('')
    setLoading(true)

    if (needsSafetyMessage(text)) setShowSafety(true)

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Only recent messages are needed; the server also limits this.
        body: JSON.stringify({ messages: nextMessages.slice(-10) }),
      })

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'The companion could not reply.')
      }

      // The reply streams in as plain text; show it word by word.
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let reply = ''

      setMessages(previous => [...previous, { role: 'assistant', content: '' }])

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        reply += decoder.decode(value, { stream: true })

        const current = reply
        setMessages(previous => [
          ...previous.slice(0, -1),
          { role: 'assistant', content: current },
        ])
      }

      reply += decoder.decode()

      if (!reply.trim()) {
        setMessages(previous => previous.slice(0, -1))
        throw new Error('The companion returned an empty reply.')
      }

      const finalReply = reply.trim()
      setMessages(previous => [
        ...previous.slice(0, -1),
        { role: 'assistant', content: finalReply },
      ])
    } catch (requestError) {
      console.error('Companion chat failed:', requestError)

      // Remove an empty reply bubble if nothing arrived.
      setMessages(previous => {
        const last = previous[previous.length - 1]
        return last?.role === 'assistant' && !last.content
          ? previous.slice(0, -1)
          : previous
      })

      setError(
        requestError.message === 'Failed to fetch'
          ? 'Could not reach the MotherLoop server. Check that "npm run server" and Ollama are running.'
          : requestError.message
      )
    } finally {
      setLoading(false)
    }
  }

  function clearChat() {
    setMessages([])
    setError('')
    setShowSafety(false)
  }

  return (
    <div className="companion no-print">
      {open && (
        <section
          className="companion-panel"
          role="dialog"
          aria-label="3AM AI Companion"
        >
          <header className="companion-header">
            <span className="companion-avatar" aria-hidden="true">🌙</span>
            <div>
              <strong>3AM Companion</strong>
              <span>Here to listen, any time</span>
            </div>
            {messages.length > 0 && (
              <button
                type="button"
                className="companion-clear"
                onClick={clearChat}
              >
                Clear
              </button>
            )}
            <button
              type="button"
              className="companion-close"
              onClick={() => setOpen(false)}
              aria-label="Close companion"
            >
              ×
            </button>
          </header>

          <div className="companion-messages" ref={scrollRef} aria-live="polite">
            {messages.length === 0 && (
              <div className="companion-welcome">
                <p>
                  &ldquo;It&apos;s quiet, and I&apos;m right here with you.
                  How are you doing, Mama?&rdquo;
                </p>
                <span>
                  I&apos;m an AI companion, not a medical professional. Your
                  chat isn&apos;t saved after you close the app.
                </span>
              </div>
            )}

            {messages.map((message, index) =>
              message.role === 'assistant' && !message.content ? (
                <div
                  key={`${index}-typing`}
                  className="companion-bubble from-ai companion-typing"
                  aria-label="Companion is typing"
                >
                  <span />
                  <span />
                  <span />
                </div>
              ) : (
                <div
                  key={`${index}-${message.role}`}
                  className={`companion-bubble ${message.role === 'user' ? 'from-user' : 'from-ai'}`}
                >
                  {message.content}
                </div>
              )
            )}

            {showSafety && (
              <div className="companion-safety" role="alert">
                <strong>You matter, and help is available now.</strong>
                <p>
                  If you are thinking about harming yourself or your baby, or
                  feel you can&apos;t stay safe, please call your local
                  emergency number or go to the nearest emergency department
                  now. Contact your doctor, and tell someone you trust.
                </p>
              </div>
            )}

            {loading && messages[messages.length - 1]?.role === 'user' && (
              <div className="companion-bubble from-ai companion-typing">
                <span />
                <span />
                <span />
              </div>
            )}

            {error && (
              <p className="companion-error" role="status">
                {error}
              </p>
            )}
          </div>

          <form className="companion-input" onSubmit={sendMessage}>
            <input
              ref={inputRef}
              value={input}
              maxLength={MAX_MESSAGE_LENGTH}
              onChange={event => setInput(event.target.value)}
              placeholder="Type how you're feeling…"
              aria-label="Message"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              aria-label="Send"
            >
              ➤
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className={`companion-fab ${open ? 'is-open' : ''}`}
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        aria-label={open ? 'Close 3AM Companion' : 'Open 3AM Companion'}
      >
        {open ? '×' : '🌙'}
        {!open && <span className="companion-fab-label">3AM</span>}
      </button>
    </div>
  )
}
