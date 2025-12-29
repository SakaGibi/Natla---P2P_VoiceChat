// helpers.js - Helper Functions & Formatters

/**
 * @returns {string} Example: "14:30"
 */
// Returns current time in "HH:MM" format
function getCurrentTime() {
    return new Date().toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

/**
 * @param {number} bytes - File size in bytes
 * @param {number} decimals - Decimal places
 * @returns {string} Example: "15.50 MB"
 */
// Converts file size in bytes to readable format (MB)
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 MB';
    
    // Calculate MB directly as app uses MB globally
    const mb = bytes / (1024 * 1024);
    return mb.toFixed(decimals) + ' MB';
}

/**
 * @param {string} str - text to sanitize
 * @returns {string} sanitized text
 */
// Sanitizes text for safe display in HTML (XSS protection)
function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * @returns {string} returns a unique transfer ID
 */
// Generates a unique Transfer ID
function generateTransferId() {
    return "transfer-" + Date.now();
}

module.exports = {
    getCurrentTime,
    formatBytes,
    escapeHTML,
    generateTransferId
};