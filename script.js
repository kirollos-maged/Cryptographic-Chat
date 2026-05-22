// ============================================================
//  0xBP7 Chat — script.js (PRIVATE CHAT VERSION WITH FIXED VOICE)
// ============================================================

const socket = new WebSocket("ws://localhost:5555");
const sendBtn = document.getElementById("sendBtn");
const input = document.getElementById("messageInput");
const messages = document.getElementById("messages");
const encryptSelect = document.getElementById("encryptSelect");

// ── USERNAME ─────────────────────────────────────────────────
let username = sessionStorage.getItem("username");
if (!username) {
    username = prompt("Enter your name") || "Guest";
    username = username.trim() || "Guest";
    sessionStorage.setItem("username", username);
}
document.getElementById("usernameText").innerText = username;
document.getElementById("headerUsername").innerText = username;
document.getElementById("userAvatar").innerText = username.charAt(0).toUpperCase();
document.getElementById("headerAvatar").innerText = username.charAt(0).toUpperCase();

// ── Current chat partner ─────────────────────────────────────
let currentChatPartner = null;

// ── Send username to server when connection opens ───────────
socket.addEventListener("open", () => {
    const initMessage = JSON.stringify({
        type: "init",
        username: username
    });
    socket.send(initMessage);
});

// ── Variables ────────────────────────────────────────────────
let connectedUsers = [];

// ── WEBSOCKET ─────────────────────────────────────────────────
socket.onclose = () => addSystemMessage("🔴 Disconnected");
socket.onerror = () => addSystemMessage("⚠️ Connection error — run server.py first");

// ── SEND PRIVATE MESSAGE ─────────────────────────────────────
sendBtn.addEventListener("click", sendMessage);
input.addEventListener("keypress", e => { if (e.key === "Enter") sendMessage(); });

async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;
    
    if (!currentChatPartner) {
        addSystemMessage("❌ Please select a contact first!");
        return;
    }

    const encryption = encryptSelect.value;
    const secret = document.getElementById("secretKey")?.value || "default_secret";
    const encryptedText = await encrypt(text, encryption, secret);

    const messageData = {
        type: "private_message",
        sender: username,
        target: currentChatPartner,
        message: encryptedText,
        encryption: encryption
    };
    socket.send(JSON.stringify(messageData));
    
    addMessage(username, encryptedText, encryption, "sent");
    input.value = "";
}

// ── HELPERS FOR DISPLAY ───────────────────────────────────────
function getDisplayCipher(encryptedText, encryption) {
    if (encryption === "rsa" && encryptedText.startsWith("RSA_PRIV:")) {
        const first = encryptedText.indexOf(":");
        const second = encryptedText.indexOf(":", first + 1);
        return encryptedText.substring(second + 1);
    }
    return encryptedText;
}

