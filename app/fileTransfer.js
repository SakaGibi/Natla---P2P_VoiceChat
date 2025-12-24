// fileTransfer.js - Tam Sürüm (Önizleme + Sesli Bildirim + Dinamik Durum + Akıllı İptal)

window.receivingFiles = {}; 
window.activeTransfers = {};
window.activeIncomingTransferIds = {}; 

// 1. İPTAL FONKSİYONU
window.cancelTransfer = function(tId, isSender = true) {
    console.log(`🚫 İptal tetiklendi. tId: ${tId}, Gönderen mi: ${isSender}`);

    if (window.activeTransfers[tId]) {
        window.activeTransfers[tId].cancelled = true; 
    }

    if (isSender) {
        // Diğer kullanıcılara iptal sinyali gönder
        const targetPeers = window.peers || {}; 
        for (let pId in targetPeers) {
            try { 
                targetPeers[pId].send(JSON.stringify({ type: 'file-cancel', payload: { tId: tId } })); 
            } catch(e) {}
        }
        
        // Gönderen ekranını güncelle
        const statusSpan = document.querySelector(`#card-${tId} .transfer-status`);
        const cancelBtn = document.getElementById(`cancel-btn-${tId}`);
        if (statusSpan) {
            statusSpan.innerText = "İPTAL EDİLDİ ❌";
            statusSpan.style.color = "#ff4757";
        }
        if (cancelBtn) cancelBtn.remove();
    }
};

// 2. GÖNDERİCİ UI (Yerel Önizlemeli)
window.addFileSentUI = function(file, tId) {
    const div = document.createElement('div');
    div.id = `card-${tId}`;
    div.className = 'message sent file-message';
    div.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span class="transfer-status" style="font-size:11px; font-weight:bold; opacity:0.8;">GÖNDERİLİYOR</span>
            <button id="cancel-btn-${tId}" onclick="cancelTransfer('${tId}', true)" style="background:none; border:none; color:#ff4757; cursor:pointer; font-size:16px; padding:0;">✖</button>
        </div>
        <div id="preview-cont-${tId}" class="preview-container" style="display:none;">
            <img id="preview-img-${tId}" class="preview-thumb">
        </div>
        <div style="font-size:14px; margin-bottom:5px; word-break:break-all;"><strong>${file.name}</strong></div>
        <div style="font-size:11px; opacity:0.7;">Boyut: ${(file.size / (1024 * 1024)).toFixed(2)} MB</div>
        <div class="meter-bg">
            <div id="prog-${tId}" class="meter-fill" style="width: 0%; background: #2ecc71;"></div>
        </div>
    `;
    document.getElementById('chatHistory').appendChild(div);
    
    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.getElementById(`preview-img-${tId}`);
            if (img) {
                img.src = e.target.result;
                document.getElementById(`preview-cont-${tId}`).style.display = 'block';
            }
        };
        reader.readAsDataURL(file);
    }
    document.getElementById('chatHistory').scrollTop = document.getElementById('chatHistory').scrollHeight;
};

// 3. GÖNDERME MOTORU (Bitiş Sesi Eklendi)
window.sendFile = function(peer, file, tId) {
    if (!peer || !peer.connected) return;
    if (!window.activeTransfers[tId]) window.activeTransfers[tId] = { cancelled: false };

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
            if (window.activeTransfers[tId]?.cancelled) return;
            peer.send(e.target.result);
            offset += e.target.result.byteLength;
            
            const bar = document.getElementById(`prog-${tId}`);
            if (bar) bar.style.width = (offset / file.size * 100) + "%";

            if (offset < file.size) {
                readAndSend();
            } else {
                // --- GÖNDERİM BİTTİ (GÖNDEREN TARAFINDA) ---
                peer.send(JSON.stringify({ type: 'file-end', payload: { tId: tId } }));
                
                // GÖNDERİCİ BİLDİRİM SESİ
                if (typeof notificationSound !== 'undefined' && !isDeafened) {
                    notificationSound.play().catch(e => {});
                }

                const statusSpan = document.querySelector(`#card-${tId} .transfer-status`);
                const cancelBtn = document.getElementById(`cancel-btn-${tId}`);
                if (statusSpan) {
                    statusSpan.innerText = "GÖNDERİLDİ ✅";
                    statusSpan.style.color = "#2ecc71";
                }
                if (cancelBtn) cancelBtn.remove();
            }
        };
        reader.readAsArrayBuffer(slice);
    };
    readAndSend();
};

