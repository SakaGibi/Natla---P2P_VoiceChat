// modals.js - Ayarlar ve Yayın İzleme Pencere Yönetimi
const dom = require('./dom');

/**
 * Modallar için gerekli temel olay dinleyicilerini başlatır
 */
function initModals() {
    // Kapat butonu (Ekran İzleme)
    if (dom.btnCloseStream) {
        dom.btnCloseStream.onclick = () => {
            dom.streamModal.style.display = 'none';
            dom.largeVideoPlayer.srcObject = null;
        };
    }

    // Ayarlar kapat
    if (dom.btnCloseSettings) {
        dom.btnCloseSettings.onclick = () => {
            dom.passwordModal.style.display = 'none';
        };
    }
}
/**
 * Ayarlar penceresini açar ve mevcut değerleri doldurur
 * @param {Object} configData - Mevcut sunucu ve anahtar bilgileri
 */
function openSettings(configData) {
    if (configData) {
        dom.serverInput.value = configData.SIGNALING_SERVER || "";
        dom.keyInput.value = configData.ACCESS_KEY || "";
    }
    
    dom.passwordModal.style.display = 'flex';
    
    // Açıldıktan kısa süre sonra ilk inputa odaklan
    setTimeout(() => {
        if (dom.serverInput) dom.serverInput.focus();
    }, 50);
}

/**
 * Ayarlar penceresini kapatır
 */
function closeSettings() {
    dom.passwordModal.style.display = 'none';
}

/**
 * Yayın izleme penceresini kapatır
 */
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