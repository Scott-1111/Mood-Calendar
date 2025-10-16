/**
 * Mood Tracker Module
 * Handles 7-day mood tracking functionality
 */

const MoodTrackerModule = (function() {
    const TRACKER_KEY = 'weeklyTracker';
    let trackerSection = null;
    let trackerInner = null;

    /**
     * Get current tracker data
     */
    function getTrackerData() {
        const data = localStorage.getItem(TRACKER_KEY);
        return data ? JSON.parse(data) : null;
    }

    /**
     * Save tracker data
     */
    function saveTrackerData(data) {
        localStorage.setItem(TRACKER_KEY, JSON.stringify(data));
    }

    /**
     * Start a new 7-day tracker
     */
    function startNewTracker() {
        const startDate = new Date();
        const trackerData = {
            startDate: CalendarModule.formatDate(startDate),
            active: true,
            days: []
        };

        // Create 7 days
        for (let i = 0; i < 7; i++) {
            const dayDate = new Date(startDate);
            dayDate.setDate(startDate.getDate() + i);
            
            trackerData.days.push({
                date: CalendarModule.formatDate(dayDate),
                dayNumber: i + 1,
                completed: false
            });
        }

        saveTrackerData(trackerData);
        renderTracker();
        
        if (window.ToastModule) {
            window.ToastModule.show('7-Day Mood Tracker started! 🎉', 'success');
        }
    }

    /**
     * Check if a date is part of current tracker
     */
    function isTrackerDate(dateString) {
        const tracker = getTrackerData();
        if (!tracker || !tracker.active) return false;
        
        return tracker.days.some(day => day.date === dateString);
    }

    /**
     * Update tracker when mood is logged
     */
    function updateTrackerProgress(dateString) {
        const tracker = getTrackerData();
        if (!tracker || !tracker.active) return;

        const dayIndex = tracker.days.findIndex(day => day.date === dateString);
        if (dayIndex !== -1) {
            // Check if entry exists
            const entry = StorageModule ? StorageModule.getEntry(dateString) : null;
            
            if (entry) {
                // Entry exists, mark as completed
                tracker.days[dayIndex].completed = true;
            } else {
                // Entry doesn't exist (was deleted), mark as incomplete
                tracker.days[dayIndex].completed = false;
            }
            
            saveTrackerData(tracker);
            renderTracker();
            
            // Check if all days are completed
            const allCompleted = tracker.days.every(day => day.completed);
            if (allCompleted && entry) {
                setTimeout(() => {
                    if (window.ToastModule) {
                        window.ToastModule.show('🎊 Congratulations! You completed your 7-day mood tracker!', 'success');
                    }
                }, 500);
            }
        }
    }

    /**
     * Handle entry deletion - update tracker progress
     */
    function handleEntryDeletion(dateString) {
        const tracker = getTrackerData();
        if (!tracker || !tracker.active) return;

        const dayIndex = tracker.days.findIndex(day => day.date === dateString);
        if (dayIndex !== -1) {
            // Mark day as incomplete since entry was deleted
            tracker.days[dayIndex].completed = false;
            saveTrackerData(tracker);
            renderTracker();
        }
    }

    /**
     * Render the tracker view
     */
    function renderTracker() {
        const statusDiv = document.getElementById('tracker-status');
        const progressDiv = document.getElementById('weekly-progress');
        
        if (!statusDiv || !progressDiv) return;

        const tracker = getTrackerData();

        if (!tracker || !tracker.active) {
            // No active tracker
            statusDiv.className = 'tracker-status';
            statusDiv.innerHTML = `
                <h3>No Active Tracker</h3>
                <p>Start a new 7-day mood tracking challenge to monitor your emotional journey.</p>
            `;
            progressDiv.innerHTML = '';
            // Fit after rendering empty state
            fitWeeklyTrackerToViewport();
            return;
        }

        // Validate tracker data against actual entries
        let needsUpdate = false;
        if (StorageModule) {
            tracker.days.forEach(day => {
                const entry = StorageModule.getEntry(day.date);
                const shouldBeCompleted = !!entry;
                
                if (day.completed !== shouldBeCompleted) {
                    day.completed = shouldBeCompleted;
                    needsUpdate = true;
                }
            });
            
            // Save if we found discrepancies
            if (needsUpdate) {
                saveTrackerData(tracker);
            }
        }

        // Active tracker
        const completedCount = tracker.days.filter(day => day.completed).length;
        const percentage = Math.round((completedCount / 7) * 100);
        const startDate = CalendarModule.parseDate(tracker.startDate);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);

        statusDiv.className = 'tracker-status active';
        statusDiv.innerHTML = `
            <h3>Active 7-Day Tracker</h3>
            <p>${formatDateRange(startDate, endDate)}</p>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${percentage}%">
                    ${percentage}%
                </div>
            </div>
            <p><strong>${completedCount} of 7 days completed</strong></p>
        `;

        // Render day cards
        const moodEntries = StorageModule ? StorageModule.getAllEntries() : {};
        const today = new Date();
        const todayString = CalendarModule.formatDate(today);

        progressDiv.innerHTML = '';
        
        tracker.days.forEach((day, index) => {
            const dayCard = document.createElement('div');
            dayCard.className = 'day-card';
            
            if (day.completed) {
                dayCard.classList.add('completed');
            }
            
            if (day.date === todayString) {
                dayCard.classList.add('current');
            }

            const entry = moodEntries[day.date];
            const dayDate = CalendarModule.parseDate(day.date);
            const isPast = dayDate < today && !CalendarModule.isSameDay(dayDate, today);

            let statusText = 'Pending';
            let emoji = '⏳';
            
            if (day.completed && entry) {
                statusText = 'Completed';
                emoji = CalendarModule.getMoodEmoji(entry.mood);
            } else if (isPast) {
                statusText = 'Missed';
                emoji = '⚠️';
            } else if (day.date === todayString) {
                statusText = 'Today - Log your mood!';
                emoji = '📝';
            }

            dayCard.innerHTML = `
                <div class="day-card-header">
                    <div class="day-card-title">Day ${day.dayNumber}</div>
                    <div class="day-card-emoji">${emoji}</div>
                </div>
                <div class="day-card-status">${formatShortDate(dayDate)}</div>
                <div class="day-card-status">${statusText}</div>
            `;

            // Make card clickable to log mood (block future dates)
            if (!day.completed) {
                dayCard.style.cursor = 'pointer';
                dayCard.addEventListener('click', () => {
                    const clickedDate = CalendarModule.parseDate(day.date);
                    const now = new Date();
                    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    if (clickedDate > today) {
                        if (window.ToastModule) {
                            window.ToastModule.show("You can't save an entry for a future date.", 'error');
                        }
                        return;
                    }
                    if (window.MoodModalModule) {
                        window.MoodModalModule.openModal(day.date);
                    }
                });
            }

            progressDiv.appendChild(dayCard);
        });

        // Fit after rendering
        fitWeeklyTrackerToViewport();
    }

    /**
     * Format date range
     */
    function formatDateRange(startDate, endDate) {
        const options = { month: 'short', day: 'numeric' };
        const start = startDate.toLocaleDateString('en-US', options);
        const end = endDate.toLocaleDateString('en-US', options);
        return `${start} - ${end}`;
    }

    /**
     * Format short date
     */
    function formatShortDate(date) {
        const options = { month: 'short', day: 'numeric', weekday: 'short' };
        return date.toLocaleDateString('en-US', options);
    }

    /**
     * Initialize tracker
     */
    function init() {
        renderTracker();

        // Add event listener for start tracker button
        const startBtn = document.getElementById('start-tracker-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                const tracker = getTrackerData();
                if (tracker && tracker.active) {
                    const confirmStart = confirm('You already have an active tracker. Starting a new one will replace it. Continue?');
                    if (!confirmStart) return;
                }
                startNewTracker();
            });
        }

        // Refit on resize/orientation and after load/fonts
        window.addEventListener('resize', fitWeeklyTrackerToViewport);
        window.addEventListener('orientationchange', fitWeeklyTrackerToViewport);
        window.addEventListener('load', fitWeeklyTrackerToViewport);
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(() => setTimeout(fitWeeklyTrackerToViewport, 0)).catch(() => {});
        }
    }

    /**
     * Ensure tracker inner container exists for scaling/centering
     */
    function ensureTrackerInner() {
        if (!trackerSection) {
            trackerSection = document.getElementById('weekly-tracker-view');
        }
        if (!trackerSection) return;
        if (!trackerInner) {
            const existingInner = trackerSection.querySelector('.tracker-inner');
            if (existingInner) {
                trackerInner = existingInner;
            } else {
                trackerInner = document.createElement('div');
                trackerInner.className = 'tracker-inner';
                const children = Array.from(trackerSection.children);
                children.forEach(child => {
                    if (child !== trackerInner) trackerInner.appendChild(child);
                });
                trackerSection.appendChild(trackerInner);
            }
        }
    }

    /**
     * Fit the Weekly Tracker view to the available viewport height to avoid vertical scroll
     */
    function fitWeeklyTrackerToViewport() {
        ensureTrackerInner();
        if (!trackerSection || !trackerInner) return;
        if (!trackerSection.classList.contains('active')) return;

        const header = document.querySelector('.app-header');
        const footer = document.querySelector('.app-footer');
        const appMain = document.querySelector('.app-main');
        const viewportH = window.innerHeight;
        const headerH = header ? header.offsetHeight : 0;
        const footerH = footer ? footer.offsetHeight : 0;
        let mainPadY = 0;
        if (appMain) {
            const cs = window.getComputedStyle(appMain);
            mainPadY = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
        }
        const sectionCs = window.getComputedStyle(trackerSection);
        const padX = (parseFloat(sectionCs.paddingLeft) || 0) + (parseFloat(sectionCs.paddingRight) || 0);
        const padY = (parseFloat(sectionCs.paddingTop) || 0) + (parseFloat(sectionCs.paddingBottom) || 0);

        const availableH = viewportH - headerH - footerH - mainPadY;
        const availableW = Math.max(trackerSection.clientWidth - padX, 0);
        const availableInnerH = Math.max(availableH - padY, 0);

        // Reset transform and measure
        trackerInner.style.transform = 'none';
        trackerInner.style.transformOrigin = 'top center';
        trackerInner.style.willChange = 'transform';
        const rect = trackerInner.getBoundingClientRect();
        const naturalW = rect.width;
        const naturalH = rect.height;
        if (!naturalW || !naturalH) return;

        const scale = Math.min(availableW / naturalW, availableInnerH / naturalH, 1);
        const scaledH = naturalH * scale;
        const dy = Math.max((availableInnerH - scaledH) / 2, 0);

        trackerSection.style.height = `${availableH}px`;
        trackerInner.style.transform = `translateY(${dy}px) scale(${scale})`;
    }

    // Public API
    return {
        init,
        renderTracker,
        updateTrackerProgress,
        handleEntryDeletion,
        isTrackerDate,
        startNewTracker
    };
})();

