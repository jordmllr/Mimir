// Focus Mode Manager for Mimir App
class FocusMode {
    constructor() {
        this.isActive = false;
        this.callbacks = {
            enter: [],
            exit: []
        };
        this.init();
    }

    init() {
        // Add keyboard event listeners
        document.addEventListener('keydown', this.handleKeydown.bind(this));

        // Add touch/mobile support
        this.initMobileSupport();

        // Add focus mode class to body for CSS targeting
        document.body.classList.add('focus-mode-ready');

        // Create focus mode indicator
        this.createFocusIndicator();

        console.log('Focus Mode initialized');
    }

    initMobileSupport() {
        // Detect if we're on mobile
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                        window.innerWidth <= 768;

        // Add mobile-specific event listeners
        if (this.isMobile) {
            // Long press gesture for mobile focus mode toggle
            let longPressTimer = null;
            let touchStartTime = 0;

            document.addEventListener('touchstart', (e) => {
                // Only trigger on non-interactive elements
                if (this.isInteractiveElement(e.target)) {
                    return;
                }

                touchStartTime = Date.now();

                // Show visual feedback for long press
                this.showLongPressIndicator(e.touches[0].clientX, e.touches[0].clientY);

                longPressTimer = setTimeout(() => {
                    // Vibrate if available (mobile feedback)
                    if (navigator.vibrate) {
                        navigator.vibrate(50);
                    }
                    this.hideLongPressIndicator();
                    this.toggle();
                }, 800); // 800ms long press
            }, { passive: true });

            document.addEventListener('touchend', () => {
                if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }
                this.hideLongPressIndicator();
            }, { passive: true });

            document.addEventListener('touchmove', () => {
                if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }
                this.hideLongPressIndicator();
            }, { passive: true });
        }
    }

    isInteractiveElement(element) {
        const interactiveTags = ['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT'];
        const interactiveClasses = ['fab', 'nav-link', 'action-btn', 'review-btn', 'show-answer-btn'];

        // Check element tag
        if (interactiveTags.includes(element.tagName)) {
            return true;
        }

        // Check element classes
        if (element.className && typeof element.className === 'string') {
            for (const className of interactiveClasses) {
                if (element.className.includes(className)) {
                    return true;
                }
            }
        }

        // Check parent elements
        let parent = element.parentElement;
        while (parent && parent !== document.body) {
            if (interactiveTags.includes(parent.tagName)) {
                return true;
            }
            if (parent.className && typeof parent.className === 'string') {
                for (const className of interactiveClasses) {
                    if (parent.className.includes(className)) {
                        return true;
                    }
                }
            }
            parent = parent.parentElement;
        }

        return false;
    }

    showLongPressIndicator(x, y) {
        // Remove any existing indicator
        this.hideLongPressIndicator();

        const indicator = document.createElement('div');
        indicator.className = 'long-press-indicator';
        indicator.style.left = (x - 25) + 'px';
        indicator.style.top = (y - 25) + 'px';

        document.body.appendChild(indicator);
        this.longPressIndicator = indicator;

        // Animate the indicator
        setTimeout(() => {
            if (this.longPressIndicator) {
                this.longPressIndicator.classList.add('active');
            }
        }, 10);
    }

    hideLongPressIndicator() {
        if (this.longPressIndicator) {
            this.longPressIndicator.remove();
            this.longPressIndicator = null;
        }
    }

    handleKeydown(event) {
        // Toggle focus mode with F key (when not in input fields)
        if (event.key === 'f' || event.key === 'F') {
            // Don't trigger if user is typing in an input field
            if (this.isInputFocused()) {
                return;
            }
            event.preventDefault();
            this.toggle();
        }

        // Exit focus mode with Escape key
        if (event.key === 'Escape' && this.isActive) {
            event.preventDefault();
            this.exit();
        }

        // Toggle with F11 (full screen key)
        if (event.key === 'F11') {
            event.preventDefault();
            this.toggle();
        }
    }

    isInputFocused() {
        const activeElement = document.activeElement;
        const inputTags = ['INPUT', 'TEXTAREA', 'SELECT'];
        return inputTags.includes(activeElement.tagName) ||
               activeElement.contentEditable === 'true';
    }

    toggle() {
        if (this.isActive) {
            this.exit();
        } else {
            this.enter();
        }
    }

    enter() {
        if (this.isActive) return;

        this.isActive = true;
        document.body.classList.add('focus-mode-active');

        // Update focus indicator
        this.updateFocusIndicator();

        // Show entry message
        const entryMessage = this.isMobile ?
            'Focus Mode Active • Tap focus button or long press to exit' :
            'Focus Mode Active • Press F or Esc to exit';
        this.showFocusMessage(entryMessage, 'focus-enter');

        // Trigger callbacks
        this.callbacks.enter.forEach(callback => callback());

        console.log('Focus Mode: ENTERED');
    }

    exit() {
        if (!this.isActive) return;

        this.isActive = false;
        document.body.classList.remove('focus-mode-active');

        // Update focus indicator
        this.updateFocusIndicator();

        // Show exit message
        const exitMessage = this.isMobile ?
            'Focus Mode Disabled • Tap focus button or long press to re-enter' :
            'Focus Mode Disabled • Press F to re-enter';
        this.showFocusMessage(exitMessage, 'focus-exit');

        // Trigger callbacks
        this.callbacks.exit.forEach(callback => callback());

        console.log('Focus Mode: EXITED');
    }

    createFocusIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'focus-mode-indicator';
        indicator.innerHTML = `
            <div class="focus-indicator-content">
                <span class="focus-indicator-icon">◉</span>
                <span class="focus-indicator-text">Focus</span>
            </div>
        `;
        indicator.addEventListener('click', () => this.toggle());
        indicator.title = this.isMobile ?
            'Toggle Focus Mode (tap or long press)' :
            'Toggle Focus Mode (F)';

        document.body.appendChild(indicator);
        this.indicator = indicator;
    }

    updateFocusIndicator() {
        if (this.indicator) {
            this.indicator.classList.toggle('active', this.isActive);
        }
    }

    showFocusMessage(text, type = 'focus-info') {
        // Remove any existing focus messages
        const existingMessages = document.querySelectorAll('.focus-message');
        existingMessages.forEach(msg => msg.remove());

        const message = document.createElement('div');
        message.className = `focus-message ${type}`;
        message.textContent = text;

        document.body.appendChild(message);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (message.parentNode) {
                message.classList.add('fade-out');
                setTimeout(() => message.remove(), 300);
            }
        }, 3000);
    }

    // Public API for components to register callbacks
    onEnter(callback) {
        this.callbacks.enter.push(callback);
        return this;
    }

    onExit(callback) {
        this.callbacks.exit.push(callback);
        return this;
    }

    // Public API to check focus mode state
    get active() {
        return this.isActive;
    }
}

// Create global focus mode instance
window.FocusMode = new FocusMode();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FocusMode;
}
