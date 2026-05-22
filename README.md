 0xBP7 Chat 🔐
 
A private, end-to-end encrypted real-time chat application with support for multiple cipher algorithms, voice messages, file sharing, and WebRTC audio/video calls.
 
---
 
## Features
 
- **Private messaging** — 1-on-1 encrypted chat over WebSockets
- **Multiple encryption methods** — switch ciphers per message on the fly
- **Encrypted voice messages** — audio recorded and encrypted in the browser before sending
- **File sharing** — chunked file transfer between peers
- **WebRTC calls** — peer-to-peer audio and video calls
- **Python CLI client** — terminal-based alternative to the browser UI
---
 
## Encryption Support
 
| Category | Algorithms |
|---|---|
| Symmetric | AES-128 ECB, DES-56 ECB, 3DES-168 ECB |
| Asymmetric | RSA-2048 (PKCS1-OAEP) |
| Encoding | Base64, Hex, URL Encode |
| Hashing | MD5, SHA-256, SHA-512 |
| Salted Hashing | Salted SHA-256, Salted SHA-512 |
 
> Encryption is implemented in both Python (`encryption.py`) and JavaScript (`crypto.js`) with matching logic so the browser frontend and Python CLI are fully interoperable.
 
---
 
## Project Structure
 
```
├── server.py         # WebSocket + HTTP server (Python)
├── client.py         # Terminal chat client (Python)
├── encryption.py     # Encryption/decryption logic (Python)
├── index.html        # Browser UI
├── script.js         # WebSocket, messaging, voice, file, WebRTC logic
├── crypto.js         # Encryption/decryption logic (JavaScript)
├── ui-extras.js      # Cipher pill UI, contacts list, search
└── style.css         # Styles
```
 
---
 
## Getting Started
 
### Prerequisites
 
- Python 3.8+
- pip
### Install dependencies
 
```bash
pip install websockets pycryptodome
```
 
### Run the server
 
```bash
python server.py
```
 
This starts two things:
- **WebSocket server** on `ws://localhost:5555`
- **HTTP server** on `http://localhost:8080` (serves the frontend)
Open your browser at **http://localhost:8080** and enter a username to start chatting.
 
---
 
## Python CLI Client
 
To chat from the terminal instead of the browser:
 
```bash
python client.py
```
 
You will be prompted for:
- **Username** — your display name
- **Encryption method** — `aes` / `des` / `3des` / `base64` / `hex` / `url` (default: `aes`)
- **Secret key** — shared key for symmetric ciphers (default: `default`)
> The Python client handles text only. Voice recording and playback are browser-only features.
 
---
 
## Encryption Toolkit (standalone)
 
`encryption.py` also runs as an interactive CLI tool for encrypting, decrypting, hashing, and verifying salted hashes:
 
```bash
python encryption.py
```
 
---
 
## How It Works
 
1. Both parties open the app in a browser and enter a username.
2. The server broadcasts the list of connected users.
3. Clicking a contact opens a private chat session.
4. Messages are encrypted **in the browser** before being sent to the server — the server only relays the ciphertext and never sees plaintext.
5. The receiver decrypts the message using the chosen cipher and shared key.
Voice messages follow the same path: audio is captured, base64-encoded, encrypted with the selected cipher, and sent as a normal message payload.
 
---
 
## Security Notes
 
- Cipher mode is **ECB** for AES/DES/3DES — suitable for demonstration purposes. For production use, CBC or GCM with random IVs is strongly recommended.
- The RSA key pair is **ephemeral** — regenerated on every server/client restart.
- The server acts as a relay only and does not store messages.
- The secret key is shared out-of-band (both users must use the same key).
---
 
## Tech Stack
 
- **Backend** — Python, `websockets`, `pycryptodome`
- **Frontend** — Vanilla JS, HTML/CSS, CryptoJS 4.x, Web Crypto API, WebRTC
- **Transport** — WebSocket (port 5555), HTTP (port 8080)
