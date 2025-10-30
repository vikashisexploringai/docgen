// Utility functions

class Utils {
    static showMessage(message, type = 'success') {
        const messageArea = document.getElementById('message-area');
        const messageClass = type === 'success' ? 'success-message' : 'error-message';
        
        messageArea.innerHTML = `<div class="${messageClass}">${message}</div>`;
        
        // Auto-hide success messages after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                if (messageArea.innerHTML.includes(message)) {
                    messageArea.innerHTML = '';
                }
            }, 5000);
        }
    }
    
    static showLoading(message = 'Processing...') {
        const messageArea = document.getElementById('message-area');
        messageArea.innerHTML = `<div class="loading">${message}</div>`;
    }
    
    static hideMessage() {
        document.getElementById('message-area').innerHTML = '';
    }
    
    static formatDate(date) {
        return moment(date).format('DD/MM/YYYY');
    }
    
    static formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    }
    
    static validateGSTIN(gstin) {
        const pattern = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/;
        return pattern.test(gstin);
    }
    
    static validatePAN(pan) {
        const pattern = /^[A-Z]{5}\d{4}[A-Z]{1}$/;
        return pattern.test(pan);
    }
    
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}
