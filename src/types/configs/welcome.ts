/**
 * Interface de Configuração de Boas-vindas
 * Corresponde a: config/welcome.yml
 */

export interface WelcomeConfig {
    enabled: boolean;
    initial_roles: string[];
    dm_message: WelcomeDmMessage;
}

export interface WelcomeDmMessage {
    enabled: boolean;
    content: string;
    use_embed: boolean;
    embed: WelcomeEmbed;
}

export interface WelcomeEmbed {
    title: string;
    description: string;
    color: string;
    thumbnail: boolean;
    image?: string;
}
