// app/renderer.js - EKRAN PAYLAŞMA (STOP FIX) & SES & AMFİ

const PORT = 8080;
const WS_URL = `ws://3.121.233.106:8080`; 
const SimplePeer = require('simple-peer'); 
const chatHistory = document.getElementById('chatHistory');
const msgInput = document.getElementById('msgInput');
const btnSend = document.getElementById('btnSend');
const path = require('path');

// Giriş Sesi Ayarı
let joinPath = path.join(__dirname, 'assets', /*'gazmaliyim.mp3'*/);
joinPath = joinPath.replace('app.asar', 'app.asar.unpacked');
const joinSound = new Audio(joinPath);
joinSound.volume = 0.2;

let socket;
let localStream;
let screenStream;
let processedStream;  
let micGainNode;
let sourceNode; 
let audioContext;
let outputAudioContext; 
let peerGainNodes = {}; 

let peers = {}; 
let userNames = {};
let isMicMuted = false;
let isDeafened = false;
let isConnected = false;
let isSharingScreen = false;
let isShowingTempMessage = false;

// --- YAYIN DEĞİŞKENLERİ ---
let activeRemoteStreams = {}; 
// --------------------------------

// --- GLOBAL VARIABLES ---
let statusTimeout;       
let onlineUserCount = 0; 
let myPeerId = null;

// UI Elements
const inputUsername = document.getElementById('username');
const statusDiv = document.getElementById('status');
const userListDiv = document.getElementById('userList');

const btnConnect = document.getElementById('btnConnect');
const activeControls = document.getElementById('activeControls');
const btnDisconnect = document.getElementById('btnDisconnect');
const btnToggleMic = document.getElementById('btnToggleMic');
const btnToggleSound = document.getElementById('btnToggleSound');
const btnShareScreen = document.getElementById('btnShareScreen'); 

// --- MODAL ELEMENTLERİ ---
const streamModal = document.getElementById('streamModal');
const largeVideoPlayer = document.getElementById('largeVideoPlayer');
const btnCloseStream = document.getElementById('btnCloseStream');
const streamerNameLabel = document.getElementById('streamerName');

// Modal Kapatma
btnCloseStream.addEventListener('click', () => {
    streamModal.style.display = 'none';
    largeVideoPlayer.srcObject = null;
});
// ------------------------------

const btnTheme = document.getElementById('btnTheme');

const micSelect = document.getElementById('micSelect');
const speakerSelect = document.getElementById('speakerSelect'); 
const micSlider = document.getElementById('micVolume');
const micVal = document.getElementById('micVal');
const masterSlider = document.getElementById('masterVolume');
const masterVal = document.getElementById('masterVal');


// --- YARDIMCI FONKSİYON ---
// --- YARDIMCI FONKSİYON: GEÇİCİ BİLDİRİM (DÜZELTİLDİ) ---
function showTemporaryStatus(message) {
    isShowingTempMessage = true; // Kilit vuruyoruz
    statusDiv.innerText = message;
    
    if (statusTimeout) clearTimeout(statusTimeout);
    
    statusTimeout = setTimeout(() => {
        isShowingTempMessage = false; // Kilidi açıyoruz
        // Süre bitince güncel sayıyı yazdır
        statusDiv.innerText = `Sohbet Odası (${onlineUserCount} Kişi)`;
    }, 3000);
}

function updateOnlineCount() {
    const count = Object.keys(userNames).length;
    onlineUserCount = count;

    if (!isShowingTempMessage) {
        statusDiv.innerText = `Sohbet Odası (${count} Kişi)`;
    }
}

// --- BAŞLANGIÇ ---
window.onload = () => {
    loadSettings();
    getDevices(); 
};

