/**
 * Calendar Module
 * Handles calendar rendering and date selection
 */

const CalendarModule = (function() {
    // Today reference (no time)
    const TODAY = new Date();
    const TODAY_DATE = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
    // Minimum month allowed: October (month index 9) of current year
    const MIN_MONTH_DATE = new Date(TODAY.getFullYear(), 9, 1);

    let currentDate = new Date();
    let selectedDate = null;
    let calendarSection = null;
    let calendarInner = null;

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    /**
     * Get the number of days in a month
     */
    function getDaysInMonth(year, month) {
        return new Date(year, month + 1, 0).getDate();
    }

    /**
     * Get the first day of the month (0 = Sunday, 6 = Saturday)
     */
    function getFirstDayOfMonth(year, month) {
        return new Date(year, month, 1).getDay();
    }

    /**
     * Format date as YYYY-MM-DD
     */
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Parse date string YYYY-MM-DD to Date object
     */
    function parseDate(dateString) {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day);
    }

    /**
     * Check if two dates are the same day
     */
    function isSameDay(date1, date2) {
        return formatDate(date1) === formatDate(date2);
    }

    /**
     * Render the calendar
     */
    function renderCalendar() {
        const calendarGrid = document.getElementById('calendar-grid');
        const monthYearDisplay = document.getElementById('current-month-year');
        
        if (!calendarGrid || !monthYearDisplay) return;

        // Update month/year display
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        monthYearDisplay.textContent = `${monthNames[month]} ${year}`;

        // Update prev/next buttons state (disable prev when at/before October of current year)
        const prevBtn = document.getElementById('prev-month');
        const nextBtn = document.getElementById('next-month');
        const atMinMonth = (year === MIN_MONTH_DATE.getFullYear() && month === 9) ||
                           (new Date(year, month, 1) <= MIN_MONTH_DATE);
        if (prevBtn) {
            prevBtn.disabled = atMinMonth;
            prevBtn.setAttribute('aria-disabled', atMinMonth);
            prevBtn.style.opacity = atMinMonth ? '0.4' : '';
            prevBtn.style.cursor = atMinMonth ? 'not-allowed' : 'pointer';
        }
        if (nextBtn) {
            nextBtn.disabled = false; // always allow future months navigation
            nextBtn.setAttribute('aria-disabled', 'false');
        }

        // Clear calendar
        calendarGrid.innerHTML = '';

        // Add day headers
        dayNames.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day-header';
            dayHeader.textContent = day;
            dayHeader.setAttribute('role', 'columnheader');
            calendarGrid.appendChild(dayHeader);
        });

        // Get calendar data
        const firstDay = getFirstDayOfMonth(year, month);
        const daysInMonth = getDaysInMonth(year, month);
    const today = TODAY_DATE;

        // Get mood entries from localStorage
        const moodEntries = StorageModule ? StorageModule.getAllEntries() : {};

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < firstDay; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day other-month';
            calendarGrid.appendChild(emptyDay);
        }

    // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayDate = new Date(year, month, day);
            const dateString = formatDate(dayDate);
            
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.setAttribute('role', 'button');
            dayElement.setAttribute('tabindex', '0');
            dayElement.setAttribute('aria-label', `${monthNames[month]} ${day}, ${year}`);

            // Check if it's today
            if (isSameDay(dayDate, today)) {
                dayElement.classList.add('today');
            }

            // Check if there's a mood entry for this day
            if (moodEntries[dateString]) {
                dayElement.classList.add('has-entry');
                
                const dayNumber = document.createElement('div');
                dayNumber.className = 'day-number';
                dayNumber.textContent = day;
                
                const moodEmoji = document.createElement('div');
                moodEmoji.className = 'day-mood-emoji';
                moodEmoji.textContent = getMoodEmoji(moodEntries[dateString].mood);
                
                dayElement.appendChild(dayNumber);
                dayElement.appendChild(moodEmoji);
            } else {
                const dayNumber = document.createElement('div');
                dayNumber.className = 'day-number';
                dayNumber.textContent = day;
                dayElement.appendChild(dayNumber);
            }

            // Prevent selection for future dates
            if (dayDate > today) {
                dayElement.classList.add('future');
            } else {
                // Add click/keyboard events for selectable dates
                dayElement.addEventListener('click', () => handleDayClick(dateString));
                dayElement.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleDayClick(dateString);
                    }
                });
            }

            calendarGrid.appendChild(dayElement);
        }

        // Add trailing empty cells so the grid always has 6 weeks (42 day cells)
        const totalFilled = firstDay + daysInMonth;
        const totalCells = 42; // 6 weeks * 7 days
        const trailing = Math.max(totalCells - totalFilled, 0);
        for (let i = 0; i < trailing; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day other-month';
            calendarGrid.appendChild(emptyDay);
        }

        // Fit calendar to viewport after rendering
        fitCalendarToViewport();
    }

    /**
     * Get emoji for mood
     */
    function getMoodEmoji(mood) {
        const moodEmojis = {
            'happy': '😊',
            'sad': '😢',
            'angry': '😠',
            'fearful': '😰',
            'content': '😌',
            'excited': '🤩',
            'anxious': '😟',
            'loved': '🥰',
            'tired': '😴',
            'stressed': '😫'
        };
        return moodEmojis[mood] || '😊';
    }

    /**
     * Handle day click
     */
    function handleDayClick(dateString) {
        // Block future dates as a safeguard
        const clicked = parseDate(dateString);
        if (clicked > TODAY_DATE) {
            if (window.ToastModule) {
                window.ToastModule.show('You can\'t add entries for future dates.', 'error');
            }
            return;
        }
        selectedDate = dateString;
        
        // Open the mood modal
        if (window.MoodModalModule) {
            window.MoodModalModule.openModal(dateString);
        }
    }

    /**
     * Navigate to previous month
     */
    function previousMonth() {
        // Only allow navigating to months not earlier than October of current year
        const prev = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        if (prev >= MIN_MONTH_DATE) {
            currentDate = prev;
            renderCalendar();
        }
    }

    /**
     * Navigate to next month
     */
    function nextMonth() {
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        renderCalendar();
    }

    /**
     * Ensure an inner container exists for scaling/centering
     */
    function ensureInnerContainer() {
        if (!calendarSection) {
            calendarSection = document.getElementById('calendar-view');
        }
        if (!calendarSection) return;

        if (!calendarInner) {
            const existingInner = calendarSection.querySelector('.calendar-inner');
            if (existingInner) {
                calendarInner = existingInner;
            } else {
                // Create wrapper and move children
                calendarInner = document.createElement('div');
                calendarInner.className = 'calendar-inner';
                const children = Array.from(calendarSection.children);
                children.forEach(child => {
                    if (child !== calendarInner) {
                        calendarInner.appendChild(child);
                    }
                });
                calendarSection.appendChild(calendarInner);
            }
        }
    }

    /**
     * Measure and scale the calendar to fit the available viewport area
     */
    function fitCalendarToViewport() {
        ensureInnerContainer();
        if (!calendarSection || !calendarInner) return;

        // Only when visible to avoid zero measurements
        if (!calendarSection.classList.contains('active')) return;

        const header = document.querySelector('.app-header');
        const footer = document.querySelector('.app-footer');

        const viewportH = window.innerHeight;
        const headerH = (header ? header.offsetHeight : 0);
        const footerH = (footer ? footer.offsetHeight : 0);
        const appMain = document.querySelector('.app-main');
        let mainPadY = 0;
        if (appMain) {
            const mainCs = window.getComputedStyle(appMain);
            mainPadY = (parseFloat(mainCs.paddingTop) || 0) + (parseFloat(mainCs.paddingBottom) || 0);
        }
        const availableH = viewportH - headerH - footerH - mainPadY;

        // Compute available width/height inside the section excluding paddings
        const cs = window.getComputedStyle(calendarSection);
        const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
        const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    const availableW = Math.max(calendarSection.clientWidth - padX, 0);
        const availableInnerH = Math.max(availableH - padY, 0);

        // Reset transform for accurate measurement
    calendarInner.style.transform = 'none';
    calendarInner.style.transformOrigin = 'top center';
        calendarInner.style.willChange = 'transform';

        const rect = calendarInner.getBoundingClientRect();
        const naturalW = rect.width;
        const naturalH = rect.height;
        if (!naturalW || !naturalH) return;

        const scale = Math.min(availableW / naturalW, availableInnerH / naturalH, 1);
        const scaledW = naturalW * scale;
        const scaledH = naturalH * scale;
    const dy = Math.max((availableInnerH - scaledH) / 2, 0);

        // Lock section height to viewport area to prevent page scroll
    calendarSection.style.height = `${availableH}px`;
    calendarInner.style.transform = `translateY(${dy}px) scale(${scale})`;
    }

    /**
     * Initialize calendar
     */
    function init() {
        // Ensure starting month is at least October of current year
        if (currentDate < MIN_MONTH_DATE) {
            currentDate = new Date(MIN_MONTH_DATE);
        }
        renderCalendar();

        // Add event listeners for month navigation
        const prevBtn = document.getElementById('prev-month');
        const nextBtn = document.getElementById('next-month');

        if (prevBtn) {
            prevBtn.addEventListener('click', previousMonth);
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', nextMonth);
        }

        // Refit on resize/orientation and after load/fonts
        window.addEventListener('resize', fitCalendarToViewport);
        window.addEventListener('orientationchange', fitCalendarToViewport);
        window.addEventListener('load', fitCalendarToViewport);
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(() => setTimeout(fitCalendarToViewport, 0)).catch(() => {});
        }
    }

    // Public API
    return {
        init,
        renderCalendar,
        formatDate,
        parseDate,
        isSameDay,
        getMoodEmoji,
        fitCalendarToViewport
    };
})();

