// userList.js - Kullanıcı Kartları ve Yayın Arayüzü Yönetimi
const state = require('../state/appState');
const dom = require('./dom');

// Kullanıcı listesine yeni bir kart ekler veya mevcut olanı günceller
function addUserUI(id, name, isConnected) {
    let el = document.getElementById(`user-${id}`);
    const statusText = isConnected ? 'Canlı' : 'Bağlanıyor...';
    const statusColor = isConnected ? '#2ecc71' : '#f1c40f';
    
    // Eğer kart zaten varsa sadece durumunu güncelle
    if (el) {
        const statusSpan = el.querySelector('.user-status');
        if (statusSpan) {
            statusSpan.innerText = statusText;
            statusSpan.style.color = statusColor;
        }
        return;
    }
    
    // Yeni kart oluştur
    el = document.createElement('div'); 
    el.id = `user-${id}`; 
    el.className = 'user-card'; 
    
    // --- HATA DÜZELTME: dom.userListDiv -> dom.userList ---
    if (dom.userList) {
        dom.userList.appendChild(el);
    } else {
        console.error("HATA: dom.userList bulunamadı!");
        return;
    }
    
    // Diğer kullanıcılar için ses seviyesi ayarı ekle
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
    
    // Kartın iç yapısını oluştur (Mikrofon ikonu, isim ve VU meter)
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

    // Ses slider'ı için olay dinleyicisi ekle
    if (id !== 'me') {
        const slider = el.querySelector('.peer-volume-slider');
        // updatePeerVolume hem sesi hem de yandaki % yazısını güncelleyecek
        slider.oninput = (e) => updatePeerVolume(id, e.target.value);
    }

    // Eğer bu kişi zaten ekran paylaşıyorsa butonu ekle
    if (state.activeRemoteStreams[id]) {
        addVideoElement(id, state.activeRemoteStreams[id]);
    }
}

// Kullanıcı mikrofonunu kapattığında UI'daki ikonu günceller
function updateMicStatusUI(id, isMuted) {
    const el = document.getElementById(`user-${id}`); 
    if (!el) return;

    let mic = el.querySelector('.mic-icon');
    if (!mic && id !== 'me') {
        mic = document.createElement('span'); 
        mic.className = 'mic-icon'; 
        el.querySelector('.user-info').prepend(mic); 
    }

    if (mic) {
        mic.innerText = isMuted ? '❌' : '🎤';
        mic.style.color = isMuted ? '#ff4757' : '#2ecc71';
    }
}

// Belirli bir kullanıcının ses seviyesini ayarlar
function updatePeerVolume(id, value) {
    if (!state.peerVolumes) state.peerVolumes = {};
    state.peerVolumes[id] = value;

    // 1. Slider yanındaki % yazısını güncelle
    const textEl = document.getElementById(`vol-val-${id}`);
    if (textEl) textEl.innerText = value + "%";

    // 2. GainNode (Ses Yükseltme) Ayarı
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

// HTML'den erişilebilmesi için window'a bağla
window.updatePeerVolume = updatePeerVolume;

// Kullanıcı kartına "İZLE" butonu ekler
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

    // Yayın biterse butonu kaldır
    if (stream.getVideoTracks().length > 0) {
        stream.getVideoTracks()[0].onended = () => removeVideoElement(id);
    }
}

// Yayın izleme butonunu ve modalı temizler
function removeVideoElement(id) {
    delete state.activeRemoteStreams[id];
    const card = document.getElementById(`user-${id}`); 
    if (card) { 
        const btn = card.querySelector('.stream-icon-btn'); 
        if (btn) btn.remove();
    }
    
    // dom.streamerNameLabel dom.js'de olmayabilir, manuel seçiyoruz:
    const streamerLabel = document.getElementById('streamerName');

    // Eğer modalda bu kişinin yayını açıksa kapat
    if (dom.streamModal && dom.streamModal.style.display !== 'none' && 
        streamerLabel && streamerLabel.getAttribute('data-id') === id) {
        
        dom.streamModal.style.display = 'none';
        if (dom.largeVideoPlayer) dom.largeVideoPlayer.srcObject = null;
    }
}

// Yayın izleme penceresini (Modal) açar
function openStreamModal(id) {
    if (!state.activeRemoteStreams[id]) return alert("Yayın yok");
    
    // Elementleri güvenli seç
    const streamerLabel = document.getElementById('streamerName');

    if (dom.largeVideoPlayer) dom.largeVideoPlayer.srcObject = state.activeRemoteStreams[id];
    
    if (streamerLabel) {
        streamerLabel.innerText = `${state.userNames[id] || 'Biri'} Ekranı`;
        streamerLabel.setAttribute('data-id', id);
    }
    
    if (dom.streamModal) dom.streamModal.style.display = 'flex';
}

// Kullanıcı kartını listeden kaldırır
function removeUserUI(id) {
    const el = document.getElementById(`user-${id}`);
    if (el) el.remove();
    
    // Audio elementini de temizle
    const audio = document.getElementById(`audio-${id}`);
    if (audio) audio.remove();
}

module.exports = {
    addUserUI,
    removeUserUI,
    updateMicStatusUI,
    addVideoElement,
    removeVideoElement,
    openStreamModal,
    updatePeerVolume
};