// ── MESSAGE UI ────────────────────────────────────────────────
function addMessage(user, encryptedText, encryption, type) {
    const isReceived = type === "received";
    const displayCipher = getDisplayCipher(encryptedText, encryption);

    const div = document.createElement("div");
    div.className = "message " + type;

    if (isReceived) {
        div.innerHTML = `
            <div class="bubble">
                <h5>${escHtml(user)}</h5>
                <p class="msg-text encrypted-view">${escHtml(displayCipher)}</p>
                <span class="encryption-label">
                    <i class="fa-solid fa-lock" style="font-size:10px"></i>
                    SENT AS: ${encryption.toUpperCase()}
                </span>
                <div class="decrypt-box">
                    <select class="decrypt-select">
                        <option value="__raw__">🔒 Show Encrypted</option>
                        <option value="normal">📄 Plain Text (no decrypt)</option>
                        <option value="aes">🔑 AES</option>
                        <option value="des">🔑 DES</option>
                        <option value="3des">🔑 3DES</option>
                        <option value="rsa">🔑 RSA</option>
                        <option value="base64">📦 Base64</option>
                        <option value="hex">🔢 Hex</option>
                        <option value="url">🔗 URL Decode</option>
                        <option value="sha256">🔐 SHA-256</option>
                        <option value="sha512">🔐 SHA-512</option>
                        <option value="salted_sha256">🧂 Salted SHA-256</option>
                        <option value="salted_sha512">🧂 Salted SHA-512</option>
                    </select>
                    <button class="decrypt-btn">Apply</button>
                </div>
            </div>
        `;

        const msgText = div.querySelector(".msg-text");
        const decSelect = div.querySelector(".decrypt-select");
        const decBtn = div.querySelector(".decrypt-btn");

        const matchingOption = decSelect.querySelector(`option[value="${encryption}"]`);
        if (matchingOption) matchingOption.selected = true;

        (async () => {
            msgText.textContent = "⏳ Decrypting...";
            msgText.className = "msg-text";
            const secret = document.getElementById("secretKey")?.value || "default_secret";
            const result = await decrypt(encryptedText, encryption === "normal" ? "normal" : encryption, secret);
            msgText.textContent = result;
        })();

        decBtn.addEventListener("click", async () => {
            const chosen = decSelect.value;
            if (chosen === "__raw__") {
                msgText.textContent = displayCipher;
                msgText.className = "msg-text encrypted-view";
                return;
            }
            msgText.textContent = "⏳ Decrypting...";
            msgText.className = "msg-text";
            const secret = document.getElementById("secretKey")?.value || "default_secret";
            const result = await decrypt(encryptedText, chosen, secret);
            msgText.textContent = result;
        });

    } else {
        div.innerHTML = `
            <div class="bubble">
                <h5>${escHtml(user)}</h5>
                <p class="msg-text encrypted-view">${escHtml(displayCipher)}</p>
                <span class="encryption-label">
                    <i class="fa-solid fa-lock" style="font-size:10px"></i>
                    ${encryption.toUpperCase()}
                </span>
                <div class="decrypt-box">
                    <button class="view-btn active" data-view="enc">🔒 Encrypted</button>
                    <button class="view-btn" data-view="plain">🔓 Plain Text</button>
                </div>
            </div>
        `;

        const msgText = div.querySelector(".msg-text");
        const viewBtns = div.querySelectorAll(".view-btn");

        viewBtns.forEach(btn => {
            btn.addEventListener("click", async () => {
                viewBtns.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                if (btn.dataset.view === "enc") {
                    msgText.textContent = displayCipher;
                    msgText.className = "msg-text encrypted-view";
                } else {
                    msgText.textContent = "⏳ Decrypting...";
                    msgText.className = "msg-text";
                    const secret = document.getElementById("secretKey")?.value || "default_secret";
                    const result = await decrypt(encryptedText, encryption, secret);
                    msgText.textContent = result;
                }
            });
        });
    }

    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
}

// ── SYSTEM MESSAGE ────────────────────────────────────────────
function addSystemMessage(text) {
    const div = document.createElement("div");
    div.className = "system-message";
    div.innerHTML = `<span>${text}</span>`;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
}

function escHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── VOICE MESSAGE (FIXED) ─────────────────────────────────────
const micBtn = document.getElementById("micBtn");
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

// Check supported MIME types
const getSupportedMimeType = () => {
    const types = [
        'audio/webm',
        'audio/mp4',
        'audio/ogg',
        'audio/wav'
    ];
    for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) {
            console.log("Using MIME type:", type);
            return type;
        }
    }
    return '';
};

