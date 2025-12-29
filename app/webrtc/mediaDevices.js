// mediaDevices.js - Audio Device Management
const dom = require('../ui/dom');
const state = require('../state/appState');
const audioEngine = require('../audio/audioEngine'); // Import AudioEngine

async function getDevices() {
    try {
        // Request devices to trigger permissions
        const devices = await navigator.mediaDevices.enumerateDevices();
        
        // Clear lists
        dom.micSelect.innerHTML = '';
        dom.speakerSelect.innerHTML = '';

        const audioInputs = devices.filter(d => d.kind === 'audioinput');
        const audioOutputs = devices.filter(d => d.kind === 'audiooutput');

        // List Microphones
        audioInputs.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.text = device.label || `Mikrofon ${dom.micSelect.length + 1}`;
            dom.micSelect.appendChild(option);
        });

        // List Speakers
        audioOutputs.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.text = device.label || `Hoparlör ${dom.speakerSelect.length + 1}`;
            dom.speakerSelect.appendChild(option);
        });

        // Restore saved selection if exists
        const savedMic = localStorage.getItem('selectedMic');
        const savedSpeaker = localStorage.getItem('selectedSpeaker');

        if (savedMic && Array.from(dom.micSelect.options).some(o => o.value === savedMic)) {
            dom.micSelect.value = savedMic;
        }
        if (savedSpeaker && Array.from(dom.speakerSelect.options).some(o => o.value === savedSpeaker)) {
            dom.speakerSelect.value = savedSpeaker;
        }

    } catch (e) {
        // Handle errors
        console.error("Cihaz listeleme hatası:", e);
    }
}

// Listen for Device Changes (Plug-and-Play)
navigator.mediaDevices.ondevicechange = () => {
    getDevices();
};

module.exports = { getDevices };