// --- CİHAZLARI LİSTELE ---
async function getDevices() {
    try {
        await navigator.mediaDevices.getUserMedia({ audio: true }); 
        const devices = await navigator.mediaDevices.enumerateDevices();
        
        const audioInputs = devices.filter(d => d.kind === 'audioinput');
        const audioOutputs = devices.filter(d => d.kind === 'audiooutput');

        micSelect.innerHTML = '<option value="">Varsayılan Mikrofon</option>';
        audioInputs.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.deviceId;
            opt.text = d.label || `Mikrofon ${micSelect.length}`;
            micSelect.appendChild(opt);
        });

        speakerSelect.innerHTML = '<option value="">Varsayılan Hoparlör</option>';
        audioOutputs.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.deviceId;
            opt.text = d.label || `Hoparlör ${speakerSelect.length}`;
            speakerSelect.appendChild(opt);
        });

        const savedMic = localStorage.getItem('selectedMicId');
        if (savedMic && audioInputs.some(d => d.deviceId === savedMic)) micSelect.value = savedMic;

        const savedSpeaker = localStorage.getItem('selectedSpeakerId');
        if (savedSpeaker && audioOutputs.some(d => d.deviceId === savedSpeaker)) speakerSelect.value = savedSpeaker;

    } catch (err) { console.error(err); }
}

// --- CİHAZ DEĞİŞİMLERİ ---
micSelect.addEventListener('change', async (e) => {
    saveSetting('selectedMicId', e.target.value);
    if (isConnected) await switchMicrophone(e.target.value);
});

async function switchMicrophone(deviceId) {
    try {
        if (localStream) localStream.getTracks().forEach(t => t.stop());

        const constraints = {
            audio: deviceId ? { deviceId: { exact: deviceId } } : true,
            video: false
        };
        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (sourceNode) sourceNode.disconnect();
        
        sourceNode = audioContext.createMediaStreamSource(newStream);
        sourceNode.connect(micGainNode); 
        
        localStream = newStream;
        setMicState(isMicMuted);

    } catch (err) {
        console.error("Mikrofon değiştirilemedi:", err);
        alert("Mikrofon değiştirilemedi: " + err.message);
    }
}

speakerSelect.addEventListener('change', (e) => {
    const deviceId = e.target.value;
    saveSetting('selectedSpeakerId', deviceId);
    
    document.querySelectorAll('audio').forEach(async (audio) => {
        if (audio.setSinkId) {
            try { await audio.setSinkId(deviceId); } catch (err) { console.error(err); }
        }
    });

    if (outputAudioContext && outputAudioContext.setSinkId) {
        outputAudioContext.setSinkId(deviceId).catch(err => console.error("Hoparlör değişmedi:", err));
    }
});

// --- LOCAL STORAGE & TEMA ---
function saveSetting(key, value) { localStorage.setItem(key, value); }
function loadSettings() {
    const savedName = localStorage.getItem('username');
    if (savedName) inputUsername.value = savedName;
    else inputUsername.value = "User_" + Math.floor(Math.random() * 1000); 

    const savedMicVol = localStorage.getItem('micVolume');
    if (savedMicVol) { micSlider.value = savedMicVol; micVal.innerText = savedMicVol + "%"; }

    const savedMasterVol = localStorage.getItem('masterVolume');
    if (savedMasterVol) { masterSlider.value = savedMasterVol; masterVal.innerText = savedMasterVol + "%"; }

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        btnTheme.innerText = '🌙';
    } else {
        btnTheme.innerText = '☀️';
    }
}
btnTheme.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    btnTheme.innerText = isLight ? '🌙' : '☀️';
    saveSetting('theme', isLight ? 'light' : 'dark');
});
inputUsername.addEventListener('input', (e) => saveSetting('username', e.target.value));

// --- SES AYARLARI ---
micSlider.addEventListener('input', (e) => {
    const val = e.target.value;
    micVal.innerText = val + "%";
    if (micGainNode) micGainNode.gain.value = val / 100; 
    saveSetting('micVolume', val); 
});
masterSlider.addEventListener('input', (e) => {
    const val = e.target.value;
    masterVal.innerText = val + "%";
    document.querySelectorAll('audio').forEach(audio => audio.volume = val / 100);
    saveSetting('masterVolume', val); 
});