micBtn.addEventListener("click", async () => {
    if (!currentChatPartner) {
        addSystemMessage("❌ Select a contact first!");
        return;
    }

    if (!isRecording) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mimeType = getSupportedMimeType();
            const options = mimeType ? { mimeType: mimeType } : {};
            mediaRecorder = new MediaRecorder(stream, options);
            audioChunks = [];

            mediaRecorder.ondataavailable = e => {
                if (e.data.size > 0) audioChunks.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                stream.getTracks().forEach(t => t.stop());
                
                // Create blob from recorded chunks
                const mimeType = getSupportedMimeType();
                const blob = new Blob(audioChunks, { type: mimeType || 'audio/webm' });
                console.log("Audio blob size:", blob.size, "type:", blob.type);
                
                if (blob.size === 0) {
                    addSystemMessage("❌ No audio recorded!");
                    return;
                }
                
                // Convert blob to base64
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = async () => {
                    // Remove data:audio/xxx;base64, prefix
                    let base64 = reader.result;
                    const commaIndex = base64.indexOf(',');
                    if (commaIndex !== -1) {
                        base64 = base64.substring(commaIndex + 1);
                    }
                    
                    const voiceEncMethod = encryptSelect.value;
                    const encryptedVoice = await encrypt(base64, voiceEncMethod);

                    const voiceData = {
                        type: "private_voice",
                        sender: username,
                        target: currentChatPartner,
                        message: encryptedVoice,
                        voiceEncryption: voiceEncMethod
                    };
                    socket.send(JSON.stringify(voiceData));
                    addVoiceMessage(username, encryptedVoice, voiceEncMethod, "sent", base64);
                };
            };

            mediaRecorder.start(100); // Collect data in 100ms chunks
            isRecording = true;
            micBtn.style.background = "#ef4444";
            micBtn.innerHTML = '<i class="fa-solid fa-stop"></i>';
            addSystemMessage("🔴 Recording... tap again to send");
        } catch (err) {
            console.error("Microphone error:", err);
            addSystemMessage("❌ Microphone access denied: " + err.message);
        }
    } else {
        // Stop recording
        if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop();
        }
        isRecording = false;
        micBtn.style.background = "";
        micBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>';
        addSystemMessage("✅ Voice message sent");
    }
});

function addVoiceMessage(user, encryptedAudio, voiceEnc, type, plainB64 = null) {
    const div = document.createElement("div");
    div.className = "message " + type;
    const encLabel = (voiceEnc && voiceEnc !== "normal") ? voiceEnc.toUpperCase() : "NONE";
    const lockIcon = (voiceEnc && voiceEnc !== "normal")
        ? `<i class="fa-solid fa-lock" style="font-size:10px"></i>`
        : `<i class="fa-solid fa-lock-open" style="font-size:10px; opacity:.5"></i>`;

    div.innerHTML = `
        <div class="bubble voice-bubble">
            <h5>${escHtml(user)}</h5>
            <div class="voice-decrypt-status" style="font-size:12px; color:var(--green,#25d366); margin-bottom:6px; min-height:16px;">
                ${(voiceEnc && voiceEnc !== "normal") ? "⏳ Decrypting voice..." : ""}
            </div>
            <div class="voice-player" style="display:none;">
                <i class="fa-solid fa-microphone voice-icon"></i>
                <audio controls style="flex:1; min-width:0; height:36px;"></audio>
            </div>
            <details class="voice-cipher-details" style="margin-top:6px;">
                <summary style="font-size:11px; cursor:pointer; opacity:.6;">
                    🔒 Show encrypted payload
                </summary>
                <p style="font-size:10px; word-break:break-all; color:#aaa; margin-top:4px; max-height:60px; overflow:auto;">
                    ${escHtml(encryptedAudio.slice(0, 300))}${encryptedAudio.length > 300 ? "…" : ""}
                </p>
            </details>
            <span class="encryption-label" style="margin-top:8px">
                ${lockIcon}
                VOICE • ${encLabel}
            </span>
        </div>
    `;

    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;

    const statusEl = div.querySelector(".voice-decrypt-status");
    const playerEl = div.querySelector(".voice-player");
    const audioEl = div.querySelector("audio");

    function attachAudio(base64Data) {
        try {
            // Decode base64 to binary
            let binaryString = atob(base64Data);
            let bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            // Determine MIME type
            let mimeType = 'audio/webm';
            if (bytes.length > 4) {
                // Check for WAV header (RIFF)
                if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
                    mimeType = 'audio/wav';
                }
                // Check for OGG header
                else if (bytes[0] === 0x4F && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) {
                    mimeType = 'audio/ogg';
                }
                // Check for MP4/M4A header
                else if (bytes[0] === 0x66 && bytes[1] === 0x74 && bytes[2] === 0x79 && bytes[3] === 0x70) {
                    mimeType = 'audio/mp4';
                }
            }
            
            const blob = new Blob([bytes], { type: mimeType });
            const audioUrl = URL.createObjectURL(blob);
            
            audioEl.src = audioUrl;
            audioEl.controls = true;
            playerEl.style.display = "flex";
            statusEl.textContent = "";
            
            audioEl.onloadeddata = () => {
                console.log("Audio loaded successfully, duration:", audioEl.duration);
            };
            
            audioEl.onerror = (e) => {
                console.error("Audio element error:", e);
                statusEl.textContent = "❌ Audio format not supported";
                statusEl.style.color = "#ef4444";
            };
            
        } catch (e) {
            console.error("Audio attachment error:", e);
            statusEl.textContent = "❌ Audio error: " + e.message;
            statusEl.style.color = "#ef4444";
        }
    }

    if (plainB64) {
        attachAudio(plainB64);
        return;
    }

    (async () => {
        try {
            const secret = document.getElementById("secretKey")?.value || "default_secret";
            const rawB64 = await decrypt(encryptedAudio, voiceEnc || "normal", secret);
            if (!rawB64 || rawB64.startsWith("❌") || rawB64.startsWith("⚠️")) {
                statusEl.textContent = rawB64 || "❌ Decryption failed";
                statusEl.style.color = "#ef4444";
                return;
            }
            attachAudio(rawB64);
        } catch (e) {
            console.error("Decryption error:", e);
            statusEl.textContent = "❌ Decrypt error: " + e.message;
            statusEl.style.color = "#ef4444";
        }
    })();
}

