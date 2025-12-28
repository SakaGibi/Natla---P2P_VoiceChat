// app/webrtc/mediaDevices.js
const dom = require('../ui/dom');
const state = require('../state/appState');
const audioEngine = require('../audio/audioEngine'); // AudioEngine'i ekledik

async function getDevices() {
    try {
        // İzinleri tetiklemek için önce cihazları iste
        // (Eğer etiketler boş gelirse initLocalStream zaten izin isteyecek)
        const devices = await navigator.mediaDevices.enumerateDevices();
        
        // Listeleri temizle
        dom.micSelect.innerHTML = '';
        dom.speakerSelect.innerHTML = '';

        const audioInputs = devices.filter(d => d.kind === 'audioinput');
        const audioOutputs = devices.filter(d => d.kind === 'audiooutput');

        // Mikrofonları Listele
        audioInputs.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.text = device.label || `Mikrofon ${dom.micSelect.length + 1}`;
            dom.micSelect.appendChild(option);
        });

        // Hoparlörleri Listele
        audioOutputs.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.text = device.label || `Hoparlör ${dom.speakerSelect.length + 1}`;
            dom.speakerSelect.appendChild(option);
        });

        // Varsa kayıtlı seçimi geri yükle
        const savedMic = localStorage.getItem('selectedMic');
        const savedSpeaker = localStorage.getItem('selectedSpeaker');

        if (savedMic && Array.from(dom.micSelect.options).some(o => o.value === savedMic)) {
            dom.micSelect.value = savedMic;
        }
        if (savedSpeaker && Array.from(dom.speakerSelect.options).some(o => o.value === savedSpeaker)) {
            dom.speakerSelect.value = savedSpeaker;
        }

    } catch (e) {
        console.error("Cihaz listeleme hatası:", e);
    }
}

// Cihaz Değişikliklerini Dinle (Tak-Çıkar)
navigator.mediaDevices.ondevicechange = () => {
    getDevices();
};

module.exports = { getDevices };