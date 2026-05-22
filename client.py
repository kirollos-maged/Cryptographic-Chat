import asyncio
import websockets
from encryption import encrypt_message, decrypt_message, encrypt_voice, decrypt_voice

HOST = 'ws://127.0.0.1:5555'

username = input("Enter your username: ")
method   = input("Encryption method (normal/aes/des/3des/base64/hex/url): ").strip().lower() or "aes"
secret   = input("Secret key (Enter = default): ").strip() or "default"

# NOTE: Voice messages recorded in the browser are automatically encrypted
# with the same method selected in the UI, using the same encrypt_voice() /
# decrypt_voice() helpers added to encryption.py.  The Python client only
# handles text; audio recording/playback is done in the browser frontend.

async def chat():
    async with websockets.connect(HOST) as websocket:
        print("Connected to server!")

        # إرسال الرسائل
        async def send_messages():
            while True:
                message = await asyncio.get_event_loop().run_in_executor(None, input)
                full_message = f"{username}: {message}"

                
                encrypted = encrypt_message(full_message, method, secret)

               
                payload = method + "|" + encrypted.decode('utf-8')
                await websocket.send(payload)

       
        async def receive_messages():
            async for raw in websocket:
                try:
                    if isinstance(raw, bytes):
                        raw = raw.decode('utf-8')

                    if "|" in raw:
                        recv_method, ciphertext = raw.split("|", 1)
                        decrypted = decrypt_message(ciphertext.encode('utf-8'), recv_method, secret)
                    else:
                        decrypted = raw  

                    print("\nReceived:", decrypted)

                except Exception as e:
                    print(f"[Error: {e}]")

        await asyncio.gather(
            send_messages(),
            receive_messages()
        )

asyncio.run(chat())