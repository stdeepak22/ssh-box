import { AuthStorageService } from '@ssh-box/common_helper';
import Conf from 'conf';

export const ConfigSchemaProps = {
    baseUrl: 'baseUrl',
    token: 'token',
    email: 'email',
    has_mp: 'has_mp',
}

interface ConfigSchema {
    [ConfigSchemaProps.baseUrl]?: string;
    [ConfigSchemaProps.token]?: string;
    [ConfigSchemaProps.email]?: string;
    [ConfigSchemaProps.has_mp]: boolean;
}

export class AuthConfigStorage implements AuthStorageService {
    private _config: Conf<ConfigSchema>;
    private _baseUrl: string;

    constructor(base_url: string) {
        this._baseUrl = base_url;
        this._config = new Conf<ConfigSchema>({
            projectName: 'ssh-box',
            defaults: {
                [ConfigSchemaProps.baseUrl]: this._baseUrl,
                [ConfigSchemaProps.token]: undefined,
                [ConfigSchemaProps.email]: undefined,
                [ConfigSchemaProps.has_mp]: false,
            }
        });
    }

    getBaseUrl = () => {
        return this._config.get(ConfigSchemaProps.baseUrl)?.toString() || 'http://localhost:3000/';
    }

    getToken = () => {
        return this._config.get(ConfigSchemaProps.token)?.toString();
    }

    getEmail = () => {
        return this._config.get(ConfigSchemaProps.email)?.toString();
    }

    getHasMp = (): boolean =>  {
        return Boolean(this._config.get(ConfigSchemaProps.has_mp, false));
    }

    isLoggedIn = (): boolean => {
        return this.getEmail() !== undefined && this.getToken() !== undefined;
    }

    getFullConfig = (): ConfigSchema => {
        return this._config.store;
    }

    setConfigProps = (props: Partial<ConfigSchema>) => {
        this._config.set(props);
    }

    clearConfig = () => {
        this._config.clear();
    }
}
