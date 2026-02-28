import { createRoleplayCommand } from './template.js';
export const danceCommand = createRoleplayCommand({
    name: 'dance',
    description: 'Dance com alguém ou sozinho',
    actionText: '💃 {user} começou a dançar freneticamente com {target}!',
    soloText: '{user} está dançando sozinho(a) com a música no máximo!',
    apiEndpoint: 'sfw/dance'
});
//# sourceMappingURL=dance.js.map