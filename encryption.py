from Crypto.Cipher import AES, DES, DES3
from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_OAEP
from Crypto.Util.Padding import pad, unpad
import base64
import hashlib
import urllib.parse

# ======================== RSA Keys ========================
_rsa_key = RSA.generate(2048)
RSA_PRIVATE_KEY = _rsa_key
RSA_PUBLIC_KEY  = _rsa_key.publickey()

# ======================== CIPHER HELPERS ========================

def _aes_cipher(key: str):
    key_bytes = key.encode().ljust(16, b' ')[:16]
    return AES.new(key_bytes, AES.MODE_ECB)

def _des_cipher(key: str):
    key_bytes = key.encode().ljust(8, b' ')[:8]
    return DES.new(key_bytes, DES.MODE_ECB)

def _3des_cipher(key: str):
    key_bytes = DES3.adjust_key_parity(key.encode().ljust(24, b' ')[:24])
    return DES3.new(key_bytes, DES3.MODE_ECB)

def _fix_b64(s: str) -> str:
    """Fix base64 padding if missing"""
    return s + '=' * (-len(s) % 4)

# ======================== ENCRYPT ========================

def encrypt(text: str, method: str, secret: str = "default") -> str:
    method = method.lower()

    if method == "aes":
        cipher = _aes_cipher(secret)
        encrypted = cipher.encrypt(pad(text.encode(), cipher.block_size))
        return "AES:" + base64.b64encode(encrypted).decode()

    elif method == "des":
        cipher = _des_cipher(secret)
        encrypted = cipher.encrypt(pad(text.encode(), cipher.block_size))
        return "DES:" + base64.b64encode(encrypted).decode()

    elif method == "3des":
        cipher = _3des_cipher(secret)
        encrypted = cipher.encrypt(pad(text.encode(), cipher.block_size))
        return "3DES:" + base64.b64encode(encrypted).decode()

    elif method == "rsa":
        cipher = PKCS1_OAEP.new(RSA_PUBLIC_KEY)
        encrypted = cipher.encrypt(text.encode())
        priv_der = RSA_PRIVATE_KEY.export_key('DER')
        return "RSA:" + base64.b64encode(priv_der).decode() + ":" + base64.b64encode(encrypted).decode()

    elif method == "base64":
        return base64.b64encode(text.encode()).decode()

    elif method == "hex":
        return text.encode().hex()

    elif method == "url":
        return urllib.parse.quote(text)

    elif method == "md5":
        return "MD5:" + hashlib.md5(text.encode()).hexdigest()

    elif method == "sha256":
        return "SHA256:" + hashlib.sha256(text.encode()).hexdigest()

    elif method == "sha512":
        return "SHA512:" + hashlib.sha512(text.encode()).hexdigest()

    elif method == "salted_sha256":
        import os
        salt = os.urandom(16)
        result = hashlib.sha256(salt + text.encode()).hexdigest()
        return "SALTED_SHA256:" + salt.hex() + ":" + result

    elif method == "salted_sha512":
        import os
        salt = os.urandom(16)
        result = hashlib.sha512(salt + text.encode()).hexdigest()
        return "SALTED_SHA512:" + salt.hex() + ":" + result

    else:
        return text  # normal

# ======================== DECRYPT ========================

def decrypt(ciphertext: str, method: str, secret: str = "default") -> str:
    method = method.lower()
    try:
        if method == "aes":
            data = ciphertext[4:] if ciphertext.startswith("AES:") else ciphertext
            cipher = _aes_cipher(secret)
            return unpad(cipher.decrypt(base64.b64decode(_fix_b64(data))), cipher.block_size).decode()

        elif method == "des":
            data = ciphertext[4:] if ciphertext.startswith("DES:") else ciphertext
            cipher = _des_cipher(secret)
            return unpad(cipher.decrypt(base64.b64decode(_fix_b64(data))), cipher.block_size).decode()

        elif method == "3des":
            data = ciphertext[5:] if ciphertext.startswith("3DES:") else ciphertext
            cipher = _3des_cipher(secret)
            return unpad(cipher.decrypt(base64.b64decode(_fix_b64(data))), cipher.block_size).decode()

        elif method == "rsa":
            parts = ciphertext.split(":")
            priv_key = RSA.import_key(base64.b64decode(_fix_b64(parts[1])))
            cipher = PKCS1_OAEP.new(priv_key)
            return cipher.decrypt(base64.b64decode(_fix_b64(parts[2]))).decode()

        elif method == "base64":
            return base64.b64decode(_fix_b64(ciphertext)).decode()

        elif method == "hex":
            return bytes.fromhex(ciphertext).decode()

        elif method == "url":
            return urllib.parse.unquote(ciphertext)

        elif method in ["md5", "sha256", "sha512", "salted_sha256", "salted_sha512"]:
            return "⚠️ Hashes cannot be decrypted"

        else:
            return ciphertext  # normal

    except Exception as e:
        return f"❌ Error: {e}"

# ======================== VERIFY SALTED HASH ========================

