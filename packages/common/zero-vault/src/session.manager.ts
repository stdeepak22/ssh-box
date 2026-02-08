let cachedKey: CryptoKey | null = null;
let timeoutId:any = null;
let INACTIVITY_LIMIT = 30000; // 30 seconds
const vaultBus = new EventTarget();
const LOCK_EVENT = "vault-locked";

export const SessionManager = {
    configureTimeout(msTime: number) {
        INACTIVITY_LIMIT = msTime;
    },

    setKey(key: CryptoKey) {
        cachedKey = key;
        this.resetTimer();
    },

    // Get the DEK and refresh the 30s window
    getKey(): CryptoKey | null {
        if (!cachedKey) {
            return null;
        }
        this.resetTimer();
        return cachedKey;
    },

    resetTimer() {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            this.lock();
        }, INACTIVITY_LIMIT);

        // so it will not make main process wait to finish this, mainly used in node env, like CLI
        if (timeoutId && typeof timeoutId.unref === 'function') {
            timeoutId.unref();
        }
    },

    /**
     * Allows to subscribe to the lock event
     */
    onLock(callback: () => void) {
        vaultBus.addEventListener(LOCK_EVENT, callback);
        return () => vaultBus.removeEventListener(LOCK_EVENT, callback);
    },

    lock() {
        if (!cachedKey) {
            console.log("Vault is already locked.");
            return;
        }
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        cachedKey = null;
        console.log("Vault is locked.");

        // dispatch events
        vaultBus.dispatchEvent(new Event(LOCK_EVENT));
    }
};