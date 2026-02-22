# 🛡️ TGR Bot - Documentação Técnica e Administrativa

Bem-vindo à documentação oficial do **TGR Bot**, o motor de automação, economia e inteligência artificial do servidor. Este documento foi elaborado para fornecer à equipe de **Staff** e ao **Time de Desenvolvedores** uma visão profunda sobre a arquitetura, configuração e manutenção do bot.

---

## 📋 Índice

1. [Visão Geral](#-visão-geral)
2. [Stack Tecnológica](#-stack-tecnológica)
3. [Instalação e Execução](#-instalação-e-execução)
4. [Arquitetura de Sistemas](#-arquitetura-de-sistemas)
   - [IA (Argos IA)](#ia-argos-ia)
   - [Economia](#economia)
   - [Tickets](#tickets)
5. [Configuração do Ambiente](#-configuração-do-ambiente)
6. [Guia do Desenvolvedor](#-guia-do-desenvolvedor)
7. [Manutenção](#-manutenção)

---

## 🚀 Visão Geral

O TGR Bot é um sistema modular projetado para engajamento e moderação. Ele utiliza **TypeScript** para segurança de tipos e **Google Gemini** para interações inteligentes, permitindo um ambiente dinâmico e responsivo.

---

## 🛠️ Stack Tecnológica

*   **Runtime**: Node.js v20+
*   **Discord Library**: Discord.js v14
*   **Banco de Dados**: PostgreSQL (Prisma) & Redis (Cache)
*   **IA**: Google Gemini 1.5
*   **Deploy**: SquareCloud / PM2

---

## ⚙️ Instalação e Execução

### 1. Dependências
```bash
npm install
```

### 2. Banco de Dados
Sincronize o schema e gere o client:
```bash
npx prisma db push
npx prisma generate
```

### 3. Desenvolvimento
```bash
npm run dev
```

### 4. Produção e Deployment
```bash
npm run build
npm start
```

**PM2**: `npm run start:pm2` | **SquareCloud**: Utiliza `squarecloud.config` e `dist/index.js`.

---

## 🏗️ Arquitetura de Sistemas

### IA (Argos IA)
*   **Key Rotation**: O `KeyManagerService` evita rate limits rotacionando múltiplas chaves API.
*   **Memória**: Combina Redis (curto prazo) e PostgreSQL (perfil de usuário) para contexto persistente.
*   **Functions**: A IA executa comandos como `query_system_knowledge` para responder dúvidas sobre o servidor.

### Economia
*   **Jogos**: Lógica robusta para `/mines`, `/blackjack` e `/roulette`.
*   **Transações**: Sistema de banco e carteira com logs detalhados.
*   **Loja**: Itens configuráveis via `shopService.ts`.

### Tickets
*   **Wizard UI**: Sistema de criação de painéis via botões/selects.
*   **Transcripts**: Logs em HTML gerados via `discord-html-transcripts`.

---

## 📄 Configuração do Ambiente (.env)

```env
DISCORD_TOKEN=...
GUILD_ID=...
DATABASE_URL="postgresql://..."
REDIS_URL="redis://..."
GEMINI_API_KEY=...
```

---

## 👨‍💻 Guia do Desenvolvedor

*   **Comandos**: Adicione em `src/commands/`. O recarregamento é automático.
*   **Handlers**: Interações de botões/modais devem estar em `src/handlers/`.
*   **Schemas**: Modificações no banco exigem `npx prisma generate`.

---

## 💾 Manutenção

*   **Snapshots**: Gerados diariamente via `SnapshotScheduler`.
*   **Logs**: Disponíveis em `/logs` e via `pm2 logs`.
*   **Backups**: O `BackupService` salva estados críticos do sistema periodicamente.

---

**Axiom-1337-ts**