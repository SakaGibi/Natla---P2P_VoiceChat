// app/audio/audioEngine.js
const path = require('path');
const dom = require('../ui/dom');
const state = require('../state/appState');

// --- SİSTEM SESLERİ ---
function playSystemSound(type) {
    if (state.isDeafened) return;

    let fileName = '';
    if (type === 'join') fileName = 'RIZZ_effect.mp3';
    else if (type === 'leave') fileName = 'cikis_effect.mp3';
    else if (type === 'notification') fileName = 'notification_effect.mp3';

    try {
        const soundPath = path.join(__dirname, '..', 'assets', fileName);
        const audio = new Audio(`file://${soundPath.replace(/\\/g, '/')}`);
        audio.volume = dom.masterSlider ? (dom.masterSlider.value / 100) : 1.0;
        
        if (dom.speakerSelect && dom.speakerSelect.value && typeof audio.setSinkId === 'function') {
            audio.setSinkId(dom.speakerSelect.value).catch(e => {});
        }
        
        audio.play().catch(err => console.error("Sistem sesi hatası:", err));
    } catch (e) {
        console.error("Ses dosyası bulunamadı:", e);
    }
}

// --- YEREL EFEKT SESLERİ (Soundpad) ---
function playLocalSound(effectName) {
    if (state.isDeafened) return;
    try {
        const soundPath = path.join(__dirname, '..', 'assets', effectName);
        const audio = new Audio(`file://${soundPath.replace(/\\/g, '/')}`);
        audio.volume = dom.masterSlider ? (dom.masterSlider.value / 100) : 1.0;
        
        if (dom.speakerSelect && dom.speakerSelect.value && typeof audio.setSinkId === 'function') {
            audio.setSinkId(dom.speakerSelect.value).catch(e => {});
        }

        audio.play().catch(() => {});
    } catch (e) { console.error(e); }
}

// --- MİKROFONU BAŞLAT (Local Stream) ---
async function initLocalStream(deviceId = null) {
    try {
        if (!deviceId && dom.micSelect && dom.micSelect.value) {
            deviceId = dom.micSelect.value;
        }

        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                deviceId: deviceId ? { exact: deviceId } : undefined,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: false 
            }, 
            video: false 
        });
        
        state.localStream = stream;

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        state.audioContext = new AudioContext();
        
        if (state.audioContext.state === 'suspended') {
            await state.audioContext.resume();
        }

        const source = state.audioContext.createMediaStreamSource(stream);
        const gainNode = state.audioContext.createGain();
        
        const initialGain = dom.micSlider ? (dom.micSlider.value / 100) : 1.0;
        gainNode.gain.value = initialGain;
        state.micGainNode = gainNode;

        const destination = state.audioContext.createMediaStreamDestination();
        
        source.connect(gainNode);
        gainNode.connect(destination);

        state.processedStream = destination.stream;
        console.log(`✅ Mikrofon hazır. Gain: ${initialGain}`);
        return true;
    } catch (e) {
        console.error("Mikrofon hatası:", e);
        alert("Mikrofon başlatılamadı!");
        return false;
    }
}

