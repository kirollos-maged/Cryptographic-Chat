// ============================================================
//  crypto.js — matches encryption.py logic exactly
//  AES / DES / 3DES → ECB mode + PKCS7 padding + Base64
//  RSA → PKCS1_OAEP (Web Crypto)
//  Encoding → Base64 / Hex / URL
//  Hashing → MD5 / SHA256 / SHA512
//
//  requires CryptoJS 4.x for AES/DES/3DES/MD5
// ============================================================

// ── Helpers ──────────────────────────────────────────────────

const _enc = new TextEncoder();
const _dec = new TextDecoder();

function getSecret() {
    return document.getElementById("secretKey")?.value || "default";
}

// Pad key to exact length with spaces (matches Python ljust)
function padKey(secret, length) {
    const bytes = new Uint8Array(length).fill(0x20); // fill with spaces
    const encoded = _enc.encode(secret);
    bytes.set(encoded.slice(0, length));
    return CryptoJS.lib.WordArray.create(bytes);
}

// ── AES (ECB + PKCS7) ────────────────────────────────────────

function encryptAES(text, secret) {
    const key = padKey(secret, 16);
    const encrypted = CryptoJS.AES.encrypt(text, key, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7
    });
    return "AES:" + encrypted.ciphertext.toString(CryptoJS.enc.Base64);
}

function decryptAES(cipher, secret) {
    try {
        const data = cipher.startsWith("AES:") ? cipher.slice(4) : cipher;
        const key = padKey(secret, 16);
        const cipherParams = CryptoJS.lib.CipherParams.create({
            ciphertext: CryptoJS.enc.Base64.parse(data)
        });
        const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
            mode: CryptoJS.mode.ECB,
            padding: CryptoJS.pad.Pkcs7
        });
        return decrypted.toString(CryptoJS.enc.Utf8) || "❌ Wrong key or format";
    } catch (e) {
        return "❌ Error: " + e.message;
    }
}

// ── DES (ECB + PKCS7) ────────────────────────────────────────

function encryptDES(text, secret) {
    const key = padKey(secret, 8);
    const encrypted = CryptoJS.DES.encrypt(text, key, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7
    });
    return "DES:" + encrypted.ciphertext.toString(CryptoJS.enc.Base64);
}

function decryptDES(cipher, secret) {
    try {
        const data = cipher.startsWith("DES:") ? cipher.slice(4) : cipher;
        const key = padKey(secret, 8);
        const cipherParams = CryptoJS.lib.CipherParams.create({
            ciphertext: CryptoJS.enc.Base64.parse(data)
        });
        const decrypted = CryptoJS.DES.decrypt(cipherParams, key, {
            mode: CryptoJS.mode.ECB,
            padding: CryptoJS.pad.Pkcs7
        });
        return decrypted.toString(CryptoJS.enc.Utf8) || "❌ Wrong key or format";
    } catch (e) {
        return "❌ Error: " + e.message;
    }
}

// ── 3DES (ECB + PKCS7) ───────────────────────────────────────

function encryptTripleDES(text, secret) {
    const key = padKey(secret, 24);
    const encrypted = CryptoJS.TripleDES.encrypt(text, key, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7
    });
    return "3DES:" + encrypted.ciphertext.toString(CryptoJS.enc.Base64);
}

function decryptTripleDES(cipher, secret) {
    try {
        const data = cipher.startsWith("3DES:") ? cipher.slice(5) : cipher;
        const key = padKey(secret, 24);
        const cipherParams = CryptoJS.lib.CipherParams.create({
            ciphertext: CryptoJS.enc.Base64.parse(data)
        });
        const decrypted = CryptoJS.TripleDES.decrypt(cipherParams, key, {
            mode: CryptoJS.mode.ECB,
            padding: CryptoJS.pad.Pkcs7
        });
        return decrypted.toString(CryptoJS.enc.Utf8) || "❌ Wrong key or format";
    } catch (e) {
        return "❌ Error: " + e.message;
    }
}

