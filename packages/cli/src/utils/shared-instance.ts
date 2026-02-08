import { Helper } from "@ssh-box/common_helper";
import { AuthConfigStorage } from "../config";

export let helper: Helper;
export let authStorage: AuthConfigStorage;

export const getHelpr = () => helper;
export const setHelpr = (h:Helper) => helper = h;

export const getAuthStorageService = ()=> authStorage;
export const setAuthStorageService = (a:AuthConfigStorage) => authStorage = a;

