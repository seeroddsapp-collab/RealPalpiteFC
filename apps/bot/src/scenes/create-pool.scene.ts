import { Scenes } from 'telegraf';
import type { BotContext, CreatePoolSession } from '../context';
import type { Db } from '@realpalpitefc/database';
import {
  kbWizardChampionships,
  kbWizardMatches,
  kbWizardModality,
  kbWizardGoalThreshold,
  kbWizardConfirm,
  kbBackToMenu,
} from '../keyboards/keyboards';
import { fmtDate, fmtModality } from '../formatters/messages';

export const CREATE_POOL_SCENE = 'create_pool';

export function buildCreatePoolScene(db: Db): Scenes.WizardScene<BotContext> {
  const wizard = new Scenes.WizardScene<BotContext>(
    CREATE_POOL_SCENE,

    // Step 0 — selecionar campeonato
    async ctx => {
      ctx.session.createPool = {};
      const championships = await db.championships.findActive();
      await ctx.reply('🆕 *Criar lista privada*\n\nEscolha o campeonato:', {
        parse_mode: 'Markdown',
        reply_markup: kbWizardChampionships(championships).reply_markup,
      });
      return ctx.wizard.next();
    },

    // Step 1 — selecionar partida
    async ctx => {
      if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
      const data = ctx.callbackQuery.data;

      if (data === 'wiz_cancel') { await exitWizard(ctx); return; }
      if (!data.startsWith('wiz_ch:')) return;

      const champId = data.slice('wiz_ch:'.length);
      const champ   = await db.championships.findById(champId);
      if (!champ) return;

      ctx.session.createPool = { champId, champName: champ.name };

      const now       = new Date();
      const weekAhead = new Date(now.getTime() + 7 * 86_400_000);
      const matches   = await db.matches.findByChampionship(champId, now, weekAhead);

      await ctx.editMessageText(`📅 *${champ.name}* — Escolha a partida:`, {
        parse_mode: 'Markdown',
        reply_markup: kbWizardMatches(matches).reply_markup,
      });
      return ctx.wizard.next();
    },

    // Step 2 — selecionar modalidade
    async ctx => {
      if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
      const data = ctx.callbackQuery.data;

      if (data === 'wiz_cancel') { await exitWizard(ctx); return; }
      if (data === 'wiz_back_ch') { return ctx.wizard.back(); }
      if (!data.startsWith('wiz_m:')) return;

      const matchId = data.slice('wiz_m:'.length);
      const match   = await db.matches.findById(matchId);
      if (!match) return;

      ctx.session.createPool = {
        ...ctx.session.createPool,
        matchId,
        matchLabel: `${match.home_team} × ${match.away_team} — ${fmtDate(match.kickoff_at)}`,
      };

      await ctx.editMessageText('🎯 *Escolha a modalidade:*', {
        parse_mode: 'Markdown',
        reply_markup: kbWizardModality().reply_markup,
      });
      return ctx.wizard.next();
    },

    // Step 3 — selecionar modalidade (recebe callback) e ramifica:
    //   total_de_gols → step 4 (threshold)
    //   outros        → step 5 (valor)
    async ctx => {
      if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
      const data = ctx.callbackQuery.data;

      if (data === 'wiz_cancel') { await exitWizard(ctx); return; }
      if (!data.startsWith('wiz_mod:')) return;

      const modality = data.slice('wiz_mod:'.length) as CreatePoolSession['modality'];
      ctx.session.createPool = { ...ctx.session.createPool, modality };

      if (modality === 'total_de_gols') {
        await ctx.editMessageText(
          '⚽ *Total de Gols — Escolha o threshold:*\n\n' +
          '_1.5 → 0 ou 1 gol / 2 ou mais_\n' +
          '_2.5 → 0–2 gols / 3 ou mais_\n' +
          '_3.5 → 0–3 gols / 4 ou mais_',
          { parse_mode: 'Markdown', reply_markup: kbWizardGoalThreshold().reply_markup },
        );
        return ctx.wizard.selectStep(4);
      }

      await ctx.editMessageText(
        '💰 *Qual o valor da entrada?*\n\nDigite um valor em R$ (ex: 10.00):',
        { parse_mode: 'Markdown' },
      );
      return ctx.wizard.selectStep(5);
    },

    // Step 4 — selecionar threshold (apenas total_de_gols)
    async ctx => {
      if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
      const data = ctx.callbackQuery.data;

      if (data === 'wiz_cancel') { await exitWizard(ctx); return; }
      if (!data.startsWith('wiz_thr:')) return;

      const goalThreshold = parseFloat(data.slice('wiz_thr:'.length));
      ctx.session.createPool = { ...ctx.session.createPool, goalThreshold };

      await ctx.editMessageText(
        `💰 *Qual o valor da entrada?*\n\n_Threshold selecionado: ${goalThreshold} gols_\n\nDigite um valor em R$ (ex: 10.00):`,
        { parse_mode: 'Markdown' },
      );
      return ctx.wizard.next(); // → step 5
    },

    // Step 5 — digitar valor do tier
    async ctx => {
      if (!ctx.message || !('text' in ctx.message)) return;

      const tierStr = ctx.message.text.replace(',', '.').trim();
      const tier    = parseFloat(tierStr);

      if (isNaN(tier) || tier < 1) {
        await ctx.reply('❌ Valor invalido. Digite um numero maior que R$1,00 (ex: 10.00):');
        return;
      }

      const { champName, matchLabel, modality, goalThreshold } = ctx.session.createPool ?? {};
      if (!modality) { await exitWizard(ctx); return; }

      ctx.session.createPool = { ...ctx.session.createPool, tier };

      const thrLine = goalThreshold ? `\n⚽ Threshold: ${goalThreshold} gols` : '';
      const summary =
        `📋 *Resumo da lista privada:*\n\n` +
        `🏆 Campeonato: ${champName}\n` +
        `⚽ Partida: ${matchLabel}\n` +
        `🎯 Modalidade: ${fmtModality(modality as never)}${thrLine}\n` +
        `💰 Valor: R$${tier.toFixed(2)}\n\n` +
        `Confirmar criacao?`;

      await ctx.reply(summary, {
        parse_mode: 'Markdown',
        reply_markup: kbWizardConfirm().reply_markup,
      });
      return ctx.wizard.next(); // → step 6
    },

    // Step 6 — processar criação
    async ctx => {
      if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
      const data = ctx.callbackQuery.data;

      if (data === 'wiz_cancel') { await exitWizard(ctx); return; }
      if (data !== 'wiz_confirm') return;

      const { matchId, modality, goalThreshold, tier } = ctx.session.createPool ?? {};
      if (!matchId || !modality || !tier) { await exitWizard(ctx); return; }

      try {
        const pool = await db.pools.create({
          match_id:       matchId,
          modality:       modality as never,
          tier_brl:       tier,
          type:           'private',
          goal_threshold: goalThreshold ?? null,
          created_by:     ctx.session.user!.id,
        });

        const botUsername = (ctx as any).botInfo?.username ?? 'bot';
        const shareLink   = `https://t.me/${botUsername}?start=join_${pool.id}`;

        await ctx.editMessageText(
          `✅ *Lista privada criada!*\n\n` +
          `Compartilhe o link abaixo com seus amigos:\n\n` +
          `🔗 ${shareLink}`,
          {
            parse_mode: 'Markdown',
            reply_markup: kbBackToMenu().reply_markup,
          },
        );
      } catch (err) {
        console.error('[create-pool] Erro:', err);
        await ctx.reply('⚠️ Erro ao criar lista. Tente novamente.');
      }

      ctx.session.createPool = undefined;
      return ctx.scene.leave();
    },
  );

  return wizard;
}

async function exitWizard(ctx: BotContext) {
  await ctx.reply('❌ Criacao de lista cancelada.', {
    reply_markup: kbBackToMenu().reply_markup,
  });
  ctx.session.createPool = undefined;
  return ctx.scene.leave();
}
