// userList.js - User Cards & Stream Interface Management
const state = require('../state/appState');
const dom = require('./dom');

// Adds a new card to the user list or updates an existing one
function addUserUI(id, name, isConnected) {
    let el = document.getElementById(`user-${id}`);
    const statusText = isConnected ? 'Canlı' : 'Bağlanıyor...';
    const statusColor = isConnected ? '#2ecc71' : '#f1c40f';
    
    // If card exists, only update status
    if (el) {
        const statusSpan = el.querySelector('.user-status');
        if (statusSpan) {
            statusSpan.innerText = statusText;
            statusSpan.style.color = statusColor;
        }
        return;
    }
    
    // Create new card
    el = document.createElement('div'); 
    el.id = `user-${id}`; 
    el.className = 'user-card'; 
    el.dataset.isMuted = 'false';
    el.dataset.isDeafened = 'false';
    
    // FIX: dom.userListDiv -> dom.userList
    if (dom.userList) {
        dom.userList.appendChild(el);
    } else {
        console.error("ERROR: dom.userList not found!");
        return;
    }
    
    // Add volume control for other users
    let volHTML = id !== 'me' ? `
    <div class="user-volume" style="display:flex; width:100%; align-items:center; gap:5px;">
        <label>🔊</label>
        <input type="range" 
               style="flex:1; width:100%; cursor:pointer;" 
               min="0" max="300" value="100" 
               id="vol-slider-${id}"
               class="peer-volume-slider">
        <span id="vol-val-${id}" style="font-size:11px; width:35px; text-align:right;">100%</span>
    </div>` : '';
    
    // Create card structure (Mic icon, name, and VU meter)
    el.innerHTML = `
        <div class="user-info">
            ${id !== 'me' ? '<span class="mic-icon">🎤</span>' : ''}
            <span class="user-name">${name}</span>
            <span class="user-status" style="color:${statusColor}">${statusText}</span>
        </div>
        ${volHTML}
        <div class="meter-bg">
            <div id="meter-fill-${id}" class="meter-fill"></div>
        </div>
    `;

    // Add event listener for volume slider
    if (id !== 'me') {
        const slider = el.querySelector('.peer-volume-slider');
        // updatePeerVolume updates both audio and percentage text
        slider.oninput = (e) => updatePeerVolume(id, e.target.value);
    }

    // If user is already sharing screen, add button
    if (state.activeRemoteStreams[id]) {
        addVideoElement(id, state.activeRemoteStreams[id]);
    }
}

// Helper to update icon based on state
function updateUserIcon(id) {
    const el = document.getElementById(`user-${id}`);
    if (!el) return;

    let mic = el.querySelector('.mic-icon');
    if (!mic && id !== 'me') {
        mic = document.createElement('span'); 
        mic.className = 'mic-icon'; 
        el.querySelector('.user-info').prepend(mic); 
    }

    if (mic) {
        const isMuted = el.dataset.isMuted === 'true';
        const isDeafened = el.dataset.isDeafened === 'true';

        if (isDeafened) {
            mic.innerText = '🔇';
            mic.style.color = '#8b281d';
        } else if (isMuted) {
            mic.innerText = 'X🎤';
            mic.style.color = '#8b281d';
        } else {
            mic.innerText = '🎤';
            mic.style.color = '#2ecc71';
        }
    }
}

// Updates the mic icon in UI when user toggles mute
function updateMicStatusUI(id, isMuted) {
    const el = document.getElementById(`user-${id}`); 
    if (el) el.dataset.isMuted = isMuted;
    updateUserIcon(id);
}

// Updates the deafen icon in UI
function updateDeafenStatusUI(id, isDeafened) {
    const el = document.getElementById(`user-${id}`);
    if (el) el.dataset.isDeafened = isDeafened;
    updateUserIcon(id);
}

// Sets the volume level for a specific user
function updatePeerVolume(id, value) {
    if (!state.peerVolumes) state.peerVolumes = {};
    state.peerVolumes[id] = value;

    // 1. Update percentage text next to slider
    const textEl = document.getElementById(`vol-val-${id}`);
    if (textEl) textEl.innerText = value + "%";

    // 2. GainNode (Volume Boost) Setting
    const gainNode = state.peerGainNodes[id];
    if (gainNode && state.outputAudioContext) {
        const masterVol = dom.masterSlider ? (dom.masterSlider.value / 100) : 1;
        const peerVol = value / 100;
        
        gainNode.gain.setTargetAtTime(
            peerVol * masterVol, 
            state.outputAudioContext.currentTime, 
            0.01
        );
    }
}

// Expose to window for HTML access
window.updatePeerVolume = updatePeerVolume;

// Adds 'WATCH' button to user card
function addVideoElement(id, stream) {
    state.activeRemoteStreams[id] = stream;
    const card = document.getElementById(`user-${id}`);
    
    if (card && !card.querySelector('.stream-icon-btn')) {
        const btn = document.createElement('button'); 
        btn.className = 'stream-icon-btn'; 
        btn.innerHTML = '🖥️ İZLE';
        btn.onclick = () => openStreamModal(id);
        card.appendChild(btn);
    }

    // Remove button if stream ends
    if (stream.getVideoTracks().length > 0) {
        stream.getVideoTracks()[0].onended = () => removeVideoElement(id);
    }
}

// Clears stream watch button and modal
function removeVideoElement(id) {
    delete state.activeRemoteStreams[id];
    const card = document.getElementById(`user-${id}`); 
    if (card) { 
        const btn = card.querySelector('.stream-icon-btn'); 
        if (btn) btn.remove();
    }
    
    // dom.streamerNameLabel might not exist in dom.js, selecting manually:
    const streamerLabel = document.getElementById('streamerName');

    // Close modal if this person's stream is open
    if (dom.streamModal && dom.streamModal.style.display !== 'none' && 
        streamerLabel && streamerLabel.getAttribute('data-id') === id) {
        
        dom.streamModal.style.display = 'none';
        if (dom.largeVideoPlayer) dom.largeVideoPlayer.srcObject = null;
    }
}

// Opens stream watch window (Modal)
function openStreamModal(id) {
    if (!state.activeRemoteStreams[id]) return alert("Yayın yok");
    
    // Select elements safely
    const streamerLabel = document.getElementById('streamerName');

    if (dom.largeVideoPlayer) dom.largeVideoPlayer.srcObject = state.activeRemoteStreams[id];
    
    if (streamerLabel) {
        streamerLabel.innerText = `${state.userNames[id] || 'Biri'} Ekranı`;
        streamerLabel.setAttribute('data-id', id);
    }
    
    if (dom.streamModal) dom.streamModal.style.display = 'flex';
}

// Removes user card from list
function removeUserUI(id) {
    const el = document.getElementById(`user-${id}`);
    if (el) el.remove();
    
    // Clean up audio element
    const audio = document.getElementById(`audio-${id}`);
    if (audio) audio.remove();
}

module.exports = {
    addUserUI,
    removeUserUI,
    updateMicStatusUI,
    updateDeafenStatusUI,
    addVideoElement,
    removeVideoElement,
    openStreamModal,
    updatePeerVolume
};