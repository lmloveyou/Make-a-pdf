import { PDFDocument, StandardFonts, rgb } from 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm'
import mammoth from 'https://cdn.jsdelivr.net/npm/mammoth@1.12.0/+esm'

const app = document.querySelector('#app')

const files = []

app.innerHTML = `
  <main class="shell">
    <section class="hero-card">
      <p class="eyebrow">PDF bundelaar</p>
      <h1>Meerdere documenten en afbeeldingen samenvoegen naar een PDF</h1>
      <p class="intro">
        Kies je bestanden, zet ze in de juiste volgorde en exporteer alles naar een
        enkel PDF-bestand. Verwerking gebeurt lokaal in je browser.
      </p>
      <div class="cta-row">
        <label class="upload-button" for="file-input">Bestanden kiezen</label>
        <input
          id="file-input"
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.md,.docx"
          multiple
        />
        <button id="merge-button" class="primary-button" type="button">Maak PDF</button>
      </div>
      <p class="support-text">
        Ondersteund: PDF, PNG, JPG, WEBP, GIF, TXT, MD en DOCX.
      </p>
    </section>

    <section class="workspace">
      <div class="workspace-header">
        <div>
          <h2>Volgorde van je bestanden</h2>
          <p>Gebruik de pijlen om de pagina-opbouw te bepalen.</p>
        </div>
        <button id="clear-button" class="ghost-button" type="button">Alles wissen</button>
      </div>

      <div id="status" class="status-panel">Nog geen bestanden geselecteerd.</div>
      <ul id="file-list" class="file-list"></ul>
    </section>
  </main>
`

const fileInput = document.querySelector('#file-input')
const mergeButton = document.querySelector('#merge-button')
const clearButton = document.querySelector('#clear-button')
const statusPanel = document.querySelector('#status')
const fileList = document.querySelector('#file-list')

fileInput.addEventListener('change', (event) => {
  const incoming = Array.from(event.target.files ?? [])

  for (const file of incoming) {
    files.push({
      id: crypto.randomUUID(),
      file,
      label: describeFile(file),
    })
  }

  sortFilesByName()

  fileInput.value = ''
  renderList()
  setStatus(`${files.length} bestand(en) klaar om samen te voegen.`, 'info')
})

clearButton.addEventListener('click', () => {
  files.length = 0
  renderList()
  setStatus('De lijst is leeggemaakt.', 'info')
})

mergeButton.addEventListener('click', async () => {
  if (!files.length) {
    setStatus('Voeg eerst minstens één bestand toe.', 'error')
    return
  }

  mergeButton.disabled = true
  setStatus('PDF wordt opgebouwd...', 'busy')

  try {
    const mergedPdf = await PDFDocument.create()
    const textFont = await mergedPdf.embedFont(StandardFonts.Helvetica)

    for (let index = 0; index < files.length; index += 1) {
      const entry = files[index]
      setStatus(`Verwerk ${index + 1} van ${files.length}: ${entry.file.name}`, 'busy')
      await appendFileToPdf(mergedPdf, textFont, entry.file)
    }

    const bytes = await mergedPdf.save()
    downloadPdf(bytes, buildOutputName(files))
    setStatus('Je PDF is klaar en werd gedownload.', 'success')
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : String(error)
    setStatus(
      `Samenvoegen mislukt: ${message}`,
      'error',
    )
  } finally {
    mergeButton.disabled = false
  }
})

function renderList() {
  if (!files.length) {
    fileList.innerHTML = ''
    return
  }

  fileList.innerHTML = files
    .map(
      (entry, index) => `
        <li class="file-item">
          <div class="file-copy">
            <strong>${escapeHtml(entry.file.name)}</strong>
            <span>${entry.label}</span>
          </div>
          <div class="file-actions">
            <button data-action="up" data-id="${entry.id}" type="button" aria-label="Omhoog">Omhoog</button>
            <button data-action="down" data-id="${entry.id}" type="button" aria-label="Omlaag">Omlaag</button>
            <button data-action="remove" data-id="${entry.id}" type="button" aria-label="Verwijderen">Verwijder</button>
          </div>
        </li>`,
    )
    .join('')

  fileList.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
      const { action, id } = button.dataset
      const currentIndex = files.findIndex((entry) => entry.id === id)

      if (currentIndex === -1) {
        return
      }

      if (action === 'remove') {
        files.splice(currentIndex, 1)
      }

      if (action === 'up' && currentIndex > 0) {
        ;[files[currentIndex - 1], files[currentIndex]] = [files[currentIndex], files[currentIndex - 1]]
      }

      if (action === 'down' && currentIndex < files.length - 1) {
        ;[files[currentIndex], files[currentIndex + 1]] = [files[currentIndex + 1], files[currentIndex]]
      }

      renderList()
    })
  })
}

function sortFilesByName() {
  files.sort((left, right) =>
    left.file.name.localeCompare(right.file.name, undefined, {
      numeric: true,
      sensitivity: 'base',
    }),
  )
}

