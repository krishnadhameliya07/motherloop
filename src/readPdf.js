
import * as pdfjsLib from 'pdfjs-dist'

import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

export async function readPdf(file) {
  const buffer = await file.arrayBuffer()

  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
  }).promise

  let fullText = ''

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()

    const pageText = content.items
      .map(item => ('str' in item ? item.str : ''))
      .join(' ')

    fullText += `\n\nPage ${pageNumber}\n${pageText}`
  }

  return fullText.trim()
}
