const { app, BrowserWindow, session, desktopCapturer } = require('electron'); // GÜNCELLENDİ
const path = require('path');

const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = "info";
log.info('Uygulama başlıyor...');

function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 650,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true 
    },
    icon: path.join(__dirname, 'assets/gazmaliyim.ico')
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile('index.html');

  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
      callback({ video: sources[0], audio: 'loopback' });
    }).catch(err => {
      console.error("Ekran kaynakları alınamadı:", err);
    });
  });

  mainWindow.once('ready-to-show', () => {
    autoUpdater.checkForUpdatesAndNotify();
  });
}

autoUpdater.on('checking-for-update', () => {
  log.info('Güncelleme kontrol ediliyor...');
});
autoUpdater.on('update-available', (info) => {
  log.info('Güncelleme bulundu! İndiriliyor...');
});
autoUpdater.on('update-not-available', (info) => {
  log.info('Güncelleme yok.');
});
autoUpdater.on('error', (err) => {
  log.info('Güncelleme hatası: ' + err);
});
autoUpdater.on('download-progress', (progressObj) => {
  log.info('İndirme hızı: ' + progressObj.bytesPerSecond);
  log.info('İndirilen: ' + progressObj.percent + '%');
});
autoUpdater.on('update-downloaded', (info) => {
  log.info('İndirme tamamlandı. Uygulama kapatılıp güncellenecek.');
  autoUpdater.quitAndInstall();  
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});