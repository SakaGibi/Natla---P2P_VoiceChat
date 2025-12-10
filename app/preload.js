const SimplePeer = require('simple-peer');

// 1. SimplePeer'i HTML'e aktar
window.SimplePeer = SimplePeer;

// 2. Audio API'yi HTML'e aktar (contextBridge YERİNE window kullanıyoruz)
// Not: index.html şu an bunları kullanmıyor ama eski kodların bozulmasın diye buraya ekledim.
window.audioAPI = {
    startMicTest: async () => {
        console.log("🟦 Preload: Mikrofon testi başlatılıyor...");
        if (!window.audioContext) window.audioContext = new AudioContext();

        // window.microphoneStream global olsun ki durdurabilelim
        window.microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log("🎤 Preload: Mikrofon stream hazır");

        window.source = window.audioContext.createMediaStreamSource(window.microphoneStream);

        window.analyser = window.audioContext.createAnalyser();
        window.analyser.fftSize = 256;
        window.source.connect(window.analyser);
        // Test sırasında sesi hoparlöre verme (yankı yapar), sadece analiz et
        // window.analyser.connect(window.audioContext.destination); 
    },

    stopMicTest: async () => {
        if (window.microphoneStream) {
            window.microphoneStream.getTracks().forEach(track => track.stop());
            window.microphoneStream = null;
        }
        if (window.source) window.source.disconnect();
        if (window.analyser) window.analyser.disconnect();
        console.log("🔴 Preload: Mikrofon testi durduruldu");
    },

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

console.log("✅ Preload: Tüm API'ler window nesnesine yüklendi.");