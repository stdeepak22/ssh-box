import { openDB, type IDBPDatabase } from 'idb';
import type { Secret } from '@ssh-box/common';

const DB_NAME = 'ssh-box-db';
const STORE_NAME = 'secrets';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase>;

function getDB() {
    if (!dbPromise) {
        dbPromise = openDB(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            },
        });
    }
    return dbPromise;
}

export const db = {
    async getAllSecrets(): Promise<Secret[]> {
        const d = await getDB();
        return d.getAll(STORE_NAME);
    },

    async saveSecrets(secrets: Secret[]) {
        const d = await getDB();
        const tx = d.transaction(STORE_NAME, 'readwrite');
        for (const secret of secrets) {
            tx.store.put(secret);
        }
        await tx.done;
    },

    async saveSecret(secret: Secret) {
        const d = await getDB();
        await d.put(STORE_NAME, secret);
    },

    async clearAll() {
        const d = await getDB();
        await d.clear(STORE_NAME);
    },
};
