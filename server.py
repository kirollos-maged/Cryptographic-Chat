import asyncio
import websockets
import json
import http.server
import threading
import os

# Store connected clients: {websocket: username}
clients = {}

async def handler(websocket):
    # Wait for client to send username
    try:
        message = await websocket.recv()
        data = json.loads(message)
        if data.get("type") == "init":
            username = data.get("username", "Guest")
            clients[websocket] = username
            print(f"✅ {username} connected")
            await broadcast_users()
        else:
            await websocket.close()
            return
    except:
        await websocket.close()
        return

    try:
        async for message in websocket:
            data = json.loads(message)
            
            # Handle private message
            if data.get("type") == "private_message":
                target_username = data.get("target")
                sender_username = data.get("sender")
                encrypted_msg = data.get("message")
                encryption_method = data.get("encryption")
                
                # Find target client
                target_websocket = None
                for ws, name in clients.items():
                    if name == target_username:
                        target_websocket = ws
                        break
                
                # Send to target only
                if target_websocket:
                    await target_websocket.send(json.dumps({
                        "type": "private_message",
                        "sender": sender_username,
                        "message": encrypted_msg,
                        "encryption": encryption_method
                    }))
                else:
                    print(f"⚠️ User {target_username} not found")
                    
            # Handle private file chunks
            elif data.get("type") == "private_file":
                target_username = data.get("target")
                target_websocket = None
                for ws, name in clients.items():
                    if name == target_username:
                        target_websocket = ws
                        break
                if target_websocket:
                    await target_websocket.send(json.dumps(data))
                    
            # Handle private voice
            elif data.get("type") == "private_voice":
                target_username = data.get("target")
                target_websocket = None
                for ws, name in clients.items():
                    if name == target_username:
                        target_websocket = ws
                        break
                if target_websocket:
                    await target_websocket.send(json.dumps(data))
                    
            # Handle private signal (WebRTC calls)
            elif data.get("type") == "private_signal":
                target_username = data.get("target")
                target_websocket = None
                for ws, name in clients.items():
                    if name == target_username:
                        target_websocket = ws
                        break
                if target_websocket:
                    await target_websocket.send(json.dumps(data))
                    
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if websocket in clients:
            removed_user = clients[websocket]
            print(f"❌ {removed_user} disconnected")
            del clients[websocket]
            await broadcast_users()

async def broadcast_users():
    """Send list of connected users to all clients"""
    user_list = list(clients.values())
    user_list_message = json.dumps({
        "type": "users",
        "users": user_list
    })
    websockets_list = list(clients.keys())
    for client in websockets_list:
        try:
            await client.send(user_list_message)
        except:
            pass

def run_http():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass
    http.server.HTTPServer(("localhost", 8080), Quiet).serve_forever()

async def main():
    threading.Thread(target=run_http, daemon=True).start()
    async with websockets.serve(handler, "localhost", 5555, max_size=10*1024*1024):
        print("Server Running...")
        print("http://localhost:8080")
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())