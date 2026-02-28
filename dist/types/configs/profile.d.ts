/**
 * Interface de Configuração de Perfil
 * Corresponde a: config/profile.yml
 */
export interface ProfileConfig {
    ignored_roles: string[];
    defaults: ProfileDefaults;
    starboard?: {
        channel_id: string;
    };
}
export interface ProfileDefaults {
    about_me: string;
    color: string;
    thumbnail: string;
    image: string;
}