// --- BAĞLANMA (BTNCONNECT) ---
btnConnect.addEventListener('click', async () => {
    const name = inputUsername.value;
    if(!name) return alert("Lütfen bir isim girin!");
    saveSetting('username', name);

    btnConnect.style.display = 'none'; 
    activeControls.style.display = 'flex';
    inputUsername.disabled = true;

    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    outputAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    if (outputAudioContext.state === 'suspended') {
        await outputAudioContext.resume();
    }

    const selectedSpeaker = speakerSelect.value;
    if (selectedSpeaker && outputAudioContext.setSinkId) {
            outputAudioContext.setSinkId(selectedSpeaker).catch(e => console.error(e));
    }

    statusDiv.innerText = "Ses motoru başlatılıyor...";
    try {
        const selectedMicId = micSelect.value;
        const constraints = {
            audio: selectedMicId ? { deviceId: { exact: selectedMicId } } : true,
            video: false
        };

        const rawStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        sourceNode = audioContext.createMediaStreamSource(rawStream);
        micGainNode = audioContext.createGain();
        micGainNode.gain.value = micSlider.value / 100; 
        
        const destination = audioContext.createMediaStreamDestination();
        sourceNode.connect(micGainNode);
        micGainNode.connect(destination);
        
        localStream = rawStream; 
        processedStream = destination.stream; 

        statusDiv.innerText = "Sunucuya bağlanılıyor...";
        msgInput.disabled = false;
        btnSend.disabled = false;
        
        btnShareScreen.disabled = false;

        userNames["me"] = name + " (Ben)";
        myPeerId = 'me';
        addUserUI("me", userNames["me"], true);
        attachVisualizer(processedStream, "me"); 

        connectSocket(name);
        isConnected = true;
    } catch (err) {
        console.error(err);
        disconnectRoom(); 
        statusDiv.innerText = "HATA: " + err.message;
    }
});

btnSend.addEventListener('click', sendChat);
msgInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendChat(); });

// --- EKRAN PAYLAŞMA BUTONU ---
btnShareScreen.addEventListener('click', async () => {
    if (!isSharingScreen) {
        // PAYLAŞIMI BAŞLAT
        try {
            screenStream = await navigator.mediaDevices.getDisplayMedia({ 
                video: true, 
                audio: false 
            });

            isSharingScreen = true;
            btnShareScreen.innerText = "🛑 Durdur";
            btnShareScreen.style.backgroundColor = "#e74c3c"; // Kırmızı

            // Tarayıcıdan durdurulursa
            screenStream.getVideoTracks()[0].onended = () => {
                stopScreenShare();
            };

            for (let id in peers) {
                try {
                    peers[id].addStream(screenStream);
                } catch (err) {
                    console.error("Akış eklenemedi:", err);
                }
            }

            showTemporaryStatus("Ekran paylaşılıyor...");

        } catch (err) {
            console.error("Ekran paylaşımı iptal:", err);
        }
    } else {
        // PAYLAŞIMI DURDUR
        stopScreenShare();
    }
});

function stopScreenShare() {
    if (!screenStream) return;
    
    screenStream.getTracks().forEach(track => track.stop());
    
    // Peer'lardan akışı kaldır ve BİLDİRİM GÖNDER
    for (let id in peers) {
        try {
            peers[id].removeStream(screenStream);
            
            // --- GÜNCELLEME: KARŞI TARAFA "BİTTİ" SİNYALİ GÖNDER ---
            peers[id].send(JSON.stringify({ 
                type: 'video-stopped', 
                senderId: 'me' 
            }));
            // --------------------------------------------------------

        } catch (err) { console.error(err); }
    }
    
    screenStream = null;
    isSharingScreen = false;
    
    btnShareScreen.innerText = "🖥️ Paylaş";
    btnShareScreen.style.backgroundColor = "#0288d1"; 
    showTemporaryStatus("Ekran paylaşımı durduruldu.");
}

// --- ODADAN AYRILMA ---
btnDisconnect.addEventListener('click', () => {
    disconnectRoom();
});