def verify_salted_hash(text: str, stored: str) -> bool:
    try:
        parts = stored.split(":")
        if len(parts) != 3:
            return False
        method, salt_hex, expected = parts
        salt = bytes.fromhex(salt_hex)
        if method == "SALTED_SHA256":
            return hashlib.sha256(salt + text.encode()).hexdigest() == expected
        elif method == "SALTED_SHA512":
            return hashlib.sha512(salt + text.encode()).hexdigest() == expected
        return False
    except:
        return False

# ======================== CHAT HELPERS ========================

def encrypt_message(text: str, method: str = "aes", secret: str = "default") -> bytes:
    return encrypt(text, method, secret).encode('utf-8')

def decrypt_message(data: bytes, method: str = "aes", secret: str = "default") -> str:
    try:
        return decrypt(data.decode('utf-8'), method, secret)
    except Exception as e:
        return f"[decode error: {e}]"

# ======================== VOICE HELPERS ========================

def encrypt_voice(audio_bytes: bytes, method: str = "aes", secret: str = "default") -> str:
    """
    Encrypt raw audio bytes using the same method as text messages.
    1. Convert audio bytes → base64 string  (so it's valid text)
    2. Encrypt that base64 string with the chosen cipher
    Returns a tagged ciphertext string, e.g. "AES:..." or "3DES:..."
    """
    raw_b64 = base64.b64encode(audio_bytes).decode('utf-8')
    return encrypt(raw_b64, method, secret)

def decrypt_voice(ciphertext: str, method: str = "aes", secret: str = "default") -> bytes:
    """
    Reverse of encrypt_voice.
    1. Decrypt the ciphertext → base64 string
    2. base64-decode → original audio bytes
    """
    raw_b64 = decrypt(ciphertext, method, secret)
    if raw_b64.startswith("❌") or raw_b64.startswith("⚠️"):
        raise ValueError(raw_b64)
    return base64.b64decode(raw_b64)

# ======================== INTERACTIVE MENU ========================

def show_menu():
    print("\n" + "=" * 50)
    print("        🔐  ENCRYPTION TOOLKIT  🔐")
    print("=" * 50)
    print("  1. Symmetric       (AES / DES / 3DES)")
    print("  2. RSA             (Asymmetric)")
    print("  3. Encoding        (Base64 / Hex / URL)")
    print("  4. Hashing         (MD5 / SHA256 / SHA512)")
    print("  5. Salted Hashing  (SHA256 / SHA512)")
    print("  6. Verify Salted Hash")
    print("  7. Exit")
    print("=" * 50)

def interactive_mode():
    print("✅ RSA Keys Generated (2048-bit)")
    while True:
        show_menu()
        choice = input("Choose option (1-7): ").strip()

        if choice == "1":
            action = input("Encrypt or Decrypt? (e/d): ").strip().lower()
            text   = input("Enter text: ")
            alg    = input("Algorithm (aes/des/3des): ").strip().lower()
            secret = input("Secret key (Enter = default): ").strip() or "default"
            if action == "e":
                print("\n✅ Result:\n", encrypt(text, alg, secret))
            else:
                print("\n✅ Result:\n", decrypt(text, alg, secret))
            input("\nPress Enter to continue...")

        elif choice == "2":
            action = input("Encrypt or Decrypt? (e/d): ").strip().lower()
            text   = input("Enter text: ")
            if action == "e":
                print("\n✅ Encrypted:\n", encrypt(text, "rsa"))
            else:
                print("\n✅ Decrypted:\n", decrypt(text, "rsa"))
            input("\nPress Enter to continue...")

        elif choice == "3":
            action = input("Encode or Decode? (e/d): ").strip().lower()
            text   = input("Enter text: ")
            method = input("Method (base64/hex/url): ").strip().lower()
            if action == "e":
                print("\n✅ Result:\n", encrypt(text, method))
            else:
                print("\n✅ Result:\n", decrypt(text, method))
            input("\nPress Enter to continue...")

        elif choice == "4":
            text   = input("Enter text: ")
            method = input("Method (md5/sha256/sha512): ").strip().lower()
            print("\n✅ Hash:\n", encrypt(text, method))
            input("\nPress Enter to continue...")

        elif choice == "5":
            text   = input("Enter text: ")
            method = input("Method (salted_sha256/salted_sha512): ").strip().lower()
            result = encrypt(text, method)
            print("\n✅ Salted Hash:\n", result)
            print("\n(احفظ الناتج ده عشان تعمل Verify بعدين)")
            input("\nPress Enter to continue...")

        elif choice == "6":
            text   = input("Enter original text: ")
            stored = input("Paste salted hash: ")
            if verify_salted_hash(text, stored):
                print("\n✅ Hash MATCHES! ✔️")
            else:
                print("\n❌ Hash does NOT match.")
            input("\nPress Enter to continue...")

        elif choice == "7":
            print("\n👋 Goodbye!")
            break
        else:
            print("❌ Invalid choice")

if __name__ == "__main__":
    interactive_mode()