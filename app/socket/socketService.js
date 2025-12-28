// socketService.js - WebSocket Yönetimi ve Mesaj Yönlendirici
const state = require('../state/appState');
const dom = require('../ui/dom');

let socket = null;

/**
 * Sunucuya bağlantı başlatır
 */
function connect(url) {
    if (!url) {
        if (dom.roomPreviewDiv) dom.roomPreviewDiv.innerText = "Config hatası!";
        return;
    }

    try {
        socket = new WebSocket(url);
    } catch (e) {
        console.error("❌ WebSocket Başlatma Hatası:", e.message);
        return;
    }

    socket.onopen = () => {
        dom.btnConnect.disabled = false;
        dom.btnConnect.innerText = "Katıl";
        
        const roomPreview = require('../ui/roomPreview');
        roomPreview.showTemporaryStatus("Sunucu bağlantısı aktif", "#2ecc71");
    };

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            handleMessage(data);
        } catch (e) {
            console.error("⚠️ Mesaj ayrıştırma hatası:", e);
        }
    };

    socket.onerror = (err) => {
        console.error("❌ WebSocket Hatası:", err);
        dom.btnConnect.disabled = true;
        dom.btnConnect.innerText = "Bağlanılamıyor";
    };

    socket.onclose = () => {
        // Eğer kullanıcı bağlıyken (odadayken) koparsa uyarı ver
        if (state.isConnected) {
            console.warn("🔌 Sunucu bağlantısı kesildi.");
            alert("Sunucu bağlantısı koptu!");
            // location.reload(); // Hata ayıklama için kapalı tutuyoruz, her şey düzelince açabilirsin
        }
    };
}

/**
 * Gelen mesaj tipine göre ilgili servisi tetikler
 */
function handleMessage(data) {
    const peerService = require('../webrtc/peerService');
    const chatService = require('../chat/chatService');
    const userList = require('../ui/userList');
    const audioEngine = require('../audio/audioEngine');
    const roomPreview = require('../ui/roomPreview');

    // Hata ayıklama için gelen her mesajı konsola bas

    switch (data.type) {
        case 'error':
            // Sunucunun gönderdiği yetkisiz erişim vb. hataları yakalar
            alert("Sunucu Hatası: " + data.message);
            console.error("🚫 Sunucu Erişimi Reddetti:", data.message);
            break;

        case 'me':
            state.myPeerId = data.id;
            break;

        case 'user-list':
            state.allUsers = data.users;
            roomPreview.updateRoomPreview();
            if (state.isConnected) {
                data.users.forEach(u => { 
                    if (u.id !== state.myPeerId) state.userNames[u.id] = u.name; 
                });
            }
            break;

        case 'user-joined':
            if (data.id === state.myPeerId) return;
            state.userNames[data.id] = data.name;
            userList.addUserUI(data.id, data.name, false);
            audioEngine.playSystemSound('join');
            // Yeni biri geldiğinde WebRTC bağlantısını başlat
            peerService.createPeer(data.id, data.name, true);
            break;

        case 'user-left':
            audioEngine.playSystemSound('leave');
            peerService.removePeer(data.id);
            break;

        case 'signal':
            peerService.handleSignal(data.senderId, data.signal);
            break;

        case 'chat':
            chatService.addMessageToUI(data.sender, data.text, 'received', data.time);
            audioEngine.playSystemSound('notification');
            break;

        case 'mic-status':
            userList.updateMicStatusUI(data.senderId, data.isMuted);
            break;

        case 'sound-effect':
            audioEngine.playLocalSound(data.effectName);
            break;

        case 'video-stopped':
            userList.removeVideoElement(data.senderId);
            break;
    }
}

/**
 * Odaya katılma isteği gönderir
 */
function joinRoom(name, room) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    
    // Anahtarı alırken varsa başındaki/sonundaki boşlukları temizle
    const accessKey = state.configData && state.configData.ACCESS_KEY 
                      ? state.configData.ACCESS_KEY.trim() 
                      : null;

    const payload = { 
        type: 'join', 
        name: name,
        room: room,
        key: accessKey 
    };
    
    console.log("📤 Sunucuya gönderilen Join paketi:", payload);
    socket.send(JSON.stringify(payload));
}

/**
 * Genel veri gönderme fonksiyonu (P2P dışı, sunucuya doğrudan mesaj)
 */
function send(payload) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(payload));
    } else {
        console.warn("⚠️ Mesaj gönderilemedi, soket kapalı.");
    }
}

module.exports = {
    connect,
    joinRoom,
    send
};