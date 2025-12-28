// index.js - Giriş Noktası
const { ipcRenderer } = require('electron');
const path = require('path');

// --- YOLLARIN DÜZELTİLMESİ ---
const dom = require(path.join(__dirname, 'ui/dom'));
const state = require(path.join(__dirname, 'state/appState'));
const configService = require(path.join(__dirname, 'config/configService'));
const mediaDevices = require(path.join(__dirname, 'webrtc/mediaDevices'));
const socketService = require(path.join(__dirname, 'socket/socketService'));
const audioEngine = require(path.join(__dirname, 'audio/audioEngine'));
const chatService = require(path.join(__dirname, 'chat/chatService'));
const screenShare = require(path.join(__dirname, 'webrtc/screenShare'));
const userList = require(path.join(__dirname, 'ui/userList'));
const visualizer = require(path.join(__dirname, 'audio/visualizer'));
const { initAutoUpdateUI } = require(path.join(__dirname, 'renderer/autoUpdateRenderer'));

// --- BAŞLANGIÇ AYARLARI ---
window.onload = async () => {
    // 1. Modalları ve Soundpad'i Başlat
    try {
        const modals = require(path.join(__dirname, 'ui/modals'));
        modals.initModals();

        const soundEffects = require(path.join(__dirname, 'audio/soundEffects'));
        soundEffects.initSoundpad();
    } catch (err) {
        console.error("❌ Başlatma hatası (Modals/Soundpad):", err);
    }

    // 2. Sürüm Bilgisini Al
    try {
        const version = await ipcRenderer.invoke('get-app-version');
        state.currentAppVersion = version;
        dom.updateStatus.innerText = "Sürüm: " + version;
    } catch (err) {
        dom.updateStatus.innerText = "Sürüm bilgisi alınamadı";
    }

    // 3. İsim Hatırlama
    const savedName = localStorage.getItem('username');
    if (savedName && dom.inputUsername) {
        dom.inputUsername.value = savedName; 
    }

    // 4. Cihazları Listele
    await mediaDevices.getDevices();

    // 5. Config Yükle ve Bağlan
    const config = configService.loadConfig();
    if (config) {
        socketService.connect(config.SIGNALING_SERVER);
    } else {
        dom.passwordModal.style.display = 'flex';
    }

    // 6. Güncelleme Servisi
    initAutoUpdateUI({
        btnCheckUpdate: dom.btnCheckUpdate,
        btnInstallUpdate: dom.btnInstallUpdate,
        updateStatus: dom.updateStatus,
        btnConnect: dom.btnConnect
    });

    // 7. Master (Genel) Ses Kontrolü - GainNode Destekli
    if (dom.masterSlider) {
        dom.masterSlider.addEventListener('input', () => {
            const value = dom.masterSlider.value;

            // DÜZELTME: HTML'deki id="masterVal" ile eşleşmeli
            const displayEl = document.getElementById('masterVal'); 
            if (displayEl) displayEl.innerText = value + "%";

            // GainNode Güncellemesi
            const allAudios = document.querySelectorAll('audio');
            for (let id in state.peerGainNodes) {
                const gainNode = state.peerGainNodes[id];
                const peerVol = (state.peerVolumes[id] || 100) / 100;

                if (gainNode && state.outputAudioContext) {
                    gainNode.gain.setTargetAtTime(
                        (value / 100) * peerVol, 
                        state.outputAudioContext.currentTime, 
                        0.01
                    );
                }
            }
        });
    }

    // --- 8. Mikrofon Kazancı (Mic Ses) ---
    if (dom.micSlider) {
        dom.micSlider.addEventListener('input', () => {
            const val = dom.micSlider.value;

            // DÜZELTME: HTML'deki id="micVal" ile eşleşmeli
            const displayEl = document.getElementById('micVal');
            if (displayEl) displayEl.innerText = val + "%";

            if (state.micGainNode) {
                state.micGainNode.gain.setTargetAtTime(val / 100, 0, 0.01);
            }
        });
    }

    // 9. Cihaz Seçimi Değişiklikleri
    if (dom.micSelect) {
        dom.micSelect.addEventListener('change', async () => {
            const deviceId = dom.micSelect.value;
            localStorage.setItem('selectedMic', deviceId);
            console.log("🎤 Mikrofon değiştirildi:", deviceId);

            // Yayındaysak mikrofonu yeniden başlat
            if (state.isConnected && state.localStream) {
                // Önceki stream'i durdur
                state.localStream.getTracks().forEach(track => track.stop());

                // Yeni stream başlat (Seçili ID ile)
                await audioEngine.initLocalStream(deviceId);

                alert("Mikrofon değiştirildi. Etkili olması için yeniden bağlanmanız gerekebilir."); 
            }
        });
    }

if (dom.speakerSelect) {
    dom.speakerSelect.addEventListener('change', () => {
        const deviceId = dom.speakerSelect.value;
        localStorage.setItem('selectedSpeaker', deviceId);
        audioEngine.setAudioOutputDevice(deviceId); // Yeni hoparlöre yönlendir
    });
}
};

