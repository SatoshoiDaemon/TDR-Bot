import { Client, TextChannel, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { prisma } from '@database/client.js';
import { logger } from '@shared/logger.js';
import { EMBED_COLORS, EMBED_CREDIT } from '@shared/embedTheme.js';
import { EventService, EventType } from '@services/eventService.js';
import { TimerManager } from '@shared/timerManager.js';
import { redis } from '@database/redis.js';

interface Enigma {
  q: string;
  a: string[];
}

export class EventScheduler {
  private client: Client;
  private lastEventType: string | null = null;
  private lastEnigmaIndex: number = -1;

  constructor(client: Client) {
    this.client = client;
    EventService.loadConfig();
  }

  start() {
    const config = EventService.getConfig();
    if (!config.enabled) return;

    // Sorteio de eventos aleatórios
    TimerManager.setInterval(() => this.tryStartRandomEvent(), config.check_interval_minutes * 60 * 1000);

    // Promoções diárias (Verificar a cada hora se já rodou hoje)
    TimerManager.setInterval(() => this.checkDailyDeals(), 60 * 60 * 1000);

    logger.info('Serviço de Eventos iniciado.');
  }

  private async tryStartRandomEvent() {
    const config = EventService.getConfig();
    const volume = EventService.getAndResetMessageCount();

    // Se poucas mensagens (menos de 5 no intervalo), pular evento ou reduzir chance drasticamente
    if (volume < 5) return;

    // Multiplicador de chance baseado no volume (Ex: 20 msg = 2x chance, cap em 3x)
    const activityMultiplier = Math.min(Math.max(1, volume / 10), 3);

    const rand = Math.random();

    const { money_rain, hot_zone, enigma_challenge, diamond_reaction } = config.random_events;

    // Build eligible events using the activityMultiplier heavily to scale chances directly with volume!
    const events: { type: string; chance: number; fn: () => Promise<void> }[] = [];
    if (money_rain?.enabled) events.push({ type: 'money_rain', chance: money_rain.chance * activityMultiplier, fn: () => this.startMoneyRain() });
    if (hot_zone?.enabled) events.push({ type: 'hot_zone', chance: hot_zone.chance * activityMultiplier, fn: () => this.startHotZone() });
    if (enigma_challenge?.enabled) events.push({ type: 'enigma', chance: enigma_challenge.chance * activityMultiplier * 1.5, fn: () => this.startEnigma() }); // Boost enigma even more
    if (diamond_reaction?.enabled) events.push({ type: 'diamond', chance: diamond_reaction.chance * activityMultiplier, fn: () => this.startDiamond() });

    // Filter out the last event type to avoid consecutive repeats
    const eligible = events.filter(e => e.type !== this.lastEventType);
    if (eligible.length === 0) return;

    // Weighted random selection
    const totalChance = eligible.reduce((sum, e) => sum + e.chance, 0);
    if (rand > totalChance) return; // No event triggered

    let cumulative = 0;
    for (const event of eligible) {
      cumulative += event.chance;
      if (rand < cumulative) {
        this.lastEventType = event.type;
        await event.fn();
        return;
      }
    }
  }

  // =========================================
  // Enigma Challenge — 30+ riddles with anti-repeat
  // =========================================

  private static readonly ENIGMAS: Enigma[] = [
    // Anime & Mangá
    { q: 'Qual a verdadeira identidade do L de Death Note?', a: ['lawliet', 'l lawliet'] },
    { q: 'Qual o nome do pirata cuja execução iniciou a Grande Era dos Piratas em One Piece?', a: ['gol d roger', 'roger', 'gold roger'] },
    { q: 'Qual o estúdio responsável pela animação de Demon Slayer (Kimetsu no Yaiba)?', a: ['ufotable'] },
    { q: 'Quem é o mestre de Naruto Uzumaki que tem uma afinidade por literatura adulta?', a: ['jiraiya'] },
    { q: 'Qual anime é focado no uso da "Alquimia", regido pela Lei da Troca Equivalente?', a: ['fullmetal alchemist', 'fullmetal alchemist brotherhood', 'fma'] },
    { q: 'Qual personagem de Attack on Titan jura eliminar até o último titã da face da terra?', a: ['eren', 'eren yeager', 'eren jaeger'] },
    { q: 'No anime Bleach, qual é o nome da espada (Zanpakuto) de Ichigo Kurosaki?', a: ['zangetsu'] },
    { q: 'Qual o nome original japonês do anime "Cavaleiros do Zodíaco"?', a: ['saint seiya'] },
    { q: 'Em qual anime os personagens caçam as "Esferas do Dragão"?', a: ['dragon ball', 'dragon ball z'] },
    { q: 'No mangá/anime Berserk, qual o nome do espadachim negro protagonista da série?', a: ['guts'] },

    // Games
    { q: 'Qual a empresa que desenvolveu a franquia The Legend of Zelda?', a: ['nintendo'] },
    { q: 'O que a sigla FPS representa em jogos de tiro?', a: ['first person shooter', 'first-person shooter'] },
    { q: 'Qual foi o ano de lançamento original de Minecraft?', a: ['2009', '2011'] },
    { q: 'Qual a famosa frase que Scorpion grita ao jogar sua lança em Mortal Kombat?', a: ['get over here', 'come here'] },
    { q: 'Qual o item usado para capturar criaturas na franquia Pokémon?', a: ['pokebola', 'pokébola', 'pokeball'] },
    { q: 'Qual é a famosa série de jogos de RPG da FromSoftware que popularizou a frase "Praise the Sun"?', a: ['dark souls'] },
    { q: 'Em Final Fantasy VII, qual é o nome do antagonista principal de cabelos prateados?', a: ['sephiroth'] },
    { q: 'No jogo The Witcher 3, qual o nome do protagonista bruxo?', a: ['geralt', 'geralt de rivia'] },
    { q: 'Qual é o bloco mais resistente de Minecraft, comumente usado como limite do mundo?', a: ['bedrock', 'rocha matriz'] },
    { q: 'Qual é a corporação maligna responsável pela epidemia de zumbis em Resident Evil?', a: ['umbrella', 'umbrella corporation'] },

    // Cultura Pop & Filmes/Heróis
    { q: 'Qual a verdadeira identidade de Darth Vader?', a: ['anakin skywalker', 'anakin'] },
    { q: 'Qual o material quase indestrutível de que são feitas as garras do Wolverine?', a: ['adamantium'] },
    { q: 'Em "Senhor dos Anéis", quem diz a famosa frase "You shall not pass!" ("Você não passará!")?', a: ['gandalf'] },
    { q: 'Qual o verdadeiro nome do Batman?', a: ['bruce wayne'] },
    { q: 'Em Harry Potter, qual magia encarregada de desarmar o oponente e que virou assinatura de Harry?', a: ['expelliarmus'] },
    { q: 'Qual cor revela o Sabre de Luz tradicional de um mestre Sith em Star Wars?', a: ['vermelho', 'vermelha'] },
    { q: 'Em Matrix, qual a cor da pílula que Neo escolhe tomar para acordar no mundo real?', a: ['vermelha', 'vermelho'] },
    { q: 'Stan Lee é mundialmente famoso por ser o rosto e maior autor de qual editora de quadrinhos?', a: ['marvel', 'marvel comics'] },
    { q: 'Qual é o nome do irmão de Edward Elric em Fullmetal Alchemist?', a: ['alphonse', 'alphonse elric', 'al'] },
    { q: 'Qual organização secreta Itachi Uchiha integrou em Naruto?', a: ['akatsuki'] },
    { q: 'Qual o nome do capitão da tripulação do Chapéu de Palha em One Piece?', a: ['luffy', 'monkey d luffy', 'monkey d. luffy'] },
    { q: 'Qual o nome da habilidade ocular do clã Uchiha?', a: ['sharingan'] },
    { q: 'Qual o nome da raposa de nove caudas selada em Naruto?', a: ['kurama', 'kyuubi'] },
    { q: 'Qual personagem de Dragon Ball é conhecido como o príncipe dos saiyajins?', a: ['vegeta'] },
    { q: 'Qual é o nome do treinador inicial no anime Pokémon?', a: ['ash', 'ash ketchum'] },
    { q: 'Qual anime possui os personagens Gon e Killua?', a: ['hunter x hunter'] },
    { q: 'Qual organização governa o mundo em Attack on Titan?', a: ['marley'] },
    { q: 'Qual é o nome da espada de Tanjiro em Demon Slayer?', a: ['nichirin', 'katana nichirin'] },
    { q: 'Qual personagem usa o poder do "Gear Fifth" em One Piece?', a: ['luffy', 'monkey d luffy'] },
    { q: 'Qual anime possui um caderno que mata pessoas quando o nome é escrito?', a: ['death note'] },
    { q: 'Qual o nome do titã colossal em Attack on Titan?', a: ['colossal titan', 'tita colossal', 'titã colossal'] },
    { q: 'Qual personagem de Naruto se torna o Sétimo Hokage?', a: ['naruto', 'naruto uzumaki'] },
    { q: 'Qual anime acompanha a jornada dos irmãos Elric?', a: ['fullmetal alchemist', 'fma'] },
    { q: 'Qual empresa desenvolveu o jogo Half-Life?', a: ['valve'] },
    { q: 'Qual é o protagonista da série God of War?', a: ['kratos'] },
    { q: 'Qual empresa desenvolveu a franquia Halo?', a: ['bungie', '343 industries'] },
    { q: 'Qual é o encanador famoso da Nintendo?', a: ['mario', 'super mario'] },
    { q: 'Qual jogo popularizou o modo Battle Royale em larga escala em 2017?', a: ['fortnite', 'pubg', 'playerunknowns battlegrounds'] },
    { q: 'Qual console foi lançado pela Sony em 1994?', a: ['playstation', 'ps1'] },
    { q: 'Qual mascote da Sega rivalizava com Mario nos anos 90?', a: ['sonic', 'sonic the hedgehog'] },
    { q: 'Qual empresa criou o sistema operacional Windows?', a: ['microsoft'] },
    { q: 'Qual linguagem é famosa por usar a frase "Hello World"?', a: ['c', 'c++', 'java', 'python'] },
    { q: 'Qual empresa criou o iPhone?', a: ['apple'] },
    { q: 'Qual jogo da Valve envolve portais e puzzles?', a: ['portal'] },
    { q: 'Qual é o nome do protagonista de Red Dead Redemption 2?', a: ['arthur morgan'] },
    { q: 'Qual é o protagonista silencioso de The Legend of Zelda?', a: ['link'] },
    { q: 'Qual empresa desenvolveu Overwatch?', a: ['blizzard'] },
    { q: 'Qual jogo sandbox permite construir com blocos e enfrentar o Ender Dragon?', a: ['minecraft'] },
    { q: 'Qual vilão principal de The Dark Knight é interpretado por Heath Ledger?', a: ['joker', 'coringa'] },
    { q: 'Qual ator interpreta Tony Stark no MCU?', a: ['robert downey jr', 'robert downey junior'] },
    { q: 'Qual planeta é o lar de Luke Skywalker?', a: ['tatooine'] },
    { q: 'Qual super-herói é conhecido como o Homem de Aço?', a: ['superman'] },
    { q: 'Qual herói da Marvel possui um escudo de vibranium?', a: ['capitao america', 'capitão america', 'steve rogers'] },
    { q: 'Qual filme apresenta o personagem Jack Sparrow?', a: ['piratas do caribe', 'pirates of the caribbean'] },
    { q: 'Qual série apresenta o Trono de Ferro?', a: ['game of thrones'] },
    { q: 'Qual dragão aparece em Skyrim como chefe final?', a: ['alduin'] },
    { q: 'Qual empresa criou o motor gráfico Unreal Engine?', a: ['epic games'] },
    { q: 'Qual jogo competitivo popular da Riot Games envolve campeões e lanes?', a: ['league of legends', 'lol'] },
    { q: 'Qual personagem de Street Fighter usa o Hadouken?', a: ['ryu'] },
    { q: 'Qual é o nome da cidade principal de GTA V?', a: ['los santos'] },
    { q: 'Qual jogo da Rockstar se passa no Velho Oeste?', a: ['red dead redemption'] },
    { q: 'Qual empresa desenvolveu The Witcher 3?', a: ['cd projekt red'] },
    { q: 'Qual personagem usa a Master Sword?', a: ['link'] },
    { q: 'Qual super-herói da Marvel é conhecido como o deus do trovão?', a: ['thor'] },
    { q: 'Qual herói usa o traje de morcego em Gotham?', a: ['batman', 'bruce wayne'] },
    { q: 'Qual personagem da Marvel encolhe de tamanho com tecnologia Pym?', a: ['ant-man', 'homem formiga'] },
    { q: 'Qual supervilão da Marvel busca as Joias do Infinito?', a: ['thanos'] },
    { q: 'Qual grupo de heróis reúne Capitão América, Thor e Homem de Ferro?', a: ['vingadores', 'avengers'] },
    { q: 'Qual tecnologia permite criar contratos inteligentes na blockchain do Ethereum?', a: ['smart contract', 'contrato inteligente'] },
    { q: 'Qual criptomoeda foi criada por Satoshi Nakamoto?', a: ['bitcoin'] },
    { q: 'Qual linguagem é mais usada para scripts web ao lado do HTML?', a: ['javascript'] },
    { q: 'Qual banco de dados relacional usa SQL e é muito popular em sistemas web?', a: ['mysql'] },
    { q: 'Qual sistema de controle de versão é o mais usado por desenvolvedores?', a: ['git'] },
    { q: 'Qual plataforma popular hospeda repositórios Git online?', a: ['github'] },
    { q: 'Qual sistema operacional open source foi criado por Linus Torvalds?', a: ['linux'] },
    { q: 'Qual navegador foi criado pelo Google?', a: ['chrome', 'google chrome'] },
    { q: 'Qual empresa criou o Android?', a: ['google'] },
    { q: 'Qual linguagem é famosa pelo mascote pinguim Tux?', a: ['linux'] },
    { q: 'Qual jogo indie envolve um cavaleiro explorando Hallownest?', a: ['hollow knight'] },
    { q: 'Qual jogo indie envolve uma garota escalando uma montanha chamada Celeste?', a: ['celeste'] },
    { q: 'Qual personagem é conhecido como o Doom Slayer?', a: ['doomguy', 'doom slayer'] },
    { q: 'Qual empresa criou a franquia Assassin’s Creed?', a: ['ubisoft'] },
    { q: 'Qual cidade fictícia é o cenário clássico de Batman?', a: ['gotham'] },
    { q: 'Qual personagem é conhecido como o mercenário tagarela da Marvel?', a: ['deadpool'] },
    { q: 'Qual mutante controla o clima nos X-Men?', a: ['storm', 'tempestade'] },
    { q: 'Qual personagem da Marvel possui garras retráteis e fator de cura?', a: ['wolverine', 'logan'] },
    { q: 'Qual jogo popular da Valve é focado em times terroristas e contra-terroristas?', a: ['counter strike', 'cs', 'csgo'] },
    { q: 'Qual personagem é o mascote da franquia Pokémon?', a: ['pikachu'] },
    { q: 'Qual pokémon inicial de fogo da primeira geração é muito famoso?', a: ['charmander'] },
    { q: 'Qual pokémon evolui para Charizard?', a: ['charmeleon', 'charmander'] },
    { q: 'Qual pokémon elétrico rivaliza com Pikachu em popularidade?', a: ['raichu'] },
    { q: 'Qual pokémon lendário é mascote da versão Pokémon Gold?', a: ['ho oh', 'ho-oh'] },
    { q: 'Qual pokémon lendário é mascote da versão Pokémon Silver?', a: ['lugia'] },
    { q: 'Qual personagem de Overwatch controla o tempo?', a: ['tracer'] },
    { q: 'Qual jogo popular da Mojang envolve sobrevivência e crafting?', a: ['minecraft'] },
    { q: 'Qual personagem é conhecido por dizer "War never changes"?', a: ['narrador fallout', 'fallout'] },
    { q: 'Qual empresa criou a franquia Fallout?', a: ['bethesda'] },
    { q: 'Qual RPG da Bethesda se passa em Tamriel?', a: ['elder scrolls', 'skyrim'] },
    { q: 'Qual personagem é o protagonista de Cyberpunk 2077?', a: ['v'] },
    { q: 'Qual megacidade é o cenário principal de Cyberpunk 2077?', a: ['night city'] },
    { q: 'Qual empresa desenvolveu Cyberpunk 2077?', a: ['cd projekt red'] },
    { q: 'Qual hacker famoso usa o pseudônimo Neo em Matrix?', a: ['neo', 'thomas anderson'] },
    { q: 'Qual inteligência artificial domina o mundo em Matrix?', a: ['machines', 'maquinas'] },
    { q: 'Qual planeta é destruído pela Estrela da Morte em Star Wars?', a: ['alderaan'] },
    { q: 'Qual caçador de recompensas usa armadura mandaloriana verde?', a: ['boba fett'] },
    { q: 'Qual série do Disney+ acompanha um mandaloriano e Grogu?', a: ['the mandalorian'] },
    { q: 'Qual apelido carinhoso os fãs deram a Grogu?', a: ['baby yoda'] },
    { q: 'Qual sabre especial possui lâmina negra em Star Wars?', a: ['darksaber'] },
    { q: 'Qual diretor criou a trilogia original de Star Wars?', a: ['george lucas'] },
    { q: 'Qual ator interpretou o Coringa em Joker (2019)?', a: ['joaquin phoenix'] },
    { q: 'Qual ator interpretou o Batman na trilogia de Christopher Nolan?', a: ['christian bale'] },
    { q: 'Qual herói da DC corre extremamente rápido?', a: ['flash'] },
    { q: 'Qual herói aquático da DC é rei de Atlântida?', a: ['aquaman'] },
    { q: 'Qual arma icônica usa munição de plasma em Halo?', a: ['energy sword', 'espada de energia'] },
    { q: 'Qual supersoldado protagonista de Halo?', a: ['master chief'] },
    { q: 'Qual IA companheira de Master Chief?', a: ['cortana'] },
    { q: 'Qual empresa criou o motor Unity?', a: ['unity technologies'] },
    { q: 'Qual engine de jogos da Valve é chamada Source?', a: ['source engine'] },
    { q: 'Qual vilão usa uma máscara preta e controla Gotham no filme The Dark Knight Rises?', a: ['bane'] },
    { q: 'Qual metal fictício compõe o escudo do Capitão América?', a: ['vibranium'] },
    { q: 'Qual herói da Marvel encolhe e cresce usando partículas especiais?', a: ['ant-man'] },
    { q: 'Qual cientista se transforma no Hulk?', a: ['bruce banner'] },
    { q: 'Qual vilão verde é inimigo clássico do Homem-Aranha?', a: ['green goblin', 'duende verde'] },
    { q:'Qual o nome do capitão da 10ª divisão da Gotei 13 em Bleach?', a:['tōshirō hitsugaya','toshirou hitsugaya','hitsugaya'] },
    { q:'Qual organização secreta aparece em Steins Gate manipulando eventos globais?', a:['sern'] },
    { q:'Qual o nome do demônio que faz contrato com Ciel em Black Butler?', a:['sebastian','sebastian michaelis'] },
    { q:'Qual anime acompanha o cientista Okabe manipulando linhas do tempo?', a:['steins gate','steins;gate'] },
    { q:'Qual personagem de Hunter x Hunter usa o poder chamado Bungee Gum?', a:['hisoka'] },
    { q:'Qual o nome do sistema de energia em Hunter x Hunter?', a:['nen'] },
    { q:'Qual capitão de One Piece possui o poder da fruta Ope Ope?', a:['trafalgar law','law','trafalgar d water law'] },
    { q:'Qual é o verdadeiro nome de Pain em Naruto?', a:['nagato'] },
    { q:'Qual bijuu possui oito caudas?', a:['gyuki','hachibi'] },
    { q:'Qual personagem de Attack on Titan é conhecido como Capitão Levi?', a:['levi','levi ackerman'] },
    { q:'Qual cidade serve de cenário principal em Cyberpunk 2077?', a:['night city'] },
    { q:'Qual o nome do cavalo de Geralt em The Witcher?', a:['roach'] },
    { q:'Qual é o nome do continente onde se passa The Witcher?', a:['the continent','continente'] },
    { q:'Qual empresa criou o motor gráfico CryEngine?', a:['crytek'] },
    { q:'Qual é o nome do protagonista de Half Life?', a:['gordon freeman','freeman'] },
    { q:'Qual arma icônica Gordon Freeman utiliza?', a:['crowbar','pé de cabra','pe de cabra'] },
    { q:'Qual empresa criou a franquia Bioshock?', a:['irrational games'] },
    { q:'Qual cidade submersa aparece em Bioshock?', a:['rapture'] },
    { q:'Qual cidade flutuante aparece em Bioshock Infinite?', a:['columbia'] },
    { q:'Qual protagonista usa a hidden blade em Assassin Creed?', a:['ezio','ezio auditore'] },
    { q:'Qual é o nome do vírus em Resident Evil 1?', a:['t virus','t-virus'] },
    { q:'Qual personagem feminina protagoniza Resident Evil 3?', a:['jill valentine','jill'] },
    { q:'Qual policial protagoniza Resident Evil 2?', a:['leon kennedy','leon s kennedy','leon'] },
    { q:'Qual cidade é destruída em Resident Evil 3?', a:['raccoon city'] },
    { q:'Qual vilão persegue o jogador em Resident Evil 3?', a:['nemesis'] },
    { q:'Qual antagonista principal aparece em Resident Evil 5?', a:['albert wesker','wesker'] },
    { q:'Qual empresa criou Silent Hill?', a:['konami'] },
    { q:'Qual protagonista aparece em Silent Hill 2?', a:['james sunderland'] },
    { q:'Qual criatura icônica tem cabeça triangular em Silent Hill?', a:['pyramid head'] },
    { q:'Qual empresa criou Metal Gear?', a:['konami'] },
    { q:'Qual o nome completo de Snake em Metal Gear Solid 3?', a:['naked snake','big boss'] },
    { q:'Qual personagem é rival de Snake em Metal Gear Solid?', a:['liquid snake'] },
    { q:'Qual IA controla o arsenal gear em Metal Gear Solid 2?', a:['gw'] },
    { q:'Qual é o criador da franquia Metal Gear?', a:['hideo kojima'] },
    { q:'Qual jogo da FromSoftware precedeu Dark Souls espiritualmente?', a:['demon souls','demons souls'] },
    { q:'Qual é o nome do mundo em Elden Ring?', a:['lands between'] },
    { q:'Qual personagem narra a introdução de Dark Souls?', a:['narrador'] },
    { q:'Qual chefe famoso de Dark Souls usa martelo gigante?', a:['smough'] },
    { q:'Qual cavaleiro aparece junto de Smough?', a:['ornstein'] },
    { q:'Qual gesto famoso surgiu em Dark Souls?', a:['praise the sun'] },
    { q:'Qual console portátil da Nintendo sucedeu o Game Boy Advance?', a:['nintendo ds','nds'] },
    { q:'Qual console portátil sucedeu o Nintendo DS?', a:['nintendo 3ds','3ds'] },
    { q:'Qual console híbrido foi lançado pela Nintendo em 2017?', a:['nintendo switch','switch'] },
    { q:'Qual empresa criou o Dreamcast?', a:['sega'] },
    { q:'Qual console foi o último da Sega?', a:['dreamcast'] },
    { q:'Qual mascote da Sega usa tênis vermelhos?', a:['sonic'] },
    { q:'Qual rival de Sonic usa duas caudas?', a:['tails','miles tails prower'] },
    { q:'Qual rival sombrio de Sonic aparece em Sonic Adventure 2?', a:['shadow'] },
    { q:'Qual personagem caça recompensas em Metroid?', a:['samus','samus aran'] },
    { q:'Qual raça alienígena é inimiga em Metroid?', a:['metroid'] },
    { q:'Qual empresa criou Doom?', a:['id software'] },
    { q:'Qual personagem protagoniza Doom?', a:['doomguy','doom slayer'] },
    { q:'Qual demônio chefe aparece no final do Doom clássico?', a:['spider mastermind'] },
    { q:'Qual arma icônica de Doom possui dois canos?', a:['super shotgun'] },
    { q:'Qual jogo popularizou o termo frag em multiplayer?', a:['doom','quake'] },
    { q:'Qual empresa criou Quake?', a:['id software'] },
    { q:'Qual motor gráfico famoso foi criado para Quake?', a:['quake engine'] },
    { q:'Qual empresa criou Counter Strike?', a:['valve'] },
    { q:'Qual mapa clássico aparece em Counter Strike?', a:['dust2','de dust2'] },
    { q:'Qual bomba é plantada pelos terroristas em Counter Strike?', a:['c4'] },
    { q:'Qual super-herói da Marvel se chama Peter Parker?', a:['spiderman','homem aranha','spider man'] },
    { q:'Qual vilão é pai de Gamora?', a:['thanos'] },
    { q:'Qual planeta é lar dos asgardianos?', a:['asgard'] },
    { q:'Qual vilão da Marvel manipula o tempo com uma joia?', a:['thanos'] },
    { q:'Qual herói empunha o martelo Mjolnir?', a:['thor'] },
    { q:'Qual herói usa o escudo estrelado?', a:['capitao america','steve rogers'] },
    { q:'Qual herói encolhe usando partículas pym?', a:['ant man','homem formiga'] },
    { q:'Qual herói verde é extremamente forte?', a:['hulk'] },
    { q:'Qual supervilão usa capacete roxo e busca as joias?', a:['thanos'] },
    { q:'Qual organização secreta nazista aparece na Marvel?', a:['hydra'] },
    { q:'Qual diretor criou o universo cinematográfico Star Wars?', a:['george lucas'] },
    { q:'Qual planeta é coberto por gelo e aparece em O Império Contra Ataca?', a:['hoth'] },
    { q:'Qual caçador de recompensas captura Han Solo?', a:['boba fett'] },
    { q:'Qual metal compõe o sabre de luz?', a:['kyber crystal','cristal kyber'] },
    { q:'Qual ordem usa sabres de luz azuis e verdes?', a:['jedi'] },
    { q:'Qual ordem usa sabres vermelhos?', a:['sith'] },
    { q:'Qual mestre treinou Obi Wan?', a:['qui gon jinn'] },
    { q:'Qual aprendiz se torna Darth Vader?', a:['anakin skywalker'] },
    { q:'Qual general lidera o exército droide?', a:['general grievous'] },
    { q:'Qual senador se torna imperador?', a:['palpatine','darth sidious'] },
    { q:'Qual linguagem foi criada por Brendan Eich?', a:['javascript'] },
    { q:'Qual banco de dados NoSQL criado pelo Facebook?', a:['cassandra'] },
    { q:'Qual banco de dados NoSQL criado pela MongoDB Inc?', a:['mongodb'] },
    { q:'Qual linguagem é usada principalmente para Android?', a:['kotlin','java'] },
    { q:'Qual linguagem criada pela Google para substituir Java em Android?', a:['kotlin'] },
    { q:'Qual framework JS criado pelo Facebook?', a:['react'] },
    { q:'Qual runtime permite executar JS no servidor?', a:['nodejs','node'] },
    { q:'Qual sistema operacional domina servidores web?', a:['linux'] },
    { q:'Qual protocolo seguro substitui http?', a:['https'] },
    { q:'Qual protocolo resolve nomes de domínio?', a:['dns'] },
    { q:'Qual protocolo criptografa tráfego web?', a:['tls'] },
    { q:'Qual algoritmo de hash é comum em blockchains?', a:['sha256','sha-256'] },
    { q:'Qual sistema de versionamento distribuído domina o mercado?', a:['git'] },
    { q:'Qual comando git envia commits ao repositório remoto?', a:['git push'] },
    { q:'Qual comando baixa alterações do remoto?', a:['git pull'] },
    { q:'Qual site hospeda repositórios git e pertence à microsoft?', a:['github'] },
    { q:'Qual alternativa open source ao github?', a:['gitlab'] },
    { q:'Qual sistema de containers popular criado pela docker inc?', a:['docker'] },
    { q:'Qual orquestrador de containers criado pelo google?', a:['kubernetes'] },
    { q:'Qual cloud da amazon domina infraestrutura global?', a:['aws'] },
    { q:'Qual cloud do google é chamada gcp?', a:['google cloud'] },
    { q:'Qual cloud da microsoft compete com aws?', a:['azure'] },
    { q:'Qual ferramenta de infraestrutura como código criada pela hashicorp?', a:['terraform'] },
    { q:'Qual linguagem criada pela sun microsystems?', a:['java'] },
    { q:'Qual linguagem criada por guido van rossum?', a:['python'] },
    { q:'Qual linguagem criada por dennis ritchie?', a:['c'] },
    { q:'Qual linguagem é conhecida por ponteiros e baixo nível?', a:['c'] },
    { q:'Qual linguagem é famosa por garbage collection e jvm?', a:['java'] },
    { q:'Qual linguagem é famosa por indentação obrigatória?', a:['python'] },
    { q:'Qual linguagem moderna criada pela google para substituir c++?', a:['go','golang'] },
    { q:'Qual linguagem criada pela mozilla para sistemas seguros?', a:['rust'] },
    { q:'Qual linguagem criada pela apple para ios?', a:['swift'] },
    { q:'Qual linguagem usada em unity para scripts?', a:['c#','csharp'] },
    { q:'Qual linguagem usada principalmente em unreal engine?', a:['c++'] },
    { q:'Qual engine open source criada pela unity technologies?', a:['unity'] },
    { q:'Qual engine popular criada pela epic games?', a:['unreal engine'] },
    { q:'Qual empresa criou fortnite?', a:['epic games'] },
    { q:'Qual modo popular de fortnite envolve 100 jogadores?', a:['battle royale'] },
    { q:'Qual empresa criou pubg?', a:['pubg corporation'] },
    { q:'Qual jogo popularizou auto battler no dota?', a:['dota auto chess'] },
    { q:'Qual empresa criou dota?', a:['valve'] },
    { q:'Qual empresa criou league of legends?', a:['riot games'] },
    { q:'Qual modo competitivo central do lol envolve destruir o nexus?', a:['summoners rift'] },
    { q:'Qual objetivo final em league of legends?', a:['nexus'] },
    { q:'Qual monstro épico concede buff poderoso no lol?', a:['baron nashor'] },
    { q:'Qual dragão concede buffs elementais?', a:['dragon','dragao'] },
    { q:'Qual rank mais alto tradicional no lol?', a:['challenger'] },
    { q:'Qual campeão do lol é conhecido como o rei dos demônios?', a:['swain'] },
    { q:'Qual campeão ninja do lol usa shurikens?', a:['zed'] },
    { q:'Qual campeão do lol manipula cartas?', a:['twisted fate'] },
    { q:'Qual campeão do lol usa barris explosivos?', a:['gangplank'] },
    { q:'Qual campeão do lol controla correntes e lanternas?', a:['thresh'] },
    { q:'Qual campeão do lol é conhecido como o demônio da dor?', a:['eve','evelynn'] },
    { q:'Qual campeão do lol usa cartas douradas para stun?', a:['twisted fate'] },
    { q:'Qual campeão do lol gira com machados?', a:['draven'] },
    { q:'Qual campeão do lol usa um poste como arma?', a:['jax'] },
    { q:'Qual campeão do lol é um espantalho demoníaco?', a:['fiddlesticks'] },
    { q:'Qual campeão do lol controla areia?', a:['azir'] },
    { q:'Qual campeão do lol é um imperador de shurima?', a:['azir'] },
    { q:'Qual campeão do lol é um minotauro?', a:['alistar'] }
  ];

  private async startEnigma() {
    const config = EventService.getConfig().random_events.enigma_challenge;
    const channel = this.getRandomChannel();
    if (!channel) return;

    const pool = EventScheduler.ENIGMAS;
    const queueLength = await redis.llen('enigma:queue');

    if (queueLength === 0) {
      logger.info('[Enigma] Fila vazia, re-embaralhando perguntas...');
      const indices = Array.from({ length: pool.length }, (_, i) => i);
      
      // Fisher-Yates shuffle
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      
      // LPUSH all indices as strings
      await redis.lpush('enigma:queue', ...indices.map(String));
      logger.info(`[Enigma] ${indices.length} perguntas adicionadas à fila.`);
    }

    const rawIndex = await redis.rpop('enigma:queue');
    const index = rawIndex ? parseInt(rawIndex) : Math.floor(Math.random() * pool.length);
    const enigma = pool[index];

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.WARNING)
      .setTitle('🧩 DESAFIO DO ENIGMA!')
      .setDescription(`O primeiro a responder corretamente ganha uma recompensa!\n\n**Pergunta:** ${enigma.q}`)
      .setFooter({ text: 'Responda no chat para ganhar! (60 segundos)' });

    const msg = await channel.send({ embeds: [embed] });

    const collector = channel.createMessageCollector({
      filter: m => {
        const answer = m.content.toLowerCase().trim();
        return !m.author.bot && enigma.a.some(a => answer.includes(a.toLowerCase()));
      },
      max: 1,
      time: 60000
    });

    collector.on('collect', async m => {
      const reward = Math.floor(Math.random() * (config.reward_max - config.reward_min + 1)) + config.reward_min;
      await prisma.economy.upsert({
        where: { userId: m.author.id },
        update: { wallet: { increment: BigInt(reward) } },
        create: { userId: m.author.id, wallet: BigInt(reward) }
      });

      await m.reply(`🎉 **CORRETO!** Você resolveu o enigma e ganhou **${reward}** dracmas!`);
    });

    collector.on('end', (collected) => {
      collector.removeAllListeners();
      if (collected.size === 0) {
        const correctAnswers = enigma.a.join(', ');
        channel.send(`⏰ **Tempo esgotado!** Ninguém acertou. A resposta era: **${correctAnswers}**`);
      }
    });
  }

  private async startDiamond() {
    const config = EventService.getConfig().random_events.diamond_reaction;
    const channel = this.getRandomChannel();
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.PRIMARY)
      .setTitle('💎 DIAMANTE APARECEU!')
      .setDescription(config.message)
      .setFooter({ text: 'Seja rápido!' });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('diamond_claim')
        .setLabel('💎 Coletar Diamante')
        .setStyle(ButtonStyle.Success)
    );

    const msg = await channel.send({ embeds: [embed], components: [row] });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      max: 1,
      time: 30000
    });

    collector.on('collect', async (i: any) => {
      if (i.customId !== 'diamond_claim') return;

      const user = i.user;

      await prisma.economy.upsert({
        where: { userId: user.id },
        update: { wallet: { increment: BigInt(config.reward) } },
        create: { userId: user.id, wallet: BigInt(config.reward) }
      });

      const updatedRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('diamond_claim')
          .setLabel(`💎 Coletado por ${user.username}`)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      );

      await i.update({ components: [updatedRow] }).catch(() => { });
      await channel.send(`💎 **${user.username}** foi o mais rápido e coletou o diamante de **${config.reward}** dracmas!`);
    });

    collector.on('end', async (collected) => {
      collector.removeAllListeners();
      if (collected.size === 0) {
        const updatedRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId('diamond_claim_expired')
            .setLabel('💎 Diamante Perdido')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
        );
        await msg.edit({ components: [updatedRow] }).catch(() => { });
      }
    });
  }

  private async startMoneyRain() {
    const config = EventService.getConfig().random_events.money_rain;
    EventService.startRandomEvent(EventType.MONEY_RAIN, config.duration_minutes);

    const channel = this.getRandomChannel();
    if (channel) {
      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(EMBED_COLORS.SUCCESS)
            .setTitle('💸 CHUVA DE DRACMAS!')
            .setDescription(config.message.replace('{duration}', config.duration_minutes.toString()))
            .setFooter({ text: EMBED_CREDIT })
        ]
      });
    }
  }

  private async startHotZone() {
    const config = EventService.getConfig().random_events.hot_zone;
    const channel = this.getRandomChannel();
    if (!channel) return;

    EventService.startRandomEvent(EventType.HOT_ZONE, config.duration_minutes, { channelId: channel.id });

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(EMBED_COLORS.WARNING)
          .setTitle('🔥 ZONA QUENTE ATIVADA!')
          .setDescription(config.message
            .replace('{channel}', channel.toString())
            .replace('{multiplier}', config.xp_multiplier.toString())
            .replace('{duration}', config.duration_minutes.toString()))
          .setFooter({ text: EMBED_CREDIT })
      ]
    });
  }

  private async checkDailyDeals() {
    const now = new Date();
    if (now.getHours() !== 0) return; // Rodar apenas na primeira hora do dia

    const config = EventService.getConfig().fixed_events.daily_shop_deals;
    if (!config.enabled || !config.notification_channel_id) return;

    try {
      const items = await prisma.shopItem.findMany();
      if (items.length === 0) return;

      // Sortear itens para desconto
      const shuffled = items.sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, config.max_items);

      const channel = this.client.channels.cache.get(config.notification_channel_id) as TextChannel;
      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor(EMBED_COLORS.PRIMARY)
        .setTitle('🏷️ OFERTAS DO DIA!')
        .setDescription('Os seguintes itens estão com **30% de desconto** apenas hoje!')
        .setFooter({ text: EMBED_CREDIT })
        .setTimestamp();

      const row = new ActionRowBuilder<ButtonBuilder>();

      selected.forEach((item: any) => {
        const discountedPrice = Math.floor(item.price * (1 - config.discount_percentage));
        embed.addFields({
          name: `${item.icon || '📦'} ${item.name}`,
          value: `~~${item.price}~~ por **${discountedPrice}** dracmas`,
          inline: true
        });

        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`buy_${item.id}`)
            .setLabel(`Comprar ${item.name}`)
            .setStyle(ButtonStyle.Success)
        );
      });

      await channel.send({ embeds: [embed], components: [row] });
      logger.info('Ofertas diárias enviadas.');

    } catch (error: any) {
      logger.error('Erro ao gerar ofertas diárias:', error);
    }
  }

  /**
   * Gets a random eligible channel respecting whitelist and blacklist.
   * If whitelist_channels has entries, ONLY those channels are used.
   * Otherwise, all text channels are used EXCEPT blacklisted ones and blacklisted categories.
   */
  private getRandomChannel(): TextChannel | null {
    const guild = this.client.guilds.cache.first();
    if (!guild) return null;

    const config = EventService.getConfig();
    const whitelistChannels: string[] = config.whitelist_channels || [];
    const blacklistChannels: string[] = config.blacklist_channels || [];
    const blacklistCategories: string[] = config.blacklist_categories || [];

    let channels;

    if (whitelistChannels.length > 0) {
      // Whitelist mode: only use whitelisted channels
      channels = guild.channels.cache.filter(c =>
        c.isTextBased() &&
        !c.isDMBased() &&
        whitelistChannels.includes(c.id)
      );
    } else {
      // Blacklist mode: use all channels except blacklisted
      channels = guild.channels.cache.filter(c =>
        c.isTextBased() &&
        !c.isDMBased() &&
        !blacklistChannels.includes(c.id) &&
        !blacklistCategories.includes(c.parentId ?? '')
      );
    }

    if (channels.size === 0) return null;
    return channels.random() as TextChannel;
  }

}
