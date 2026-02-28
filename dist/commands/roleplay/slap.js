import { createRoleplayCommand } from './template.js';
export const slapCommand = createRoleplayCommand({
    name: 'slap',
    description: 'Dê um tapa em alguém',
    actionText: '🖐️ {user} deu um tapa em {target}!',
    soloText: '{user} está distribuindo tapas imaginários!',
    apiEndpoint: 'sfw/slap'
});
//# sourceMappingURL=slap.js.map