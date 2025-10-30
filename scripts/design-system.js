// CityNav Design System - Interactive Functionality

// Small env-aware logger for this standalone script
const dsLog = (function () {
    const isDev = typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development';
    // store recent logs in a global array for inspection in tests without spamming console
    if (!window.__ds_log) window.__ds_log = { entries: [] };
    return {
        log: (...args) => { window.__ds_log.entries.push(['log', ...args]); },
        warn: (...args) => { window.__ds_log.entries.push(['warn', ...args]); }
    };
})();

class CityNavDesignSystem {
    constructor() {
        this.currentScreen = 'welcome';
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupInteractiveElements();
        this.setupScreenNavigation();
        this.setupResponsiveNavigation();
    }

    setupNavigation() {
        // Smooth scrolling for navigation links
        const navLinks = document.querySelectorAll('.nav-group a');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('data-section');
                const targetSection = document.getElementById(targetId);
                
                if (targetSection) {
                    // Remove active class from all links
                    navLinks.forEach(l => l.classList.remove('active'));
                    // Add active class to clicked link
                    link.classList.add('active');
                    
                    // Smooth scroll to section
                    targetSection.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        // Update active navigation based on scroll position
        window.addEventListener('scroll', () => {
            this.updateActiveNavigation();
        });
    }

    updateActiveNavigation() {
        const sections = document.querySelectorAll('.ds-section');
        const navLinks = document.querySelectorAll('.nav-group a');
        
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (window.scrollY >= sectionTop - 100) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-section') === current) {
                link.classList.add('active');
            }
        });
    }

    setupInteractiveElements() {
        this.setupButtons();
        this.setupToggleSwitches();
        this.setupLanguageSelector();
        this.setupModeSelector();
        this.setupCategoryChips();
        this.setupPasswordToggle();
    }

    setupButtons() {
        // Add ripple effect to buttons
        const buttons = document.querySelectorAll('.btn');
        buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                this.createRipple(e, button);
            });
        });

        // Emergency SOS button special behavior
        const sosButtons = document.querySelectorAll('.btn-emergency');
        sosButtons.forEach(button => {
            let pressTimer;
            
            button.addEventListener('mousedown', () => {
                pressTimer = setTimeout(() => {
                    this.activateEmergencyMode();
                }, 3000);
            });
            
            button.addEventListener('mouseup', () => {
                clearTimeout(pressTimer);
            });
            
            button.addEventListener('mouseleave', () => {
                clearTimeout(pressTimer);
            });
        });
    }

    createRipple(event, element) {
        const circle = document.createElement('span');
        const diameter = Math.max(element.clientWidth, element.clientHeight);
        const radius = diameter / 2;
        
        const rect = element.getBoundingClientRect();
        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${event.clientX - rect.left - radius}px`;
        circle.style.top = `${event.clientY - rect.top - radius}px`;
        circle.classList.add('ripple');
        
        // Add ripple styles if not already defined
        if (!document.querySelector('.ripple-styles')) {
            const style = document.createElement('style');
            style.className = 'ripple-styles';
            style.textContent = `
                .ripple {
                    position: absolute;
                    border-radius: 50%;
                    background-color: rgba(255, 255, 255, 0.3);
                    transform: scale(0);
                    animation: ripple-animation 600ms linear;
                    pointer-events: none;
                }
                
                @keyframes ripple-animation {
                    to {
                        transform: scale(4);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        const ripple = element.getElementsByClassName('ripple')[0];
        if (ripple) {
            ripple.remove();
        }
        
        element.appendChild(circle);
        
        setTimeout(() => {
            circle.remove();
        }, 600);
    }

    setupToggleSwitches() {
        const toggles = document.querySelectorAll('.toggle-switch');
        toggles.forEach(toggle => {
            toggle.addEventListener('click', () => {
                toggle.classList.toggle('active');
                
                // Trigger custom event
                const event = new CustomEvent('toggleChange', {
                    detail: { active: toggle.classList.contains('active') }
                });
                toggle.dispatchEvent(event);
            });
        });
    }

    setupLanguageSelector() {
        const langCards = document.querySelectorAll('.lang-card');
        langCards.forEach(card => {
            card.addEventListener('click', () => {
                // Remove active from all language cards
                const parentSelector = card.closest('.language-selector');
                if (parentSelector) {
                    parentSelector.querySelectorAll('.lang-card').forEach(c => c.classList.remove('active'));
                }
                // Add active to clicked card
                card.classList.add('active');
                
                // Trigger custom event
                const event = new CustomEvent('languageChange', {
                    detail: { language: card.textContent }
                });
                card.dispatchEvent(event);
            });
        });
    }

    setupModeSelector() {
        const modeChips = document.querySelectorAll('.mode-chip');
        modeChips.forEach(chip => {
            chip.addEventListener('click', () => {
                // Remove active from all mode chips in the same selector
                const parentSelector = chip.closest('.mode-selector');
                if (parentSelector) {
                    parentSelector.querySelectorAll('.mode-chip').forEach(c => c.classList.remove('active'));
                }
                // Add active to clicked chip
                chip.classList.add('active');
                
                // Trigger custom event
                const event = new CustomEvent('modeChange', {
                    detail: { mode: chip.textContent.trim() }
                });
                chip.dispatchEvent(event);
            });
        });
    }

    setupCategoryChips() {
        const categoryChips = document.querySelectorAll('.category-chip');
        categoryChips.forEach(chip => {
            chip.addEventListener('click', () => {
                // Toggle active state for category chips (can have multiple active)
                chip.classList.toggle('active');
                
                // Get all active categories
                const parentContainer = chip.closest('.category-chips');
                const activeCategories = Array.from(parentContainer.querySelectorAll('.category-chip.active'))
                    .map(c => c.textContent.trim());
                
                // Trigger custom event
                const event = new CustomEvent('categoryChange', {
                    detail: { categories: activeCategories }
                });
                chip.dispatchEvent(event);
            });
        });
    }

    setupPasswordToggle() {
        const passwordToggles = document.querySelectorAll('.input-wrapper .input-icon');
        passwordToggles.forEach(toggle => {
            const input = toggle.closest('.input-wrapper').querySelector('input[type="password"], input[type="text"]');
            if (input && input.type === 'password') {
                toggle.addEventListener('click', () => {
                    const isPassword = input.type === 'password';
                    input.type = isPassword ? 'text' : 'password';
                    const icon = toggle.querySelector('.material-icons');
                    icon.textContent = isPassword ? 'visibility_off' : 'visibility';
                });
            }
        });
    }

    setupScreenNavigation() {
        // Global navigation function for prototype screens
        window.navigateToScreen = (screenId) => {
            this.currentScreen = screenId;
            dsLog.log(`Navigating to screen: ${screenId}`);
            
            // In a real app, this would handle routing
            // For the prototype, we'll just log and potentially show different content
            
            // Trigger custom event for screen navigation
            const event = new CustomEvent('screenNavigation', {
                detail: { screen: screenId, previousScreen: this.currentScreen }
            });
            document.dispatchEvent(event);
            
            // Update URL hash for demo purposes
            window.location.hash = screenId;
        };
    }

    setupResponsiveNavigation() {
        // Mobile navigation toggle for design system
        const createMobileToggle = () => {
            if (window.innerWidth <= 1024 && !document.querySelector('.mobile-nav-toggle')) {
                const toggle = document.createElement('button');
                toggle.className = 'mobile-nav-toggle';
                toggle.innerHTML = '<span class="material-icons">menu</span>';
                toggle.style.cssText = `
                    position: fixed;
                    top: 16px;
                    left: 16px;
                    z-index: 1060;
                    background: var(--primary);
                    color: var(--on-primary);
                    border: none;
                    border-radius: 50%;
                    width: 56px;
                    height: 56px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: var(--elevation-3);
                    cursor: pointer;
                `;
                
                toggle.addEventListener('click', () => {
                    const nav = document.querySelector('.design-system-nav');
                    nav.classList.toggle('open');
                    
                    const icon = toggle.querySelector('.material-icons');
                    icon.textContent = nav.classList.contains('open') ? 'close' : 'menu';
                });
                
                document.body.appendChild(toggle);
            }
        };
        
        // Check on load and resize
        createMobileToggle();
        window.addEventListener('resize', createMobileToggle);
        
        // Close mobile nav when clicking outside
        document.addEventListener('click', (e) => {
            const nav = document.querySelector('.design-system-nav');
            const toggle = document.querySelector('.mobile-nav-toggle');
            
            if (nav && toggle && nav.classList.contains('open')) {
                if (!nav.contains(e.target) && !toggle.contains(e.target)) {
                    nav.classList.remove('open');
                    toggle.querySelector('.material-icons').textContent = 'menu';
                }
            }
        });
    }

    activateEmergencyMode() {
        // Emergency mode activation
        dsLog.log('Emergency mode activated!');
        
        // Show emergency overlay (in a real app)
        this.showNotification('Emergency mode activated! Contacting emergency services...', 'error');
        
        // Vibrate if supported
        if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200]);
        }
    }

    showNotification(message, type = 'info') {
        // Create notification toast
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Add notification styles if not already defined
        if (!document.querySelector('.notification-styles')) {
            const style = document.createElement('style');
            style.className = 'notification-styles';
            style.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 16px 24px;
                    border-radius: 8px;
                    color: white;
                    font-weight: 500;
                    z-index: 1080;
                    max-width: 400px;
                    box-shadow: var(--elevation-4);
                    animation: slideIn 300ms ease;
                }
                
                .notification-info { background-color: var(--primary); }
                .notification-success { background-color: var(--success); }
                .notification-warning { background-color: var(--warning); }
                .notification-error { background-color: var(--error); }
                
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                
                @keyframes slideOut {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 300ms ease';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 5000);
        
        // Click to dismiss
        notification.addEventListener('click', () => {
            notification.style.animation = 'slideOut 300ms ease';
            setTimeout(() => {
                notification.remove();
            }, 300);
        });
    }
}