function disconnectRoom() {
    isConnected = false;
    
    if (isSharingScreen) stopScreenShare(); 
    btnShareScreen.disabled = true;

    if (socket) { socket.close(); socket = null; }

    for (let id in peers) { peers[id].destroy(); }
    peers = {};

    if (localStream) localStream.getTracks().forEach(t => t.stop());
    if (audioContext) audioContext.close();
    if (outputAudioContext) outputAudioContext.close(); 
    
    localStream = null;
    audioContext = null;
    outputAudioContext = null;

    document.getElementById('userList').innerHTML = ''; 
    document.getElementById('audioContainer').innerHTML = ''; 
    
    streamModal.style.display = 'none';
    largeVideoPlayer.srcObject = null;
    activeRemoteStreams = {};
    
    btnConnect.style.display = 'block'; 
    activeControls.style.display = 'none'; 
    
    inputUsername.disabled = false;
    msgInput.disabled = true;
    btnSend.disabled = true;
    
    statusDiv.innerText = "Odan ayrıldınız. Hazır...";
}

// --- CHAT FONKSİYONLARI ---
function addMessageToUI(sender, text, type, time = null) {
    if (!time) time = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    const cleanName = sender.replace(" (Ben)", "");
    
    const div = document.createElement('div');
    div.className = `message ${type}`;
    div.innerHTML = `<span class="msg-sender">${cleanName}</span>${text}<span class="msg-time">${time}</span>`;
    
    chatHistory.appendChild(div);
    chatHistory.scrollTop = chatHistory.scrollHeight; 
}

function sendChat() {
    const text = msgInput.value.trim();
    if (!text || !isConnected) return;

    addMessageToUI(userNames['me'], text, 'sent');

    const payload = JSON.stringify({
        type: 'chat',
        sender: userNames['me'],
        text: text,
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    });

    for (let id in peers) {
        try { peers[id].send(payload); } catch (e) { console.error("Mesaj gönderilemedi:", e); }
    }
    msgInput.value = '';
}

function sendPeerStatusUpdate(payload) {
    if (!isConnected) return;
    payload.senderId = 'me'; 
    const jsonPayload = JSON.stringify(payload);
    for (let id in peers) {
        try { peers[id].send(jsonPayload); } catch (e) { console.error(`Status gönderilemedi (${id}):`, e); }
    }
}

// --- SES KONTROLLERİ ---
function setMicState(mute) {
    if (!localStream) return;
    const track = localStream.getAudioTracks()[0];
    isMicMuted = mute;
    track.enabled = !mute; 

    sendPeerStatusUpdate({ type: 'mic-status', isMuted: mute });

    if (isMicMuted) {
        btnToggleMic.innerText = "🎤✖"; 
        btnToggleMic.style.backgroundColor = "#8b281d"; 
    } else {
        btnToggleMic.innerText = "🎤"; 
        btnToggleMic.style.backgroundColor = "#397251"; 
    }
}

btnToggleMic.addEventListener('click', () => {
    if (isDeafened) return alert("Hoparlör kapalıyken mikrofonu açamazsınız!");
    setMicState(!isMicMuted);
});

btnToggleSound.addEventListener('click', () => {
    isDeafened = !isDeafened;
    
    document.querySelectorAll('audio').forEach(audio => audio.muted = isDeafened);
    
    if (outputAudioContext) {
        if (isDeafened) {
            outputAudioContext.suspend();
        } else {
            outputAudioContext.resume();
        }
    }
    
    if (isDeafened) {
        btnToggleSound.innerText = "🔇"; 
        btnToggleSound.style.backgroundColor = "#8b281d"; 
        if (!isMicMuted) setMicState(true);
    } else {
        btnToggleSound.innerText = "🔊"; 
        btnToggleSound.style.backgroundColor = "#397251";
    }
});

