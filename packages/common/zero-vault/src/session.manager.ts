let cachedKey: CryptoKey | null = null;
let timeoutId:any = null;
let DEFAULT_LIMIT = 30_000; // 30sec
let INACTIVITY_LIMIT:number | undefined = undefined
const vaultBus = new EventTarget();
const LOCK_EVENT = "vault-locked";
let lock_at = Date.now();

export const SessionManager = {
    getTimeout() {
        if(!INACTIVITY_LIMIT){
            const fromEnv = Number(process.env.VAULT_UNLOCK_TIMEOUT);
            if (fromEnv && !isNaN(fromEnv)) {
                INACTIVITY_LIMIT = fromEnv;
            }
            INACTIVITY_LIMIT = INACTIVITY_LIMIT || DEFAULT_LIMIT;
        }
        return INACTIVITY_LIMIT;
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
        const timeoutTime = this.getTimeout();

        lock_at = Date.now() + timeoutTime;
        timeoutId = setTimeout(() => {
            this.lock();
        }, timeoutTime);

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

    getUnlockStatus() : {
        is_unlock: boolean,
        lock_at_timestamp: number
    } {
        return {
            is_unlock: (lock_at - Date.now()) > 0,
            lock_at_timestamp: lock_at,
        };
    },

    lock() {
        if (!cachedKey) {
            return false;
        }
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        if(lock_at > Date.now()){
            lock_at = Date.now();
        }
        cachedKey = null;
        
        // dispatch events
        setTimeout(()=>{
            vaultBus.dispatchEvent(new Event(LOCK_EVENT));
        });
        return true;
    }
};