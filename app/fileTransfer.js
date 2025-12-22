// fileTransfer.js

window.receivingFiles = {}; 
window.activeTransfers = {};
window.activeIncomingTransferIds = {}; // senderId -> tId eşleşmesi için

console.log("🛠️ fileTransfer.js yüklendi.");

// 1. İPTAL FONKSİYONU
window.cancelTransfer = function(tId, isSender = true) {
    if (window.activeTransfers[tId]) {
        window.activeTransfers[tId].cancelled = true; 
        if (isSender) {
            for (let pId in peers) {
                try { peers[pId].send(JSON.stringify({ type: 'file-cancel', payload: { tId: tId } })); } catch(e) {}
            }
        }
    }
    const card = document.getElementById(isSender ? `card-${tId}` : `card-rec-${tId}`);
    if (card) card.remove();
};

// 2. GİDEN DOSYA UI
// 1. GİDEN DOSYA UI (Gönderici - Yeşil Bar)
window.addFileSentUI = function(file, tId) {
    const div = document.createElement('div');
    div.id = `card-${tId}`;
    div.className = 'message sent file-message';
    // Görseldeki mavi kutu içine yerleşir
    div.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span style="font-size:12px; font-weight:bold;">Gönderiliyor...</span>
            <button onclick="cancelTransfer('${tId}', true)" style="background:none; border:none; color:#ff4757; cursor:pointer; font-size:16px; padding:0;">✖</button>
        </div>
        <div style="font-size:14px; margin-bottom:8px; word-break:break-all;"><strong>${file.name}</strong></div>
        
        <div class="meter-bg" style="background: rgba(0,0,0,0.3); height: 10px; border-radius: 5px; overflow: hidden; width: 100%;">
            <div id="prog-${tId}" class="meter-fill" style="width: 0%; height: 100%; background: #2ecc71; border-radius: 5px; transition: width 0.2s ease;"></div>
        </div>
    `;
    document.getElementById('chatHistory').appendChild(div);
    document.getElementById('chatHistory').scrollTop = document.getElementById('chatHistory').scrollHeight;
};

// 2. GELEN DOSYA UI (Alıcı - Mavi Bar)
function displayIncomingFile(senderId, fileName, fileSize, tId) {
    const div = document.createElement('div');
    div.id = `card-rec-${tId}`;
    div.className = 'message received file-message';
    // Görseldeki koyu gri kutu içine yerleşir
    div.innerHTML = `
        <div style="font-size:12px; color:#aaa; margin-bottom:8px;">${userNames[senderId] || "Biri"} gönderiyor...</div>
        <div style="font-size:14px; margin-bottom:8px; word-break:break-all;"><strong>${fileName}</strong></div>
        
        <div class="meter-bg" id="cont-${tId}" style="background: rgba(0,0,0,0.3); height: 100%; height: 10px; border-radius: 5px; overflow: hidden; width: 100%;">
            <div id="prog-${tId}" class="meter-fill" style="width: 0%; height: 100%; background: #3498db; border-radius: 5px; transition: width 0.2s ease;"></div>
        </div>
        
        <a id="link-${tId}" class="download-btn" style="display:none; margin-top:10px; text-decoration:none; color:#2ecc71; font-weight:bold; font-size:13px;">⬇ İndir (Hazır)</a>
    `;
    document.getElementById('chatHistory').appendChild(div);
    document.getElementById('chatHistory').scrollTop = document.getElementById('chatHistory').scrollHeight;
}

// 3. DOSYA GÖNDERME MOTORU
window.sendFile = function(peer, file, tId) {
    if (!peer || !peer.connected) return;
    window.activeTransfers[tId] = { cancelled: false };
    const chunkSize = 16 * 1024;
    let offset = 0;

    peer.send(JSON.stringify({ type: 'file-metadata', payload: { name: file.name, size: file.size, type: file.type, tId: tId } }));

    const readAndSend = () => {
        if (window.activeTransfers[tId]?.cancelled) return;
        if (peer._channel && peer._channel.bufferedAmount > 64 * 1024) {
            setTimeout(readAndSend, 50);
            return;
        }

        const slice = file.slice(offset, offset + chunkSize);
        const reader = new FileReader();
        reader.onload = (e) => {
            peer.send(e.target.result);
            offset += e.target.result.byteLength;
            const bar = document.getElementById(`prog-${tId}`);
            if (bar) bar.style.width = (offset / file.size * 100) + "%";
            if (offset < file.size) readAndSend();
            else peer.send(JSON.stringify({ type: 'file-end', payload: { tId: tId } }));
        };
        reader.readAsArrayBuffer(slice);
    };
    readAndSend();
};

// 4. GELEN VERİYİ İŞLEME
window.handleIncomingFileData = function(senderId, data) {
    let message = null;
    let isJson = false;

    try {
        if (typeof data === 'string') {
            message = JSON.parse(data);
            isJson = true;
        } else if (data instanceof Uint8Array && data[0] === 123) {
            message = JSON.parse(new TextDecoder().decode(data));
            isJson = true;
        }
    } catch (e) { isJson = false; }

    if (isJson && message?.type) {
        if (message.type === 'file-metadata') {
            const tId = message.payload.tId;
            window.activeIncomingTransferIds[senderId] = tId; // REHBERE EKLE
            window.receivingFiles[tId] = { metadata: message.payload, receivedChunks: [], receivedSize: 0 };
            displayIncomingFile(senderId, message.payload.name, message.payload.size, tId);
        } 
        else if (message.type === 'file-end') {
            const tId = message.payload.tId;
            const fData = window.receivingFiles[tId];
            if (fData) {
                const url = URL.createObjectURL(new Blob(fData.receivedChunks, { type: fData.metadata.type }));
                const link = document.getElementById(`link-${tId}`);
                if (link) { link.href = url; link.download = fData.metadata.name; link.style.display = 'block'; }
                const cont = document.getElementById(`cont-${tId}`);
                if (cont) cont.style.display = 'none';
                delete window.receivingFiles[tId];
                delete window.activeIncomingTransferIds[senderId];
            }
        }
        else if (message.type === 'file-cancel') {
            const tId = window.activeIncomingTransferIds[senderId];
            const card = document.getElementById(`card-rec-${tId}`);
            if (card) card.remove();
            delete window.receivingFiles[tId];
            delete window.activeIncomingTransferIds[senderId];
        }
    } else {
        // BINARY PARÇA: Rehberden tId'yi bul
        const tId = window.activeIncomingTransferIds[senderId];
        const fData = window.receivingFiles[tId];
        if (fData) {
            fData.receivedChunks.push(data);
            fData.receivedSize += data.byteLength;
            const bar = document.getElementById(`prog-${tId}`);
            if (bar) bar.style.width = (fData.receivedSize / fData.metadata.size * 100) + "%";
        }
    }
};

function displayIncomingFile(senderId, fileName, fileSize, tId) {
    const div = document.createElement('div');
    div.id = `card-rec-${tId}`;
    div.className = 'message received file-message';
    div.innerHTML = `
        <span class="msg-sender">${userNames[senderId] || "Biri"} gönderiyor:</span>
        <div class="file-info"><strong>${fileName}</strong></div>
        <div class="meter-bg" id="cont-${tId}" style="background:rgba(0,0,0,0.2); height:8px; border-radius:4px; margin-top:5px;">
            <div id="prog-${tId}" class="meter-fill" style="width: 0%; height: 100%; background: #3498db; border-radius: 4px; transition: width 0.1s;"></div>
        </div>
        <a id="link-${tId}" class="download-btn" style="display:none; margin-top:5px; text-decoration:none; color:#2ecc71; font-weight:bold;">⬇ İndir</a>
    `;
    document.getElementById('chatHistory').appendChild(div);
    document.getElementById('chatHistory').scrollTop = chatHistory.scrollHeight;
}