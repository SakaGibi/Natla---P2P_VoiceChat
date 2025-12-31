// soundEffects.js - Soundpad & Effect Management
const state = require('../state/appState');
const socketService = require('../socket/socketService');
const audioEngine = require('./audioEngine');
const dom = require('../ui/dom');
const path = require('path');

// Default legacy sounds
const defaultSounds = [
    { file: 'fahh_effect', title: 'Fahh Efekti', short: 'fahh' },
    { file: 'ahhhhhhh_effect', title: 'Ahhhhhhh Efekti', short: 'aaah' },
    { file: 'besili_camis_effect', title: 'besili camış', short: 'besili camış' },
    { file: 'denyo_dangalak_effect', title: 'denyo mu dangalak mı?', short: 'denyo' },
    { file: 'deplasman_yasağı_effect', title: 'deplasman yarağı', short: 'dep. yasak' },
    { file: 'levo_rage_effect', title: 'harika bir oyun', short: 'işte bu' },
    { file: 'masaj_salonu_effect', title: 'mecidiyeköy masaj salonu', short: 'masaj salonu' },
    { file: 'neden_ben_effect', title: 'Neden dede neden beni seçtin', short: 'neden dede' },
    { file: 'samsun_anlık_effect', title: 'adalet mahallesinde gaza', short: 'Samsun Anlık' },
    { file: 'simdi_hoca_effect', title: 'şimdi hocam, position is obvious', short: 'Şimdi Hoca' },
    { file: 'soru_yanlısmıs_effect', title: 'Yauv sen yanlış yapmadın, soru yanlışmış yauv', short: 'Soru Yanlışmış Yauv' },
    { file: 'çok_zor_ya_effect', title: 'çok zor ya', short: 'çok zor ya' },
    { file: 'sus_artık_effect', title: 'yeter be sus artık', short: 'sus artık' },
    { file: 'buz_bira_effect', title: 'buz gibi bira var mı?', short: 'buz bira' },
    { file: 'osu_effect', title: 'yankılı osuruk', short: 'osuruk' },
    { file: 'aglama_oyna_Effect', title: 'ağlama hade oyna', short: 'ağlama oyna' }
];

// Current mappings: index -> { path: string, name: string, isCustom: boolean }
let soundMap = {};

function initSoundpad() {
    loadSoundMap();
    renderButtons();
    setupFileInput();
}

function loadSoundMap() {
    try {
        const saved = localStorage.getItem('soundMap');
        if (saved) {
            soundMap = JSON.parse(saved);
        } else {
            // Populate defaults on first run if empty
            defaultSounds.forEach((s, i) => {
                soundMap[i] = {
                    path: s.file, // Legacy names are just filenames without extension
                    name: s.short,
                    isCustom: false,
                    title: s.title
                };
            });
        }
    } catch (e) {
        console.error("SoundMap load error:", e);
    }
}

function saveSoundMap() {
    localStorage.setItem('soundMap', JSON.stringify(soundMap));
}

function renderButtons() {
    const buttons = document.querySelectorAll('.soundpad-btn');

    buttons.forEach((btn, index) => {
        const data = soundMap[index];

        // Reset state
        btn.onclick = null;
        btn.oncontextmenu = null;

        if (data) {
            btn.innerText = data.name;
            btn.title = data.title || data.name;
            btn.style.backgroundColor = data.isCustom ? '#4834d4' : ''; // Highlight custom

            // Left Click: PLAY
            btn.onclick = () => {
                if (!state.isConnected) return;
                if (state.isDeafened) return;

                // Determine if we need full path or asset lookup
                audioEngine.playLocalSound(data.path, data.isCustom);

                // Visual feedback
                btn.style.opacity = '0.5';
                setTimeout(() => btn.style.opacity = '1', 200);
            };
        } else {
            btn.innerText = "+";
            btn.title = "Sağ tıkla ekle";
            btn.style.backgroundColor = '#2c3e50';
            btn.onclick = () => {
                // Hint for user
                alert("Bu butona ses eklemek için SAĞ TIKLAYIN.");
            };
        }

        // Right Click: CONTEXT MENU (Assign Sound or Rename)
        btn.oncontextmenu = (e) => {
            e.preventDefault();
            openEditModal(index);
        };
    });
}

// --- FILE INPUT HANDLING ---
let pendingFileScan = null; // Temp storage for selected file

function setupFileInput() {
    let input = document.getElementById('soundpadInput');
    if (!input) {
        input = document.createElement('input');
        input.type = 'file';
        input.id = 'soundpadInput';
        input.accept = 'audio/*';
        input.style.display = 'none';
        document.body.appendChild(input);
    }

    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Update UI to show selected file
            if (dom.selectedFileName) {
                dom.selectedFileName.innerText = file.name;
                dom.selectedFileName.style.color = "#2ecc71"; // Green to indicate success
            }
            // Store file data to be saved later
            pendingFileScan = {
                path: file.path,
                name: file.name.split('.')[0].substring(0, 10),
                title: file.name
            };

            // Auto-fill name if empty
            if (dom.soundpadNameInput && dom.soundpadNameInput.value.trim() === "") {
                dom.soundpadNameInput.value = pendingFileScan.name;
            }
        }
        input.value = '';
    };
}

function triggerFileSelect() {
    const input = document.getElementById('soundpadInput');
    if (input) input.click();
}

function openEditModal(index) {
    if (!dom.soundpadModal) return;

    // Reset state
    pendingFileScan = null;
    const data = soundMap[index];
    const currentName = (data && data.name) ? data.name : "";
    const currentTitle = (data && data.title) ? data.title : "Mevcut dosya korunacak";

    // Setup UI
    dom.soundpadNameInput.value = currentName;
    if (dom.selectedFileName) {
        dom.selectedFileName.innerText = (data && data.path) ? (data.title || "Mevcut Ses") : "Henüz dosya seçilmedi";
        dom.selectedFileName.style.color = "#888";
    }

    dom.soundpadModal.style.display = 'flex';
    dom.soundpadNameInput.focus();

    // FILE SELECT BUTTON
    if (dom.btnSelectSoundFile) {
        dom.btnSelectSoundFile.onclick = () => {
            triggerFileSelect();
        };
    }

    // SAVE BUTTON
    dom.btnSoundpadSave.onclick = () => {
        const newName = dom.soundpadNameInput.value.trim();

        // 1. If we have a new file selected
        if (pendingFileScan) {
            soundMap[index] = {
                path: pendingFileScan.path,
                name: newName || pendingFileScan.name, // Use input name or file name
                title: pendingFileScan.title,
                isCustom: true
            };
        }
        // 2. No new file, but name changed (and entry exists)
        else if (soundMap[index] && newName !== "") {
            soundMap[index].name = newName;
        }

        saveSoundMap();
        renderButtons();
        closeEditModal();
    };

    dom.btnSoundpadCancel.onclick = () => {
        closeEditModal();
    };

    // Allow Enter key to save
    dom.soundpadNameInput.onkeypress = (e) => {
        if (e.key === 'Enter') dom.btnSoundpadSave.click();
    };
}

function closeEditModal() {
    if (dom.soundpadModal) {
        dom.soundpadModal.style.display = 'none';
        dom.soundpadNameInput.value = '';
    }
    pendingFileScan = null;
}

function resetSoundMap() {
    if (confirm("Soundpad'i varsayılan ayarlara sıfırlamak istediğinize emin misiniz?")) {
        localStorage.removeItem('soundMap');
        loadSoundMap();
        renderButtons();
    }
}

module.exports = { initSoundpad, resetSoundMap };