async function appendFileToPdf(pdfDoc, font, file) {
  const extension = getExtension(file.name)

  if (file.type === 'application/pdf' || extension === 'pdf') {
    const sourcePdf = await PDFDocument.load(await file.arrayBuffer())
    const pages = await pdfDoc.copyPages(sourcePdf, sourcePdf.getPageIndices())

    for (const page of pages) {
      pdfDoc.addPage(page)
    }

    return
  }

  if (isImageFile(file, extension)) {
    await appendImageToPdf(pdfDoc, file)
    return
  }

  if (isTextFile(file, extension)) {
    const rawText = await extractText(file, extension)

    if (!rawText.trim()) {
      throw new Error(`"${file.name}" bevat geen leesbare tekst.`)
    }

    appendTextToPdf(pdfDoc, font, rawText, file.name)
    return
  }

  throw new Error(`Bestandstype niet ondersteund: ${file.name}`)
}

async function appendImageToPdf(pdfDoc, file) {
  const image = await loadRenderableImage(file)
  const bytes = await rasterizeImage(image.element)
  const embeddedImage = await pdfDoc.embedPng(bytes)

  const page = pdfDoc.addPage([595.28, 841.89])
  const margin = 36
  const maxWidth = page.getWidth() - margin * 2
  const maxHeight = page.getHeight() - margin * 2
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1)
  const width = image.width * scale
  const height = image.height * scale
  const x = (page.getWidth() - width) / 2
  const y = (page.getHeight() - height) / 2

  page.drawImage(embeddedImage, { x, y, width, height })
}

function appendTextToPdf(pdfDoc, font, text, title) {
  const pageWidth = 595.28
  const pageHeight = 841.89
  const margin = 48
  const fontSize = 12
  const lineHeight = 18
  const titleSize = 16
  const maxWidth = pageWidth - margin * 2

  let page = pdfDoc.addPage([pageWidth, pageHeight])
  let cursorY = pageHeight - margin

  page.drawText(title, {
    x: margin,
    y: cursorY,
    size: titleSize,
    font,
    color: rgb(0.12, 0.16, 0.24),
  })

  cursorY -= 30

  const paragraphs = text.replace(/\r\n/g, '\n').split('\n')

  for (const paragraph of paragraphs) {
    const lines = wrapText(paragraph || ' ', font, fontSize, maxWidth)

    for (const line of lines) {
      if (cursorY < margin) {
        page = pdfDoc.addPage([pageWidth, pageHeight])
        cursorY = pageHeight - margin
      }

      page.drawText(line, {
        x: margin,
        y: cursorY,
        size: fontSize,
        font,
        color: rgb(0.18, 0.2, 0.25),
      })

      cursorY -= lineHeight
    }
  }
}

function wrapText(text, font, fontSize, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean)

  if (!words.length) {
    return [' ']
  }

  const lines = []
  let currentLine = words[0]

  for (let index = 1; index < words.length; index += 1) {
    const candidate = `${currentLine} ${words[index]}`

    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      currentLine = candidate
    } else {
      lines.push(currentLine)
      currentLine = words[index]
    }
  }

  lines.push(currentLine)
  return lines
}

async function extractText(file, extension) {
  if (extension === 'docx') {
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
    return result.value
  }

  return new TextDecoder().decode(await file.arrayBuffer())
}

async function loadRenderableImage(file) {
  const objectUrl = URL.createObjectURL(file)

  try {
    return await new Promise((resolve, reject) => {
      const image = new Image()
      image.onload = () =>
        resolve({
          element: image,
          width: image.naturalWidth,
          height: image.naturalHeight,
        })
      image.onerror = () => reject(new Error(`Afbeelding kon niet geladen worden: ${file.name}`))
      image.src = objectUrl
    })
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

async function rasterizeImage(image) {
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Canvas kon niet worden voorbereid voor afbeeldingsconversie.')
  }

  context.drawImage(image, 0, 0)

  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error('Afbeelding kon niet worden omgezet naar PNG voor de PDF.'))
        return
      }

      resolve(await blob.arrayBuffer())
    }, 'image/png')
  })
}

function isImageFile(file, extension) {
  return file.type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(extension)
}

function isTextFile(file, extension) {
  return ['txt', 'md', 'docx'].includes(extension) || file.type.startsWith('text/')
}

function getExtension(name) {
  return name.split('.').pop()?.toLowerCase() ?? ''
}

function setStatus(message, kind) {
  statusPanel.textContent = message
  statusPanel.dataset.kind = kind
}

function describeFile(file) {
  const extension = getExtension(file.name)
  const size = `${(file.size / 1024 / 1024).toFixed(2)} MB`

  if (file.type === 'application/pdf' || extension === 'pdf') {
    return `PDF • ${size}`
  }

  if (isImageFile(file, extension)) {
    return `Afbeelding • ${size}`
  }

  if (isTextFile(file, extension)) {
    return `Document • ${size}`
  }

  return `Onbekend type • ${size}`
}

function buildOutputName(entries) {
  if (entries.length === 1) {
    const baseName = entries[0].file.name.replace(/\.[^.]+$/, '')
    return `${baseName}-samengevoegd.pdf`
  }

  return `samengevoegde-bestanden-${new Date().toISOString().slice(0, 10)}.pdf`
}

function downloadPdf(bytes, filename) {
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  link.click()

  URL.revokeObjectURL(url)
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
