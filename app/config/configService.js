// configService.js - Settings Management (Read/Write)
const fs = require('fs');
const path = require('path');
const state = require('../state/appState');
const dom = require('../ui/dom');

// FIX: isPackaged check on Renderer side
const isActuallyDev = !__dirname.includes('app.asar');

let CONFIG_PATH;

if (isActuallyDev) {
    // In development (inside app/ folder, go up one level)
    CONFIG_PATH = path.join(__dirname, '..', '..', 'config.json');
} else {
    // Paketlendiğinde kullanıcı verileri klasörü (AppData/Roaming/Natla)
    const appData = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share");
    const appDir = path.join(appData, 'Natla');
    
    if (!fs.existsSync(appDir)){
        try { fs.mkdirSync(appDir, { recursive: true }); } catch(e) { console.error("Klasör oluşturulamadı", e); }
    }
    
    CONFIG_PATH = path.join(appDir, 'config.json');
}


// Returns current configuration
function getConfig() {
    return state.configData;
}


// Reads config.json from file system and loads into state
function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            const data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
            state.configData = data;
            console.log("✅ Config yüklendi:", data.SIGNALING_SERVER);
            return data;
        }
    } catch (error) {
        console.error("Config okunurken hata oluştu:", error);
    }
    return null;
}


// Saves data from UI as config.json
function handleSaveSettings() {
    const enteredServer = dom.serverInput.value.trim();
    const enteredKey = dom.keyInput.value.trim();

    if (!enteredServer || !enteredKey) {
        return alert("Lütfen tüm alanları doldurun!");
    }

    const newConfig = { 
        SIGNALING_SERVER: enteredServer, 
        ACCESS_KEY: enteredKey 
    };

    try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(newConfig, null, 2));
        state.configData = newConfig;
        dom.passwordModal.style.display = 'none';
        alert("Ayarlar kaydedildi. Yeniden bağlanılıyor...");
        location.reload(); 
    } catch (e) {
        alert("Dosya yazma hatası: " + e.message);
    }
}


// Saves simple localStorage settings (Username etc.)
function saveSetting(key, value) {
    localStorage.setItem(key, value);
}

module.exports = {
    getConfig,
    loadConfig,
    handleSaveSettings,
    saveSetting
};