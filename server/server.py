import asyncio
import websockets
import json
import uuid

# Sunucuya o an fiziksel olarak bağlı olan tüm soketler
connected_sockets = set()

# Aktif kullanıcı verileri: {websocket: {"id": ..., "name": ..., "room": ..., "avatar": ...}}
users = {}

# Güvenlik Anahtarı
ACCESS_KEY = "your_access_key_here"

async def broadcast_user_list():
    """
    Tüm sunucuya (giriş ekranındakiler dahil) güncel kullanıcı listesini gönderir.
    """
    if not connected_sockets:
        return

    # Her kullanıcının bilgilerini ve avatarını listeye ekle
    full_list = [
        {
            "id": u["id"], 
            "name": u["name"], 
            "room": u["room"], 
            "avatar": u.get("avatar")
        } 
        for u in users.values()
    ]
    
    message = json.dumps({"type": "user-list", "users": full_list})
    
    for ws in connected_sockets:
        try:
            await ws.send(message)
        except:
            pass

async def handler(websocket):
    # Yeni bir bağlantı geldiğinde listeye ekle
    connected_sockets.add(websocket)
    try:
        # Bağlanan kişiye anlık oda doluluk bilgilerini gönder
        await broadcast_user_list()
        
        async for message in websocket:
            data = json.loads(message)
            
            # --- ODAYA KATILMA ---
            if data['type'] == 'join':
                # Erişim anahtarı kontrolü
                if data.get('key') != ACCESS_KEY:
                    print(f"🚫 Yetkisiz erişim denemesi: {data.get('name')}")
                    await websocket.send(json.dumps({"type": "error", "message": "Geçersiz Erişim Anahtarı!"}))
                    await websocket.close()
                    return
                
                user_id = str(uuid.uuid4())
                target_room = data.get('room', 'genel')
                user_avatar = data.get('avatar') # İstemciden gelen Base64 avatar
                
                # Kullanıcıyı sistem kaydına al
                users[websocket] = {
                    "id": user_id,
                    "name": data['name'],
                    "room": target_room,
                    "avatar": user_avatar
                }
                
                print(f"✅ Giriş başarılı: {data['name']} -> Oda: {target_room}")
                
                # Kullanıcıya kendi ID'sini bildir
                await websocket.send(json.dumps({"type": "me", "id": user_id}))
                
                # Odadaki diğerlerine yeni birinin geldiğini duyur
                join_msg = json.dumps({
                    "type": "user-joined", 
                    "id": user_id, 
                    "name": data['name'],
                    "room": target_room,
                    "avatar": user_avatar
                })
                
                for ws, info in users.items():
                    if ws != websocket and info['room'] == target_room:
                        await ws.send(join_msg)
                
                # Listeyi herkese güncelle
                await broadcast_user_list()

            # --- DİĞER MESAJLAR (Signal, Chat, Mic vb.) ---
            elif websocket in users:
                sender_info = users[websocket]
                current_room = sender_info['room']
                sender_id = sender_info['id']
                
                # WebRTC Sinyalleşmesi (Hedef odaklı)
                if data['type'] == 'signal':
                    target_id = data.get('targetId')
                    target_ws = None
                    for ws, u in users.items():
                        if u["id"] == target_id:
                            target_ws = ws
                            break
                    
                    if target_ws and users[target_ws]['room'] == current_room:
                        data['senderId'] = sender_id
                        await target_ws.send(json.dumps(data))

                # Genel oda mesajları (Chat, sound-effect, mic-status vb.)
                else:
                    data['senderId'] = sender_id
                    out_msg = json.dumps(data)
                    
                    for ws, info in users.items():
                        if ws != websocket and info['room'] == current_room:
                            await ws.send(out_msg)

    except Exception as e:
        print(f"⚠️ Bağlantı hatası: {e}")
    finally:
        # Kullanıcı ayrıldığında temizlik yap
        connected_sockets.discard(websocket)
        if websocket in users:
            leaver = users.pop(websocket)
            leaver_room = leaver['room']
            
            # Odadakilere ayrılma bilgisini gönder
            leave_msg = json.dumps({"type": "user-left", "id": leaver["id"]})
            for ws, info in users.items():
                if info['room'] == leaver_room:
                    await ws.send(leave_msg)
            
            # Listeyi güncelle
            await broadcast_user_list()

async def main():
    # Tüm IP'lerden 8080 portuna gelen bağlantıları dinle
    async with websockets.serve(handler, "0.0.0.0", 8080):
        print("🔐 Natla Sunucusu (AWS) 8080 portunda aktif...")
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())