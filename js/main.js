/**
 * Main Application Module
 * Coordinates all modules and handles localStorage
 */

// Storage Module
const StorageModule = (function() {
    const STORAGE_KEY = 'moodCalendarEntries';

    /**
     * Get all mood entries
     */
    function getAllEntries() {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : {};
    }

    /**
     * Get entry for a specific date
     */
    function getEntry(dateString) {
        const entries = getAllEntries();
        return entries[dateString] || null;
    }

    /**
     * Save or update an entry
     */
    function saveEntry(dateString, entryData) {
        const entries = getAllEntries();
        entries[dateString] = {
            ...entryData,
            updatedAt: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    }

    /**
     * Delete an entry
     */
    function deleteEntry(dateString) {
        const entries = getAllEntries();
        delete entries[dateString];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    }

    /**
     * Clear all entries
     */
    function clearAllEntries() {
        localStorage.removeItem(STORAGE_KEY);
    }

    // Public API
    return {
        getAllEntries,
        getEntry,
        saveEntry,
        deleteEntry,
        clearAllEntries
    };
})();

// Toast Notification Module
const ToastModule = (function() {
    let toastTimeout;

    /**
     * Show toast notification
     */
    function show(message, type = 'success') {
        const toast = document.getElementById('toast');
        if (!toast) return;

        // Clear existing timeout
        if (toastTimeout) {
            clearTimeout(toastTimeout);
        }

        // Reset state to ensure animation starts from hidden each time
        toast.classList.remove('active');
        // Force reflow so the browser acknowledges the state change
        void toast.offsetWidth;

        // Set toast content and type
        toast.textContent = message;
        toast.className = `toast ${type}`;

        // Force reflow again before showing
        void toast.offsetWidth;
        toast.classList.add('active');

        // Hide after 3 seconds
        toastTimeout = setTimeout(() => {
            toast.classList.remove('active');
        }, 3000);
    }

    // Public API
    return {
        show
    };
})();

// Confirmation Dialog Module
const ConfirmationModule = (function() {
    let confirmCallback = null;

    /**
     * Show confirmation dialog
     */
    function show(title, message, onConfirm) {
        const overlay = document.getElementById('confirmation-overlay');
        const dialog = document.getElementById('confirmation-dialog');
        const titleEl = document.getElementById('confirmation-title');
        const messageEl = document.getElementById('confirmation-message');
        
        if (!overlay || !dialog || !titleEl || !messageEl) return;

        // Set content
        titleEl.textContent = title;
        messageEl.textContent = message;
        confirmCallback = onConfirm;

        // Show dialog
        overlay.classList.add('active');
        dialog.style.display = 'block';
    }

    /**
     * Hide confirmation dialog
     */
    function hide() {
        const overlay = document.getElementById('confirmation-overlay');
        const dialog = document.getElementById('confirmation-dialog');
        
        if (overlay && dialog) {
            overlay.classList.remove('active');
            dialog.style.display = 'none';
        }
        
        confirmCallback = null;
    }

    /**
     * Handle confirmation
     */
    function handleConfirm() {
        if (confirmCallback) {
            confirmCallback();
        }
        hide();
    }

    /**
     * Handle cancellation
     */
    function handleCancel() {
        hide();
    }

    /**
     * Initialize confirmation dialog
     */
    function init() {
        const confirmBtn = document.getElementById('confirmation-confirm');
        const cancelBtn = document.getElementById('confirmation-cancel');
        const overlay = document.getElementById('confirmation-overlay');

        if (confirmBtn) {
            confirmBtn.addEventListener('click', handleConfirm);
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', handleCancel);
        }

        if (overlay) {
            overlay.addEventListener('click', handleCancel);
        }

        // Escape key to cancel
        document.addEventListener('keydown', (e) => {
            const dialog = document.getElementById('confirmation-dialog');
            if (e.key === 'Escape' && dialog && dialog.style.display === 'block') {
                handleCancel();
            }
        });
    }

    // Public API
    return {
        show,
        hide,
        init
    };
})();

// Modal Module
const MoodModalModule = (function() {
    let modal;
    let selectedMood = null;
    let selectedDate = null;
    let selectedImage = null;
    let imageRemoved = false;

    /**
     * Open modal for a specific date
     */
    function openModal(dateString) {
        modal = document.getElementById('mood-modal');
        if (!modal) return;

        selectedDate = dateString;
        selectedMood = null;
        selectedImage = null;

        // Check if there's an existing entry
        const existingEntry = StorageModule.getEntry(dateString);
        
        // Update modal title
        const modalTitle = document.getElementById('modal-title');
        const date = CalendarModule.parseDate(dateString);
        const dateDisplay = date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        if (modalTitle) {
            modalTitle.textContent = existingEntry ? `Edit Mood - ${dateDisplay}` : `Log Your Mood - ${dateDisplay}`;
        }

        // Set selected date in hidden input
        const dateInput = document.getElementById('selected-date');
        if (dateInput) {
            dateInput.value = dateString;
        }

        // Reset form
        const form = document.getElementById('mood-form');
        if (form) {
            form.reset();
        }

        // Clear mood selection
        const moodOptions = document.querySelectorAll('.mood-option');
        moodOptions.forEach(option => option.classList.remove('selected'));

        // Clear image preview
        const imagePreview = document.getElementById('image-preview');
        const removeImageBtn = document.getElementById('remove-image-btn');
        if (imagePreview) {
            imagePreview.classList.remove('active');
            imagePreview.innerHTML = '';
        }
        if (removeImageBtn) {
            removeImageBtn.style.display = 'none';
        }
        
        imageRemoved = false;

        // If editing, populate form
        if (existingEntry) {
            // Select mood
            const moodOption = document.querySelector(`[data-mood="${existingEntry.mood}"]`);
            if (moodOption) {
                moodOption.classList.add('selected');
                selectedMood = existingEntry.mood;
            }

            // Set story
            const storyTextarea = document.getElementById('mood-story');
            if (storyTextarea) {
                storyTextarea.value = existingEntry.story;
            }

            // Show existing image
            if (existingEntry.image && imagePreview) {
                imagePreview.innerHTML = `<img src="${existingEntry.image}" alt="Mood image">`;
                imagePreview.classList.add('active');
                selectedImage = existingEntry.image;
                if (removeImageBtn) {
                    removeImageBtn.style.display = 'inline-flex';
                }
            }
        }

        // Show modal
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
    }

    /**
     * Close modal
     */
    function closeModal() {
        if (!modal) return;
        
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        selectedMood = null;
        selectedDate = null;
        selectedImage = null;
    }

    /**
     * Handle mood selection
     */
    function handleMoodSelection(e) {
        if (!e.target.closest('.mood-option')) return;

        const moodOption = e.target.closest('.mood-option');
        const mood = moodOption.dataset.mood;

        // Remove previous selection
        const moodOptions = document.querySelectorAll('.mood-option');
        moodOptions.forEach(option => option.classList.remove('selected'));

        // Select new mood
        moodOption.classList.add('selected');
        selectedMood = mood;
    }

    /**
     * Handle image upload
     */
    function handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            ToastModule.show('Image size should be less than 5MB', 'error');
            e.target.value = '';
            return;
        }

        // Read and preview image
        const reader = new FileReader();
        reader.onload = function(event) {
            selectedImage = event.target.result;
            imageRemoved = false;
            
            const imagePreview = document.getElementById('image-preview');
            const removeImageBtn = document.getElementById('remove-image-btn');
            if (imagePreview) {
                imagePreview.innerHTML = `<img src="${selectedImage}" alt="Preview">`;
                imagePreview.classList.add('active');
            }
            if (removeImageBtn) {
                removeImageBtn.style.display = 'inline-flex';
            }
        };
        reader.readAsDataURL(file);
    }

    /**
     * Handle remove image
     */
    function handleRemoveImage() {
        ConfirmationModule.show(
            'Remove Photo',
            'Are you sure you want to remove this photo?',
            () => {
                selectedImage = null;
                imageRemoved = true;
                
                const imagePreview = document.getElementById('image-preview');
                const removeImageBtn = document.getElementById('remove-image-btn');
                const imageInput = document.getElementById('mood-image');
                
                if (imagePreview) {
                    imagePreview.classList.remove('active');
                    imagePreview.innerHTML = '';
                }
                if (removeImageBtn) {
                    removeImageBtn.style.display = 'none';
                }
                if (imageInput) {
                    imageInput.value = '';
                }
                
                ToastModule.show('Photo removed', 'success');
            }
        );
    }

    /**
     * Handle form submission
     */
    function handleFormSubmit(e) {
        e.preventDefault();

        // Prevent submitting entries for future dates
        try {
            const selected = selectedDate ? CalendarModule.parseDate(selectedDate) : null;
            const today = new Date();
            const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            if (selected && selected > todayDate) {
                ToastModule.show('You can\'t save an entry for a future date.', 'error');
                return;
            }
        } catch (_) { /* no-op */ }

        if (!selectedMood) {
            ToastModule.show('Please select a mood', 'error');
            return;
        }

        const story = document.getElementById('mood-story').value.trim();
        if (!story) {
            ToastModule.show('Please write your story', 'error');
            return;
        }

        // Save entry (handle image removal)
        const entryData = {
            mood: selectedMood,
            story: story,
            image: imageRemoved ? null : selectedImage,
            createdAt: new Date().toISOString()
        };

        StorageModule.saveEntry(selectedDate, entryData);

        // Update UI
        CalendarModule.renderCalendar();
        MoodTrackerModule.updateTrackerProgress(selectedDate);
        DiaryGeneratorModule.renderDiary();

        // Close modal and show success message
        closeModal();
        ToastModule.show('Mood logged successfully! 🎉', 'success');
    }

    /**
     * Initialize modal
     */
    function init() {
        modal = document.getElementById('mood-modal');
        if (!modal) return;

        // Close modal events
        const closeBtn = document.getElementById('close-modal');
        const cancelBtn = document.getElementById('cancel-btn');

        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', closeModal);
        }

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                closeModal();
            }
        });

        // Mood selection
        const moodSelector = document.getElementById('mood-selector');
        if (moodSelector) {
            moodSelector.addEventListener('click', handleMoodSelection);
        }

        // Image upload
        const imageInput = document.getElementById('mood-image');
        if (imageInput) {
            imageInput.addEventListener('change', handleImageUpload);
        }

        // Remove image button
        const removeImageBtn = document.getElementById('remove-image-btn');
        if (removeImageBtn) {
            removeImageBtn.addEventListener('click', handleRemoveImage);
        }

        // Form submission
        const form = document.getElementById('mood-form');
        if (form) {
            form.addEventListener('submit', handleFormSubmit);
        }
    }

    // Public API
    return {
        init,
        openModal,
        closeModal
    };
})();

