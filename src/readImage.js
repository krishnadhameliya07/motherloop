
import { createWorker } from 'tesseract.js'

export async function readImage(file) {
  const worker = await createWorker('eng')

  try {
    const result = await worker.recognize(file)
    return result.data.text.trim()
  } finally {
    await worker.terminate()
  }
}