// --- UZAK KULLANICI SESİNİ EKLE (DÜZELTİLMİŞ) ---
function addAudioElement(id, stream) {
    console.log(`🔊 ${id} için ses motoru hazırlanıyor...`);

    // 1. Audio HTML Elementini Oluştur
    let audioEl = document.getElementById(`audio-${id}`);
    if (!audioEl) {
        audioEl = document.createElement('audio');
        audioEl.id = `audio-${id}`;
        audioEl.autoplay = true; 
        document.body.appendChild(audioEl);
    }

    // ---------------------------------------------------------------------
    // [ÇÖZÜM]: "ANCHOR" (ÇAPA) TAKTİĞİ
    // WebRTC akışını canlı tutmak için gizli bir ses elementinde ham halini çalıyoruz.
    // Bu olmadan "createMediaStreamSource" sessiz veri alır.
    const anchorAudio = document.createElement('audio');
    anchorAudio.srcObject = stream;
    anchorAudio.muted = true; // Sadece veri akışı için, sesi buradan duymayacağız
    anchorAudio.play().catch(e => console.warn("Anchor play hatası:", e));
    // Anchor'u elemente iliştir ki garbage collector silmesin
    audioEl._anchor = anchorAudio; 
    // ---------------------------------------------------------------------

    // 2. Çıkış AudioContext'ini Hazırla
    if (!state.outputAudioContext) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        state.outputAudioContext = new AudioContext();
    }

    if (state.outputAudioContext.state === 'suspended') {
        state.outputAudioContext.resume();
    }

    // 3. Web Audio Zinciri (Ses Yükseltme/Gain İçin)
    try {
        const source = state.outputAudioContext.createMediaStreamSource(stream);
        const gainNode = state.outputAudioContext.createGain();
        const destination = state.outputAudioContext.createMediaStreamDestination();

        source.connect(gainNode);
        gainNode.connect(destination);

        const masterVol = dom.masterSlider ? (dom.masterSlider.value / 100) : 1.0;
        const peerVol = (state.peerVolumes && state.peerVolumes[id]) ? (state.peerVolumes[id] / 100) : 1.0;
        
        gainNode.gain.value = masterVol * peerVol;
        state.peerGainNodes[id] = gainNode;

        // 4. İşlenmiş Sesi Audio Elementine Ver
        audioEl.srcObject = destination.stream;
        audioEl.volume = 1.0; // Element hep %100, gain içeriden hallediyor

        // Hoparlör Seçimi
        if (dom.speakerSelect && dom.speakerSelect.value && typeof audioEl.setSinkId === 'function') {
            audioEl.setSinkId(dom.speakerSelect.value)
                .then(() => console.log(`🎧 Çıkış cihazı ayarlandı: ${id}`))
                .catch(e => console.warn("SinkID hatası:", e));
        }

        audioEl.play()
            .then(() => console.log(`✅ SES ÇALIYOR: ${id}`))
            .catch(e => console.error(`❌ Oynatma hatası: ${id}`, e));

    } catch (err) {
        console.error("Web Audio Graph Hatası:", err);
        // Hata olursa ham sesi ver
        audioEl.srcObject = stream;
        audioEl.play();
    }
}

// --- SES ELEMENTİNİ SİL ---
function removeAudioElement(id) {
    const el = document.getElementById(`audio-${id}`);
    if (el) {
        // Anchor'u temizle
        if (el._anchor) {
            el._anchor.srcObject = null;
            el._anchor = null;
        }
        el.srcObject = null;
        el.remove();
    }
    if (state.peerGainNodes[id]) {
        delete state.peerGainNodes[id];
    }
}

// --- HOPARLÖR DEĞİŞTİRME ---
async function setAudioOutputDevice(deviceId) {
    if (!deviceId) return;
    console.log("🔄 Ses çıkışı değiştiriliyor ->", deviceId);

    const allAudios = document.querySelectorAll('audio');
    allAudios.forEach(audio => {
        if (typeof audio.setSinkId === 'function') {
            audio.setSinkId(deviceId).catch(e => console.error(e));
        }
    });

    if (state.outputAudioContext && typeof state.outputAudioContext.setSinkId === 'function') {
        state.outputAudioContext.setSinkId(deviceId).catch(() => {});
    }
}

// mikrofonu açar/kapatır
function setMicState(muted) {
    state.isMicMuted = muted;

    if (state.localStream) {
        state.localStream.getAudioTracks().forEach(track => {
            track.enabled = !muted;
        });
    }

    if (dom.btnToggleMic) {
        dom.btnToggleMic.innerText = muted ? '🎤✖' : '🎤';
        dom.btnToggleMic.style.backgroundColor = muted ? '#8b281d' : ''; // Kırmızı / Normal
        dom.btnToggleMic.title = muted ? "Mikrofon Kapalı" : "Mikrofon Açık";
    }

    try {
        const socketService = require('../socket/socketService');
        if (state.isConnected) {
            socketService.send({
                type: 'mic-status',
                isMuted: muted
            });
        }
    } catch (e) { console.warn("Mic status gönderilemedi:", e); }
    
    const userList = require('../ui/userList');
    userList.updateMicStatusUI("me", muted);
}


// Hoparlörü kapatır/açar (Sağırlaştırma Modu)

function toggleDeafen() {
    state.isDeafened = !state.isDeafened;
    const isDeaf = state.isDeafened;

    if (dom.btnToggleSound) {
        dom.btnToggleSound.innerText = isDeaf ? '🔇' : '🔊';
        dom.btnToggleSound.style.backgroundColor = isDeaf ? '#8b281d' : ''; 
        dom.btnToggleSound.title = isDeaf ? "Ses Kapalı" : "Ses Açık";
    }

    const allAudios = document.querySelectorAll('audio');
    allAudios.forEach(audio => {
        audio.muted = isDeaf;
    });
    
    if (isDeaf && !state.isMicMuted) {
        setMicState(true);
    }
}

module.exports = {
    playSystemSound,
    playLocalSound,
    initLocalStream,
    addAudioElement,
    removeAudioElement,
    setAudioOutputDevice,
    setMicState,
    toggleDeafen
};