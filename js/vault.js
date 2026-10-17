/**
 * vault.js — cofre criptografado
 * Senha mestra -> PBKDF2-SHA256 (600.000 iterações) -> chave AES-256-GCM.
 * A senha mestra NUNCA é salva. Só o arquivo criptografado vai pro disco.
 */
const Vault = (() => {
    const ITERATIONS = 600000;
    const STORAGE_KEY = 'luminous_vault';

    let key = null;      // chave na memória (só existe desbloqueado)
    let salt = null;
    let iter = ITERATIONS;
    let entries = [];

    const enc = new TextEncoder();
    const dec = new TextDecoder();

    const b64 = {
        enc(buf) {
            let s = '';
            new Uint8Array(buf).forEach(b => { s += String.fromCharCode(b); });
            return btoa(s);
        },
        dec(str) {
            return Uint8Array.from(atob(str), c => c.charCodeAt(0));
        }
    };

    // No app (Electron) salva em arquivo; no navegador usa localStorage
    const storage = {
        async load() {
            if (window.vaultAPI) return window.vaultAPI.load();
            return localStorage.getItem(STORAGE_KEY);
        },
        async save(text) {
            if (window.vaultAPI) return window.vaultAPI.save(text);
            localStorage.setItem(STORAGE_KEY, text);
        }
    };

    async function deriveKey(master, saltBytes, iterations) {
        const base = await crypto.subtle.importKey(
            'raw', enc.encode(master), 'PBKDF2', false, ['deriveKey']
        );
        return crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt: saltBytes, iterations, hash: 'SHA-256' },
            base,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }

    // Cada salvamento usa um IV novo (obrigatório no AES-GCM)
    async function persist() {
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const plain = enc.encode(JSON.stringify({ entries }));
        const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain);
        const file = {
            v: 1,
            kdf: 'PBKDF2-SHA256',
            iter,
            salt: b64.enc(salt),
            iv: b64.enc(iv),
            data: b64.enc(cipher)
        };
        await storage.save(JSON.stringify(file));
    }

    return {
        async exists() {
            const text = await storage.load();
            return !!text;
        },

        async create(master) {
            salt = crypto.getRandomValues(new Uint8Array(16));
            iter = ITERATIONS;
            key = await deriveKey(master, salt, iter);
            entries = [];
            await persist();
        },

        async unlock(master) {
            const text = await storage.load();
            if (!text) throw new Error('NO_VAULT');
            const f = JSON.parse(text);
            const s = b64.dec(f.salt);
            const k = await deriveKey(master, s, f.iter);
            try {
                const plain = await crypto.subtle.decrypt(
                    { name: 'AES-GCM', iv: b64.dec(f.iv) }, k, b64.dec(f.data)
                );
                entries = JSON.parse(dec.decode(plain)).entries;
            } catch (e) {
                throw new Error('WRONG_PASSWORD');
            }
            key = k;
            salt = s;
            iter = f.iter;
        },

        lock() {
            key = null;
            salt = null;
            entries = [];
        },

        list() {
            return entries.map(e => ({ ...e }));
        },

        async add(item) {
            entries.push({ id: crypto.randomUUID(), ...item });
            await persist();
        },

        async update(id, item) {
            const i = entries.findIndex(e => e.id === id);
            if (i === -1) return;
            entries[i] = { id, ...item };
            await persist();
        },

        async remove(id) {
            entries = entries.filter(e => e.id !== id);
            await persist();
        },

        // Backup: devolve o arquivo JÁ criptografado
        async exportRaw() {
            return storage.load();
        },

        // Restaurar backup (valida o formato antes de substituir)
        async importRaw(text) {
            const f = JSON.parse(text);
            if (!f || f.v !== 1 || !f.salt || !f.iv || !f.data || !f.iter) {
                throw new Error('INVALID_FILE');
            }
            await storage.save(text);
            this.lock();
        }
    };
})();