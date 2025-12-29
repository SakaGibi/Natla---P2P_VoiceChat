// modals.js - Settings & Stream Window Management
const dom = require('./dom');

// Initializes basic event listeners for modals
function initModals() {
    // Close button (Stream Watch)
    if (dom.btnCloseStream) {
        dom.btnCloseStream.onclick = () => {
            dom.streamModal.style.display = 'none';
            dom.largeVideoPlayer.srcObject = null;
        };
    }

    // Close settings
    if (dom.btnCloseSettings) {
        dom.btnCloseSettings.onclick = () => {
            dom.passwordModal.style.display = 'none';
        };
    }
}
/**
 * @param {Object} configData - Mevcut sunucu ve anahtar bilgileri
 */
// Opens settings window and fills current values
function openSettings(configData) {
    if (configData) {
        dom.serverInput.value = configData.SIGNALING_SERVER || "";
        dom.keyInput.value = configData.ACCESS_KEY || "";
    }
    
    dom.passwordModal.style.display = 'flex';
    
    // Focus on first input shortly after opening
    setTimeout(() => {
        if (dom.serverInput) dom.serverInput.focus();
    }, 50);
}

// Closes settings window
function closeSettings() {
    dom.passwordModal.style.display = 'none';
}

// Closes stream watch window
function closeStream() {
    dom.streamModal.style.display = 'none';
    dom.largeVideoPlayer.srcObject = null;
}

module.exports = {
    initModals,
    openSettings,
    closeSettings,
    closeStream
};