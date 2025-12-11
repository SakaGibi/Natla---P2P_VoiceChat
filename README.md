# Electron P2P Voice Chat

Bu proje, WebRTC ve WebSocket kullanarak insanların sesli sohbet edebildiği basit bir masaüstü uygulamasıdır. Electron üzerinde çalışır ve yerel ağda ya da internet üzerinden düşük gecikmeli P2P (eşler arası) ses aktarımı yapar.

## Özellikler
- P2P ses iletimi (sunucuya yük binmez)
- Mikrofon ve hoparlör cihazlarını seçebilme
- Mikrofon hassasiyeti (gain) ve genel ses seviyesi ayarı
- Mikrofon kapatma (Mute) ve sesi tamamen susturma (Deafen)
- Karanlık / aydınlık tema desteği
- Bağlı kullanıcı listesi ve konuşma göstergesi (visualizer)
- Sade ve anlaşılır arayüz

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
