# Make-a-pdf

A simple web tool for combining multiple documents and images into a single PDF.

## What this tool does

With this application, you can:

- select multiple files
- change the file order
- combine documents and images into one PDF
- download the final result directly in your browser

## Supported file types

This version supports:

- PDF
- PNG
- JPG / JPEG
- WEBP
- GIF
- TXT
- MD
- DOCX

## How to use

1. Open `index.html` through a local server such as Live Server.
2. Click `Bestanden kiezen`.
3. Select the documents and images you want to merge.
4. Adjust the order using the `Omhoog` and `Omlaag` buttons.
5. Click `Maak PDF`.
6. The new PDF will be downloaded automatically.

## Run locally with npm

If you prefer to run the project through Vite:

```bash
npm install
npm run dev
```

Then open the local URL shown in your terminal.

## Project structure

```text
index.html
src/main.js
src/style.css
```

## Note

All processing happens locally in the browser. Your files are not uploaded to an external server.
