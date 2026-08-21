import type { BotContext } from '../context';
import type { Db } from '@realpalpitefc/database';
import {
  msgMainMenu,
  msgChampionships,
  msgNoChampionships,
  msgHowToPlay,
  msgTodayMatches,
  msgOpenPools,
  type OpenPoolChampGroup,
  type OpenPoolEntry,
} from '../formatters/messages';
import { kbMainMenu, kbChampionships, kbTodayMatches, kbOpenPools, kbBackToMenu } from '../keyboards/keyboards';

function safeEdit(ctx: BotContext, text: string, extra: Record<string, unknown>) {
  return ctx.editMessageText(text, extra as never)
    .catch((err: any) => {
      if (String(err?.description ?? err?.message ?? '').includes('message is not modified')) return;
      return ctx.reply(text, extra as never);
    });
}

export function registerMenuActions(bot: { action: (...args: unknown[]) => void }, db: Db) {
  // Menu principal
  (bot as any).action('menu', async (ctx: BotContext) => {
    await ctx.answerCbQuery();
    const user = ctx.session.user!;
    await safeEdit(ctx, msgMainMenu(user.virtual_balance), {
      parse_mode: 'Markdown',
      reply_markup: kbMainMenu().reply_markup,
    });
  });

  // Listas Globais → lista de campeonatos
  (bot as any).action('gl_ch', async (ctx: BotContext) => {
    await ctx.answerCbQuery();
    const now = new Date();
    const in21Days = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);
    const championships = await db.championships.findActiveWithUpcomingMatches(now, in21Days);

    if (championships.length === 0) {
      await safeEdit(ctx, msgNoChampionships(), {
        parse_mode: 'Markdown',
        reply_markup: kbBackToMenu().reply_markup,
      });
      return;
    }

    await safeEdit(ctx, msgChampionships(), {
      parse_mode: 'Markdown',
      reply_markup: kbChampionships(championships).reply_markup,
    });
  });

  // Bolões Abertos — pools com status open E ao menos 1 participante, com contagem e prêmio estimado
  (bot as any).action('gl_open', async (ctx: BotContext) => {
    await ctx.answerCbQuery();

    const { data: pools } = await db.client
      .from('pools')
      .select('id, modality, tier_brl, ghost_count, match_id, matches(id, home_team, away_team, kickoff_at, championships(name))')
      .eq('status', 'open')
      .eq('type', 'global')
      .order('match_id');

    const poolIds = (pools ?? []).map((p: any) => p.id);
    let statsMap = new Map<string, { count: number; total: number }>();

    if (poolIds.length > 0) {
      const { data: entries } = await db.client
        .from('entries')
        .select('pool_id, amount')
        .in('pool_id', poolIds);

      for (const e of entries ?? []) {
        const s = statsMap.get(e.pool_id) ?? { count: 0, total: 0 };
        s.count++;
        s.total += Number(e.amount);
        statsMap.set(e.pool_id, s);
      }
    }

    // Agrupa: campeonato → partida → pools (apenas pools com ao menos 1 participante, real ou fantasma)
    const champMap = new Map<string, { champName: string; matchMap: Map<string, { match: any; pools: OpenPoolEntry[] }> }>();

    const nowPlus5 = Date.now() + 5 * 60 * 1000;

    for (const pool of pools ?? []) {
      const tierBrl = Number((pool as any).tier_brl);
      const ghostCount = Number((pool as any).ghost_count ?? 0);
      const real = statsMap.get((pool as any).id) ?? { count: 0, total: 0 };
      const totalCount = real.count + ghostCount;

      if (totalCount === 0) continue; // pula pools realmente vazios

      const match = (pool as any).matches as any;
      if (!match) continue;

      // Oculta pools cujo jogo já começou ou começa em menos de 5 minutos
      if (new Date(match.kickoff_at).getTime() <= nowPlus5) continue;
      const champName = match.championships?.name ?? 'Outros';
      const matchId = match.id;

      if (!champMap.has(champName)) champMap.set(champName, { champName, matchMap: new Map() });
      const { matchMap } = champMap.get(champName)!;
      if (!matchMap.has(matchId)) matchMap.set(matchId, { match, pools: [] });

      const entry: OpenPoolEntry = {
        id: (pool as any).id,
        modality: (pool as any).modality,
        tierBrl,
        participants: totalCount,
        estimatedPrize: (real.total + ghostCount * tierBrl) * 0.95,
      };
      matchMap.get(matchId)!.pools.push(entry);
    }

    const groups: OpenPoolChampGroup[] = [...champMap.values()].map(g => ({
      champName: g.champName,
      matches: [...g.matchMap.values()].sort(
        (a, b) => new Date(a.match.kickoff_at).getTime() - new Date(b.match.kickoff_at).getTime(),
      ),
    }));

    await safeEdit(ctx, msgOpenPools(groups), {
      parse_mode: 'Markdown',
      reply_markup: kbOpenPools(groups).reply_markup,
    });
  });

  // Jogos de Hoje — partidas do dia agrupadas por campeonato
  (bot as any).action('gl_today', async (ctx: BotContext) => {
    await ctx.answerCbQuery();

    // Meia-noite e fim do dia no horário de Brasília (UTC-3)
    const nowBR = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const todayBR = nowBR.toISOString().split('T')[0];
    const startUTC = new Date(todayBR + 'T03:00:00.000Z');
    const endUTC = new Date(startUTC.getTime() + 24 * 60 * 60 * 1000);

    const cutoffUTC = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { data: rows } = await db.client
      .from('matches')
      .select('*, championships(name)')
      .eq('status', 'scheduled')
      .gte('kickoff_at', startUTC.toISOString())
      .lt('kickoff_at', endUTC.toISOString())
      .gt('kickoff_at', cutoffUTC)
      .order('kickoff_at', { ascending: true });

    // Agrupa por campeonato preservando ordem cronológica
    const groupMap = new Map<string, { champName: string; matches: any[] }>();
    for (const m of rows ?? []) {
      const champName = (m.championships as any)?.name ?? 'Outros';
      if (!groupMap.has(champName)) groupMap.set(champName, { champName, matches: [] });
      groupMap.get(champName)!.matches.push(m);
    }
    const groups = [...groupMap.values()] as Array<{ champName: string; matches: any[] }>;

    await safeEdit(ctx, msgTodayMatches(groups), {
      parse_mode: 'Markdown',
      reply_markup: kbTodayMatches(groups).reply_markup,
    });
  });

  // Minhas Entradas — delegado para registerMyEntriesActions

  // Como Jogar
  (bot as any).action('how_to_play', async (ctx: BotContext) => {
    await ctx.answerCbQuery();
    await safeEdit(ctx, msgHowToPlay(), {
      parse_mode: 'Markdown',
      reply_markup: kbBackToMenu().reply_markup,
    });
  });
}
