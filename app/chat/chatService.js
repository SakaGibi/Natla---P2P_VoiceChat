// chatService.js - Chat & Messaging Management
const state = require('../state/appState');
const dom = require('../ui/dom');

// Adds a message to the UI (Chat History)
/**
 * @param {string} sender - sender name
 * @param {string} text - context of the message
 * @param {string} type - 'sent' or 'received'
 * @param {string} time - time string (optional)
 */
function addMessageToUI(sender, text, type, time = null) {
    // Get current time if not provided
    if (!time) {
        time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Clean "(Ben)" suffix from sender name
    const cleanName = sender ? sender.replace(" (Ben)", "") : "Biri";

    const div = document.createElement('div');
    div.className = `message ${type}`;
    
    // Create HTML structure
    div.innerHTML = `
        <span class="msg-sender">${cleanName}</span>
        ${text}
        <span class="msg-time">${time}</span>
    `;

    dom.chatHistory.appendChild(div);
    
    // Scroll to bottom on new message
    dom.chatHistory.scrollTop = dom.chatHistory.scrollHeight;
}

// Gets message from input, adds to local UI, and sends to all peers
function sendChat() {
    const text = dom.msgInput.value.trim();
    
    // Do nothing if empty or not connected
    if (!text || !state.isConnected) return;

    const myName = state.userNames['me'] || "Ben";
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Add to own screen
    addMessageToUI(myName, text, 'sent', time);

    // 2. Prepare message payload
    const payload = { 
        type: 'chat', 
        sender: myName, 
        text: text, 
        time: time 
    };

    // 3. Send to all connected peers
    const peerService = require('../webrtc/peerService');
    peerService.broadcast(payload);

    // 4. Clear input field
    dom.msgInput.value = '';
}

module.exports = {
    addMessageToUI,
    sendChat
};