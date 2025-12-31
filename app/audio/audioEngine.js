// audioEngine.js - Manages Audio Streams and Effects
const path = require('path');
const dom = require('../ui/dom');
const state = require('../state/appState');

// --- FILE PATH FINDER ---
function getAssetPath(fileName) {    
    let assetPath = path.join(__dirname, '..', 'assets', fileName);

    // Handle asar unpacking
    if (assetPath.includes('app.asar')) {
        assetPath = assetPath.replace('app.asar', 'app.asar.unpacked');
    }

    return assetPath;
}

// --- SYSTEM SOUNDS ---
function playSystemSound(type) {
    if (state.isDeafened) return;

    // Select file based on type
    let fileName = '';
    if (type === 'join') fileName = 'RIZZ_effect.mp3';
    else if (type === 'leave') fileName = 'cikis_effect.mp3';
    else if (type === 'notification') fileName = 'notification_effect.mp3';

    try {
        const soundPath = getAssetPath(fileName);
        const audio = new Audio(soundPath);
        
        // Set volume
        audio.volume = dom.masterSlider ? (dom.masterSlider.value / 100) : 1.0;
        
        // Set output device
        if (dom.speakerSelect && dom.speakerSelect.value && typeof audio.setSinkId === 'function') {
            audio.setSinkId(dom.speakerSelect.value).catch(e => {});
        }
        
        audio.play().catch(() => {});
    } catch (e) { console.error(e); }
}

// --- LOCAL SOUND EFFECTS (Soundpad) ---
function playLocalSound(effectName) {
    if (state.isDeafened) return;
    try {
        const fileName = effectName.endsWith('.mp3') ? effectName : `${effectName}.mp3`;
        const soundPath = getAssetPath(fileName);
        
        const audio = new Audio(soundPath);
        
        // Set volume
        audio.volume = dom.masterSlider ? (dom.masterSlider.value / 100) : 1.0;
        
        // Set output device
        if (dom.speakerSelect && dom.speakerSelect.value && typeof audio.setSinkId === 'function') {
            audio.setSinkId(dom.speakerSelect.value).catch(e => {});
        }

        audio.play().catch(() => {});
    } catch (e) { }
}

// --- INITIALIZE MICROPHONE (Local Stream) ---
async function initLocalStream(deviceId = null) {
    try {
        if (!deviceId && dom.micSelect && dom.micSelect.value) {
            deviceId = dom.micSelect.value;
        }

        // Get User Media
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                deviceId: deviceId ? { exact: deviceId } : undefined,
                echoCancellation: true, // noise cancellation
                noiseSuppression: true, // noise suppression
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

        // Create Source & Gain Node
        const source = state.audioContext.createMediaStreamSource(stream);
        const gainNode = state.audioContext.createGain();
        
        // Set Initial Gain
        const initialGain = dom.micSlider ? (dom.micSlider.value / 100) : 1.0;
        gainNode.gain.value = initialGain;
        state.micGainNode = gainNode;

        // Connect Nodes
        const destination = state.audioContext.createMediaStreamDestination();
        
        source.connect(gainNode);
        gainNode.connect(destination);

        state.processedStream = destination.stream;
        return true;
    } catch (e) {
        alert("Mikrofon başlatılamadı!");
        return false;
    }
}

