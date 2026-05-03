// audioEngine.js - Manages Audio Streams and Effects
const path = require('path');
const dom = require('../ui/dom');
const state = require('../state/appState');
const { ipcRenderer } = require('electron');


// --- FILE PATH FINDER ---
function getAssetPath(fileName) {
    let assetPath = path.join(__dirname, '..', 'assets', fileName);
    if (assetPath.includes('app.asar')) {
        assetPath = assetPath.replace('app.asar', 'app.asar.unpacked');
    }
    return assetPath;
}

// --- SYSTEM SOUNDS ---
function playSystemSound(type) {
    if (state.isDeafened) return;
    let fileName = '';
    if (type === 'join') fileName = 'RIZZ_effect.mp3';
    else if (type === 'leave') fileName = 'cikis_effect.mp3';
    else if (type === 'notification') fileName = 'notification_effect.mp3';

    try {
        const soundPath = getAssetPath(fileName);
        const audio = new Audio(soundPath);
        // [FIX]: Cap volume at 1.0 (HTMLMediaElement limit)
        const rawVol = dom.masterSlider ? (dom.masterSlider.value / 100) : 1.0;
        audio.volume = Math.min(1.0, rawVol);
        if (dom.speakerSelect && dom.speakerSelect.value && typeof audio.setSinkId === 'function') {
            audio.setSinkId(dom.speakerSelect.value).catch(e => { });
        }
        audio.play().catch(() => { });
    } catch (e) { console.error(e); }
}

// --- LOCAL SOUND EFFECTS ---
function playLocalSound(effectName, isCustomPath = false) {
    if (state.isDeafened) return;
    try {
        let soundPath;
        if (isCustomPath) {
            soundPath = effectName;
        } else {
            const fileName = effectName.endsWith('.mp3') ? effectName : `${effectName}.mp3`;
            soundPath = getAssetPath(fileName);
        }
        const audio = new Audio(soundPath);

        if (dom.speakerSelect && dom.speakerSelect.value && typeof audio.setSinkId === 'function') {
            audio.setSinkId(dom.speakerSelect.value).catch(e => { });
        }

        if (state.audioContext && state.soundpadStreamDestination) {
            try {
                const source = state.audioContext.createMediaElementSource(audio);

                const webrtcGain = state.audioContext.createGain();
                webrtcGain.gain.value = 1.0;
                source.connect(webrtcGain);
                webrtcGain.connect(state.soundpadStreamDestination);

                const localGain = state.audioContext.createGain();
                const masterVol = dom.masterSlider ? (dom.masterSlider.value / 100) : 1.0;
                const spVol = dom.soundpadSlider ? (dom.soundpadSlider.value / 100) : 1.0;
                localGain.gain.value = masterVol * spVol;

                source.connect(localGain);
                localGain.connect(state.audioContext.destination);

            } catch (err) {
                console.error("Audio mixing error:", err);
            }
        } else {
            const masterVol = dom.masterSlider ? (dom.masterSlider.value / 100) : 1.0;
            const spVol = dom.soundpadSlider ? (dom.soundpadSlider.value / 100) : 1.0;
            audio.volume = Math.min(1.0, masterVol * spVol);
        }
        audio.play().catch(e => console.error("Play error:", e));
    } catch (e) {
        console.error("Soundpad error:", e);
    }
}

