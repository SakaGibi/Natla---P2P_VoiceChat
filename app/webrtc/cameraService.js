// cameraService.js - Camera Management
const state = require('../state/appState');
const dom = require('../ui/dom');

// Starts camera
async function start() {
    if (state.isCameraOn) return;

    try {
        // Request camera
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
        });

        state.cameraStream = stream;
        state.isCameraOn = true;

        // Update UI
        dom.btnToggleCam.innerHTML = "📷";
        dom.btnToggleCam.classList.add('active-cam');
        dom.btnToggleCam.style.backgroundColor = "#e74c3c";

        // Handle manual stop
        if (state.cameraStream.getVideoTracks().length > 0) {
            state.cameraStream.getVideoTracks()[0].onended = () => {
                stop();
            };
        }

        // Add camera stream to all existing connections
        for (let id in state.peers) {
            try {
                state.peers[id].addStream(state.cameraStream);
            } catch (err) {
                console.error(`Peer ${id} kamera akışı ekleme hatası:`, err);
            }
        }
    } catch (err) {
        console.error("Kamera başlatılamadı:", err);
        // Fallback to fake camera for testing if requested or error
        const useFake = confirm("Kamera açılamadı. Test için 'Sahte Kamera' kullanılsın mı?");
        if (useFake) {
            startFake();
        }
    }
}

// Starts a fake canvas stream
function startFake() {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');

    // Animation loop
    let x = 0;
    const interval = setInterval(() => {
        if (!state.isCameraOn) {
            clearInterval(interval);
            return;
        }
        ctx.fillStyle = '#333';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(x % canvas.width, 240, 50, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'white';
        ctx.font = '30px Arial';
        ctx.fillText("Fake Camera", 20, 50);
        ctx.fillText(new Date().toLocaleTimeString(), 20, 100);

        x += 5;
    }, 30);

    const stream = canvas.captureStream(30);
    state.cameraStream = stream;
    state.isCameraOn = true;

    dom.btnToggleCam.innerHTML = "📷";
    dom.btnToggleCam.classList.add('active-cam');
    dom.btnToggleCam.style.backgroundColor = "#e74c3c";

    // Add to peers
    for (let id in state.peers) {
        try {
            state.peers[id].addStream(state.cameraStream);
        } catch (err) {
            console.error(`Peer ${id} sahte akış ekleme hatası:`, err);
        }
    }
}

// Stops camera and notifies peers
function stop() {
    if (!state.cameraStream) return;

    // Stop stream tracks
    state.cameraStream.getTracks().forEach(track => track.stop());

    // Remove stream from peers and send notification
    for (let id in state.peers) {
        try {
            state.peers[id].removeStream(state.cameraStream);
            state.peers[id].send(JSON.stringify({
                type: 'video-stopped',
                senderId: state.myPeerId
            }));
        } catch (err) {
            console.error(`Peer ${id} kamera akışı kaldırma hatası:`, err);
        }
    }

    // Clean up state and UI
    state.cameraStream = null;
    state.isCameraOn = false;

    dom.btnToggleCam.innerHTML = "📷";
    dom.btnToggleCam.style.backgroundColor = "#0288d1";
    dom.btnToggleCam.classList.remove('active-cam');
}

module.exports = {
    start,
    stop
};
