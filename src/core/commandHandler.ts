import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { logger } from '@shared/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function loadCommands() {
  const commands: any[] = [];
  const categoriesPath = join(__dirname, '../commands');
  const categories = readdirSync(categoriesPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && !dirent.name.endsWith('_old'))
    .map(dirent => dirent.name);

  for (const category of categories) {
    const commandFiles = readdirSync(join(categoriesPath, category))
      .filter(file => file.endsWith('.js') && !file.endsWith('.map'));

    for (const file of commandFiles) {
      try {
        const filePath = join(categoriesPath, category, file);
        // Converter path para URL válida no Windows/Linux para import dinâmico
        const fileUrl = pathToFileURL(filePath).href;
        const commandModule = await import(fileUrl);

        // Pegar TODAS as exportações que terminam com 'Command'
        const commandKeys = Object.keys(commandModule).filter(key => key.endsWith('Command'));

        if (commandKeys.length > 0) {
          for (const commandKey of commandKeys) {
            const command = commandModule[commandKey];
            if (command && command.name) {
              command.category = category;
              commands.push(command);
            }
          }
        } else {
          // Fallback: pegar a primeira exportação válida
          const firstKey = Object.keys(commandModule)[0];
          const command = commandModule[firstKey];
          if (command && command.name) {
            command.category = category;
            commands.push(command);
          }
        }
      } catch (error) {
        logger.error(`Erro ao carregar comando ${file} (${category}):`, error);
      }
    }
  }

  logger.info(`${commands.length} comandos carregados.`);
  return commands;
}
