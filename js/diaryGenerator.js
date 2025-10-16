/**
 * Diary Generator Module
 * Handles diary view and simple PDF/print export functionality
 */

const DiaryGeneratorModule = (function() {
    let currentFilter = 'all';

    /**
     * Format date for display
     */
    function formatDisplayDate(dateString) {
        const date = CalendarModule.parseDate(dateString);
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }

    /**
     * Get mood label
     */
    function getMoodLabel(mood) {
        const moodLabels = {
            'happy': 'Happy',
            'sad': 'Sad',
            'angry': 'Angry',
            'fearful': 'Fearful',
            'content': 'Content',
            'excited': 'Excited',
            'anxious': 'Anxious',
            'loved': 'Loved',
            'tired': 'Tired',
            'stressed': 'Stressed'
        };
        return moodLabels[mood] || 'Unknown';
    }

    /**
     * Filter entries based on selected filter
     */
    function filterEntries(entries) {
        const today = new Date();
        const entriesArray = Object.entries(entries).map(([date, entry]) => ({
            date,
            ...entry
        }));

        // Sort by date (newest first)
        entriesArray.sort((a, b) => {
            return new Date(b.date) - new Date(a.date);
        });

        if (currentFilter === 'all') {
            return entriesArray;
        }

        if (currentFilter === 'week') {
            const oneWeekAgo = new Date(today);
            oneWeekAgo.setDate(today.getDate() - 7);
            
            return entriesArray.filter(entry => {
                const entryDate = CalendarModule.parseDate(entry.date);
                return entryDate >= oneWeekAgo;
            });
        }

        if (currentFilter === 'month') {
            const oneMonthAgo = new Date(today);
            oneMonthAgo.setMonth(today.getMonth() - 1);
            
            return entriesArray.filter(entry => {
                const entryDate = CalendarModule.parseDate(entry.date);
                return entryDate >= oneMonthAgo;
            });
        }

        return entriesArray;
    }

    /**
     * Render diary entries
     */
    function renderDiary() {
        const diaryContainer = document.getElementById('diary-entries');
        if (!diaryContainer) return;

        const entries = StorageModule ? StorageModule.getAllEntries() : {};
        const filteredEntries = filterEntries(entries);

        if (filteredEntries.length === 0) {
            diaryContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📔</div>
                    <h3>No Diary Entries Yet</h3>
                    <p>Start logging your moods to create your personalized diary.</p>
                </div>
            `;
            return;
        }

        diaryContainer.innerHTML = '';

        filteredEntries.forEach(entry => {
            const entryElement = document.createElement('div');
            entryElement.className = 'diary-entry';
            
            const moodEmoji = CalendarModule.getMoodEmoji(entry.mood);
            const moodLabel = getMoodLabel(entry.mood);
            const formattedDate = formatDisplayDate(entry.date);

            let imageHTML = '';
            if (entry.image) {
                imageHTML = `<img src="${entry.image}" alt="Memory from ${formattedDate}" class="diary-entry-image">`;
            }

            entryElement.innerHTML = `
                <button class="delete-entry-btn" data-date="${entry.date}" title="Delete this entry">
                    🗑️ Delete
                </button>
                <div class="diary-entry-header">
                    <div class="diary-entry-date">${formattedDate}</div>
                    <div class="diary-entry-mood">
                        <span>${moodEmoji}</span>
                        <span>${moodLabel}</span>
                    </div>
                </div>
                <div class="diary-entry-story">${escapeHtml(entry.story)}</div>
                ${imageHTML}
            `;

            diaryContainer.appendChild(entryElement);
            
            // Add delete event listener
            const deleteBtn = entryElement.querySelector('.delete-entry-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (window.ConfirmationModule) {
                        window.ConfirmationModule.show(
                            'Delete Entry',
                            `Are you sure you want to delete the entry for ${formattedDate}? This action cannot be undone.`,
                            () => {
                                if (StorageModule) {
                                    StorageModule.deleteEntry(entry.date);
                                    renderDiary();
                                    CalendarModule.renderCalendar();
                                    
                                    // Update weekly tracker progress bar
                                    if (MoodTrackerModule) {
                                        MoodTrackerModule.handleEntryDeletion(entry.date);
                                    }
                                    
                                    if (window.ToastModule) {
                                        window.ToastModule.show('Entry deleted successfully', 'success');
                                    }
                                }
                            }
                        );
                    }
                });
            }
        });
    }

    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Build a printable month calendar (current month) with mood emojis
     */
    function buildPrintableMonthCalendarHTML(allEntries, targetDate = new Date()) {
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth(); // 0-11
        const firstOfMonth = new Date(year, month, 1);
        const monthName = firstOfMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const startDay = firstOfMonth.getDay(); // 0=Sun..6=Sat
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const entriesMap = allEntries || {};

        // Build 42 cells (6 weeks) for a stable grid
        const cells = [];
        for (let i = 0; i < 42; i++) {
            const dayNum = i - startDay + 1;
            if (i < startDay || dayNum > daysInMonth) {
                cells.push({ empty: true });
            } else {
                const dateStr = CalendarModule.formatDate(new Date(year, month, dayNum));
                const entry = entriesMap[dateStr];
                const emoji = entry ? CalendarModule.getMoodEmoji(entry.mood) : '';
                cells.push({ empty: false, dayNum, emoji });
            }
        }

        const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const headersHTML = weekdays.map(w => `<div class="cal-hdr">${w}</div>`).join('');
        const cellsHTML = cells.map(c => c.empty
            ? '<div class="cal-cell cal-empty"></div>'
            : `<div class=\"cal-cell\"><div class=\"cal-day\">${c.dayNum}</div>${c.emoji ? `<div class=\"cal-emoji\">${c.emoji}</div>` : ''}</div>`
        ).join('');

        return `
            <section class="print-month">
                <h2 class="print-month-title">${monthName} Calendar</h2>
                <div class="print-cal-grid">
                    ${headersHTML}
                    ${cellsHTML}
                </div>
            </section>
        `;
    }

    // Removed unused preview-related functions (generateDiaryHTML, closePreview)

    /**
     * Export diary as PDF (print functionality) — FIXED & REDESIGNED
     */
    function exportDiary() {
        const entries = StorageModule ? StorageModule.getAllEntries() : {};
        const entriesArray = Object.entries(entries).map(([date, entry]) => ({
            date,
            ...entry
        }));

        if (entriesArray.length === 0) {
            if (window.ToastModule) {
                window.ToastModule.show('No entries to export. Start logging your moods first!', 'error');
            }
            return;
        }

        // Sort oldest → newest
        entriesArray.sort((a, b) => new Date(a.date) - new Date(b.date));

        const entriesCount = entriesArray.length;
        const today = new Date().toLocaleDateString('en-US', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
        });

        // Ask for user's full name for the cover page
        const rawName = window.prompt('Enter your full name for the diary title page:', '');
        const userName = (rawName || '').trim();

        // Build diary pages
        let diaryPagesHTML = '';
        entriesArray.forEach((entry, index) => {
            const formattedDate = formatDisplayDate(entry.date);
            const moodEmoji = CalendarModule.getMoodEmoji(entry.mood);
            const moodLabel = getMoodLabel(entry.mood);
            const story = escapeHtml(entry.story || '');
            const imageHTML = entry.image 
                ? `<img src="${entry.image}" alt="Memory" class="entry-image">`
                : '';

            diaryPagesHTML += `
                <div class="diary-page">
                    <div class="page-content">
                        <div class="entry-header">${formattedDate}</div>
                        <div class="entry-mood">${moodEmoji ? `${moodEmoji} ${moodLabel}` : ''}</div>
                        <div class="entry-story">${story}</div>
                        ${imageHTML}
                    </div>
                    <div class="page-badge">Page ${index + 1}</div>
                </div>
            `;
        });

    const printWindow = window.open('', '_blank');
    const baseHref = (document.baseURI || (location.origin + location.pathname)).replace(/[^/]*$/, '');
        const monthCalendarHTML = buildPrintableMonthCalendarHTML(entries, new Date());
        const printContent = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>My Mood Diary - MoodCalendar</title>
        <base href="${baseHref}">
                <style>
                    * {
                        box-sizing: border-box;
                        margin: 0;
                        padding: 0;
                    }
                    body {
                        font-family: 'Segoe UI', Roboto, Arial, sans-serif;
                        background: #fff;
                        color: #222;
                        line-height: 1.7;
                    }
                    /* Zero margins to allow full-width cover bands */
                    @page { margin: 0; }

                    /* COVER PAGE */
                    .cover-page {
                        min-height: 100vh;
                        display: grid;
                        grid-template-rows: 110px 1fr 110px;
                        align-items: stretch;
                        text-align: center;
                        page-break-after: always;
                        position: relative;
                        background: #fff;
                    }
                    .cover-top { background-color: #3F51B5; }
                    .cover-bottom { background-color: #3F51B5; }
                    .cover-center {
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        width: 100%;
                        background: #fff;
                        padding: 16px;
                    }
                    .cover-center img {
                        width: 140px;
                        margin-bottom: 15px;
                    }
                    .cover-center h1 {
                        font-size: 2.3rem;
                        font-weight: 700;
                        color: #3F51B5;
                        margin-bottom: 8px;
                    }
                    .cover-center p {
                        font-size: 1.1rem;
                        color: #3F51B5;
                    }

                    /* PRINTABLE MONTH CALENDAR */
                    .print-month { page-break-after: always; padding: 0.5in 0.2in; }
                    .print-month-title { font-size: 1.6rem; font-weight: 800; color: #374151; margin: 0 0 16px; text-align: center; }
                    .print-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
                    .cal-hdr { text-align: center; font-weight: 700; color: #4b5563; padding: 8px 0; border-bottom: 2px solid #e5e7eb; }
                    .cal-cell { border: 1px solid #e5e7eb; border-radius: 8px; min-height: 78px; padding: 6px; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; background: #fff; }
                    .cal-empty { background: #fafafa; }
                    .cal-day { align-self: flex-start; font-weight: 700; color: #111827; }
                    .cal-emoji { font-size: 1.6rem; margin-top: 6px; }

                    /* DIARY PAGES */
                    .diary-page {
                        page-break-after: always;
                        position: relative;
                        overflow: hidden;
                        padding: 0; /* No padding so badge can sit at true page corner */
                        min-height: 100vh; /* Fill full printed page height so badge is at footer */
                        display: block;
                    }
                    .page-content { padding: 0.8in; padding-bottom: calc(0.8in + 28px); }
                    .entry-header {
                        color: #3F51B5;
                        font-weight: 600;
                        font-size: 1.1rem;
                        margin-bottom: 6px;
                    }
                    .entry-mood {
                        font-size: 1rem;
                        color: #3F51B5;
                        margin-bottom: 15px;
                    }
                    .entry-story {
                        font-size: 1rem;
                        text-align: justify;
                        white-space: pre-wrap;
                        margin-bottom: 15px;
                        overflow-wrap: break-word;
                    }
                    .entry-image {
                        display: block;
                        max-width: 100%;
                        border-radius: 8px;
                        margin: 0 auto 16px;
                    }

                    /* Per-page badge anchored within each page content */
                    .page-badge {
                        position: absolute;
                        /* Align with content footer-right (same as .page-content padding) */
                        bottom: 0.5in;
                        right: 0.5in;
                        background: #6366f1;
                        color: #fff;
                        padding: 6px 10px;
                        border-radius: 8px;
                        font-weight: 700;
                        font-size: 12px;
                        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
                        z-index: 10;
                    }

                    @media print {
                        body { margin: 0; }
                        .cover-page, .diary-page { page-break-inside: avoid; }
                    }
                    @media screen { .page-badge { display: none; } }
                </style>
            </head>
            <body>
                <div class="cover-page">
                    <div class="cover-top"></div>
                    <div class="cover-center">
                        <img src="assets/moodcalendarlogo.png" alt="MoodCalendar Logo">
                        <h1>MY MOOD DIARY</h1>
                        <p>By: ${escapeHtml(userName || '_______________')}</p>
                        <p style="margin-top:10px;font-size:0.9rem;color:#777;">Generated on ${today}</p>
                    </div>
                    <div class="cover-bottom"></div>
                </div>
                ${monthCalendarHTML}

                ${diaryPagesHTML}
            </body>
            </html>
        `;

        printWindow.document.write(printContent);
        printWindow.document.close();

        printWindow.onload = function() {
            setTimeout(() => {
                printWindow.print();
            }, 600);
        };

        if (window.ToastModule) {
            window.ToastModule.show('Opening print view for your diary...', 'success');
        }
    }

    /**
     * Initialize diary
     */
    function init() {
        renderDiary();

        const filterSelect = document.getElementById('diary-filter');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                currentFilter = e.target.value;
                renderDiary();
            });
        }

        const exportBtn = document.getElementById('export-diary-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', exportDiary);
        }
    }

    // Public API
    return {
        init,
        renderDiary,
        exportDiary
    };
})();
