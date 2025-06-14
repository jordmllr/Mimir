// User interaction handlers for Mimir app
/**
 * Comprehensive swipe detection system for mobile flashcard interactions
 */
class SwipeDetector {
    constructor(element, options = {}) {
        this.element = element;
        this.options = {
            threshold: options.threshold || 50, // Minimum distance for a swipe
            restraint: options.restraint || 100, // Maximum distance perpendicular to swipe direction
            allowedTime: options.allowedTime || 300, // Maximum time allowed for swipe
            ...options
        };

        this.startX = 0;
        this.startY = 0;
        this.startTime = 0;
        this.isTracking = false;

        this.callbacks = {
            swipeLeft: [],
            swipeRight: [],
            swipeUp: [],
            swipeDown: [],
            tap: [],
            longPress: []
        };

        this.longPressTimer = null;
        this.longPressDelay = options.longPressDelay || 500;

        this.init();
    }

    init() {
        // Touch events for mobile
        this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });

        // Mouse events for desktop testing
        this.element.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.element.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.element.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.element.addEventListener('mouseleave', this.handleMouseUp.bind(this));

        // Prevent context menu on long press
        this.element.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    handleTouchStart(e) {
        const touch = e.touches[0];
        const target = e.target;

        // Don't interfere with form elements and buttons
        if (this.isFormElement(target)) {
            return;
        }

        this.startTracking(touch.clientX, touch.clientY);
        // Only prevent default if we're starting to track a swipe
        e.preventDefault();
    }

    handleTouchMove(e) {
        if (!this.isTracking) return;

        // Clear long press timer on movement
        this.clearLongPressTimer();

        // Only prevent scrolling during active swipe tracking
        e.preventDefault();
    }

    handleTouchEnd(e) {
        if (!this.isTracking) return;

        const touch = e.changedTouches[0];
        this.endTracking(touch.clientX, touch.clientY);
    }

    handleMouseDown(e) {
        const target = e.target;

        // Don't interfere with form elements and buttons
        if (this.isFormElement(target)) {
            return;
        }

        this.startTracking(e.clientX, e.clientY);
    }

    handleMouseMove(e) {
        if (!this.isTracking) return;
        this.clearLongPressTimer();
    }

    handleMouseUp(e) {
        if (!this.isTracking) return;
        this.endTracking(e.clientX, e.clientY);
    }

    startTracking(x, y) {
        this.startX = x;
        this.startY = y;
        this.startTime = Date.now();
        this.isTracking = true;

        // Start long press timer
        this.longPressTimer = setTimeout(() => {
            if (this.isTracking) {
                this.triggerCallback('longPress', { x, y });
                this.isTracking = false;
            }
        }, this.longPressDelay);
    }

    endTracking(endX, endY) {
        if (!this.isTracking) return;

        this.clearLongPressTimer();
        this.isTracking = false;

        const deltaX = endX - this.startX;
        const deltaY = endY - this.startY;
        const deltaTime = Date.now() - this.startTime;
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);

        // Check if it's within time limit
        if (deltaTime > this.options.allowedTime) {
            return;
        }

        // Check for tap (small movement)
        if (absDeltaX < 10 && absDeltaY < 10) {
            this.triggerCallback('tap', {
                x: endX,
                y: endY,
                startX: this.startX,
                startY: this.startY
            });
            return;
        }

        // Determine swipe direction
        if (absDeltaX >= this.options.threshold || absDeltaY >= this.options.threshold) {
            if (absDeltaX > absDeltaY) {
                // Horizontal swipe
                if (absDeltaY <= this.options.restraint) {
                    if (deltaX > 0) {
                        this.triggerCallback('swipeRight', {
                            distance: absDeltaX,
                            time: deltaTime,
                            startX: this.startX,
                            startY: this.startY,
                            endX,
                            endY
                        });
                    } else {
                        this.triggerCallback('swipeLeft', {
                            distance: absDeltaX,
                            time: deltaTime,
                            startX: this.startX,
                            startY: this.startY,
                            endX,
                            endY
                        });
                    }
                }
            } else {
                // Vertical swipe
                if (absDeltaX <= this.options.restraint) {
                    if (deltaY > 0) {
                        this.triggerCallback('swipeDown', {
                            distance: absDeltaY,
                            time: deltaTime,
                            startX: this.startX,
                            startY: this.startY,
                            endX,
                            endY
                        });
                    } else {
                        this.triggerCallback('swipeUp', {
                            distance: absDeltaY,
                            time: deltaTime,
                            startX: this.startX,
                            startY: this.startY,
                            endX,
                            endY
                        });
                    }
                }
            }
        }
    }

    clearLongPressTimer() {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
    }

    // Helper method to check if an element is a form element or navigation element that should not be interfered with
    isFormElement(element) {
        if (!element) return false;

        const formTags = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'];
        const navigationTags = ['A']; // Add anchor tags for navigation
        const tagName = element.tagName;

        // Check if it's a form element or navigation element
        if (formTags.includes(tagName) || navigationTags.includes(tagName)) {
            return true;
        }

        // Check if it has navigation-related classes
        if (element.classList && (element.classList.contains('nav-link') || element.classList.contains('navigation'))) {
            return true;
        }

        // Check if it's inside a form element or navigation element
        let parent = element.parentElement;
        while (parent) {
            if (formTags.includes(parent.tagName) || navigationTags.includes(parent.tagName)) {
                return true;
            }
            if (parent.classList && (parent.classList.contains('nav-link') || parent.classList.contains('navigation'))) {
                return true;
            }
            parent = parent.parentElement;
        }

        return false;
    }

    triggerCallback(eventType, data) {
        this.callbacks[eventType].forEach(callback => {
            callback(data);
        });
    }

    // Public methods to register callbacks
    onSwipeLeft(callback) {
        this.callbacks.swipeLeft.push(callback);
        return this;
    }

    onSwipeRight(callback) {
        this.callbacks.swipeRight.push(callback);
        return this;
    }

    onSwipeUp(callback) {
        this.callbacks.swipeUp.push(callback);
        return this;
    }

    onSwipeDown(callback) {
        this.callbacks.swipeDown.push(callback);
        return this;
    }

    onTap(callback) {
        this.callbacks.tap.push(callback);
        return this;
    }

    onLongPress(callback) {
        this.callbacks.longPress.push(callback);
        return this;
    }

    // Remove all event listeners
    destroy() {
        this.element.removeEventListener('touchstart', this.handleTouchStart);
        this.element.removeEventListener('touchmove', this.handleTouchMove);
        this.element.removeEventListener('touchend', this.handleTouchEnd);
        this.element.removeEventListener('mousedown', this.handleMouseDown);
        this.element.removeEventListener('mousemove', this.handleMouseMove);
        this.element.removeEventListener('mouseup', this.handleMouseUp);
        this.element.removeEventListener('mouseleave', this.handleMouseUp);
        this.clearLongPressTimer();
    }
}