// ── EMOJI PICKER ──────────────────────────────────────────────
const emojis = [
    "😀", "😁", "😂", "🤣", "😊", "😍", "🥰", "😎", "🤩", "🥳",
    "😢", "😭", "😡", "🤬", "😱", "😨", "🤔", "🤗", "😴", "🤒",
    "👍", "👎", "👏", "🙌", "🤝", "✌️", "🤞", "💪", "🫶", "❤️",
    "🔥", "⭐", "💯", "🎉", "🎊", "🎁", "🏆", "💎", "🚀", "💻",
    "😺", "🐶", "🦊", "🐸", "🦁", "🐼", "🐧", "🦋", "🌈", "🌟",
    "🍕", "🍔", "🍣", "🍜", "🎂", "🍦", "☕", "🍵", "🥤", "🍺",
    "⚽", "🏀", "🎮", "🎯", "🎲", "🃏", "🎸", "🎹", "🎤", "🎬",
    "🌍", "🌙", "☀️", "⛅", "🌊", "🏔️", "🌺", "🌸", "🌻", "🍀"
];

const emojiPicker = document.createElement("div");
emojiPicker.id = "emojiPicker";
emojiPicker.innerHTML = `
    <div class="emoji-grid">
        ${emojis.map(e => `<button class="emoji-item">${e}</button>`).join("")}
    </div>
`;
document.querySelector(".chat-input").appendChild(emojiPicker);

const emojiBtn = document.querySelector(".icon-btn:nth-child(2)");
emojiBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    emojiPicker.classList.toggle("show");
});

emojiPicker.querySelectorAll(".emoji-item").forEach(btn => {
    btn.addEventListener("click", (e) => {
        e.stopPropagation();
        input.value += btn.textContent;
        input.focus();
        emojiPicker.classList.remove("show");
    });
});

document.addEventListener("click", (e) => {
    if (!emojiPicker.contains(e.target) && e.target !== emojiBtn) {
        emojiPicker.classList.remove("show");
    }
});

// ── ATTACHMENT (PRIVATE) ─────────────────────────────────────
const fileInput = document.createElement("input");
fileInput.type = "file";
fileInput.accept = "image/*,video/*,.pdf,.doc,.docx,.txt,.zip";
fileInput.style.display = "none";
document.body.appendChild(fileInput);

