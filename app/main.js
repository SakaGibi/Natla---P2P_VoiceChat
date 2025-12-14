const { app, BrowserWindow, session, desktopCapturer } = require('electron'); // GÜNCELLENDİ
const path = require('path');

function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
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
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});