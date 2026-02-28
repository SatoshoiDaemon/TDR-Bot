import { createRoleplayCommand } from './template.js';
export const patCommand = createRoleplayCommand({
    name: 'pat',
    description: 'Faça carinho (pat) em alguém',
    actionText: '🐾 {user} fez carinho em {target}!',
    soloText: '{user} quer receber carinho...',
    apiEndpoint: 'sfw/pat'
});
//# sourceMappingURL=pat.js.map