const attachBtn = document.querySelector(".icon-btn:nth-child(1)");
attachBtn.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file) return;
    fileInput.value = "";

    if (!currentChatPartner) {
        addSystemMessage("❌ Select a contact first!");
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        addSystemMessage("❌ File too large — max 5 MB");
        return;
    }

    addSystemMessage("📤 Sending " + file.name + " to " + currentChatPartner + "...");

    const reader = new FileReader();
    reader.onload = (e) => {
        const base64 = e.target.result;
        const CHUNK = 60000;
        const total = Math.ceil(base64.length / CHUNK);
        const msgId = Date.now().toString(36);

        for (let i = 0; i < total; i++) {
            const fileData = {
                type: "private_file",
                sender: username,
                target: currentChatPartner,
                encryption: "__file_chunk__",
                msgId: msgId,
                chunk: base64.slice(i * CHUNK, (i + 1) * CHUNK),
                index: i,
                total: total,
                fileName: file.name,
                fileType: file.type
            };
            socket.send(JSON.stringify(fileData));
        }
        addFileMessage(username, base64, file.name, file.type, "sent");
    };
    reader.readAsDataURL(file);
});

// ── CHUNK REASSEMBLY ─────────────────────────────────────────
const _pendingChunks = {};

function handleChunk(data) {
    const { msgId, chunk, index, total, fileName, fileType, sender } = data;

    if (!_pendingChunks[msgId]) {
        _pendingChunks[msgId] = { chunks: new Array(total), total, fileName, fileType, sender };
    }

    _pendingChunks[msgId].chunks[index] = chunk;

    const received = _pendingChunks[msgId].chunks.filter(c => c !== undefined).length;
    if (received === total) {
        const fullBase64 = _pendingChunks[msgId].chunks.join("");
        addFileMessage(sender, fullBase64, fileName, fileType, "received");
        delete _pendingChunks[msgId];
    }
}

function addFileMessage(user, base64, fileName, fileType, type) {
    const div = document.createElement("div");
    div.className = "message " + type;

    const isImage = fileType && fileType.startsWith("image/");

    if (isImage) {
        div.innerHTML = `
            <div class="bubble">
                <h5>${escHtml(user)}</h5>
                <img src="${base64}" alt="${escHtml(fileName)}" class="msg-image"
                     onclick="window.open(this.src,'_blank')">
                <span class="encryption-label">
                    <i class="fa-solid fa-image" style="font-size:10px"></i>
                    IMAGE • ${escHtml(fileName)}
                </span>
            </div>
        `;
    } else {
        div.innerHTML = `
            <div class="bubble">
                <h5>${escHtml(user)}</h5>
                <div class="file-bubble">
                    <i class="fa-solid fa-file file-icon"></i>
                    <div class="file-info">
                        <span class="file-name">${escHtml(fileName)}</span>
                        <span class="file-size">${fileType || "File"}</span>
                    </div>
                    <a href="${base64}" download="${escHtml(fileName)}" class="file-dl-btn">
                        <i class="fa-solid fa-download"></i>
                    </a>
                </div>
            </div>
        `;
    }

    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
}

// ── WEBSOCKET MESSAGE HANDLER (Main) ─────────────────────────
socket.onmessage = (event) => {
    try {
        const data = JSON.parse(event.data);
        
        if (data.type === "users") {
            connectedUsers = data.users.filter(u => u !== username);
            if (window.updateContactsList) {
                window.updateContactsList(connectedUsers);
            }
            if (connectedUsers.length > 0) {
                addSystemMessage(`👥 Online: ${connectedUsers.join(", ")}`);
            }
            return;
        }
        
        if (data.type === "private_message") {
            addMessage(data.sender, data.message, data.encryption, "received");
        }
        else if (data.type === "private_voice") {
            addVoiceMessage(data.sender, data.message, data.voiceEncryption || "normal", "received");
        }
        else if (data.type === "private_signal") {
            if (window.handleSignal) window.handleSignal(data);
        }
        else if (data.type === "private_file") {
            if (data.encryption === "__file_chunk__") {
                handleChunk(data);
            }
        }
    } catch (e) {
        console.log("Parse error:", e);
    }
};