// --- SOUNDPAD ---
const soundEffects = [
    { file: 'fahh_effect', title: 'Fahh Efekti' },  
    { file: 'ahhhhhhh_effect', title: 'Ahhhhhhh Efekti' },    
    { file: 'besili_camis_effect',    title: 'besili camış' },     
    { file: 'denyo_dangalak_effect',    title: 'denyo mu dangalak mı?' },
    { file: 'deplasman_yasağı_effect', title: 'deplasman yarağı' },
    { file: 'levo_rage_effect', title: 'harika bir oyun' },
    { file: 'masaj_salonu_effect', title: 'mecidiyeköy masaj salonu' },
    { file: 'neden_ben_effect', title: 'Neden dede neden beni seçtin' },
    { file: 'samsun_anlık_effect', title: 'adalet mahallesinde gaza' },
    { file: 'simdi_hoca_effect', title: 'şimdi hocam, position is obvious' },
    { file: 'ananı_effect', title: 'ananı s...' },
    { file: 'yalvarırım_ağzına_effect', title: 'yalvarırım ağzına al' },
    { file: 'sus_artık_effect', title: 'yeter be sus artık' },
    { file: '', title: '' },
    { file: '', title: '' },
    { file: '', title: '' }
];

document.querySelectorAll('.soundpad-btn').forEach((btn, index) => {
    const soundId = index + 1;
    const effectInfo = soundEffects[index] || { 
        file: `effect_${soundId}`, 
        title: `Ses Efekti ${soundId}` 
    };

    btn.innerText = soundId.toString();
    btn.title = effectInfo.title; 

    btn.addEventListener('click', () => {
        if (!isConnected) return; 
        
        sendPeerStatusUpdate({ type: 'sound-effect', effectName: effectInfo.file });
        playLocalSound(effectInfo.file);
    });
});

function playLocalSound(effectName) {
    try {
        let soundPath = path.join(__dirname, 'assets', `${effectName}.mp3`);
        soundPath = soundPath.replace('app.asar', 'app.asar.unpacked');
        
        const audio = new Audio(soundPath); 
        const masterVol = document.getElementById('masterVolume').value;
        audio.volume = masterVol / 100;
        
        const selectedSpeaker = document.getElementById('speakerSelect').value;
        if (selectedSpeaker && audio.setSinkId) {
             audio.setSinkId(selectedSpeaker).catch(e => {});
        }

        if (isDeafened) return; 

        audio.play().catch(e => console.warn("Ses çalma hatası:", e));
    } catch (e) { console.error("Ses dosyası hatası:", e); }
}

// --- WEBSOCKET ---
function connectSocket(name) {
    socket = new WebSocket(WS_URL);

    socket.onopen = () => {
        statusDiv.innerText = "Odaya giriliyor...";
        socket.send(JSON.stringify({ type: 'join', name: name }));
    };

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'user-list') {
                // Listeyi aldık, önce peer'ları oluşturalım
                data.users.forEach(user => {
                    userNames[user.id] = user.name;
                    createPeer(user.id, user.name, true);
                });
                // Sonra sayımı güncelle
                updateOnlineCount();
            } 
            else if (data.type === 'user-joined') {
                userNames[data.id] = data.name;
                updateNameUI(data.id, data.name);
                joinSound.play().catch(e => {});                
                showTemporaryStatus(`${data.name} katıldı 👋`);
                
                // Yeni kişi geldi, sayıyı güncelle
                updateOnlineCount();
            } 
            else if (data.type === 'user-left') {
                const leaverName = userNames[data.id] || "Biri";
                const targetFriendName = "berkypci"; 
                
                if (leaverName.trim().toLowerCase() === targetFriendName.toLowerCase()) {
                    playLocalSound("cikis"); 
                    showTemporaryStatus(`${leaverName} kaçtı! 🏃‍♂️`);
                } else {
                    showTemporaryStatus(`${leaverName} ayrıldı 💨`);
                }
                
                removePeer(data.id);
            }
            else if (data.type === 'signal') handleSignal(data.senderId, data.signal);
        } catch (e) { console.error(e); }
    };
    
    socket.onerror = () => { statusDiv.innerText = "Sunucu Bağlantı Hatası!"; disconnectRoom(); };
    socket.onclose = () => { if(isConnected) disconnectRoom(); };
}

