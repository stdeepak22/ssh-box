import Conf from 'conf';

interface ConfigSchema {
    token?: string;
    email?: string;
    baseUrl?: string;
}

const config = new Conf<ConfigSchema>({
    projectName: 'ssh-box'
});

export const getConfig = () => config;
export const getToken = () => config.get('token');
export const getBaseUrl = () => config.get('baseUrl', 'http://localhost:3000'); // Default to local
