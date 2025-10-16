# MoodCalendar

A simple, responsive mood-tracking web app with:
- Calendar mood logging (localStorage powered)
- 7‑day Weekly Tracker
- Printable/PDF Diary export with a cover, monthly emoji calendar, and chronological entries

## Features
- Calendar
  - Log a mood per day with an optional story and image
  - Past/future constraints to keep entries realistic
  - Stable 6‑week grid for consistent sizes
- Weekly Tracker
  - 7-day challenge with progress
  - Completed days show a green→blue gradient; non-completed stay white
- Diary Export (PDF)
  - Prompts for your name and renders a cover: logo, “MY MOOD DIARY”, “By: <name>”, sandwiched by purple bands
  - Includes a month calendar page with mood emojis for days that have entries
  - Lists all entries (oldest → newest), each on its own page
  - Custom page badge starts at 1 on the first entries page

## Getting started
1. Serve the project locally (any static server). On Windows PowerShell, for example:
   - Python 3 installed:
     ```powershell
     cd "c:\\Users\\Mariel Cid Camay\\OneDrive\\Desktop\\Second to the last sem (Hopefully)\\moodcalendar"
     python -m http.server 8000
     ```
2. Open http://localhost:8000 in your browser.

## How to use
- Navigate between Calendar, Weekly Tracker, and Diary using the navbar.
- Click a day in the calendar (not in the future) to log or update your mood.
- Start a 7‑day tracker from the Weekly Tracker view.
- Export your diary from the Diary view by clicking “Export as PDF”. You’ll be asked for your full name; it appears on the cover.

## PDF export tips
- In the Print/Save dialog:
  - Turn off “Headers and footers”
  - Keep scale at 100% (or Default)
  - Margins: None or Default both work (the layout insets content appropriately)
- The first two pages are the cover and the monthly calendar; page numbers begin on the entries pages.
- Adjust page-number position by editing `.page-badge` in `js/diaryGenerator.js`:
  - Search for `.page-badge { bottom: 0.8in; right: 0.8in; }` and tweak to your preference (e.g., `6mm`).

## Project structure
```
index.html
assets/
  moodcalendarlogo.png
  moodcalendarbanner.png
css/
  styles.css
js/
  main.js
  calendar.js
  moodTracker.js
  diaryGenerator.js
```

## Notes
- All data is stored in the browser’s localStorage; exporting to PDF uses the browser’s print-to-PDF.
- Tested primarily in Chromium-based browsers (Chrome/Edge). PDF rendering can vary slightly across browsers.
