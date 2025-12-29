const SimplePeer = require('simple-peer');

// 1. Expose SimplePeer to HTML
window.SimplePeer = SimplePeer;

// 2. Expose Audio API to HTML
window.audioAPI = {
    // Start Microphone Test
    startMicTest: async () => {
        console.log("🟦 Preload: Starting mic test...");
        if (!window.audioContext) window.audioContext = new AudioContext();

        // Make stream global to allow stopping it
        window.microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log("🎤 Preload: Mic stream ready");

        window.source = window.audioContext.createMediaStreamSource(window.microphoneStream);

        window.analyser = window.audioContext.createAnalyser();
        window.analyser.fftSize = 256;
        window.source.connect(window.analyser);
    },

    // Stop Microphone Test
    stopMicTest: async () => {
        if (window.microphoneStream) {
            window.microphoneStream.getTracks().forEach(track => track.stop());
            window.microphoneStream = null;
        }
        if (window.source) window.source.disconnect();
        if (window.analyser) window.analyser.disconnect();
        console.log("🔴 Preload: Mic test stopped");
    },

    // Calculate Audio Level (RMS)
    getAudioLevel: () => {
        if (!window.analyser) return 0;
        const dataArray = new Uint8Array(window.analyser.fftSize);
        window.analyser.getByteTimeDomainData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            const v = (dataArray[i] - 128) / 128;
            sum += v * v;
        }
        return Math.sqrt(sum / dataArray.length);
    }
};

console.log("✅ Preload: All APIs loaded to window object.");