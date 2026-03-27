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

    // Determine Display Name
    let displayName = sender || "Biri";

    if (type === 'sent') {
        displayName = "Ben";
    } else {
        displayName = displayName.replace(" (Ben)", "");
    }

    const div = document.createElement('div');
    div.className = `message ${type}`;

    // Helper to linkify URLs
    const linkify = (inputText) => {
        let replacedText, replacePattern1, replacePattern2, replacePattern3;

        //URLs starting with http://, https://, or ftp://
        replacePattern1 = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
        replacedText = inputText.replace(replacePattern1, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color: #6bb9f0; text-decoration: underline;">$1</a>');

        //URLs starting with "www." (without // before it, or it'd re-link the ones done above).
        replacePattern2 = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
        replacedText = replacedText.replace(replacePattern2, '$1<a href="http://$2" target="_blank" rel="noopener noreferrer" style="color: #6bb9f0; text-decoration: underline;">$2</a>');

        return replacedText;
    };

    const linkifiedText = linkify(text);

    // Create HTML structure
    div.innerHTML = `
        <span class="msg-sender">${displayName}</span>
        ${linkifiedText}
        <span class="msg-time">${time}</span>
    `;

    dom.chatHistory.appendChild(div);

    dom.chatHistory.scrollTop = dom.chatHistory.scrollHeight;
}

// Gets message from input, adds to local UI, and sends to all peers
function sendChat() {
    const text = dom.msgInput.value.trim();

    if (!text) return;

    // --- COMMANDS ---
    if (text.toLowerCase() === '/help') {
        const helpText = `
            <b>Komutlar:</b><br>
            - <b>/help:</b> Yardım<br>
            - <b>/clear:</b> Mesaj Geçmişini Temizle<br>
            <br>
            <b>Kısayollar:</b><br>
            - <b>Ctrl+Shift+M:</b> Mikrofonu Aç/Kapat<br>
            - <b>Ctrl+Shift+N:</b> Sağırlaştır/Duy<br>
            <br>
            <b>Soundpad Kullanımı:</b><br>
            - Sesi çalmak için butona <b>Sol Tıkla</b>.<br>
            - Ses efektini değiştirmek için <b>Sağ Tıkla</b>. Ses dosyasının, dosya konumunu değiştirince ses çalmaz, konumu düzeltmen gerekir.<br>
        `;
        addMessageToUI("Yorick", helpText, 'received');
        dom.msgInput.value = '';
        return;
    }
    if (text.toLowerCase() === '/clear') {
        const children = Array.from(dom.chatHistory.children);
        for (let i = 1; i < children.length; i++) { // start from 1 to skip welcome message and help message
            children[i].remove();
        }
        dom.msgInput.value = '';
        return;
    }

    if (!state.isConnected) return;

    const myName = state.userNames['me'] || "Ben";
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Add to own screen
    addMessageToUI(myName, text, 'sent', time);

    // 2. Prepare message payload
    const cleanSenderName = myName.replace(" (Ben)", "");

    const payload = {
        type: 'chat',
        sender: cleanSenderName,
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