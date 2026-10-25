
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

function extractPageLines(items) {
  const textItems = items
    .filter(item => typeof item.str === 'string' && item.str.trim())
    .map(item => ({
      text: item.str.trim(),
      x: item.transform?.[4] ?? 0,
      y: item.transform?.[5] ?? 0,
      width: item.width ?? 0,
      height: item.height ?? 0,
      hasEOL: Boolean(item.hasEOL),
    }))
    .sort((a, b) => {
      const yDiff = b.y - a.y
      return Math.abs(yDiff) > 2.5 ? yDiff : a.x - b.x
    })

  const lines = []

  for (const item of textItems) {
    let line = lines.find(
      existing => Math.abs(existing.y - item.y) <= 2.5
    )

    if (!line) {
      line = {
        y: item.y,
        items: [],
      }

      lines.push(line)
    }

    line.items.push(item)
  }

  lines.sort((a, b) => b.y - a.y)

  const renderedLines = lines
    .map(line => {
      line.items.sort((a, b) => a.x - b.x)

      let value = ''
      let previous = null

      for (const item of line.items) {
        if (previous) {
          const previousEnd = previous.x + previous.width
          const gap = item.x - previousEnd

          if (gap > 1.5 && value && !/\s$/.test(value)) {
            value += ' '
          }
        }

        value += item.text
        previous = item
      }

      return {
        text: value.replace(/\s+/g, ' ').trim(),
        y: line.y,
        hasEOL: line.items.some(item => item.hasEOL),
      }
    })
    .filter(line => line.text)

  if (renderedLines.length < 2) {
    return renderedLines.map(line => line.text).join('\n')
  }

  const gaps = []

  for (let i = 1; i < renderedLines.length; i++) {
    const gap = renderedLines[i - 1].y - renderedLines[i].y

    if (gap > 0) {
      gaps.push(gap)
    }
  }

  const sortedGaps = [...gaps].sort((a, b) => a - b)

  const typicalGap = sortedGaps.length
    ? sortedGaps[Math.floor(sortedGaps.length / 2)]
    : 12

  const paragraphGap = Math.max(
    typicalGap * 1.55,
    typicalGap + 4
  )

  let output = ''

  for (let i = 0; i < renderedLines.length; i++) {
    const current = renderedLines[i]

    if (i > 0) {
      const verticalGap =
        renderedLines[i - 1].y - current.y

      output += verticalGap > paragraphGap ? '\n\n' : '\n'
    }

    output += current.text
  }

  return output.trim()
}

export async function readPdf(file) {
  const buffer = await file.arrayBuffer()

  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
  }).promise

  const pages = []

  for (
    let pageNumber = 1;
    pageNumber <= pdf.numPages;
    pageNumber++
  ) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    const pageText = extractPageLines(content.items)

    pages.push(
      `Page ${pageNumber}${
        pageText
          ? `\n\n${pageText}`
          : '\n\n[No embedded text found on this page. This may be a scanned page requiring OCR.]'
      }`
    )
  }

  return pages
    .join('\n\n────────────────────────\n\n')
    .trim()
}
