// dom.js - Centralized DOM Element References

const dom = {
    // Login Screen & Connection
    inputUsername: document.getElementById('username'),
    roomSelect: document.getElementById('roomSelect'),
    btnConnect: document.getElementById('btnConnect'),
    activeControls: document.getElementById('activeControls'),

    // Status & Notifications
    updateStatus: document.getElementById('updateStatus'),
    roomPreviewDiv: document.getElementById('roomPreview'),

    // Control Buttons
    btnToggleMic: document.getElementById('btnToggleMic'),
    btnToggleCam: document.getElementById('btnToggleCam'),
    btnToggleSound: document.getElementById('btnToggleSound'),
    btnDisconnect: document.getElementById('btnDisconnect'),
    btnShareScreen: document.getElementById('btnShareScreen'),

    // Chat Area
    chatHistory: document.getElementById('chatHistory'),
    msgInput: document.getElementById('msgInput'),
    btnSend: document.getElementById('btnSend'),
    btnAttach: document.getElementById('btnAttach'),
    fileInput: document.getElementById('fileInput'),

    // User List
    userList: document.getElementById('userList'),
    audioContainer: document.getElementById('audioContainer'),

    // Settings Modal
    btnSettings: document.getElementById('btnSettings'),
    passwordModal: document.getElementById('passwordModal'),
    btnCloseSettings: document.getElementById('btnCloseSettings'),
    serverInput: document.getElementById('serverInput'),
    keyInput: document.getElementById('keyInput'),
    btnSaveKey: document.getElementById('btnSaveKey'),
    btnResetSoundpad: document.getElementById('btnResetSoundpad'),

    // Device Selection
    micSelect: document.getElementById('micSelect'),
    speakerSelect: document.getElementById('speakerSelect'),

    // Volume Sliders
    micSlider: document.getElementById('micVolume'),
    masterSlider: document.getElementById('masterVolume'),

    // Update Buttons
    btnCheckUpdate: document.getElementById('btnCheckUpdate'),
    btnInstallUpdate: document.getElementById('btnInstallUpdate'),

    // Update Notification Bubble
    updateNotification: document.getElementById('updateNotification'),
    btnDismissUpdate: document.getElementById('btnDismissUpdate'),

    // Screen Share Modal
    streamModal: document.getElementById('streamModal'),
    btnCloseStream: document.getElementById('btnCloseStream'),
    largeVideoPlayer: document.getElementById('largeVideoPlayer'),
    streamerNameLabel: document.getElementById('streamerName'),

    // profile elemts
    avatarInput: document.getElementById('avatarInput'),
    myAvatarDisplay: document.getElementById('myAvatarDisplay'),

    // Soundpad Modal
    soundpadModal: document.getElementById('soundpadModal'),
    soundpadNameInput: document.getElementById('soundpadNameInput'),
    btnSoundpadSave: document.getElementById('btnSoundpadSave'),
    btnSoundpadCancel: document.getElementById('btnSoundpadCancel'),
    btnSelectSoundFile: document.getElementById('btnSelectSoundFile'),
    selectedFileName: document.getElementById('selectedFileName'),
};

module.exports = dom;