// --- P2P ---
function createPeer(targetId, name, initiator) {
    try {
        const peer = new SimplePeer({
            initiator: initiator,
            stream: processedStream, 
            trickle: false,
            config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
        });

        peer.on('signal', signal => {
            if(socket && socket.readyState === WebSocket.OPEN)
                socket.send(JSON.stringify({ type: 'signal', targetId: targetId, signal: signal }));
        });

        // GELEN AKIŞI YÖNETME 
        peer.on('stream', stream => {
            if (stream.getVideoTracks().length > 0) {
                console.log("Video akışı alındı:", targetId);
                addVideoElement(targetId, stream);
            } 
            else {
                addAudioElement(targetId, stream);
                const finalName = userNames[targetId] || name || "Bilinmeyen";
                addUserUI(targetId, finalName, true);
                attachVisualizer(stream, targetId);
            }
        });

        // VERİ GELDİĞİNDE (CHAT veya DURUM)
        peer.on('data', data => {
            try {
                const strData = new TextDecoder("utf-8").decode(data);
                const msg = JSON.parse(strData);
        
                if (msg.type === 'chat') {
                    addMessageToUI(msg.sender, msg.text, 'received', msg.time);
                } 
                else if (msg.type === 'mic-status') {
                    updateMicStatusUI(targetId, msg.isMuted);
                }
                else if (msg.type === 'sound-effect') {
                    playLocalSound(msg.effectName);
                }
                // --- GÜNCELLEME: YAYIN BİTTİ MESAJINI YAKALA ---
                else if (msg.type === 'video-stopped') {
                    removeVideoElement(targetId);
                }
                // -----------------------------------------------
            } catch (e) { console.error("Gelen P2P Data hatası:", e); }
        });

        peer.on('error', err => {
            if (err.message.includes('User-Initiated Abort') || err.message.includes('Close called')) return;
            console.error("Peer hatası:", err);
        });

        peer.on('close', () => removePeer(targetId));

        peers[targetId] = peer;
        if(!document.getElementById(`user-${targetId}`)) {
            const finalName = userNames[targetId] || name || "Bilinmeyen";
            addUserUI(targetId, finalName, false);
        }
    } catch (e) { console.error(e); }
}

function handleSignal(senderId, signal) {
    if (!peers[senderId]) {
        const storedName = userNames[senderId] || "Bilinmeyen";
        createPeer(senderId, storedName, false);
    }
    if (peers[senderId]) peers[senderId].signal(signal);
}

// --- UI HELPERS ---
function addUserUI(id, name, isConnected) {
    let el = document.getElementById(`user-${id}`);
    const statusText = isConnected ? 'Canlı' : 'Bağlanıyor...';
    
    if (!el) {
        el = document.createElement('div');
        el.id = `user-${id}`;
        el.className = 'user-card';
        userListDiv.appendChild(el);
    }
        
    let volumeControlHTML = '';
        if (id !== 'me') {
            volumeControlHTML = `
                <div class="user-volume">
                    <label>🔊</label>
                    <input type="range" min="0" max="300" value="100" 
                            oninput="
                                document.getElementById('vol-val-${id}').innerText = this.value + '%';
                                if (peerGainNodes['${id}']) {
                                    peerGainNodes['${id}'].gain.value = this.value / 100;
                                }
                            ">
                    <span id="vol-val-${id}">100%</span>
                </div>
            `;
        }

    el.innerHTML = `
        <div class="user-info">
            ${id !== 'me' ? '<span class="mic-icon">🎤</span>' : ''} 
            <span class="user-name">${name}</span>
            <span class="user-status">${statusText}</span>
        </div>
        ${volumeControlHTML}
        <div class="meter-bg">
            <div id="meter-fill-${id}" class="meter-fill"></div>
        </div>
    `;
}