// --- KATIL BUTONU ---
dom.btnConnect.addEventListener('click', async () => {
    const name = dom.inputUsername.value.trim();
    if (!name) return alert("Lütfen bir isim girin!");

    // Ses akışını ve GainNode yapısını başlat
    const success = await audioEngine.initLocalStream();
    if (success) {
        state.isConnected = true;
        state.currentRoom = dom.roomSelect.value;
        
        // İsmi kaydet
        localStorage.setItem('username', name);
        configService.saveSetting('username', name);
        
        // UI Hazırlıkları
        dom.btnConnect.style.display = 'none';
        dom.activeControls.style.display = 'flex';
        dom.roomSelect.disabled = true;
        dom.inputUsername.disabled = true;
        dom.msgInput.disabled = false;
        dom.btnSend.disabled = false;
        dom.btnShareScreen.disabled = false;

        // Kendi ismini state'e ve listeye ekle
        state.userNames["me"] = name + " (Ben)";
        userList.addUserUI("me", state.userNames["me"], true);
        
        // Kendi ses görselleştiricini başlat (İşlenmiş stream üzerinden)
        visualizer.attachVisualizer(state.processedStream, "me");

        socketService.joinRoom(name, state.currentRoom);
    }
});

// --- DİĞER EVENTLER ---

// Mikrofon Kapat/Aç
dom.btnToggleMic.addEventListener('click', () => {
    if (state.isDeafened) return alert("Hoparlör kapalı!");
    audioEngine.setMicState(!state.isMicMuted);
});

// Hoparlör Kapat/Aç (Deafen)
dom.btnToggleSound.addEventListener('click', () => {
    audioEngine.toggleDeafen();
});

// Ekran Paylaşımı
dom.btnShareScreen.addEventListener('click', () => {
    if (!state.isSharingScreen) screenShare.start();
    else screenShare.stop();
});

// Chat Mesaj Gönderme
dom.btnSend.addEventListener('click', () => chatService.sendChat());
dom.msgInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') chatService.sendChat();
});

// Dosya Eki Seçme
dom.btnAttach.addEventListener('click', () => {
    if (!state.isConnected) return alert("Önce bir odaya bağlanmalısınız!");
    dom.fileInput.click();
});

// Dosya Gönderimi
dom.fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const MAX_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
    if (file.size > MAX_SIZE) {
        alert("Dosya 2GB'dan büyük olamaz.");
        return;
    }
    
    const fileTransfer = require(path.join(__dirname, 'files/fileTransfer'));
    const tId = "transfer-" + Date.now();
    
    fileTransfer.addFileSentUI(file, tId);
    for (let id in state.peers) { 
        fileTransfer.sendFile(state.peers[id], file, tId); 
    }
    e.target.value = ''; 
});

// Ayarlar Paneli
dom.btnSettings.addEventListener('click', () => {
    const config = configService.getConfig();
    if (config) {
        dom.serverInput.value = config.SIGNALING_SERVER || "";
        dom.keyInput.value = config.ACCESS_KEY || "";
    }
    dom.passwordModal.style.display = 'flex';
});

dom.btnSaveKey.addEventListener('click', () => configService.handleSaveSettings());

// Bağlantıyı Kes (Sayfayı Yenile)
dom.btnDisconnect.addEventListener('click', () => location.reload());