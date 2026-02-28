import { createRoleplayCommand } from './template.js';
export const cryCommand = createRoleplayCommand({
    name: 'cry',
    description: 'Chore no ombro de alguém',
    actionText: '😭 {user} está chorando muito abraçado(a) com {target}!',
    soloText: '{user} está em prantos! 😭',
    apiEndpoint: 'sfw/cry'
});
//# sourceMappingURL=cry.js.map