// ── WEBSOCKET CALL FUNCTIONS (PRIVATE) ───────────────────────
const callModal = document.createElement("div");
callModal.id = "callModal";
callModal.innerHTML = `
    <div class="call-overlay">
        <div class="call-box">
            <div id="incomingBanner" style="display:none; text-align:center; margin-bottom:8px">
                <div class="call-avatar" id="callAvatar">?</div>
                <div class="call-name" id="callName">User</div>
                <div class="call-status" id="callStatus" style="color:#27d366">📞 Incoming call...</div>
                <div style="display:flex; gap:16px; margin-top:16px; justify-content:center">
                    <button class="call-ctrl hangup" id="rejectBtn" title="Reject">
                        <i class="fa-solid fa-phone-slash"></i>
                    </button>
                    <button class="call-ctrl" id="acceptBtn" title="Accept"
                            style="background:#27d366">
                        <i class="fa-solid fa-phone"></i>
                    </button>
                </div>
            </div>
            <div id="activeBanner" style="display:none; text-align:center; width:100%">
                <div class="call-avatar" id="activeAvatar">?</div>
                <div class="call-name" id="activeName">User</div>
                <div class="call-status" id="activeStatus">🟢 Connected</div>
                <div id="videoWrap" style="display:none; position:relative; margin:12px 0">
                    <video id="remoteVideo" autoplay playsinline
                           style="width:100%; max-height:200px; border-radius:14px; background:#000; display:block"></video>
                    <video id="localVideo" autoplay muted playsinline
                           style="position:absolute; bottom:8px; right:8px; width:90px;
                                  border-radius:10px; background:#000"></video>
                </div>
                <div class="call-timer" id="callTimer">00:00</div>
                <div class="call-controls" style="margin-top:12px">
                    <button class="call-ctrl mute" id="muteBtn"><i class="fa-solid fa-microphone"></i></button>
                    <button class="call-ctrl hangup" id="hangupBtn"><i class="fa-solid fa-phone-slash"></i></button>
                    <button class="call-ctrl cam" id="camBtn" style="display:none"><i class="fa-solid fa-video"></i></button>
                </div>
            </div>
        </div>
    </div>
`;
document.querySelector(".app").appendChild(callModal);

let pc = null;
let callStream = null;
let callInterval = null;
let callSeconds = 0;
let isMuted = false;
let isCallActive = false;
let callType = "audio";

const ICE_SERVERS = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

function sendPrivateSignal(payload) {
    const signalData = {
        type: "private_signal",
        sender: username,
        target: currentChatPartner,
        ...payload
    };
    socket.send(JSON.stringify(signalData));
}

function showCallTimer() {
    callSeconds = 0;
    document.getElementById("callTimer").style.display = "block";
    callInterval = setInterval(() => {
        callSeconds++;
        const m = String(Math.floor(callSeconds / 60)).padStart(2, "0");
        const s = String(callSeconds % 60).padStart(2, "0");
        document.getElementById("callTimer").textContent = `${m}:${s}`;
    }, 1000);
}

function formatSeconds(n) {
    return String(Math.floor(n / 60)).padStart(2, "0") + ":" + String(n % 60).padStart(2, "0");
}

function updateMuteBtn() {
    const btn = document.getElementById("muteBtn");
    btn.innerHTML = isMuted ? '<i class="fa-solid fa-microphone-slash"></i>'
        : '<i class="fa-solid fa-microphone"></i>';
    btn.style.background = isMuted ? "#ef4444" : "";
}

function showModal(panel) {
    callModal.style.display = panel === "hide" ? "none" : "flex";
    document.getElementById("incomingBanner").style.display = panel === "incoming" ? "block" : "none";
    document.getElementById("activeBanner").style.display = panel === "active" ? "block" : "none";
}

