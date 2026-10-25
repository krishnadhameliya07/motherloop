import { useEffect, useRef, useState } from 'react'
import { saveNurseLog } from '../../wellbeingStorage'

const API_URL = 'http://127.0.0.1:3001/api/nurse-vision'
const MAX_SIDE = 1024

// Nurse AI Vision (from Fourth Trimester / Saheli): take or upload a
// photo of yourself or your meal; a local vision model (llava) gives a
// gentle, non-diagnostic observation. The photo is never saved.
export default function NurseVision() {
  const [stream, setStream] = useState(null)
  const [photo, setPhoto] = useState(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const fileRef = useRef(null)

  useEffect(() => {
    if (stream && videoRef.current) videoRef.current.srcObject = stream
  }, [stream])

  // Always switch the camera off when leaving the page.
  useEffect(
    () => () => stream?.getTracks().forEach(track => track.stop()),
    [stream]
  )

  async function openCamera() {
    setError('')
    setResult(null)

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('This browser cannot open the camera. Please upload a photo instead.')
      return
    }

    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      })
      setStream(media)
    } catch {
      setError('Could not open the camera. Allow camera permission, or upload a photo instead.')
    }
  }

  function stopCamera() {
    stream?.getTracks().forEach(track => track.stop())
    setStream(null)
  }

  // Draw to a canvas, shrinking large photos so they upload quickly.
  function drawPhoto(source, width, height) {
    const scale = Math.min(1, MAX_SIDE / Math.max(width, height))
    const canvas = canvasRef.current
    canvas.width = Math.round(width * scale)
    canvas.height = Math.round(height * scale)
    canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height)
    setPhoto(canvas.toDataURL('image/jpeg', 0.85))
  }

  function capture() {
    const video = videoRef.current
    if (!video?.videoWidth) return

    drawPhoto(video, video.videoWidth, video.videoHeight)
    stopCamera()
  }

  function onFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file (JPG or PNG).')
      return
    }

    setError('')
    setResult(null)

    const image = new Image()
    const url = URL.createObjectURL(file)

    image.onload = () => {
      drawPhoto(image, image.naturalWidth, image.naturalHeight)
      URL.revokeObjectURL(url)
    }
    image.onerror = () => {
      setError('That image could not be read. Please try another photo.')
      URL.revokeObjectURL(url)
    }
    image.src = url
  }

  async function analyze() {
    if (!photo) return

    setBusy(true)
    setError('')

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: photo }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          data.error ||
            `The photo check failed (server replied ${response.status}). Restart "npm run server" and check its terminal for details.`
        )
      }

      setResult(data)
      saveNurseLog({
        ai_analysis_type: data.ai_analysis_type,
        ai_insight_text: data.ai_insight_text,
        fatigue_index: data.fatigue_index,
        alert_level: data.alert_level,
      })
    } catch (requestError) {
      setError(
        requestError.message === 'Failed to fetch'
          ? 'Could not reach the MotherLoop server. Check that "npm run server" and Ollama are running.'
          : requestError.message
      )
    } finally {
      setBusy(false)
    }
  }

  function reset() {
    stopCamera()
    setPhoto(null)
    setResult(null)
    setError('')
  }

  return (
    <section className="form-panel nurse-panel">
      <div className="nurse-heading">
        <h3>📷 Nurse AI Vision</h3>
        <p>
          Take or upload a photo of yourself or your meal. The AI gently looks
          for signs of tiredness or how your meal supports recovery. Your photo
          is never saved.
        </p>
      </div>

      <div className={`nurse-camera ${stream || photo ? 'has-media' : ''}`}>
        {stream ? (
          <video ref={videoRef} autoPlay playsInline muted />
        ) : photo ? (
          <img src={photo} alt="Your photo preview" />
        ) : (
          <div className="nurse-empty">
            <span aria-hidden="true">📸</span>
            <p>For a tiredness check, make sure your face is well lit.</p>
            <div className="nurse-buttons">
              <button type="button" className="primary-button" onClick={openCamera}>
                Open camera
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => fileRef.current?.click()}
              >
                Upload photo
              </button>
            </div>
          </div>
        )}

        {stream && (
          <button
            type="button"
            className="nurse-shutter"
            onClick={capture}
            aria-label="Take photo"
          />
        )}

        {(stream || photo) && !busy && (
          <button
            type="button"
            className="nurse-close"
            onClick={reset}
            aria-label="Discard photo"
          >
            ×
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={onFile}
      />
      <canvas ref={canvasRef} hidden />

      {error && (
        <p className="status-message" role="alert">
          {error}
        </p>
      )}

      {photo && !result && !busy && (
        <button type="button" className="primary-button nurse-analyze" onClick={analyze}>
          ✨ Check this photo
        </button>
      )}

      {busy && (
        <p className="status-message" role="status">
          The AI nurse is looking at your photo… On a laptop this can take a
          minute or two.
        </p>
      )}

      {result && (
        <div className={`nurse-result level-${result.alert_level}`}>
          <div className="nurse-result-top">
            <span>AI NURSE INSIGHT</span>
            {result.fatigue_index !== null && (
              <span className="status-pill status-pending">
                Tiredness {result.fatigue_index}/10
              </span>
            )}
          </div>
          <p>&ldquo;{result.ai_insight_text}&rdquo;</p>
          <button type="button" className="text-button" onClick={reset}>
            ↻ Check another photo
          </button>
          <p className="field-hint">
            This is a supportive AI observation from a photo, not a medical
            assessment. Tell your doctor about any symptoms that worry you.
          </p>
        </div>
      )}
    </section>
  )
}