// Burger Menu Module
const BurgerMenuModule = (function() {
    let burgerBtn = null;
    let headerNav = null;
    let isOpen = false;

    /**
     * Toggle mobile menu
     */
    function toggleMenu() {
        isOpen = !isOpen;
        
        if (burgerBtn) {
            burgerBtn.classList.toggle('active');
            burgerBtn.setAttribute('aria-expanded', isOpen);
        }
        
        if (headerNav) {
            headerNav.classList.toggle('active');
        }

        // Prevent body scroll when menu is open
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }

    /**
     * Close mobile menu
     */
    function closeMenu() {
        if (isOpen) {
            toggleMenu();
        }
    }

    /**
     * Initialize burger menu
     */
    function init() {
        burgerBtn = document.getElementById('burger-menu');
        headerNav = document.getElementById('header-nav');

        if (burgerBtn) {
            burgerBtn.addEventListener('click', toggleMenu);
        }

        // Close menu when clicking on a nav button
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            btn.addEventListener('click', closeMenu);
        });

        // Close menu when clicking outside (on overlay)
        if (headerNav) {
            headerNav.addEventListener('click', (e) => {
                // Only close if clicking the overlay (nav element itself, not its children)
                if (e.target === headerNav && isOpen) {
                    closeMenu();
                }
            });
        }

        // Close menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isOpen) {
                closeMenu();
            }
        });

        // Close menu when window is resized to desktop size (match CSS 600px breakpoint)
        window.addEventListener('resize', () => {
            if (window.innerWidth > 600 && isOpen) {
                closeMenu();
            }
        });
    }

    // Public API
    return {
        init,
        closeMenu
    };
})();

