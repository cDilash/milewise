// Shared utility functions
const utils = {
    // Formatting helpers
    formatCurrency(amount) {
        return `$${parseFloat(amount).toFixed(2)}`;
    },

    formatDate(date) {
        if (typeof date === 'string') {
            date = new Date(date);
        }
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Local Storage Helpers
    saveToLocalStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            this.showNotification('Data saved successfully', 'success');
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            this.showNotification('Error saving data', 'error');
            return false;
        }
    },

    getFromLocalStorage(key, defaultValue = []) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            this.showNotification('Error loading data', 'error');
            return defaultValue;
        }
    },

    // Date comparison helpers
    isSameDay(date1, date2) {
        return date1.getDate() === date2.getDate() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getFullYear() === date2.getFullYear();
    },

    isThisWeek(date) {
        const today = new Date();
        const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
        const weekEnd = new Date(today.setDate(today.getDate() - today.getDay() + 6));
        return date >= weekStart && date <= weekEnd;
    },

    isSameMonth(date1, date2) {
        return date1.getMonth() === date2.getMonth() &&
               date1.getFullYear() === date2.getFullYear();
    },

    // Notification system
    showNotification(message, type = 'info', duration = 5000) {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());

        // Create new notification
        const notification = document.createElement('div');
        notification.className = `notification ${type} animate-slide-in`;
        notification.innerHTML = `
            <i class="fas fa-${
                type === 'success' ? 'check-circle' : 
                type === 'error' ? 'exclamation-circle' : 
                type === 'warning' ? 'exclamation-triangle' :
                'info-circle'
            } mr-2"></i>
            <span class="notification-message">${message}</span>
            <button onclick="this.parentElement.remove()" class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Add notification to DOM
        document.body.appendChild(notification);

        // Auto remove after duration
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, duration);
    },

    // Loading state management
    showLoading(element, message = 'Loading...') {
        const originalContent = element.innerHTML;
        element.disabled = true;
        element.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-circle-notch fa-spin"></i>
                <span>${message}</span>
            </div>
        `;
        return originalContent;
    },

    hideLoading(element, originalContent) {
        element.disabled = false;
        element.innerHTML = originalContent;
    },

    // Theme management
    initializeTheme() {
        const isDarkMode = localStorage.getItem('darkMode') === 'true';
        document.body.classList.toggle('dark-mode', isDarkMode);
        return isDarkMode;
    },

    toggleDarkMode() {
        const isDark = document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', isDark);
        
        // Update map style if it exists
        if (window.map) {
            map.setStyle(isDark ? 
                'mapbox://styles/mapbox/dark-v11' : 
                'mapbox://styles/mapbox/streets-v12'
            );
        }
        
        return isDark;
    },

    // Navigation management
    async loadNavigation() {
        try {
            // Check if navigation is already loaded
            const existingNav = document.querySelector('nav');
            if (existingNav) {
                console.log('Navigation already loaded');
                return;
            }

            const response = await fetch('components/nav.html');
            const html = await response.text();
            
            // Create temporary container
            const temp = document.createElement('div');
            temp.innerHTML = html;
            
            // Extract elements
            const nav = temp.querySelector('nav');
            const style = temp.querySelector('style');
            const script = temp.querySelector('script');
            
            // Insert nav
            const navPlaceholder = document.getElementById('nav-placeholder');
            if (navPlaceholder && !navPlaceholder.hasChildNodes()) {
                navPlaceholder.appendChild(nav);
                
                // Add styles if not present
                if (style && !document.querySelector(`style[data-nav-styles]`)) {
                    style.setAttribute('data-nav-styles', 'true');
                    document.head.appendChild(style);
                }
                
                // Execute script
                if (script) {
                    const newScript = document.createElement('script');
                    newScript.textContent = script.textContent;
                    document.body.appendChild(newScript);
                }
            }

            this.setActiveNavLink();

        } catch (error) {
            console.error('Error loading navigation:', error);
            this.showNotification('Error loading navigation', 'error');
        }
    },

    setActiveNavLink() {
        const currentPage = window.location.pathname.split('/').pop().split('.')[0] || 'index';
        document.querySelectorAll('.nav-link, .mobile-link').forEach(link => {
            if (link.getAttribute('href').includes(currentPage)) {
                link.classList.add('active');
            }
        });
    },

    toggleMobileMenu() {
        const mobileMenu = document.getElementById('mobileMenu');
        if (mobileMenu) {
            mobileMenu.classList.toggle('hidden');
        }
    },

    // Export CSV helper
    exportToCSV(data, filename) {
        const blob = new Blob([data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', filename);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    utils.initializeTheme();
});

// Close mobile menu when clicking outside
document.addEventListener('click', function(event) {
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    if (mobileMenu && !mobileMenu.contains(event.target) && !mobileMenuBtn.contains(event.target)) {
        mobileMenu.classList.add('hidden');
    }
});

// Export utils globally
window.utils = utils;
