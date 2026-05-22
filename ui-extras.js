// ============================================================
//  0xBP7 ui-extras.js
// ============================================================

(function () {

    const _sel = document.getElementById("encryptSelect");
    const _pills = document.querySelectorAll(".cipher-pill");
    const _activeCipherName = document.getElementById("activeCipherName");
    const _sessionCipherLabel = document.getElementById("sessionCipherLabel");

    function getCipherLabel(val) {
        const map = {
            aes: "AES-128 ECB", des: "DES-56 ECB", "3des": "3DES-168 ECB",
            rsa: "RSA-2048", hex: "Hex Encode", base64: "Base64 Encode",
            normal: "Plaintext (No Cipher)", sha256: "SHA-256 Hash",
            sha512: "SHA-512 Hash", salted_sha256: "Salted SHA-256",
            salted_sha512: "Salted SHA-512", url: "URL Encode"
        };
        return map[val] || val.toUpperCase();
    }

    function getShortLabel(val) {
        const map = {
            aes: "AES-128", des: "DES-56", "3des": "3DES-168",
            rsa: "RSA-2048", hex: "Hex", base64: "Base64", normal: "Plaintext"
        };
        return map[val] || val.toUpperCase();
    }

    function activatePill(val) {
        _pills.forEach(p => p.classList.toggle("active", p.dataset.value === val));
        _sel.value = val;
        if (_activeCipherName) _activeCipherName.textContent = getCipherLabel(val);
        if (_sessionCipherLabel) _sessionCipherLabel.textContent = getShortLabel(val);

        const ac = document.querySelector(".contact-item.active");
        if (ac) {
            const badge = ac.querySelector(".cipher-badge");
            if (badge) {
                badge.className = "cipher-badge " + (val === "normal" ? "none" : val);
                badge.textContent = val === "normal" ? "PLAIN" : val.toUpperCase();
            }
        }
    }

    _pills.forEach(pill => {
        pill.addEventListener("click", () => activatePill(pill.dataset.value));
    });

    _sel.addEventListener("change", () => {
        const v = _sel.value;
        _pills.forEach(p => p.classList.toggle("active", p.dataset.value === v));
        if (_activeCipherName) _activeCipherName.textContent = getCipherLabel(v);
        if (_sessionCipherLabel) _sessionCipherLabel.textContent = getShortLabel(v);
    });

    activatePill("aes");

    const voiceSel = document.getElementById("voiceCipherSelect");
    const micBtn = document.getElementById("micBtn");

    if (micBtn && voiceSel) {
        micBtn.addEventListener("mousedown", () => {
            const choice = voiceSel.value;
            if (choice !== "same") {
                micBtn._prevEnc = _sel.value;
                _sel.value = choice;
            }
        });
        micBtn.addEventListener("mouseup", () => {
            setTimeout(() => {
                if (micBtn._prevEnc !== undefined) {
                    activatePill(micBtn._prevEnc);
                    delete micBtn._prevEnc;
                }
            }, 300);
        });
    }

    let currentUsername = sessionStorage.getItem("username") || "Guest";
    currentUsername = currentUsername.trim() || "Guest";

    window.updateContactsList = function (otherUsers) {
        const contactsList = document.getElementById("contactsList");
        if (!contactsList) return;

        contactsList.innerHTML = "";

        let allContacts = [];

        allContacts.push({
            name: currentUsername,
            isMe: true,
            online: true,
            preview: "You (Me)"
        });

        if (otherUsers && otherUsers.length > 0) {
            otherUsers.forEach(user => {
                allContacts.push({
                    name: user,
                    isMe: false,
                    online: true,
                    preview: "Online"
                });
            });
        }

        if (allContacts.length === 0) {
            const div = document.createElement("div");
            div.className = "contact-item";
            div.innerHTML = `
                <div class="contact-avatar" style="background:#37474f;">
                    ?
                </div>
                <div class="contact-details">
                    <div class="contact-name">No one online</div>
                    <div class="contact-preview">
                        <span>Waiting for others...</span>
                    </div>
                </div>
            `;
            contactsList.appendChild(div);
            return;
        }

        allContacts.forEach((contact, index) => {
            const div = document.createElement("div");
            const isActive = (index === 1) || (index === 0 && allContacts.length === 1);
            div.className = "contact-item" + (isActive ? " active" : "");

            const initials = contact.name.charAt(0).toUpperCase();
            const avatarClass = contact.isMe ? "color-current-user" : "color-other-client";
            const nameDisplay = contact.isMe ? `${contact.name} (You)` : contact.name;

            div.innerHTML = `
                <div class="contact-avatar ${avatarClass}">
                    ${initials}
                    ${contact.online ? '<span class="online-indicator"></span>' : ""}
                </div>
                <div class="contact-details">
                    <div class="contact-name">${escapeHtml(nameDisplay)}</div>
                    <div class="contact-preview">
                        <i class="fa-solid fa-lock lock-small"></i>
                        <span>${contact.preview}</span>
                    </div>
                </div>
                <span class="cipher-badge aes">AES</span>
            `;

            div.addEventListener("click", () => {
                document.querySelectorAll(".contact-item").forEach(el => el.classList.remove("active"));
                div.classList.add("active");
                
                if (!contact.isMe) {
                    if (window.setCurrentChatPartner) {
                        window.setCurrentChatPartner(contact.name);
                    }
                }
            });

            contactsList.appendChild(div);
        });
        
        const firstOther = allContacts.find(c => !c.isMe);
        if (firstOther && window.setCurrentChatPartner) {
            window.setCurrentChatPartner(firstOther.name);
            const items = document.querySelectorAll(".contact-item");
            items.forEach(item => {
                const nameSpan = item.querySelector(".contact-name");
                if (nameSpan && nameSpan.innerText.includes(firstOther.name)) {
                    document.querySelectorAll(".contact-item").forEach(el => el.classList.remove("active"));
                    item.classList.add("active");
                }
            });
        }
    };

    function escapeHtml(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.addEventListener("input", e => {
            const filter = e.target.value.toLowerCase();
            const items = document.querySelectorAll(".contact-item");
            items.forEach(item => {
                const name = item.querySelector(".contact-name")?.innerText.toLowerCase() || "";
                item.style.display = name.includes(filter) ? "flex" : "none";
            });
        });
    }

    const style = document.createElement('style');
    style.textContent = `
        .contact-avatar.color-current-user {
            background: linear-gradient(135deg, #00e676, #00bcd4);
            position: relative;
        }
        .contact-avatar.color-other-client {
            background: linear-gradient(135deg, #7c4dff, #b39ddb);
            position: relative;
        }
        .contact-item.active .contact-avatar {
            box-shadow: 0 0 0 2px rgba(0,188,212,0.5);
        }
        .contact-item.active .contact-avatar.color-other-client {
            box-shadow: 0 0 0 2px rgba(124,77,255,0.5);
        }
        .contact-name {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 4px;
        }
    `;
    document.head.appendChild(style);

})();