async function createPC() {
    pc = new RTCPeerConnection(ICE_SERVERS);
    pc.onicecandidate = ({ candidate }) => {
        if (candidate) sendPrivateSignal({ signal: "ice", candidate });
    };
    pc.ontrack = (e) => {
        const remoteVideo = document.getElementById("remoteVideo");
        if (!remoteVideo.srcObject) remoteVideo.srcObject = new MediaStream();
        remoteVideo.srcObject.addTrack(e.track);
        if (e.track.kind === "video") {
            document.getElementById("videoWrap").style.display = "block";
        }
    };
    callStream.getTracks().forEach(t => pc.addTrack(t, callStream));
}

async function startCall(type) {
    if (isCallActive) return;
    if (!currentChatPartner) {
        addSystemMessage("❌ Select a contact first!");
        return;
    }
    
    callType = type;
    const constraints = type === "video" ? { audio: true, video: true } : { audio: true };
    try {
        callStream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
        addSystemMessage("❌ Microphone/Camera access denied: " + err.message);
        return;
    }

    if (type === "video") {
        document.getElementById("localVideo").srcObject = callStream;
        document.getElementById("camBtn").style.display = "flex";
    }

    sendPrivateSignal({ signal: "call-offer-preview", callType: type });
    addSystemMessage(type === "video" ? "📹 Calling... (video)" : "📞 Calling...");

    pc = new RTCPeerConnection(ICE_SERVERS);
    pc.onicecandidate = ({ candidate }) => {
        if (candidate) sendPrivateSignal({ signal: "ice", candidate });
    };
    pc.ontrack = (e) => {
        const rv = document.getElementById("remoteVideo");
        if (!rv.srcObject) rv.srcObject = new MediaStream();
        rv.srcObject.addTrack(e.track);
        if (e.track.kind === "video") document.getElementById("videoWrap").style.display = "block";
    };
    callStream.getTracks().forEach(t => pc.addTrack(t, callStream));

    isCallActive = true;
    document.getElementById("activeAvatar").textContent = username.charAt(0).toUpperCase();
    document.getElementById("activeName").textContent = username;
    document.getElementById("activeStatus").textContent = "⏳ Ringing...";
    showModal("active");
}

function endCall(notify = true) {
    if (notify && currentChatPartner) sendPrivateSignal({ signal: "hangup" });
    if (pc) { pc.close(); pc = null; }
    if (callStream) { callStream.getTracks().forEach(t => t.stop()); callStream = null; }
    clearInterval(callInterval); callInterval = null;
    const rv = document.getElementById("remoteVideo");
    const lv = document.getElementById("localVideo");
    if (rv) rv.srcObject = null;
    if (lv) lv.srcObject = null;
    document.getElementById("videoWrap").style.display = "none";
    document.getElementById("camBtn").style.display = "none";
    document.getElementById("callTimer").style.display = "none";
    isMuted = false; isCallActive = false; callType = "audio";
    updateMuteBtn();
    showModal("hide");
    addSystemMessage("📵 Call ended — " + formatSeconds(callSeconds));
}

let _pendingOffer = null;
let _pendingCaller = null;

window.handleSignal = async function (data) {
    const { signal, callType: ct, sdp, candidate, sender } = data;

    if (signal === "call-offer-preview") {
        if (isCallActive) { sendPrivateSignal({ signal: "busy" }); return; }
        callType = ct;
        _pendingCaller = sender;
        document.getElementById("callAvatar").textContent = sender.charAt(0).toUpperCase();
        document.getElementById("callName").textContent = sender;
        document.getElementById("callStatus").textContent = ct === "video" ? "📹 Incoming video call..." : "📞 Incoming voice call...";
        showModal("incoming");
        return;
    }

    if (signal === "offer") {
        _pendingOffer = sdp;
        _pendingCaller = sender || _pendingCaller;
        if (isCallActive) {
            await _applyOffer();
        }
        return;
    }

    if (signal === "accept") {
        if (!pc) return;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendPrivateSignal({ signal: "offer", sdp: pc.localDescription });
        document.getElementById("activeStatus").textContent = "⏳ Connecting...";
        return;
    }

    if (signal === "answer") {
        if (!pc) return;
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        document.getElementById("activeStatus").textContent = "🟢 Connected";
        showCallTimer();
        return;
    }

    if (signal === "ice") {
        if (!pc) return;
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch { }
        return;
    }

    if (signal === "hangup") {
        addSystemMessage("📵 " + (sender || "User") + " ended the call");
        endCall(false);
        return;
    }

    if (signal === "busy") {
        addSystemMessage("📵 User is busy");
        endCall(false);
        return;
    }
};

