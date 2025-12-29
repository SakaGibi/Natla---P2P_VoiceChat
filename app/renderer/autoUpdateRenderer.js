const { ipcRenderer } = require('electron');

function initAutoUpdateUI({
    btnCheckUpdate,
    btnInstallUpdate,
    updateStatus,
    btnConnect
}) {
    let currentVersion = "Sürüm yükleniyor...";

    // Get Initial Version
    ipcRenderer.invoke('get-app-version').then(v => {
        currentVersion = v;
        updateStatus.innerText = "Sürüm: " + v;
    });

    // --- CREATE DYNAMIC DOWNLOAD BUTTON ---
    const btnDownloadUpdate = document.createElement('button');
    btnDownloadUpdate.id = "btnDownloadUpdate";
    btnDownloadUpdate.innerText = "Güncellemeyi İndir";
    btnDownloadUpdate.style.cssText = `
        display: none;
        background: #27ae60;
        color: white;
        border: none;
        padding: 8px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        font-weight: bold;
    `;

    btnInstallUpdate.parentNode.insertBefore(btnDownloadUpdate, btnInstallUpdate);

    // --- EVENT LISTENERS ---

    // Check for Update
    btnCheckUpdate.addEventListener('click', () => {
        btnCheckUpdate.disabled = true;
        updateStatus.innerText = "Güncellemeler kontrol ediliyor...";
        ipcRenderer.send('check-for-update');
    });

    // Start Download
    btnDownloadUpdate.addEventListener('click', () => {
        btnDownloadUpdate.disabled = true;
        updateStatus.innerText = "İndirme başlatılıyor...";
        ipcRenderer.send('start-download');
    });

    // Install Update
    btnInstallUpdate.addEventListener('click', () => {
        btnInstallUpdate.disabled = true;
        updateStatus.innerText = "Uygulama kapatılıyor ve güncelleniyor...";
        ipcRenderer.send('install-update');
    });

    // --- IPC LISTENERS ---

    // Update Available
    ipcRenderer.on('update-available', (event, version) => {
        updateStatus.innerText = `Yeni sürüm bulundu! v${version}, İndirmek istiyor musunuz?`;
        updateStatus.style.color = "#3498db";
        btnCheckUpdate.style.display = 'none';
        btnDownloadUpdate.style.display = 'block';
    });

    // Update Not Available
    ipcRenderer.on('update-not-available', () => {
        updateStatus.innerText = `Uygulama güncel: v${currentVersion}`;
        updateStatus.style.color = "#888";
        btnCheckUpdate.disabled = false;
    });

    // Download Progress
    ipcRenderer.on('download-progress', (event, progressObj) => {
        const percent = Math.round(progressObj.percent);
        updateStatus.innerText = `İndiriliyor: %${percent}`;
        btnDownloadUpdate.style.display = 'none';
    });

    // Update Ready to Install
    ipcRenderer.on('update-ready', () => {
        updateStatus.innerText = "İndirme tamamlandı! Yüklemeye hazır.";
        updateStatus.style.color = "#2ecc71";
        btnDownloadUpdate.style.display = 'none';
        btnInstallUpdate.style.display = 'block';
    });

    // Update Error
    ipcRenderer.on('update-error', (event, error) => {
        updateStatus.innerText = "Hata: " + error;
        updateStatus.style.color = "#e74c3c";
        btnCheckUpdate.disabled = false;
    });
}

module.exports = { initAutoUpdateUI };