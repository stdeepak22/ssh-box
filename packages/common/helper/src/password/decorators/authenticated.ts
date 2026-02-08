import { AuthStorageService } from "../../types.js";


export interface ShouldBeAuthenticatedResult {
    baseUrl: string,
    token: string,
}
export function ShouldBeAuthenticated() {
    return function (
        _target: any,
        _propertyKey: string,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;
        descriptor.value = function (...args: any[]) {
            const authStorageService = (this as any)._authStorageService as AuthStorageService;
            if (!authStorageService) {
                throw new Error("AuthStorageService is not initialized.");
            }

            const baseUrl = authStorageService.getBaseUrl();
            const token = authStorageService.getToken();

            if (!token || !baseUrl) {
                throw new Error("Looks like you are not logged-in yet, login first.");
            }
            const decoratorValue = {
                baseUrl,
                token,
            } as ShouldBeAuthenticatedResult
            return originalMethod.apply(this, [...args, decoratorValue])
        }
        return descriptor;
    }
}