// ── RSA (Web Crypto OAEP) ─────────────────────────────────────

let _rsa = null;
async function getRSA() {
    if (!_rsa) _rsa = await crypto.subtle.generateKey(
        { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-1" },
        true, ["encrypt", "decrypt"]
    );
    return _rsa;
}

async function encryptRSA(text) {
    const kp = await getRSA();
    const ct = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, kp.publicKey, _enc.encode(text));
    const priv = await crypto.subtle.exportKey("pkcs8", kp.privateKey);
    const privB64 = btoa(String.fromCharCode(...new Uint8Array(priv)));
    const ctB64 = btoa(String.fromCharCode(...new Uint8Array(ct)));
    return "RSA:" + privB64 + ":" + ctB64;
}

async function decryptRSA(cipher) {
    if (!cipher.startsWith("RSA:")) return "❌ Not RSA format";
    const parts = cipher.split(":");
    const privBytes = Uint8Array.from(atob(parts[1]), c => c.charCodeAt(0));
    const ctBytes = Uint8Array.from(atob(parts[2]), c => c.charCodeAt(0));
    const privKey = await crypto.subtle.importKey(
        "pkcs8", privBytes,
        { name: "RSA-OAEP", hash: "SHA-1" },
        false, ["decrypt"]
    );
    const pt = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, privKey, ctBytes);
    return _dec.decode(pt);
}

// ── Hashing ───────────────────────────────────────────────────

function hashMD5(text) {
    return "MD5:" + CryptoJS.MD5(text).toString();
}

async function hashSHA(algo, text) {
    const h = await crypto.subtle.digest(algo, _enc.encode(text));
    const hex = Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, "0")).join("");
    return algo.replace("-", "") + ":" + hex;
}

// ── Salted Hashing ────────────────────────────────────────────

async function saltedHash(algo, text) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, "0")).join("");
    const data = new Uint8Array([...salt, ..._enc.encode(text)]);
    const h = await crypto.subtle.digest(algo, data);
    const hashHex = Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, "0")).join("");
    const prefix = algo === "SHA-256" ? "SALTED_SHA256" : "SALTED_SHA512";
    return prefix + ":" + saltHex + ":" + hashHex;
}

// ── Main encrypt / decrypt ────────────────────────────────────

async function encrypt(text, method) {
    const secret = getSecret();
    switch (method) {
        case "aes":    return encryptAES(text, secret);
        case "des":    return encryptDES(text, secret);
        case "3des":   return encryptTripleDES(text, secret);
        case "rsa":    return encryptRSA(text);
        case "base64": return btoa(unescape(encodeURIComponent(text)));
        case "hex":    return [..._enc.encode(text)].map(b => b.toString(16).padStart(2, "0")).join("");
        case "url":    return encodeURIComponent(text);
        case "md5":    return hashMD5(text);
        case "sha256": return hashSHA("SHA-256", text);
        case "sha512": return hashSHA("SHA-512", text);
        case "salted_sha256": return saltedHash("SHA-256", text);
        case "salted_sha512": return saltedHash("SHA-512", text);
        default:       return text;
    }
}

async function decrypt(cipher, method) {
    const secret = getSecret();
    try {
        switch (method) {
            case "aes":    return decryptAES(cipher, secret);
            case "des":    return decryptDES(cipher, secret);
            case "3des":   return decryptTripleDES(cipher, secret);
            case "rsa":    return decryptRSA(cipher);
            case "base64": return decodeURIComponent(escape(atob(cipher)));
            case "hex":    return _dec.decode(new Uint8Array(cipher.match(/.{2}/g).map(h => parseInt(h, 16))));
            case "url":    return decodeURIComponent(cipher);
            case "md5": case "sha256": case "sha512":
            case "salted_sha256": case "salted_sha512":
                return "⚠️ Hashes cannot be decrypted";
            default:       return cipher;
        }
    } catch (e) {
        return "❌ Error: " + e.message;
    }
}