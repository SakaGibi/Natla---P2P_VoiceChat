// app/ui/dom.js

const dom = {
    // Giriş Ekranı ve Bağlantı
    inputUsername: document.getElementById('username'),
    roomSelect: document.getElementById('roomSelect'),
    btnConnect: document.getElementById('btnConnect'),
    activeControls: document.getElementById('activeControls'),
    
    // Durum ve Bildirimler
    updateStatus: document.getElementById('updateStatus'),
    roomPreviewDiv: document.getElementById('roomPreview'),
    
    // Kontrol Butonları
    btnToggleMic: document.getElementById('btnToggleMic'),
    btnToggleSound: document.getElementById('btnToggleSound'),
    btnDisconnect: document.getElementById('btnDisconnect'),
    btnShareScreen: document.getElementById('btnShareScreen'),
    
    // Sohbet Alanı
    chatHistory: document.getElementById('chatHistory'),
    msgInput: document.getElementById('msgInput'),
    btnSend: document.getElementById('btnSend'),
    btnAttach: document.getElementById('btnAttach'),
    fileInput: document.getElementById('fileInput'),
    
    // Kullanıcı Listesi
    userList: document.getElementById('userList'), // userList.js burayı kullanıyor
    audioContainer: document.getElementById('audioContainer'),
    
    // Ayarlar Modalı
    btnSettings: document.getElementById('btnSettings'),
    passwordModal: document.getElementById('passwordModal'),
    btnCloseSettings: document.getElementById('btnCloseSettings'),
    serverInput: document.getElementById('serverInput'),
    keyInput: document.getElementById('keyInput'),
    btnSaveKey: document.getElementById('btnSaveKey'),
    
    // --- HATA BURADAYDI: Bu ikisi eksikti ---
    micSelect: document.getElementById('micSelect'),        
    speakerSelect: document.getElementById('speakerSelect'), 
    // ----------------------------------------

    // Sliderlar (HTML id'leri ile uyumlu)
    micSlider: document.getElementById('micVolume'),      
    masterSlider: document.getElementById('masterVolume'), 

    // Güncelleme Butonları
    btnCheckUpdate: document.getElementById('btnCheckUpdate'),
    btnInstallUpdate: document.getElementById('btnInstallUpdate'),

    // Ekran Paylaşımı Modal
    streamModal: document.getElementById('streamModal'),
    btnCloseStream: document.getElementById('btnCloseStream'),
    largeVideoPlayer: document.getElementById('largeVideoPlayer'),
    streamerNameLabel: document.getElementById('streamerName') // Bunu da ekledim garanti olsun
};

module.exports = dom;