// Loading Screen Module
const LoadingScreenModule = (function() {
    let loadingScreen = null;
    let introVideo = null;
    let isHidden = false;

    /**
     * Hide loading screen
     */
    function hideLoadingScreen() {
        if (isHidden || !loadingScreen) return;
        
        isHidden = true;
        loadingScreen.classList.add('hidden');
        
        // Remove from DOM after transition
        setTimeout(() => {
            if (loadingScreen && loadingScreen.parentNode) {
                loadingScreen.style.display = 'none';
            }
        }, 500);
    }

    /**
     * Initialize loading screen
     */
    function init() {
        loadingScreen = document.getElementById('loading-screen');
        introVideo = document.getElementById('intro-video');
        
        if (!loadingScreen || !introVideo) return;

        // Hide loading screen when video ends
        introVideo.addEventListener('ended', () => {
            hideLoadingScreen();
        });

        // Allow clicking to skip
        loadingScreen.addEventListener('click', () => {
            hideLoadingScreen();
        });

        // Fallback: hide after 5 seconds if video doesn't play
        setTimeout(() => {
            hideLoadingScreen();
        }, 5000);

        // Handle video errors
        introVideo.addEventListener('error', () => {
            console.warn('Video failed to load, hiding loading screen');
            hideLoadingScreen();
        });
    }

    // Public API
    return {
        init,
        hideLoadingScreen
    };
})();

