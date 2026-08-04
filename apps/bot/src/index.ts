import http from 'http';
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
import { carteiraCommand, registerCarteiraActions } from './commands/carteira.command';
import { registerMenuActions } from './actions/menu.actions';
import { registerMinhaContaActions } from './actions/minha-conta.actions';
import { registerMatchesActions } from './actions/matches.actions';
import { registerPoolsActions } from './actions/pools.actions';
import { registerMyEntriesActions } from './actions/my-entries.actions';
import { registerPrivatePoolsActions } from './actions/private-pools.actions';
import { buildCreatePoolScene, CREATE_POOL_SCENE } from './scenes/create-pool.scene';
import { buildDepositarScene, DEPOSITAR_SCENE } from './scenes/depositar.scene';
import { buildSacarScene, SACAR_SCENE, handleSacarOk } from './scenes/sacar.scene';
import { buildAlterarPixScene, ALTERAR_PIX_SCENE } from './scenes/alterar-pix.scene';
import { startClosePoolsCron } from './cron/close-pools.cron';
import { startCheckResultsCron } from './cron/check-results.cron';
import { startMatchSyncCron, syncMatches } from './services/sync-matches.service';
import { MercadoPagoService } from './services/mercadopago.service';
import { fmtBrl } from './formatters/messages';

// ── Validação de variáveis de ambiente ────────────────────────────────────
const {
  TELEGRAM_BOT_TOKEN,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  FOOTBALL_DATA_API_KEY,
  MP_ACCESS_TOKEN,
} = process.env;

if (!TELEGRAM_BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN não definido no .env');
if (!SUPABASE_URL) throw new Error('SUPABASE_URL não definido no .env');
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY não definido no .env');

if (!MP_ACCESS_TOKEN) {
  console.warn('[pix] MP_ACCESS_TOKEN não definido — comandos /depositar e /sacar estarão desabilitados');
}

// ── Inicialização das dependências ────────────────────────────────────────
const db = new Db(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const sportsData = new SportsDataService(
  new EspnAdapter(),
  new FootballDataAdapter(FOOTBALL_DATA_API_KEY ?? ''),
);

const mp = new MercadoPagoService(MP_ACCESS_TOKEN ?? '');

// ── Bot ────────────────────────────────────────────────────────────────────
const bot = new Telegraf<BotContext>(TELEGRAM_BOT_TOKEN);

// Scenes
const createPoolScene  = buildCreatePoolScene(db);
const depositarScene   = buildDepositarScene(db, mp);
const sacarScene       = buildSacarScene(db, mp);
const alterarPixScene  = buildAlterarPixScene(db);
const stage = new Scenes.Stage<BotContext>([createPoolScene, depositarScene, sacarScene, alterarPixScene]);

// Middleware (ordem importa)
bot.use(session());
bot.use(stage.middleware());
bot.use(authMiddleware(db));

// Comandos de texto
bot.command('start',     startCommand(db));
bot.command('extrato',   extratoCommand(db));
bot.command('carteira',  carteiraCommand(db));
bot.command('depositar', ctx => ctx.scene.enter(DEPOSITAR_SCENE));
bot.command('sacar',     ctx => ctx.scene.enter(SACAR_SCENE));
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
registerCarteiraActions(bot as never, db);
registerMinhaContaActions(bot as never, db);

// Ação para entrar na cena de criação de lista
(bot as any).action('cp', (ctx: BotContext) => {
  ctx.answerCbQuery();
  return ctx.scene.enter(CREATE_POOL_SCENE);
});

// Confirmação e cancelamento do fluxo de saque
(bot as any).action('sacar_ok', (ctx: BotContext) => handleSacarOk(ctx, db, mp));
(bot as any).action('sacar_cancel', async (ctx: BotContext) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText('Saque cancelado.');
  return ctx.scene.leave();
});

// Tratamento global de erros
bot.catch((err: unknown, ctx: BotContext) => {
  console.error(`[bot] Erro no handler de ${ctx.updateType}:`, err);
  ctx.reply('⚠️ Ocorreu um erro inesperado. Tente novamente em instantes.').catch(() => {});
});

// ── Webhook PIX (Mercado Pago) ─────────────────────────────────────────────
function parseJsonBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(raw)); }
      catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

