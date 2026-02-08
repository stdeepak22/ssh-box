import { AuthHelper } from './password/auth.helper.js';
import { MasterPasswordHelper } from './password/password.helper.js';
import { SecretHelper } from './password/secret.helper.js';
import { AuthStorageService } from './types.js';
import { PingPongHelper } from './password/ping.helper.js';


export class Helper {
    private static _instance?: Helper;
    private _authStorageService?: AuthStorageService;
    
    private _masterPasswordHelper?: MasterPasswordHelper;
    private _secretHelper?: SecretHelper;
    private _authHelper?: AuthHelper;
    private _pingHelper?: PingPongHelper;

    private constructor(authStorageService: AuthStorageService) {
        this._authStorageService = authStorageService;
        this._masterPasswordHelper = new MasterPasswordHelper(this._authStorageService);
        this._secretHelper = new SecretHelper(this._authStorageService);
        this._authHelper = new AuthHelper(this._authStorageService);
        this._pingHelper = new PingPongHelper(this._authStorageService);
    }    

    static getInstance(authStorageService: AuthStorageService) {
        if (!this._instance) {
            this._instance = new Helper(authStorageService);
        }
        return this._instance;
    }

    async ping(){
        return this._pingHelper?.ping();
    }

    async unlockVault(password: string) {
        return this._masterPasswordHelper?.unlockVault(password);
    }

    async setPassword(newPassword: string) {
        return this._masterPasswordHelper?.setPassword(newPassword);
    }

    async changePassword(oldPassword: string, newPassword: string) {
        return this._masterPasswordHelper?.updatePassword(oldPassword, newPassword);
    }

    async saveSecret(name: string, value: string) {
        return this._secretHelper?.addSecret(name, value);
    }

    async getSpecificSecret(name: string, version?: string) {
        return this._secretHelper?.getSecretByName(name, version);
    }

    async getSecretList() {
        return this._secretHelper?.getSecretList();
    }

    async registerNewAccount(email: string, password: string) {
        return this._authHelper?.registerNewAccount(email, password);
    }
    
    async login(email: string, password: string) {
        return this._authHelper?.login(email, password);
    }
}