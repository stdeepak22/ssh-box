import { Helper } from "@ssh-box/common_helper";
import { AuthConfigStorage } from "../config";

export let helper: Helper;
export let authStorage: AuthConfigStorage;

export const getHelpr = () => helper;
export const setHelpr = (h:Helper) => helper = h;

export const getAuthStorageService = ()=> authStorage;
export const setAuthStorageService = (a:AuthConfigStorage) => authStorage = a;

export const rtf = new Intl.RelativeTimeFormat('en', { 
  numeric: 'auto' // Use "yesterday" instead of "1 day ago"
});


export const getRelativeTime = (date: number) => {
  const diff: number = date - Date.now();
  
  const units: {[key: string]: number} = {
    'year': 24 * 60 * 60 * 1000 * 365,
    'month': 24 * 60 * 60 * 1000 * 30,
    'day': 24 * 60 * 60 * 1000,
    'hour': 60 * 60 * 1000,
    'minute': 60 * 1000,
    'second': 1000
  };

  for (let unit in units) {
    if (Math.abs(diff) > units[unit]  || unit === 'second') {
      return rtf.format(Math.round(diff / units[unit]), unit as Intl.RelativeTimeFormatUnit);
    }
  }
}