// Utility function to create swipe detector
function createSwipeDetector(element, options = {}) {
    return new SwipeDetector(element, options);
}

// iOS Navigation Fix - Utility function to ensure navigation works on iOS
function initIOSNavigationFix() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    console.log('Initializing iOS navigation fix - iOS detected:', isIOS);
    console.log('User agent:', navigator.userAgent);

    // Find all navigation links
    const navLinks = document.querySelectorAll('.nav-link, a[href]');
    console.log('Found navigation links:', navLinks.length);

    navLinks.forEach((link, index) => {
        // Skip if already processed
        if (link.dataset.iosFixed) return;
        link.dataset.iosFixed = 'true';

        console.log(`Setting up navigation fix for link ${index}:`, link.href || link.textContent);

        // For iOS, use a more aggressive approach
        if (isIOS) {
            // Add multiple event handlers to ensure navigation works
            link.addEventListener('touchstart', function(e) {
                console.log('iOS touch start on navigation link:', this.href);
                this.style.backgroundColor = 'rgba(214, 179, 0, 0.3)';
                this.dataset.touchStarted = 'true';
            }, { passive: true });

            link.addEventListener('touchend', function(e) {
                console.log('iOS touch end on navigation link:', this.href);
                this.style.backgroundColor = '';

                // Only navigate if this was a clean touch (not a swipe)
                if (this.dataset.touchStarted === 'true' && this.href) {
                    e.preventDefault();
                    e.stopPropagation();

                    console.log('iOS forcing navigation to:', this.href);
                    // Use a longer delay for iOS
                    setTimeout(() => {
                        window.location.href = this.href;
                    }, 150);
                }

                this.dataset.touchStarted = 'false';
            }, { passive: false });

            // Also handle click as a fallback
            link.addEventListener('click', function(e) {
                console.log('iOS click on navigation link:', this.href);
                if (this.href) {
                    e.preventDefault();
                    console.log('iOS click navigation to:', this.href);
                    window.location.href = this.href;
                }
            }, { passive: false });
        } else {
            // For non-iOS, use simpler handling
            link.addEventListener('click', function(e) {
                console.log('Non-iOS click on navigation link:', this.href);
                // Let default behavior happen
            });
        }
    });
}

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initIOSNavigationFix);
} else {
    initIOSNavigationFix();
}