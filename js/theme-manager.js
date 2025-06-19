// Theme Manager for Mimir App
class ThemeManager {
    constructor() {
        this.currentTheme = 'default';
        this.themes = {
            default: {
                name: 'Light in Water',
                description: 'Dark theme with golden accents and ethereal glow effects'
            },
            paper: {
                name: 'Ink on Paper',
                description: 'Monochromatic light theme with paper-like texture'
            }
        };
        this.init();
    }

    init() {
        // Load saved theme from localStorage
        const savedTheme = localStorage.getItem('mimir-theme');
        if (savedTheme && this.themes[savedTheme]) {
            this.currentTheme = savedTheme;
        }

        // Apply the current theme
        this.applyTheme(this.currentTheme);

        // Create theme toggle button
        this.createThemeToggle();

        console.log('Theme Manager initialized with theme:', this.currentTheme);
    }

    createThemeToggle() {
        // Create theme toggle button
        const themeToggle = document.createElement('div');
        themeToggle.className = 'theme-toggle';
        themeToggle.innerHTML = `
            <div class="theme-toggle-content">
                <span class="theme-toggle-icon">🎨</span>
                <span class="theme-toggle-text">${this.themes[this.currentTheme].name}</span>
            </div>
        `;
        
        themeToggle.addEventListener('click', () => this.toggleTheme());
        
        // Add to page
        document.body.appendChild(themeToggle);

        // Add CSS for theme toggle
        this.addThemeToggleStyles();
    }

    addThemeToggleStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .theme-toggle {
                position: fixed;
                top: 20px;
                left: 20px;
                background-color: var(--bg-modal);
                border: 1px solid var(--divider-medium);
                border-radius: 20px;
                padding: 8px 16px;
                cursor: pointer;
                transition: all 0.3s ease;
                z-index: 1002;
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                user-select: none;
                -webkit-user-select: none;
                touch-action: manipulation;
                -webkit-tap-highlight-color: rgba(214, 179, 0, 0.3);
                -webkit-touch-callout: none;
            }

            .theme-toggle:hover {
                border-color: var(--accent-primary);
                background-color: var(--bg-container);
                transform: scale(1.05);
            }

            .theme-toggle-content {
                display: flex;
                align-items: center;
                gap: 8px;
                color: var(--text-secondary);
                font-size: 14px;
                font-weight: 500;
            }

            .theme-toggle-icon {
                font-size: 16px;
                opacity: 0.8;
            }

            .theme-toggle:hover .theme-toggle-content {
                color: var(--accent-primary);
            }

            .theme-toggle:hover .theme-toggle-icon {
                opacity: 1;
            }

            /* Mobile adjustments */
            @media (max-width: 768px) {
                .theme-toggle {
                    top: 15px;
                    left: 15px;
                    padding: 6px 12px;
                    min-width: 44px;
                    min-height: 44px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .theme-toggle-content {
                    font-size: 12px;
                    gap: 6px;
                }

                .theme-toggle-icon {
                    font-size: 14px;
                }
            }

            /* Hide theme toggle when mobile keyboard is open */
            @media (max-height: 500px) {
                .theme-toggle {
                    opacity: 0.7;
                    transform: scale(0.8);
                }
            }
        `;
        document.head.appendChild(style);
    }

    toggleTheme() {
        const themes = Object.keys(this.themes);
        const currentIndex = themes.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % themes.length;
        const nextTheme = themes[nextIndex];
        
        this.setTheme(nextTheme);
    }

    setTheme(themeName) {
        if (!this.themes[themeName]) {
            console.warn('Theme not found:', themeName);
            return;
        }

        this.currentTheme = themeName;
        this.applyTheme(themeName);
        this.saveTheme(themeName);
        this.updateThemeToggle();

        // Show theme change message
        this.showThemeMessage(`Switched to ${this.themes[themeName].name}`);
    }

    applyTheme(themeName) {
        const html = document.documentElement;
        
        // Remove existing theme attributes
        html.removeAttribute('data-theme');
        
        // Apply new theme
        if (themeName !== 'default') {
            html.setAttribute('data-theme', themeName);
        }

        console.log('Applied theme:', themeName);
    }

    saveTheme(themeName) {
        localStorage.setItem('mimir-theme', themeName);
    }

    updateThemeToggle() {
        const themeToggle = document.querySelector('.theme-toggle');
        if (themeToggle) {
            const textElement = themeToggle.querySelector('.theme-toggle-text');
            if (textElement) {
                textElement.textContent = this.themes[this.currentTheme].name;
            }
        }
    }

    showThemeMessage(message) {
        // Remove existing message
        const existingMessage = document.querySelector('.theme-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Create new message
        const messageElement = document.createElement('div');
        messageElement.className = 'theme-message';
        messageElement.textContent = message;
        
        // Add message styles
        messageElement.style.cssText = `
            position: fixed;
            top: 70px;
            left: 50%;
            transform: translateX(-50%);
            background-color: var(--bg-modal);
            border: 1px solid var(--divider-medium);
            border-radius: 8px;
            padding: 12px 20px;
            color: var(--accent-primary);
            font-size: 14px;
            font-weight: 500;
            z-index: 1003;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            animation: theme-message-enter 0.3s ease-out;
            max-width: 300px;
            text-align: center;
        `;

        document.body.appendChild(messageElement);

        // Auto-remove after 2 seconds
        setTimeout(() => {
            messageElement.style.animation = 'theme-message-exit 0.3s ease-in forwards';
            setTimeout(() => {
                if (messageElement.parentNode) {
                    messageElement.remove();
                }
            }, 300);
        }, 2000);
    }

    // Public API
    getCurrentTheme() {
        return this.currentTheme;
    }

    getAvailableThemes() {
        return { ...this.themes };
    }
}

// Initialize theme manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.ThemeManager = new ThemeManager();
});

// Add CSS animations for theme messages
const themeAnimationStyles = document.createElement('style');
themeAnimationStyles.textContent = `
    @keyframes theme-message-enter {
        from {
            opacity: 0;
            transform: translateX(-50%) translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    }

    @keyframes theme-message-exit {
        from {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
        to {
            opacity: 0;
            transform: translateX(-50%) translateY(-10px);
        }
    }
`;
document.head.appendChild(themeAnimationStyles);
