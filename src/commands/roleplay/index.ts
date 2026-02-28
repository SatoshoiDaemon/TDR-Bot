import { createRoleplayCommand } from './template.js';

// --- Comandos de Afeto ---
export const hugCommand = createRoleplayCommand({
  name: 'hug',
  description: 'Dê um abraço caloroso em alguém',
  actionText: '{user} deu um abraço em {target}! ❤️',
  soloText: '{user} está se abraçando... que fofo?',
  apiEndpoint: 'sfw/hug'
});

export const kissCommand = createRoleplayCommand({
  name: 'kiss',
  description: 'Dê um beijo em alguém',
  actionText: '{user} deu um beijão em {target}! 💋',
  soloText: '{user} mandou um beijo para o ar!',
  apiEndpoint: 'sfw/kiss'
});

// --- Comandos de Interação Social (Neutros/Divertidos) ---
export const highfiveCommand = createRoleplayCommand({
  name: 'highfive',
  description: 'Dê um "toca aqui" em alguém!',
  actionText: '{user} deu um high-five em {target}! ✋✨',
  soloText: '{user} ficou no vácuo tentando dar um high-five...',
  apiEndpoint: 'sfw/highfive'
});

export const cheersCommand = createRoleplayCommand({
  name: 'cheers',
  description: 'Brinde com alguém!',
  actionText: '{user} brindou com {target}! 🍻',
  soloText: '{user} brindou sozinho... saúde!',
  apiEndpoint: 'sfw/smile' // Usando smile como fallback visual para alegria/brinde se não houver cheers direto
});

export const danceCommand = createRoleplayCommand({
  name: 'dance',
  description: 'Comece a dançar!',
  actionText: '{user} está dançando com {target}! 💃🕺',
  soloText: '{user} começou a dançar sozinho! Que ritmo!',
  apiEndpoint: 'sfw/dance'
});

export const happyCommand = createRoleplayCommand({
  name: 'happy',
  description: 'Mostre sua felicidade!',
  actionText: '{user} está muito feliz com {target}! ✨',
  soloText: '{user} está radiante de felicidade! 😁',
  apiEndpoint: 'sfw/happy'
});

export const waveCommand = createRoleplayCommand({
  name: 'wave',
  description: 'Acene para alguém!',
  actionText: '{user} acenou para {target}! 👋',
  soloText: '{user} está acenando para todo mundo! Oie!',
  apiEndpoint: 'sfw/wave'
});

// --- Comandos de Reação ---
export const slapCommand = createRoleplayCommand({
  name: 'slap',
  description: 'Dê um tapa em alguém',
  actionText: '{user} deu um tapa em {target}! 🖐️',
  soloText: '{user} deu um tapa no próprio rosto? Por que?',
  apiEndpoint: 'sfw/slap'
});

export const pokeCommand = createRoleplayCommand({
  name: 'poke',
  description: 'Cutuque alguém',
  actionText: '{user} cutucou {target}! 👉',
  soloText: '{user} está se cutucando...',
  apiEndpoint: 'sfw/poke'
});

export const biteCommand = createRoleplayCommand({
  name: 'bite',
  description: 'Dê uma mordidinha em alguém',
  actionText: '{user} deu uma mordidinha em {target}! 🦷',
  soloText: '{user} está mordendo o próprio lábio...',
  apiEndpoint: 'sfw/bite'
});

export const bonkCommand = createRoleplayCommand({
  name: 'bonk',
  description: 'Dê um bonk em alguém (vá para a horny jail!)',
  actionText: '{user} deu um bonk em {target}! 🔨',
  soloText: '{user} deu um bonk em si mesmo. Horny jail?',
  apiEndpoint: 'sfw/bonk'
});

export const cryCommand = createRoleplayCommand({
  name: 'cry',
  description: 'Comece a chorar',
  actionText: '{user} está chorando no ombro de {target}... 😭',
  soloText: '{user} está chorando sozinho no canto... 😭',
  apiEndpoint: 'sfw/cry'
});

export const patCommand = createRoleplayCommand({
  name: 'pat',
  description: 'Faça carinho (pat) em alguém',
  actionText: '🐾 {user} fez carinho em {target}!',
  soloText: '{user} quer receber carinho...',
  apiEndpoint: 'sfw/pat'
});