// 4. ALICI VERİ İŞLEME (Alıcı Bildirim Sesi ve İptal Eden İsmi Eklendi)
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
            const info = message.payload;
            const tId = info.tId;
            window.activeIncomingTransferIds[senderId] = tId;
            window.receivingFiles[tId] = { metadata: info, receivedChunks: [], receivedSize: 0 };
            displayIncomingFile(senderId, info.name, info.size, tId, info.type);
        } 
        else if (message.type === 'file-end') {
            const tId = message.payload.tId;
            const fData = window.receivingFiles[tId];
            if (fData) {
                const blob = new Blob(fData.receivedChunks, { type: fData.metadata.type });
                const url = URL.createObjectURL(blob);
                
                if (fData.metadata.type?.startsWith('image/')) {
                    const imgEl = document.getElementById(`preview-img-rec-${tId}`);
                    const contEl = document.getElementById(`preview-cont-rec-${tId}`);
                    if (imgEl && contEl) {
                        imgEl.src = url;
                        contEl.style.display = 'block';
                    }
                }

                // --- ALIM BİTTİ (ALICI TARAFINDA) ---
                const link = document.getElementById(`link-${tId}`);
                if (link) { link.href = url; link.download = fData.metadata.name; link.style.display = 'block'; }
                const cont = document.getElementById(`cont-${tId}`);
                if (cont) cont.style.display = 'none';

                const statusDiv = document.querySelector(`#card-rec-${tId} .transfer-status`);
                if (statusDiv) {
                    statusDiv.innerText = "ALINDI ✅";
                    statusDiv.style.color = "#2ecc71";
                }

                // ALICI BİLDİRİM SESİ
                if (typeof notificationSound !== 'undefined' && !isDeafened) {
                    notificationSound.play().catch(e => {});
                }
                
                delete window.receivingFiles[tId];
                delete window.activeIncomingTransferIds[senderId];
                document.getElementById('chatHistory').scrollTop = document.getElementById('chatHistory').scrollHeight;
            }
        }
        else if (message.type === 'file-cancel') {
            // --- ALICI EKRANINDA İPTAL EDENİN İSMİNİ GÖSTER ---
            const tId = message.payload.tId;
            const statusDiv = document.querySelector(`#card-rec-${tId} .transfer-status`);
            const cont = document.getElementById(`cont-${tId}`);
            
            const senderName = (window.userNames && window.userNames[senderId]) || "Bir Kullanıcı";
            
            if (statusDiv) {
                statusDiv.innerText = `${senderName.toUpperCase()} İPTAL ETTİ ❌`;
                statusDiv.style.color = "#ff4757";
            }
            if (cont) cont.style.display = 'none'; 
            
            delete window.receivingFiles[tId];
            delete window.activeIncomingTransferIds[senderId];
        }
    } else {
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

// 5. ALICI UI KARTI
function displayIncomingFile(senderId, fileName, fileSize, tId, fileType) {
    const div = document.createElement('div');
    div.id = `card-rec-${tId}`;
    div.className = 'message received file-message';
    const name = (window.userNames && window.userNames[senderId]) || "Bir Kullanıcı";
    div.innerHTML = `
        <div class="transfer-status" style="font-size:11px; color:#aaa; margin-bottom:8px; font-weight:bold;">${name.toUpperCase()} GÖNDERİYOR</div>
        <div id="preview-cont-rec-${tId}" class="preview-container" style="display:none;">
            <img id="preview-img-rec-${tId}" class="preview-thumb">
        </div>
        <div style="font-size:14px; margin-bottom:5px; word-break:break-all;"><strong>${fileName}</strong></div>
        <div style="font-size:11px; opacity:0.7;">Boyut: ${(fileSize / (1024 * 1024)).toFixed(2)} MB</div>
        <div class="meter-bg" id="cont-${tId}">
            <div id="prog-${tId}" class="meter-fill" style="width: 0%; background: #3498db;"></div>
        </div>
        <a id="link-${tId}" class="download-btn" style="display:none; margin-top:10px; text-decoration:none; color:#2ecc71; font-weight:bold; font-size:13px;">⬇ İndir (Hazır)</a>
    `;
    document.getElementById('chatHistory').appendChild(div);
    document.getElementById('chatHistory').scrollTop = document.getElementById('chatHistory').scrollHeight;
}