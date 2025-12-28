// peerService.js - WebRTC P2P Bağlantı Yönetimi
const SimplePeer = require('simple-peer');
const state = require('../state/appState');
const dom = require('../ui/dom');

/**
 * Yeni bir P2P bağlantısı oluşturur
 * @param {string} targetId - Bağlanılacak kullanıcının ID'si
 * @param {string} name - Kullanıcı adı
 * @param {boolean} initiator - Bağlantıyı başlatan taraf mı?
 */
function createPeer(targetId, name, initiator) {
    if (targetId === state.myPeerId || state.peers[targetId]) return;

    const socketService = require('../socket/socketService');
    const audioEngine = require('../audio/audioEngine');
    const userList = require('../ui/userList');
    const chatService = require('../chat/chatService');
    const fileTransfer = require('../files/fileTransfer');

    try {
        const peer = new SimplePeer({ 
            initiator: initiator, 
            stream: state.processedStream, 
            trickle: false, 
            config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] } 
        });

        // --- SİNYALLEŞME ---
        peer.on('signal', signal => { 
            socketService.send({ 
                type: 'signal', 
                targetId: targetId, 
                signal: signal 
            }); 
        });

        // --- MEDYA AKIŞI ---
        peer.on('stream', stream => {
            console.log(`📡 ${targetId} kullanıcısından akış alındı.`);
                
            if (stream.getVideoTracks().length > 0) {
                // Bu bir ekran paylaşımı akışıdır
                const userList = require('../ui/userList');
                userList.addVideoElement(targetId, stream);
            } else {
                // Bu bir mikrofon ses akışıdır
                const visualizer = require('../audio/visualizer');
                const userList = require('../ui/userList');
                const audioEngine = require('../audio/audioEngine');
                
                // 1. Sesi hoparlöre ver
                audioEngine.addAudioElement(targetId, stream); 
                
                // 2. UI kartını oluştur veya güncelle
                userList.addUserUI(targetId, state.userNames[targetId] || "Biri", true);
                
                // 3. Ses barını akışa bağla
                visualizer.attachVisualizer(stream, targetId); 
            }
        });

        // --- VERİ KANALI (Chat, Dosya, Durum) ---
        peer.on('data', data => { 
            try {
                const strData = new TextDecoder("utf-8").decode(data);
                const msg = JSON.parse(strData);
                
                // Gelen verinin tipine göre ilgili servise yönlendir
                if (msg.type === 'file-metadata' || msg.type === 'file-end' || msg.type === 'file-cancel') {
                    fileTransfer.handleIncomingFileData(targetId, data);
                } 
                else if (msg.type === 'chat') { 
                    chatService.addMessageToUI(msg.sender, msg.text, 'received', msg.time); 
                    audioEngine.playSystemSound('notification');
                } 
                else if (msg.type === 'mic-status') { 
                    userList.updateMicStatusUI(targetId, msg.isMuted); 
                } 
                else if (msg.type === 'sound-effect') { 
                    audioEngine.playLocalSound(msg.effectName); 
                } 
                else if (msg.type === 'video-stopped') { 
                    userList.removeVideoElement(targetId); 
                }
            } catch (e) { 
                // JSON değilse ham dosyadır
                fileTransfer.handleIncomingFileData(targetId, data); 
            }
        });

        peer.on('close', () => removePeer(targetId));
        peer.on('error', err => { console.error(`Peer ${targetId} hatası:`, err); }); 

        state.peers[targetId] = peer;
    } catch (e) { 
        console.error("Peer oluşturma hatası:", e); 
    }
}

/**
 * Gelen sinyal verisini mevcut peer'a iletir
 */
function handleSignal(senderId, signal) {
    if (!state.peers[senderId]) {
        const userName = state.userNames[senderId] || "Bilinmeyen";
        createPeer(senderId, userName, false);
    }
    if (state.peers[senderId]) { 
        state.peers[senderId].signal(signal); 
    }
}

/**
 * Peer bağlantısını ve ilgili UI öğelerini temizler
 */
function removePeer(id) {
    if (state.peers[id]) { 
        state.peers[id].destroy(); 
        delete state.peers[id]; 
    }
    
    if (state.peerGainNodes[id]) delete state.peerGainNodes[id];
    if (state.activeRemoteStreams[id]) delete state.activeRemoteStreams[id];
    
    const userList = require('../ui/userList');
    userList.removeUserUI(id);
}

/**
 * Tüm bağlı peer'lara veri gönderir
 */
function broadcast(payload) {
    const jsonPayload = JSON.stringify(payload);
    for (let id in state.peers) { 
        try { 
            state.peers[id].send(jsonPayload); 
        } catch (e) { 
            console.error(`Broadcast hatası (${id}):`, e);
        } 
    }
}

module.exports = {
    createPeer,
    handleSignal,
    removePeer,
    broadcast
};