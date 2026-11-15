# 0xBP7 Chat

0xBP7 Chat is a local browser chat and cryptography demonstration built with
Python and vanilla JavaScript. It includes a WebSocket relay, a browser UI,
and a separate interactive encryption toolkit.

> **Security warning:** This project is for demonstration only. Its current
> encryption options and transport do not provide production-grade
> confidentiality, integrity, or authentication. Do not use it to protect
> sensitive conversations.

## What the project includes

- **Browser chat UI** — contact list, search, one-to-one message view, and
  per-message selection of cipher, encoding, hash, or plaintext.
- **Voice messages** — recorded in the browser with `MediaRecorder`; the
  selected message transform is applied before the payload is relayed. Plain
  voice is also an available option.
- **File sharing** — browser-side Base64 data URLs sent in chunks. The UI
  rejects files larger than 5 MB. File contents are **not encrypted** by the
  current implementation.
- **Audio/video call controls** — browser WebRTC media with call signaling
  relayed through the WebSocket server. Calls require browser microphone or
  camera permission and a working peer connection.
- **Interactive encryption toolkit** — `encryption.py` can be run separately
  to encrypt/decrypt text, encode/decode data, create hashes, and verify salted
  hashes.

## Available transforms

| Type | Options in the code |
|---|---|
| Symmetric ciphers | AES-128, DES, and 3DES, all using ECB mode with PKCS7 padding |
| Public-key demo | 2048-bit RSA-OAEP |
| Encodings | Base64, hexadecimal, and URL encoding |
| Hashes | MD5, SHA-256, SHA-512, salted SHA-256, and salted SHA-512 |
| Other | Plaintext (no encryption) |

Encodings are reversible representations, not encryption. Hashes are
one-way digests and cannot be decrypted.

### Security and interoperability limitations

- AES, DES, and 3DES use ECB mode, which reveals repeated patterns. DES and
  3DES are legacy algorithms; the code also pads or truncates user-provided
  keys rather than using a password-based key derivation function.
- The RSA message format includes the private key alongside the ciphertext.
  Anyone who can read that payload can recover its message; the RSA option
  must not be treated as confidential encryption.
- The browser uses unencrypted `ws://` transport. The server binds to
  `localhost` and relays messages, but the code does not provide authenticated
  identities or message integrity.
- File chunks are sent as Base64, not ciphertext. Voice messages can be sent
  as plaintext when the corresponding UI option is selected.
- `client.py` is a legacy text client and is **not compatible** with
  `server.py` as currently written: it sends a `method|ciphertext` payload,
  while the server expects an initial JSON `init` message and then JSON
  messages with a `type` field.
- Python and JavaScript implementations are separate; the repository does not
  include tests proving that their ciphertext formats interoperate. In
  particular, their 3DES key handling differs.

## Run the browser server

### Requirements

- Python 3.8 or later
- `pip`
- A modern browser; the page loads CryptoJS, Font Awesome, and fonts from
  external CDNs.

Install the Python dependencies:

```bash
python -m pip install websockets pycryptodome
```

Start the server:

```bash
python server.py
```

The script starts an HTTP server at `http://localhost:8080` for the frontend
and a WebSocket server at `ws://localhost:5555`. Open
[`http://localhost:8080`](http://localhost:8080) in your browser. The server
binds to localhost; it is not configured as a public deployment.

**Validation note:** In the current checkout, `python server.py` started both
listeners and the frontend returned HTTP 200, but an initial JSON WebSocket
handshake closed and the browser showed “Disconnected.” A working browser chat
could not be verified, so the features above describe the code, not a
successful end-to-end run. There is no dependency manifest or pinned
`websockets` version in this repository.

## Standalone encryption toolkit

Run the interactive toolkit:

```bash
python -X utf8 encryption.py
```

It presents options for symmetric encryption, RSA, encodings, hashes, and
salted-hash verification. This toolkit is separate from the browser server.

## Project files

| File | Purpose |
|---|---|
| `server.py` | Local HTTP frontend server and WebSocket message relay |
| `index.html` | Browser chat structure and external frontend dependencies |
| `script.js` | Browser messaging, voice, file-transfer, and WebRTC logic |
| `crypto.js` | Browser-side cipher, encoding, and hashing functions |
| `ui-extras.js` | Cipher controls, contact list, and conversation search |
| `style.css` | Browser UI styles |
| `encryption.py` | Python encryption and hashing toolkit |
| `client.py` | Legacy text client; protocol does not match `server.py` |