// --- INITIALIZE MICROPHONE (Forced Mono) ---
async function initLocalStream(deviceId = null) {
    try {
        if (!deviceId && dom.micSelect && dom.micSelect.value) {
            deviceId = dom.micSelect.value;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                deviceId: deviceId ? { exact: deviceId } : undefined,
                channelCount: 1, // FORCE MONO
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
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
        state.streamDestination = destination;

        const spDestination = state.audioContext.createMediaStreamDestination();
        state.soundpadStreamDestination = spDestination;

        source.connect(gainNode);
        gainNode.connect(destination);

        state.processedStream = destination.stream;
        return true;
    } catch (e) {
        alert("Mikrofon başlatılamadı!");
        console.error(e);
        return false;
    }
}

// --- ADD REMOTE USER AUDIO ---
function addAudioElement(id, stream, streamType = 'mic') {
    const elId = streamType === 'mic' ? `audio-${id}` : `audio-sp-${id}`;
    let audioEl = document.getElementById(elId);
    if (!audioEl) {
        audioEl = document.createElement('audio');
        audioEl.id = elId;
        audioEl.autoplay = true;
        document.body.appendChild(audioEl);
    }

    const anchorAudio = document.createElement('audio');
    anchorAudio.srcObject = stream;
    anchorAudio.muted = true;
    anchorAudio.play().catch(() => { });
    audioEl._anchor = anchorAudio;

    if (!state.outputAudioContext) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        state.outputAudioContext = new AudioContext();
    }

    if (state.outputAudioContext.state === 'suspended') {
        state.outputAudioContext.resume();
    }

    try {
        const source = state.outputAudioContext.createMediaStreamSource(stream);
        const gainNode = state.outputAudioContext.createGain();
        const destination = state.outputAudioContext.createMediaStreamDestination();

        source.connect(gainNode);
        gainNode.connect(destination);

        const masterVol = dom.masterSlider ? (dom.masterSlider.value / 100) : 1.0;
        let targetVol = 1.0;

        if (streamType === 'mic') {
            const peerVol = (state.peerVolumes && state.peerVolumes[id]) ? (state.peerVolumes[id] / 100) : 1.0;
            targetVol = masterVol * peerVol;
            state.peerGainNodes[id] = gainNode;
        } else {
            const spVol = dom.soundpadSlider ? (dom.soundpadSlider.value / 100) : 1.0;
            targetVol = masterVol * spVol;
            if (!state.peerSoundpadGainNodes) state.peerSoundpadGainNodes = {};
            state.peerSoundpadGainNodes[id] = gainNode;
        }

        gainNode.gain.value = state.isDeafened ? 0 : targetVol;

        audioEl.srcObject = destination.stream;
        audioEl.volume = 1.0;

        if (dom.speakerSelect && dom.speakerSelect.value && typeof audioEl.setSinkId === 'function') {
            audioEl.setSinkId(dom.speakerSelect.value).catch(() => { });
        }
        audioEl.play().catch(() => { });
    } catch (err) {
        audioEl.srcObject = stream;
        audioEl.play().catch(() => { });
    }
}

function tryProcessPendingStreams(targetId) {
    if (!state.pendingAudioStreams || !state.pendingAudioStreams[targetId]) return;

    const streams = state.pendingAudioStreams[targetId];
    const map = (state.streamTrackMap && state.streamTrackMap[targetId]) || {};

    for (let i = streams.length - 1; i >= 0; i--) {
        const stream = streams[i];
        const trackId = stream.getAudioTracks()[0]?.id;

        if (map.micId && (trackId === map.micId || stream.id === map.micId)) {
            // Process as Mic
            addAudioElement(targetId, stream, 'mic');
            const visualizer = require('./visualizer');
            visualizer.attachVisualizer(stream, targetId);

            const userList = require('../ui/userList');
            userList.addUserUI(targetId, state.userNames[targetId] || "Biri", true);

            streams.splice(i, 1);
        } else if (map.soundpadId && (trackId === map.soundpadId || stream.id === map.soundpadId)) {
            // Process as Soundpad
            addAudioElement(targetId, stream, 'soundpad');
            streams.splice(i, 1);
        } else {
            console.warn("Track ID mismatch, using fallback assignment.");
            if (state.peerGainNodes[targetId]) {
                // Mic already exists, so this must be soundpad
                addAudioElement(targetId, stream, 'soundpad');
            } else {
                // First stream is mic
                addAudioElement(targetId, stream, 'mic');
                const visualizer = require('./visualizer');
                visualizer.attachVisualizer(stream, targetId);
                const userList = require('../ui/userList');
                userList.addUserUI(targetId, state.userNames[targetId] || "Biri", true);
            }
            streams.splice(i, 1);
        }
    }
}

