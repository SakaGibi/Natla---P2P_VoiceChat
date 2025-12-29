// socketService.js - WebSocket Management & Message Router
const state = require('../state/appState');
const dom = require('../ui/dom');

let socket = null;
let messageQueue = []; 

// --- CONNECTION LOGIC ---

// Connect to Server
function connect(url) {
    if (!url) {
        if (dom.roomPreviewDiv) dom.roomPreviewDiv.innerText = "Config hatası!";
        return;
    }

    // Check existing connection
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        return;
    }

    try {
        socket = new WebSocket(url);
    } catch (e) {
        console.error("❌ WebSocket Başlatma Hatası:", e.message);
        return;
    }

    socket.onopen = () => {
        // Update UI
        if (dom.btnConnect) {
            dom.btnConnect.disabled = false;
            dom.btnConnect.innerText = "Katıl";
        }
        
        // Send queued messages
        if (messageQueue.length > 0) {
            while (messageQueue.length > 0) {
                const msg = messageQueue.shift();
                send(msg);
            }
        }

        // Update Preview
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

// --- MESSAGE HANDLING ---

// Handle Incoming Messages
function handleMessage(data) {
    const peerService = require('../webrtc/peerService');
    const chatService = require('../chat/chatService');
    const userList = require('../ui/userList');
    const audioEngine = require('../audio/audioEngine');
    
    let roomPreview = null;
    try { roomPreview = require('../ui/roomPreview'); } catch(e){}

    // Handle Message Types
    switch (data.type) {
        case 'error':
            alert("Sunucu Hatası: " + data.message);
            break;

        case 'me': 
            state.myPeerId = data.id;
            break;

        case 'room-users': 
        case 'user-list':
            state.allUsers = data.users;
            
            if (roomPreview) roomPreview.updateRoomPreview();
            
            if (state.isConnected) {
                data.users.forEach(u => { 
                    if (u.id !== state.myPeerId) {
                        state.userNames[u.id] = u.name;
                        userList.addUserUI(u.id, u.name, true);
                        
                        // [FIX]: ID Comparison Initiation
                        if (shouldIInitiate(state.myPeerId, u.id)) {
                            peerService.createPeer(u.id, u.name, true);
                        }
                    }
                });
            }
            break;

        case 'user-joined':
            if (data.id === state.myPeerId) return;
            
            state.userNames[data.id] = data.name;
            userList.addUserUI(data.id, data.name, true);
            audioEngine.playSystemSound('join');
            
            // [FIX]: ID Comparison Initiation
            if (shouldIInitiate(state.myPeerId, data.id)) {
                peerService.createPeer(data.id, data.name, true);
            }
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

// --- HELPER FUNCTIONS ---

// [FIX]: Collision Avoidance Logic
function shouldIInitiate(myId, targetId) {
    if (!myId || !targetId) return false;
    return myId > targetId;
}

// Join Room Request
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

// Safe Send Function
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