async function handlePixWebhook(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<void> {
  try {
    // C-1: Valida token de segurança na URL (?token=WEBHOOK_SECRET)
    const webhookSecret = process.env.WEBHOOK_SECRET;
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (!webhookSecret || url.searchParams.get('token') !== webhookSecret) {
      res.writeHead(401);
      res.end('Unauthorized');
      return;
    }

    const body = (await parseJsonBody(req)) as {
      type?: string;
      data?: { id?: string };
    };

    // MP notifica pagamentos com type === "payment"
    if (body.type !== 'payment' || !body.data?.id) {
      res.writeHead(200);
      res.end('OK');
      return;
    }

    const mpPaymentId = body.data.id;
    const payment = await mp.getPayment(mpPaymentId);

    if (payment.status !== 'approved') {
      res.writeHead(200);
      res.end('OK');
      return;
    }

    // Localiza o depósito pelo ID do pagamento MP
    const deposit = await db.pixDeposits.findByMpPaymentId(mpPaymentId);
    if (!deposit) {
      res.writeHead(200);
      res.end('OK');
      return;
    }

    // C-2: Confirmação atômica — apenas se ainda estiver 'pending' (idempotente)
    const confirmed = await db.pixDeposits.confirmIfPending(deposit.id, new Date());
    if (!confirmed) {
      // Já foi processado por um webhook anterior (retry do MP)
      res.writeHead(200);
      res.end('OK');
      return;
    }

    // Credita o saldo atomicamente
    const user = await db.users.findById(deposit.user_id);
    if (!user) throw new Error(`User ${deposit.user_id} not found`);

    const newBalance = await db.users.creditBalance(user.id, deposit.amount);

    await db.transactions.create({
      user_id: user.id,
      type: 'deposit',
      amount: deposit.amount,
      balance_after: newBalance,
      description: 'Depósito PIX confirmado',
    });

    // Notifica o usuário via Telegram
    bot.telegram
      .sendMessage(
        user.telegram_id,
        `✅ *Depósito confirmado!*\n\n` +
          `💰 *${fmtBrl(deposit.amount)}* creditados ao seu saldo.\n` +
          `Saldo atual: *${fmtBrl(newBalance)}*`,
        { parse_mode: 'Markdown' },
      )
      .catch(() => {});

    res.writeHead(200);
    res.end('OK');
  } catch (err) {
    console.error('[pix webhook]', err);
    res.writeHead(500);
    res.end('Error');
  }
}

// ── Inicialização ─────────────────────────────────────────────────────────
async function main() {
  startMatchSyncCron(db, sportsData);
  startClosePoolsCron(db, bot);
  startCheckResultsCron(db, sportsData, bot);

  const me = await bot.telegram.getMe();
  const webhookDomain = process.env.RENDER_EXTERNAL_URL;

  if (webhookDomain) {
    const port = parseInt(process.env.PORT ?? '3000', 10);
    const webhookPath = '/webhook';

    await bot.telegram.setWebhook(`${webhookDomain}${webhookPath}`);
    const webhookCallback = bot.webhookCallback(webhookPath);

    http
      .createServer((req, res) => {
        if (req.url === '/health') {
          res.writeHead(200);
          res.end('OK');
          return;
        }
        if (req.url?.startsWith('/pix/webhook') && req.method === 'POST') {
          handlePixWebhook(req, res);
          return;
        }
        if (req.url === '/api/sync' && req.method === 'POST') {
          const syncSecret = process.env.BOT_SYNC_SECRET;
          if (!syncSecret || req.headers['authorization'] !== `Bearer ${syncSecret}`) {
            res.writeHead(401);
            res.end('Unauthorized');
            return;
          }
          syncMatches(db, sportsData)
            .then(result => {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(result));
            })
            .catch(err => {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: String(err) }));
            });
          return;
        }
        webhookCallback(req, res);
      })
      .listen(port);

    console.log(`🤖 @${me.username} iniciado (webhook) — ${webhookDomain}${webhookPath} porta ${port}`);
    console.log(`💳 PIX webhook em ${webhookDomain}/pix/webhook`);
  } else {
    await bot.launch();
    console.log(`🤖 @${me.username} iniciado (long-polling)`);
  }

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

main().catch(err => {
  console.error('[main] Falha ao iniciar o bot:', err);
  process.exit(1);
});
