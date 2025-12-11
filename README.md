🔊 Electron P2P Voice Chat

Bu proje, WebRTC ve WebSocket kullanarak insanların sesli sohbet edebildiği basit bir masaüstü uygulaması. Electron üzerinde çalışıyor ve yerel ağda ya da internet üzerinden düşük gecikmeli P2P (eşler arası) ses aktarımı yapıyor.

Özellikler

P2P ses iletimi (sunucuya yük binmez)

Mikrofon ve hoparlör cihazlarını seçebilme

Mikrofon hassasiyeti ve genel ses seviyesi ayarı

Mikrofon kapatma (Mute) ve sesi tamamen susturma (Deafen)

Karanlık / aydınlık tema

Bağlı kullanıcı listesini ve konuşma durumlarını (visualizer) gösterme

Günlük kullanım için sade ve anlaşılır bir sesli sohbet uygulaması.

Kullanılan Teknolojiler

Electron

HTML / CSS / JavaScript

Simple-Peer (WebRTC)

Python WebSocket sinyal sunucusu

Nasıl Çalıştırılır?

Gerekli paketleri kur:

cd app
npm install


Sinyal sunucusunu başlat:

python server/server.py


Uygulamayı çalıştır:

cd app
npm start


Kurulum dosyası (.exe) oluşturmak istersen:

npm run dist

Notlar

Farklı ağlardan bağlanmak için Ngrok kullanabilir veya sunucuyu bir bulut servisine koyabilirsin.

İçeride Google STUN sunucuları tanımlıdır, bu yüzden NAT arkasında da çalışır.

Bu projeyi yaparken hem ChatGPT hem Google Gemini’den yardım aldım. Tasarımı, yapıyı ve kodları onlarla birlikte şekillendirdim.
