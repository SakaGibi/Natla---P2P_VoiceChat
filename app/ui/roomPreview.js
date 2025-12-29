// roomPreview.js - Room Preview & Status Notifications
const state = require('../state/appState');
const dom = require('./dom');

/**
 * @param {string} message - message to display
 * @param {string} color - text color (default: green)
 */
// Shows temporary status messages that disappear after a delay
function showTemporaryStatus(message, color = "#4cd137") {
    if (!dom.roomPreviewDiv) return;
    
    // Clear existing timer if present
    if (state.statusTimeout) clearTimeout(state.statusTimeout);

    dom.roomPreviewDiv.innerText = message;
    dom.roomPreviewDiv.style.color = color;
    dom.roomPreviewDiv.style.fontWeight = "bold";

    // Revert to original room view after 3 seconds
    state.statusTimeout = setTimeout(() => {
        state.statusTimeout = null; 
        updateRoomPreview();
    }, 3000);
}

// Updates the UI with user count and names in the selected room
function updateRoomPreview() {
    if (!dom.roomSelect) return;
    
    // Skip update if a temporary status message is active
    if (state.statusTimeout) return;

    const selectedRoom = dom.roomSelect.value;
    const usersInRoom = state.allUsers.filter(u => u.room === selectedRoom);

    if (dom.roomPreviewDiv) {
        dom.roomPreviewDiv.style.fontWeight = "normal";
        
        if (state.isConnected) {
            // Connected: "📢 General (3 People)"
            dom.roomPreviewDiv.innerText = `${getRoomName(state.currentRoom)} (${usersInRoom.length} Kişi)`;
            dom.roomPreviewDiv.style.color = "var(--text-main)";
        } else {
            // Not connected: Show user names in selected room
            if (usersInRoom.length === 0) {
                dom.roomPreviewDiv.innerText = `${getRoomName(selectedRoom)}: Boş`;
            } else {
                const names = usersInRoom.map(u => u.name).join(", ");
                dom.roomPreviewDiv.innerText = `${getRoomName(selectedRoom)}: ${names}`;
            }
            dom.roomPreviewDiv.style.color = "#aaa";
        }
    }
}

/**
 * @param {string} val - Oda anahtarı (genel, oyun vb.)
 */
// Converts room IDs to user-friendly names and icons
function getRoomName(val) {
    if (val === 'genel') return "📢 Genel";
    if (val === 'oyun') return "🎮 Oyun";
    if (val === 'muzik') return "🎵 Müzik";
    if (val === 'ozel') return "🔒 Özel";
    return val;
}

// Add listener to update preview instantly when room selection changes
if (dom.roomSelect) {
    dom.roomSelect.addEventListener('change', () => {
        if (state.statusTimeout) { 
            clearTimeout(state.statusTimeout); 
            state.statusTimeout = null; 
        }
        updateRoomPreview();
    });
}

module.exports = {
    showTemporaryStatus,
    updateRoomPreview,
    getRoomName
};