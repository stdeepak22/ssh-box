import { SessionManager } from "../session.manager.js";

export interface UnlockVaultNeededResult {
    key: CryptoKey,
}

export function UnlockedVaultNeeded() {
    return function (
        _target: any,
        _propertyKey: string,
        descriptor: PropertyDescriptor
    ) {

        const originalMethod = descriptor.value;
        descriptor.value = function (...args: any[]) {
            const key = SessionManager.getKey(); // This also resets the 30s timer

            if (!key) {
                throw new Error("Vault is locked. Please re-enter your password, and unlock it first.");
            }
            const decoratorValue = {
                key
            } as UnlockVaultNeededResult
            return originalMethod.apply(this, [...args, decoratorValue])
        }
        return descriptor;
    }
}