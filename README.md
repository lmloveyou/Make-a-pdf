# Make-a-pdf

Een eenvoudige webtool om meerdere documenten en afbeeldingen samen te voegen tot één PDF.

## Wat deze tool doet

Met deze applicatie kun je:

- meerdere bestanden selecteren
- de volgorde van de bestanden aanpassen
- documenten en afbeeldingen combineren in één PDF
- het resultaat rechtstreeks downloaden in je browser

## Ondersteunde bestanden

Deze versie ondersteunt:

- PDF
- PNG
- JPG / JPEG
- WEBP
- GIF
- TXT
- MD
- DOCX

## Hoe gebruiken

1. Open `index.html` via een lokale server, bijvoorbeeld Live Server.
2. Klik op `Bestanden kiezen`.
3. Selecteer de documenten en afbeeldingen die je wilt samenvoegen.
4. Zet de volgorde juist met de knoppen `Omhoog` en `Omlaag`.
5. Klik op `Maak PDF`.
6. De nieuwe PDF wordt automatisch gedownload.

## Lokaal starten met npm

Als je het project liever via Vite start:

```bash
npm install
npm run dev
```

Daarna open je de lokale URL die in de terminal verschijnt.

## Projectstructuur

```text
index.html
src/main.js
src/style.css
```

## Opmerking

De verwerking gebeurt lokaal in de browser. Je bestanden worden dus niet naar een externe server gestuurd.