// Utility functions for form validation
class FormValidator {
    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    static validatePassword(password) {
        return password.length >= 6;
    }
    
    static showFieldError(field, message) {
        // Remove existing error
        const existingError = field.parentElement.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
        
        // Add new error
        const error = document.createElement('span');
        error.className = 'field-error';
        error.textContent = message;
        error.style.cssText = `
            color: var(--error);
            font-size: var(--body-small-size);
            margin-top: 4px;
            display: block;
        `;
        
        field.parentElement.appendChild(error);
        field.style.borderColor = 'var(--error)';
    }
    
    static clearFieldError(field) {
        const existingError = field.parentElement.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
        field.style.borderColor = '';
    }
}

// Location services simulation
class LocationService {
    static async getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        resolve({
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                            city: 'Pune' // Simulated city detection
                        });
                    },
                    (error) => {
                        reject(error);
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 60000
                    }
                );
            } else {
                reject(new Error('Geolocation not supported'));
            }
        });
    }
    
    static async detectCity(lat, lng) {
        // Simulate city detection API call
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve('Pune');
            }, 1000);
        });
    }
}

// Initialize the design system when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new CityNavDesignSystem();
    
    // Add some demo event listeners
    document.addEventListener('languageChange', (e) => {
        dsLog.log('Language changed to:', e.detail.language);
    });
    
    document.addEventListener('modeChange', (e) => {
        dsLog.log('Transport mode changed to:', e.detail.mode);
    });
    
    document.addEventListener('categoryChange', (e) => {
        dsLog.log('Active categories:', e.detail.categories);
    });
    
    document.addEventListener('screenNavigation', (e) => {
        dsLog.log('Screen navigation:', e.detail);
    });
    
    // Form validation demos
    const emailInputs = document.querySelectorAll('input[type="email"]');
    emailInputs.forEach(input => {
        input.addEventListener('blur', () => {
            if (input.value && !FormValidator.validateEmail(input.value)) {
                FormValidator.showFieldError(input, 'Please enter a valid email address');
            } else {
                FormValidator.clearFieldError(input);
            }
        });
    });
    
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    passwordInputs.forEach(input => {
        input.addEventListener('blur', () => {
            if (input.value && !FormValidator.validatePassword(input.value)) {
                FormValidator.showFieldError(input, 'Password must be at least 6 characters long');
            } else {
                FormValidator.clearFieldError(input);
            }
        });
    });
});

// Add CSS custom properties support for older browsers
if (!CSS.supports('color', 'var(--primary)')) {
    dsLog.warn('CSS Custom Properties not supported. Consider using a polyfill.');
}
