import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { Telegraf, Scenes, session } from 'telegraf';
import { Db } from '@realpalpitefc/database';
import { EspnAdapter, FootballDataAdapter, SportsDataService } from '@realpalpitefc/sports-data';
import type { BotContext } from './context';

import { authMiddleware } from './middleware/auth.middleware';
import { startCommand } from './commands/start.command';
import { extratoCommand } from './commands/extrato.command';
import { registerMenuActions } from './actions/menu.actions';
import { registerMatchesActions } from './actions/matches.actions';
import { registerPoolsActions } from './actions/pools.actions';
import { registerMyEntriesActions } from './actions/my-entries.actions';
import { registerPrivatePoolsActions } from './actions/private-pools.actions';
import { buildCreatePoolScene, CREATE_POOL_SCENE } from './scenes/create-pool.scene';
import { startClosePoolsCron } from './cron/close-pools.cron';
import { startCheckResultsCron } from './cron/check-results.cron';
import { startMatchSyncCron } from './services/sync-matches.service';

// ── Validação de variáveis de ambiente ────────────────────────────────────
const { TELEGRAM_BOT_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FOOTBALL_DATA_API_KEY } =
  process.env;

if (!TELEGRAM_BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN não definido no .env');
if (!SUPABASE_URL) throw new Error('SUPABASE_URL não definido no .env');
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY não definido no .env');

// ── Inicialização das dependências ────────────────────────────────────────
const db = new Db(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const sportsData = new SportsDataService(
  new EspnAdapter(),
  new FootballDataAdapter(FOOTBALL_DATA_API_KEY ?? ''),
);

// ── Bot ────────────────────────────────────────────────────────────────────
const bot = new Telegraf<BotContext>(TELEGRAM_BOT_TOKEN);

// Scenes
const createPoolScene = buildCreatePoolScene(db);
const stage = new Scenes.Stage<BotContext>([createPoolScene]);

// Middleware (ordem importa)
bot.use(session());
bot.use(stage.middleware());
bot.use(authMiddleware(db));

// Comandos de texto
bot.command('start', startCommand(db));
bot.command('extrato', extratoCommand(db));
bot.command('criarlista', ctx => ctx.scene.enter(CREATE_POOL_SCENE));
bot.command('menu', ctx =>
  ctx.reply('🏠 Menu Principal', {
    reply_markup: require('./keyboards/keyboards').kbMainMenu().reply_markup,
  }),
);

// Ações de callback (inline keyboard)
registerMenuActions(bot as never, db);
registerMatchesActions(bot as never, db);
registerPoolsActions(bot as never, db);
registerMyEntriesActions(bot as never, db);
registerPrivatePoolsActions(bot as never, db);

// Ação para entrar na cena de criação de lista
(bot as any).action('cp', (ctx: BotContext) => {
  ctx.answerCbQuery();
  return ctx.scene.enter(CREATE_POOL_SCENE);
});

// Tratamento global de erros
bot.catch((err: unknown, ctx: BotContext) => {
  console.error(`[bot] Erro no handler de ${ctx.updateType}:`, err);
  ctx
    .reply('⚠️ Ocorreu um erro inesperado. Tente novamente em instantes.')
    .catch(() => {});
});

// ── Inicialização ─────────────────────────────────────────────────────────
async function main() {
  startMatchSyncCron(db, sportsData);
  startClosePoolsCron(db, bot);
  startCheckResultsCron(db, sportsData, bot);

  // Verifica conexão com Telegram antes de iniciar polling
  const me = await bot.telegram.getMe();
  console.log(`🤖 @${me.username} iniciado (long-polling)`);
  await bot.launch();

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

main().catch(err => {
  console.error('[main] Falha ao iniciar o bot:', err);
  process.exit(1);
});
