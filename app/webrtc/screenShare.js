// screenShare.js - Screen Share Management
const state = require('../state/appState');
const dom = require('../ui/dom');

// Starts screen sharing
async function start() {
    if (state.isSharingScreen) return;

    try {
        // Request screen capture
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: false
        });

        state.screenStream = stream;
        state.isSharingScreen = true;

        // Update UI
        dom.btnShareScreen.innerText = "🛑 Durdur";
        dom.btnShareScreen.style.backgroundColor = "#e74c3c";

        // Handle manual stop via browser UI
        state.screenStream.getVideoTracks()[0].onended = () => {
            stop();
        };

        // Add screen stream to all existing connections
        for (let id in state.peers) {
            try {
                state.peers[id].addStream(state.screenStream);
            } catch (err) {
                console.error(`Peer ${id} akış ekleme hatası:`, err);
            }
        }

        // Add to local video window if open
        if (state.videoWindow && !state.videoWindow.closed && state.videoWindow.api) {
            state.videoWindow.api.addStream('me-screen', 'Ben (Ekran)', state.screenStream);
        }
    } catch (err) {
        console.error("Ekran paylaşımı başlatılamadı:", err);
    }
}

// Stops screen sharing and notifies peers
function stop() {
    if (!state.screenStream) return;

    // Stop stream tracks
    state.screenStream.getTracks().forEach(track => track.stop());

    // Remove stream from peers (Track ended event will handle the rest)
    for (let id in state.peers) {
        try {
            state.peers[id].removeStream(state.screenStream);
        } catch (err) {
            console.error(`Peer ${id} akış kaldırma hatası:`, err);
        }
    }

    // Remove from local video window if open
    if (state.videoWindow && !state.videoWindow.closed && state.videoWindow.api) {
        state.videoWindow.api.removeStream('me-screen');
    }

    // Clean up state and UI
    state.screenStream = null;
    state.isSharingScreen = false;

    dom.btnShareScreen.innerText = "🖥️ Paylaş";
    dom.btnShareScreen.style.backgroundColor = "#0288d1";
}

module.exports = {
    start,
    stop
};