// View Navigation Module
const ViewNavigationModule = (function() {
    /**
     * Switch between views
     */
    function switchView(viewName) {
        // Update nav buttons
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            if (btn.dataset.view === viewName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Update view sections
        const viewSections = document.querySelectorAll('.view-section');
        viewSections.forEach(section => {
            section.classList.remove('active');
        });

        const targetView = document.getElementById(`${viewName}-view`);
        if (targetView) {
            targetView.classList.add('active');
        }

        // Render appropriate view
        switch(viewName) {
            case 'calendar':
                CalendarModule.renderCalendar();
                // Defer fit to next tick to ensure layout is updated
                if (typeof CalendarModule.fitCalendarToViewport === 'function') {
                    setTimeout(() => CalendarModule.fitCalendarToViewport(), 0);
                }
                break;
            case 'weekly-tracker':
                MoodTrackerModule.renderTracker();
                break;
            case 'diary':
                DiaryGeneratorModule.renderDiary();
                break;
        }
    }

    /**
     * Initialize navigation
     */
    function init() {
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                switchView(btn.dataset.view);
            });
        });
    }

    // Public API
    return {
        init,
        switchView
    };
})();

// Initialize Application
document.addEventListener('DOMContentLoaded', function() {
    // Initialize loading screen first
    LoadingScreenModule.init();
    
    // Initialize all modules
    ConfirmationModule.init();
    BurgerMenuModule.init();
    CalendarModule.init();
    MoodTrackerModule.init();
    DiaryGeneratorModule.init();
    MoodModalModule.init();
    ViewNavigationModule.init();

    // Check for tracker reminder
    checkTrackerReminder();
});

/**
 * Check if user should be reminded about tracker
 */
function checkTrackerReminder() {
    const lastCheck = localStorage.getItem('lastTrackerCheck');
    const today = new Date().toDateString();

    if (lastCheck !== today) {
        localStorage.setItem('lastTrackerCheck', today);

        // Check if there's an active tracker
        const tracker = localStorage.getItem('weeklyTracker');
        if (tracker) {
            const trackerData = JSON.parse(tracker);
            if (trackerData.active) {
                const todayString = CalendarModule.formatDate(new Date());
                const todayEntry = StorageModule.getEntry(todayString);
                
                if (!todayEntry) {
                    setTimeout(() => {
                        ToastModule.show('📝 Don\'t forget to log your mood today!', 'success');
                    }, 2000);
                }
            }
        }
    }
}

// Make modules available globally
window.StorageModule = StorageModule;
window.ToastModule = ToastModule;
window.MoodModalModule = MoodModalModule;
window.ConfirmationModule = ConfirmationModule;