async function _applyOffer() {
    if (!_pendingOffer || !callStream) return;
    await createPC();
    await pc.setRemoteDescription(new RTCSessionDescription(_pendingOffer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    sendPrivateSignal({ signal: "answer", sdp: pc.localDescription });
    document.getElementById("activeAvatar").textContent = (_pendingCaller || "?").charAt(0).toUpperCase();
    document.getElementById("activeName").textContent = _pendingCaller || "User";
    document.getElementById("activeStatus").textContent = "🟢 Connected";
    showModal("active");
    showCallTimer();
    _pendingOffer = null;
}

document.getElementById("acceptBtn").addEventListener("click", async () => {
    isCallActive = true;
    const constraints = callType === "video" ? { audio: true, video: true } : { audio: true };
    try {
        callStream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
        addSystemMessage("❌ Media access denied: " + err.message);
        sendPrivateSignal({ signal: "busy" });
        showModal("hide");
        isCallActive = false;
        return;
    }
    if (callType === "video") {
        document.getElementById("localVideo").srcObject = callStream;
        document.getElementById("videoWrap").style.display = "block";
        document.getElementById("camBtn").style.display = "flex";
    }
    sendPrivateSignal({ signal: "accept" });
    addSystemMessage(callType === "video" ? "📹 Video call accepted" : "📞 Call accepted");
    document.getElementById("activeAvatar").textContent = username.charAt(0).toUpperCase();
    document.getElementById("activeName").textContent = username;
    document.getElementById("activeStatus").textContent = "⏳ Connecting...";
    showModal("active");
    if (_pendingOffer) await _applyOffer();
});

document.getElementById("rejectBtn").addEventListener("click", () => {
    sendPrivateSignal({ signal: "hangup" });
    showModal("hide");
    _pendingOffer = null;
    _pendingCaller = null;
    addSystemMessage("📵 Call rejected");
});

document.getElementById("hangupBtn").addEventListener("click", () => endCall(true));
document.getElementById("muteBtn").addEventListener("click", () => {
    isMuted = !isMuted;
    if (callStream) callStream.getAudioTracks().forEach(t => t.enabled = !isMuted);
    updateMuteBtn();
});
document.getElementById("camBtn").addEventListener("click", () => {
    if (!callStream) return;
    callStream.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    const on = callStream.getVideoTracks()[0]?.enabled;
    document.getElementById("camBtn").innerHTML = on ? '<i class="fa-solid fa-video"></i>' : '<i class="fa-solid fa-video-slash"></i>';
    document.getElementById("camBtn").style.background = on ? "" : "#ef4444";
});

const headerBtns = document.querySelectorAll(".header-icons button");
if (headerBtns[0]) headerBtns[0].addEventListener("click", () => startCall("audio"));
if (headerBtns[1]) headerBtns[1].addEventListener("click", () => startCall("video"));
if (headerBtns[2]) headerBtns[2].addEventListener("click", () => {
    addSystemMessage("ℹ️ 0xBP7 Secure Chat — End-to-end encrypted messaging");
});

// Make functions available globally
window.setCurrentChatPartner = function(partner) {
    currentChatPartner = partner;
    document.getElementById("headerUsername").innerText = partner;
    addSystemMessage(`💬 Now chatting with ${partner}`);
};