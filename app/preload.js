const { contextBridge } = require('electron');

let audioContext;
let analyser;
let source;

contextBridge.exposeInMainWorld('electronAPI', {
    getUserName: async () => {
        return prompt("Lütfen adını gir:");
    }
});

contextBridge.exposeInMainWorld('audioAPI', {
    startMicTest: async () => {
        console.log("🟦 Preload: Mikrofon testi başlatılıyor...");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log("🎤 Preload: Mikrofon stream hazır");

            audioContext = new AudioContext();
            source = audioContext.createMediaStreamSource(stream);

            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;

            source.connect(analyser);
            analyser.connect(audioContext.destination);

            console.log("🟢 Preload: Mikrofon sesi hoparlöre yönlendirildi.");
        } catch (err) {
            console.error("❌ Preload: Mikrofon alınamadı:", err);
        }
    },

    getAudioData: () => {
        if (!analyser) return null;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteTimeDomainData(dataArray);
        return dataArray;
    }
});
