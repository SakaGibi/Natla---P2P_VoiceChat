# Electron P2P Voice Chat

# TR
Bu proje, WebRTC ve WebSocket kullanarak insanların sesli sohbet edebildiği basit bir masaüstü uygulamasıdır. Electron üzerinde çalışır ve yerel ağda ya da internet üzerinden düşük gecikmeli P2P (eşler arası) ses aktarımı yapar.

## Özellikler
- **Kalıcı Yazılı Sohbet (Text Chat):** Yan panelde sürekli açık duran metin sohbeti.
- **P2P Veri Kanalları:** Yazılı mesajlar sunucuya uğramadan, direkt eşler arasında (P2P) şifreli iletilir.
- **Oda Katılım Bildirimi:** Odaya yeni bir kullanıcı katıldığında sesli bildirim.
- P2P ses iletimi (sunucuya yük binmez)
- Mikrofon ve hoparlör cihazlarını seçebilme
- Mikrofon kapatma (Mute) ve sesi tamamen susturma (Deafen)
- Mikrofon hassasiyeti (gain) ve genel ses seviyesi ayarı
- Karanlık / aydınlık tema desteği
- Bağlı kullanıcı listesi ve konuşma göstergesi (visualizer)
- Sabit bölünmüş ekran (Sidebar + Chat Alanı) ile iyileştirilmiş arayüz.

## Kullanılan Teknolojiler
- Electron  
- HTML / CSS / JavaScript  
- Simple-Peer (WebRTC)  
- Python WebSocket sinyal sunucusu

## Nasıl Çalıştırılır

### 1. Gereksinimleri kur
```bash
cd app
npm install
```

### 2. Sinyal sunucusunu başlat
```bash
python server/server.py
```

### 3. Uygulamayı çalıştır
```bash
cd app
npm start
```

### 4. Kurulum dosyası (.exe) oluşturmak istersen
```bash
npm run dist
```

## Notlar
Bu uygulama farklı ağlar üzerinden de kullanılabilir. Bunun için sinyal sunucusunu bir bulut platformuna taşıyabilir veya Ngrok gibi araçlarla dış erişime açabilirsin.  
Ayrıca projede Google STUN sunucuları tanımlı olduğu için NAT arkasından bağlantılar da sorunsuz şekilde çalışır.

Bu projeyi yaparken ChatGPT ve Google Gemini'den çokça destek aldım. Kodların çoğunu birlikte düşünerek, bazılarını da doğrudan onların yardımıyla yazdım.


# EN
This project is a simple desktop application that allows people to communicate using voice chat via WebRTC and WebSocket. It runs on Electron and performs low-latency P2P (peer-to-peer) audio transmission over a local network or the internet.

## Features
- **Persistent Text Chat:** Permanently displayed text chat in a split-screen side panel.
- **P2P Data Channels:** Text messages are transmitted securely and directly between peers (P2P), bypassing the signaling server for message content.
- **Room Join Notification:** An audible alert plays when a new user joins the room.
- P2P audio transmission (zero load on the server for media streaming).
- Ability to select microphone and speaker devices.
- Microphone muting (Mute) and total audio suppression (Deafen).
- Microphone sensitivity (gain) and master volume control.
- Dark / light theme support.
- Connected user list and voice indicator (visualizer).
- Improved user interface with a permanent split-screen layout (Sidebar + Chat Area).

## Technologies Used
- Electron  
- HTML / CSS / JavaScript  
- Simple-Peer (WebRTC)  
- Python WebSocket signaling server

## How to Run

### 1. Install dependencies
```bash
cd app
npm install
```

### 2. Start the signaling server
```bash
python server/server.py
```

### 3. Run the application
```bash
cd app
npm start
```

### 4. If you want to create an installer (.exe)
```bash
npm run dist
```

## Notes
This application can also be used across different networks. To do this, you can deploy the signaling server to a cloud platform or expose it using tools like Ngrok. Additionally, since Google STUN servers are configured in the project, connections behind NAT work smoothly.

I received significant support from ChatGPT and Google Gemini while developing this project. We brainstormed most of the code logic together, and some parts were written directly with their assistance.
