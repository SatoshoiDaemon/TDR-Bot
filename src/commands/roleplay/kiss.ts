import { createRoleplayCommand } from './template.js';

export const kissCommand = createRoleplayCommand({
    name: 'kiss',
    description: 'Dê um beijo em alguém',
    actionText: '😘 {user} deu um beijo apaixonado em {target}!',
    soloText: '{user} mandou um beijo para todos!',
    apiEndpoint: 'sfw/kiss'
});