function removeAudioElement(id) {
    const el = document.getElementById(`audio-${id}`);
    if (el) {
        if (el._anchor) { el._anchor.srcObject = null; el._anchor = null; }
        el.srcObject = null;
        el.remove();
    }
    const spEl = document.getElementById(`audio-sp-${id}`);
    if (spEl) {
        if (spEl._anchor) { spEl._anchor.srcObject = null; spEl._anchor = null; }
        spEl.srcObject = null;
        spEl.remove();
    }
    if (state.peerGainNodes[id]) delete state.peerGainNodes[id];
    if (state.peerSoundpadGainNodes && state.peerSoundpadGainNodes[id]) delete state.peerSoundpadGainNodes[id];
}

async function setAudioOutputDevice(deviceId) {
    if (!deviceId) return;
    const allAudios = document.querySelectorAll('audio');
    allAudios.forEach(audio => {
        if (typeof audio.setSinkId === 'function') audio.setSinkId(deviceId).catch(() => { });
    });
    if (state.outputAudioContext && typeof state.outputAudioContext.setSinkId === 'function') {
        state.outputAudioContext.setSinkId(deviceId).catch(() => { });
    }
}

function setMicState(muted) {
    state.isMicMuted = muted;
    if (state.localStream) {
        state.localStream.getAudioTracks().forEach(track => track.enabled = !muted);
    }
    if (dom.btnToggleMic) {
        dom.btnToggleMic.innerText = muted ? '🎤✖' : '🎤';
        dom.btnToggleMic.classList.toggle('btn-closed', muted);
    }
    try {
        const socketService = require('../socket/socketService');
        const peerService = require('../webrtc/peerService');
        if (state.isConnected) {
            const payload = { type: 'mic-status', isMuted: muted };
            socketService.send(payload);
            peerService.broadcast(payload);
        }
        ipcRenderer.send('sync-mic-state', muted);
    } catch (e) { }
    const userList = require('../ui/userList');
    userList.updateMicStatusUI("me", muted);
}

function toggleDeafen() {
    state.isDeafened = !state.isDeafened;
    const isDeaf = state.isDeafened;

    if (dom.btnToggleSound) {
        dom.btnToggleSound.innerText = isDeaf ? '🔇' : '🔊';
        dom.btnToggleSound.classList.toggle('btn-closed', isDeaf);
    }

    const allAudios = document.querySelectorAll('audio');
    allAudios.forEach(audio => { audio.muted = isDeaf; });

    // Auto-mute if deafened. DO NOT auto-unmute (Manual action required).
    if (isDeaf && !state.isMicMuted) {
        setMicState(true);
    }

    const userList = require('../ui/userList');
    userList.updateDeafenStatusUI("me", isDeaf);
    try {
        const socketService = require('../socket/socketService');
        const peerService = require('../webrtc/peerService');
        if (state.isConnected) {
            const payload = { type: 'deafen-status', isDeafened: isDeaf };
            socketService.send(payload);
            peerService.broadcast(payload);
        }
        ipcRenderer.send('sync-deafen-state', isDeaf);
    } catch (e) { }
}

function nudgeAllPeers() {
    if (!state.outputAudioContext || !state.peerGainNodes) return;
    if (state.outputAudioContext.state === 'suspended') state.outputAudioContext.resume();

    for (const id in state.peerGainNodes) {
        const gainNode = state.peerGainNodes[id];
        if (!gainNode) continue;
        const currentVal = gainNode.gain.value;
        const now = state.outputAudioContext.currentTime;
        gainNode.gain.setValueAtTime(currentVal, now);
        gainNode.gain.linearRampToValueAtTime(currentVal + 0.001, now + 0.05);
        gainNode.gain.linearRampToValueAtTime(currentVal, now + 0.1);
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
    toggleDeafen,
    nudgeAllPeers,
    tryProcessPendingStreams
};