// --- ADD REMOTE USER AUDIO ---
function addAudioElement(id, stream) {
    let audioEl = document.getElementById(`audio-${id}`);
    if (!audioEl) {
        audioEl = document.createElement('audio');
        audioEl.id = `audio-${id}`;
        audioEl.autoplay = true; 
        document.body.appendChild(audioEl);
    }

    // Anchor Audio (Keep stream active)
    const anchorAudio = document.createElement('audio');
    anchorAudio.srcObject = stream;
    anchorAudio.muted = true; 
    anchorAudio.play().catch(() => {});
    audioEl._anchor = anchorAudio; 

    // Initialize Output Context
    if (!state.outputAudioContext) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        state.outputAudioContext = new AudioContext();
    }

    if (state.outputAudioContext.state === 'suspended') {
        state.outputAudioContext.resume();
    }

    // Notify Server
    try {
        // Create Processing Nodes
        const source = state.outputAudioContext.createMediaStreamSource(stream);
        const gainNode = state.outputAudioContext.createGain();
        const destination = state.outputAudioContext.createMediaStreamDestination();

        source.connect(gainNode);
        gainNode.connect(destination);

        // Calculate Volume
        const masterVol = dom.masterSlider ? (dom.masterSlider.value / 100) : 1.0;
        const peerVol = (state.peerVolumes && state.peerVolumes[id]) ? (state.peerVolumes[id] / 100) : 1.0;
        
        gainNode.gain.value = masterVol * peerVol;
        state.peerGainNodes[id] = gainNode;

        // Connect to Element
        audioEl.srcObject = destination.stream;
        audioEl.volume = 1.0; 

        // Set Output Device
        if (dom.speakerSelect && dom.speakerSelect.value && typeof audioEl.setSinkId === 'function') {
            audioEl.setSinkId(dom.speakerSelect.value).catch(() => {});
        }

        audioEl.play().catch(() => {});

    } catch (err) {
        // Fallback
        audioEl.srcObject = stream;
        audioEl.play();
    }
}

// --- REMOVE AUDIO ELEMENT ---
function removeAudioElement(id) {
    const el = document.getElementById(`audio-${id}`);
    if (el) {
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

// --- CHANGE SPEAKER ---
async function setAudioOutputDevice(deviceId) {
    if (!deviceId) return;
    const allAudios = document.querySelectorAll('audio');
    allAudios.forEach(audio => {
        if (typeof audio.setSinkId === 'function') {
            audio.setSinkId(deviceId).catch(() => {});
        }
    });

    // Update Context Output
    if (state.outputAudioContext && typeof state.outputAudioContext.setSinkId === 'function') {
        state.outputAudioContext.setSinkId(deviceId).catch(() => {});
    }
}

// --- TOGGLE MICROPHONE STATE ---
function setMicState(muted) {
    state.isMicMuted = muted;

    if (state.localStream) {
        state.localStream.getAudioTracks().forEach(track => track.enabled = !muted);
    }

    // UI Güncelleme (Buton)
    if (dom.btnToggleMic) {
        dom.btnToggleMic.innerText = muted ? '🎤✖' : '🎤';
        dom.btnToggleMic.classList.toggle('btn-closed', muted);
    }

    // --- KRİTİK DÜZELTME ---
    // Durumu hem sunucuya hem peerlara gönder
    try {
        const socketService = require('../socket/socketService');
        const peerService = require('../webrtc/peerService');
        if (state.isConnected) {
            const payload = { type: 'mic-status', isMuted: muted };
            socketService.send(payload); // Sunucu üzerinden relay
            peerService.broadcast(payload); // P2P üzerinden direkt
        }
    } catch (e) { }
    
    // Kendi kartını güncelle
    const userList = require('../ui/userList');
    userList.updateMicStatusUI("me", muted);
}

// --- TOGGLE DEAFEN ---
function toggleDeafen() {
    state.isDeafened = !state.isDeafened;
    const isDeaf = state.isDeafened;

    if (dom.btnToggleSound) {
        dom.btnToggleSound.innerText = isDeaf ? '🔇' : '🔊';
        dom.btnToggleSound.classList.toggle('btn-closed', isDeaf);
    }

    const allAudios = document.querySelectorAll('audio');
    allAudios.forEach(audio => { audio.muted = isDeaf; });
    
    if (isDeaf && !state.isMicMuted) {
        setMicState(true); 
    }

    // --- KRİTİK DÜZELTME ---
    // Kendi kartındaki dataset'i güncelle ki ikon hemen düzelsin
    const userList = require('../ui/userList');
    userList.updateDeafenStatusUI("me", isDeaf);

    // Sağırlaşma durumunu hem sunucuya hem peerlara bildir
    try {
        const socketService = require('../socket/socketService');
        const peerService = require('../webrtc/peerService');
        if (state.isConnected) {
            const payload = { type: 'deafen-status', isDeafened: isDeaf };
            socketService.send(payload); // Güvenli kanal (Sunucu)
            peerService.broadcast(payload); // Hızlı kanal (P2P)
        }
    } catch (e) { }
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