/**
 * Interface de Configuração de Inatividade
 * Corresponde a: config/inactivity.yml
 */
export interface InactivityConfig {
    enabled: boolean;
    inactive_days: number;
    notification_channel_id: string;
    message: InactivityMessage;
    feedback_button: FeedbackButton;
}
export interface InactivityMessage {
    content: string;
    embed: InactivityEmbed;
}
export interface InactivityEmbed {
    title: string;
    description: string;
    color: string;
    footer: string;
}
export interface FeedbackButton {
    label: string;
    style: 'Primary' | 'Secondary' | 'Success' | 'Danger';
}
