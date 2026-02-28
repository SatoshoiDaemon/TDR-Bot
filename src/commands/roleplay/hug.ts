import { createRoleplayCommand } from './template.js';

export const hugCommand = createRoleplayCommand({
    name: 'hug',
    description: 'Dê um abraço caloroso em alguém',
    actionText: '🤗 {user} deu um abraço apertado em {target}!',
    soloText: '{user} precisa de um abraço. Alguém ajude!',
    apiEndpoint: 'sfw/hug'
});