function updateMicStatusUI(id, isMuted) {
    const userCard = document.getElementById(`user-${id}`);
    if (!userCard) return;

    let micIcon = userCard.querySelector('.mic-icon');
    if (!micIcon) {
        micIcon = document.createElement('span');
        micIcon.className = 'mic-icon';
        userCard.querySelector('.user-info').prepend(micIcon); 
    }

    if (isMuted) {
        micIcon.innerText = '❌'; 
        micIcon.style.color = '#ff4757';
    } else {
        micIcon.innerText = '🎤'; 
        micIcon.style.color = '#2ecc71';
    }
}

function updateNameUI(id, newName) {
    const el = document.getElementById(`user-${id}`);
    if (el) {
        const nameSpan = el.querySelector('.user-name');
        if (nameSpan) nameSpan.innerText = newName;
    }
}

function attachVisualizer(stream, id) {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64; 
    source.connect(analyser);
    
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const barElement = document.getElementById(`meter-fill-${id}`);

    function updateMeter() {
        if (!document.getElementById(`user-${id}`)) return; 
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for(let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const average = sum / dataArray.length;
        const percent = Math.min(100, average * 2.5); 
        if(barElement) barElement.style.width = percent + "%";
        requestAnimationFrame(updateMeter);
    }
    updateMeter();
}

function addAudioElement(id, stream) {
    if (document.getElementById(`audio-${id}`)) return;
    const audio = document.createElement('audio');
    audio.id = `audio-${id}`;
    audio.srcObject = stream;
    audio.autoplay = true;
    audio.muted = true; 
    document.getElementById('audioContainer').appendChild(audio);

    if (outputAudioContext) {
        try {
            const source = outputAudioContext.createMediaStreamSource(stream);
            const gainNode = outputAudioContext.createGain();
            gainNode.gain.value = 1.0; 
            source.connect(gainNode);
            gainNode.connect(outputAudioContext.destination);
            peerGainNodes[id] = gainNode;
        } catch (e) {
            console.error("Ses motoru hatası:", e);
            audio.muted = false; 
        }
    }
}

function addVideoElement(id, stream) {
    console.log("Video akışı hafızaya alındı:", id);
    activeRemoteStreams[id] = stream;

    const userCard = document.getElementById(`user-${id}`);
    if (userCard) {
        if (userCard.querySelector('.stream-icon-btn')) return;

        const btnWatch = document.createElement('button');
        btnWatch.className = 'stream-icon-btn';
        btnWatch.innerHTML = '🖥️ İZLE';
        btnWatch.title = 'Yayını İzlemek İçin Tıkla';
        
        btnWatch.onclick = () => { openStreamModal(id); };

        userCard.appendChild(btnWatch);
    }

    stream.getVideoTracks()[0].onended = () => {
        removeVideoElement(id);
    };
}

function removeVideoElement(id) {
    delete activeRemoteStreams[id];
    
    const userCard = document.getElementById(`user-${id}`);
    if (userCard) {
        const btn = userCard.querySelector('.stream-icon-btn');
        if (btn) btn.remove();
    }

    if (streamModal.style.display !== 'none' && streamerNameLabel.getAttribute('data-id') === id) {
        streamModal.style.display = 'none';
        largeVideoPlayer.srcObject = null;
    }
}

function openStreamModal(id) {
    const stream = activeRemoteStreams[id];
    if (!stream) return alert("Yayın bulunamadı!");

    largeVideoPlayer.srcObject = stream;
    streamerNameLabel.innerText = `${userNames[id] || 'Kullanıcı'} - Ekran Yayını`;
    streamerNameLabel.setAttribute('data-id', id); 
    
    streamModal.style.display = 'flex'; 
}

function removePeer(id) {
    if(peers[id]) { peers[id].destroy(); delete peers[id]; }
    if (peerGainNodes[id]) { delete peerGainNodes[id]; }

    if (activeRemoteStreams[id]) {
        removeVideoElement(id); 
    }

    const el = document.getElementById(`user-${id}`); if(el) el.remove();
    const aud = document.getElementById(`audio-${id}`); if(aud) aud.remove();
    
    delete userNames[id];

    updateOnlineCount();
}