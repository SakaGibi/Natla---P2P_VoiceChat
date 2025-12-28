// socketService.js - WebSocket Yönetimi ve Mesaj Yönlendirici
const state = require('../state/appState');
const dom = require('../ui/dom');

let socket = null;
let messageQueue = []; 

/**
 * Sunucuya bağlantı başlatır
 */
function connect(url) {
    if (!url) {
        if (dom.roomPreviewDiv) dom.roomPreviewDiv.innerText = "Config hatası!";
        return;
    }

    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        return;
    }

    console.log("🔌 Sunucuya bağlanılıyor:", url);

    try {
        socket = new WebSocket(url);
    } catch (e) {
        console.error("❌ WebSocket Başlatma Hatası:", e.message);
        return;
    }

    socket.onopen = () => {
        console.log("✅ WebSocket Bağlantısı Kuruldu!");
        
        if (dom.btnConnect) {
            dom.btnConnect.disabled = false;
            dom.btnConnect.innerText = "Katıl";
        }
        
        // Kuyruktaki mesajları gönder
        if (messageQueue.length > 0) {
            console.log(`📨 Kuyrukta bekleyen ${messageQueue.length} mesaj gönderiliyor...`);
            while (messageQueue.length > 0) {
                const msg = messageQueue.shift();
                send(msg);
            }
        }

        try {
            const roomPreview = require('../ui/roomPreview');
            roomPreview.showTemporaryStatus("Sunucu bağlantısı aktif", "#2ecc71");
        } catch (e) {}
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
        if (dom.btnConnect) {
            dom.btnConnect.disabled = true;
            dom.btnConnect.innerText = "Bağlanılamıyor";
        }
    };

    socket.onclose = (event) => {
        console.warn(`🔌 Sunucu bağlantısı kesildi. Kod: ${event.code}`);
        state.isConnected = false;
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
    
    let roomPreview = null;
    try { roomPreview = require('../ui/roomPreview'); } catch(e){}

    switch (data.type) {
        case 'error':
            alert("Sunucu Hatası: " + data.message);
            break;

        case 'me': 
            state.myPeerId = data.id;
            console.log("🆔 Kimlik alındı:", data.id);
            break;

        case 'room-users': 
        case 'user-list':
            console.log("👥 Kullanıcı listesi alındı:", data.users);
            state.allUsers = data.users;
            
            if (roomPreview) roomPreview.updateRoomPreview();
            
            if (state.isConnected) {
                data.users.forEach(u => { 
                    if (u.id !== state.myPeerId) {
                        state.userNames[u.id] = u.name;
                        userList.addUserUI(u.id, u.name, true);
                        
                        // [ÇÖZÜM]: Sadece ID'si benimkinden küçük olanlara ben başlatırım.
                        // Büyük olanlar bana başlatacak, ben bekleyeceğim.
                        if (shouldIInitiate(state.myPeerId, u.id)) {
                            console.log(`🚀 Başlatıcı benim -> ${u.name}`);
                            peerService.createPeer(u.id, u.name, true);
                        } else {
                            console.log(`⏳ Bekliyorum -> ${u.name} başlatacak.`);
                        }
                    }
                });
            }
            break;

        case 'user-joined':
            if (data.id === state.myPeerId) return;
            console.log("👋 Yeni kullanıcı:", data.name);
            
            state.userNames[data.id] = data.name;
            userList.addUserUI(data.id, data.name, true);
            audioEngine.playSystemSound('join');
            
            // [ÇÖZÜM]: Burada da aynı ID kontrolü
            if (shouldIInitiate(state.myPeerId, data.id)) {
                console.log(`🚀 Başlatıcı benim -> ${data.name}`);
                peerService.createPeer(data.id, data.name, true);
            } else {
                console.log(`⏳ Bekliyorum -> ${data.name} başlatacak.`);
            }
            break;

        case 'user-left':
            console.log("🚪 Kullanıcı ayrıldı:", data.id);
            audioEngine.playSystemSound('leave');
            peerService.removePeer(data.id);
            break;

        case 'signal':
            // Sinyal geldiyse peerService.handleSignal devreye girer.
            // Eğer biz "Bekleyen" taraf isek, handleSignal bizim için peer'ı "Initiator: false" olarak yaratır.
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
            if (data.senderId !== state.myPeerId) {
                audioEngine.playLocalSound(data.effectName);
            }
            break;

        case 'video-stopped':
            userList.removeVideoElement(data.senderId);
            break;

        default:
            console.warn("⚠️ Bilinmeyen Mesaj Tipi:", data.type);
            break;
    }
}

/**
 * [ÇÖZÜM] Çarpışma Önleyici Mantık
 * İki ID'yi string olarak karşılaştırır.
 * Alfabetik/Sayısal olarak büyük olan taraf bağlantıyı başlatır.
 */
function shouldIInitiate(myId, targetId) {
    if (!myId || !targetId) return false;
    return myId > targetId;
}

/**
 * Odaya katılma isteği gönderir
 */
function joinRoom(name, room) {
    const accessKey = state.configData && state.configData.ACCESS_KEY 
                      ? state.configData.ACCESS_KEY.trim() 
                      : null;

    const payload = { 
        type: 'join', 
        name: name,
        room: room,
        key: accessKey 
    };
    
    send(payload);
}

/**
 * Güvenli veri gönderme fonksiyonu
 */
function send(payload) {
    if (!socket) {
        messageQueue.push(payload);
        return;
    }
    if (socket.readyState === WebSocket.CONNECTING) {
        messageQueue.push(payload);
        return;
    }
    if (socket.readyState === WebSocket.OPEN) {
        try {
            socket.send(JSON.stringify(payload));
        } catch (e) {
            console.error("Mesaj gönderme hatası:", e);
        }
    } else {
        console.error("❌ Soket kapalı, mesaj gönderilemedi:", payload.type);
    }
}

module.exports = {
    connect,
    joinRoom,
    send
};