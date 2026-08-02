import { Markup } from 'telegraf';
import type { ChampionshipRow, MatchRow, PoolRow } from '@realpalpitefc/database';
import { fmtDate, fmtModality } from '../formatters/messages';

export function kbMainMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🌐 Listas Globais', 'gl_ch')],
    [Markup.button.callback('📋 Minhas Entradas', 'me')],
    [Markup.button.callback('🔒 Minhas Listas', 'my_pools')],
    [Markup.button.callback('➕ Criar Lista Privada', 'cp')],
    [Markup.button.callback('❓ Como Jogar', 'how_to_play')],
  ]);
}

export function kbChampionships(championships: ChampionshipRow[]) {
  const rows = championships.map(c => [Markup.button.callback(c.name, `gl_m:${c.id}`)]);
  rows.push([Markup.button.callback('🏠 Menu', 'menu')]);
  return Markup.inlineKeyboard(rows);
}

export function kbMatches(matches: MatchRow[]) {
  if (matches.length === 0) {
    return Markup.inlineKeyboard([[Markup.button.callback('⬅️ Campeonatos', 'gl_ch')]]);
  }
  const rows = matches.map(m => {
    const label = `${m.home_team} × ${m.away_team} — ${fmtDate(m.kickoff_at)}`;
    return [Markup.button.callback(label, `gl_p:${m.id}`)];
  });
  rows.push([Markup.button.callback('⬅️ Campeonatos', 'gl_ch')]);
  return Markup.inlineKeyboard(rows);
}

export function kbTierSelect(tiers: number[], matchId: string) {
  const rows = tiers.map(t => [Markup.button.callback(`💰 R$ ${t}`, `gl_tier:${matchId}:${t}`)]);
  rows.push([Markup.button.callback('⬅️ Campeonatos', 'gl_ch')]);
  return Markup.inlineKeyboard(rows);
}

export function kbPools(pools: PoolRow[], matchId: string, entryCounts: Record<string, number> = {}) {
  if (pools.length === 0) {
    return Markup.inlineKeyboard([[Markup.button.callback('⬅️ Escolher valor', `gl_p:${matchId}`)]]);
  }
  const rows = pools.map(p => {
    const tipo = p.type === 'global' ? '🌐' : '🔒';
    const count = entryCounts[p.id] ?? 0;
    const jogadores = count === 1 ? '1 jogador' : `${count} jogadores`;
    const modalLabel = fmtModality(p.modality);
    const label = `${tipo} ${modalLabel} · ${jogadores}`;
    return [Markup.button.callback(label, `gl_e:${p.id}`)];
  });
  rows.push([Markup.button.callback('⬅️ Escolher valor', `gl_p:${matchId}`)]);
  return Markup.inlineKeyboard(rows);
}

export function kbPrediction(pool: PoolRow, matchId: string) {
  const back = [Markup.button.callback('⬅️ Voltar', `gl_p:${matchId}`)];

  switch (pool.modality) {
    case 'dupla_chance_resultado':
      return Markup.inlineKeyboard([
        [
          Markup.button.callback('🏠 Casa (1)', `gl_pr:${pool.id}:h`),
          Markup.button.callback('🤝 Empate (X)', `gl_pr:${pool.id}:d`),
          Markup.button.callback('✈️ Fora (2)', `gl_pr:${pool.id}:a`),
        ],
        back,
      ]);

    case 'dupla_chance':
      return Markup.inlineKeyboard([
        [
          Markup.button.callback('🏠🤝 1X (Casa ou Empate)', `gl_pr:${pool.id}:1x`),
        ],
        [
          Markup.button.callback('🏠✈️ 12 (Casa ou Fora)', `gl_pr:${pool.id}:12`),
        ],
        [
          Markup.button.callback('🤝✈️ X2 (Empate ou Fora)', `gl_pr:${pool.id}:x2`),
        ],
        back,
      ]);

    case 'total_de_gols':
      return Markup.inlineKeyboard([
        [
          Markup.button.callback('⚽ Over 1.5', `gl_pr:${pool.id}:o_1.5`),
          Markup.button.callback('🔒 Under 1.5', `gl_pr:${pool.id}:u_1.5`),
        ],
        [
          Markup.button.callback('⚽ Over 2.5', `gl_pr:${pool.id}:o_2.5`),
          Markup.button.callback('🔒 Under 2.5', `gl_pr:${pool.id}:u_2.5`),
        ],
        [
          Markup.button.callback('⚽ Over 3.5', `gl_pr:${pool.id}:o_3.5`),
          Markup.button.callback('🔒 Under 3.5', `gl_pr:${pool.id}:u_3.5`),
        ],
        back,
      ]);

    case 'placar_exato': {
      const scores = [
        ['0-0', '1-0', '0-1'],
        ['1-1', '2-0', '0-2'],
        ['2-1', '1-2', '2-2'],
        ['3-0', '3-1', '3-2'],
        ['0-3', '1-3', '2-3'],
      ];
      const rows = scores.map(row =>
        row.map(s => Markup.button.callback(s, `gl_pr:${pool.id}:${s}`)),
      );
      rows.push(back);
      return Markup.inlineKeyboard(rows);
    }
  }
}

export function kbConfirm(poolId: string, pred: string) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ Confirmar', `gl_ok:${poolId}:${pred}`),
      Markup.button.callback('❌ Cancelar', `gl_e:${poolId}`),
    ],
  ]);
}

export function kbBackToMenu() {
  return Markup.inlineKeyboard([[Markup.button.callback('🏠 Menu', 'menu')]]);
}

// ── Minhas Entradas ─────────────────────────────────────────────────────────
import type { HistFilter } from '../formatters/messages';

export function kbMyEntriesAtivas(details: import('../formatters/messages').EntryDetail[]) {
  const rows = details.map(({ entry, pool, match }) => {
    const abbrev = (n: string) => n.length > 10 ? n.slice(0, 9) + '.' : n;
    const label = `⚽ ${abbrev(match.home_team)} × ${abbrev(match.away_team)} | ${fmtModality(pool.modality)} R$${pool.tier_brl.toFixed(0)}`;
    return [Markup.button.callback(label, `me_entry:${entry.id}`)];
  });
  rows.push([Markup.button.callback('⬅️ Minhas Entradas', 'me')]);
  return Markup.inlineKeyboard(rows);
}

export function kbEntryDetail(entryId: string, canCancel: boolean) {
  const rows: ReturnType<typeof Markup.button.callback>[][] = [];
  if (canCancel) {
    rows.push([Markup.button.callback('🚫 Cancelar entrada', `me_cancel:${entryId}`)]);
  }
  rows.push([Markup.button.callback('⬅️ Entradas Ativas', 'me_ativas')]);
  return Markup.inlineKeyboard(rows);
}

export function kbCancelConfirm(entryId: string) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ Confirmar cancelamento', `me_cancel_ok:${entryId}`),
      Markup.button.callback('❌ Manter entrada',         `me_entry:${entryId}`),
    ],
  ]);
}

export function kbMyEntriesMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🟢 Ativas',              'me_ativas')],
    [Markup.button.callback('🏁 Finalizadas Recentes', 'me_rec')],
    [Markup.button.callback('📊 Historico',            'me_hist:30d:all')],
    [Markup.button.callback('💰 Gestao de Banca',      'me_banca:all')],
    [Markup.button.callback('🏠 Menu',                 'menu')],
  ]);
}

export function kbMyEntriesBack() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('⬅️ Minhas Entradas', 'me')],
    [Markup.button.callback('🏠 Menu',            'menu')],
  ]);
}

export function kbMyEntriesHist(f: HistFilter) {
  const p = (id: HistFilter['period'], label: string) =>
    Markup.button.callback(f.period === id ? `${label} ✓` : label, `me_hist:${id}:${f.outcome}`);
  const o = (id: HistFilter['outcome'], label: string) =>
    Markup.button.callback(f.outcome === id ? `${label} ✓` : label, `me_hist:${f.period}:${id}`);

  return Markup.inlineKeyboard([
    [p('7d', '7 dias'), p('30d', '30 dias'), p('90d', '90 dias'), p('all', 'Tudo')],
    [o('all', 'Todas'), o('won', '🏆 Ganhos'), o('lost', '❌ Perdas')],
    [Markup.button.callback('⬅️ Minhas Entradas', 'me')],
  ]);
}

export function kbMyEntriesBanca(period: HistFilter['period']) {
  const p = (id: HistFilter['period'], label: string) =>
    Markup.button.callback(period === id ? `${label} ✓` : label, `me_banca:${id}`);

  return Markup.inlineKeyboard([
    [p('7d', '7 dias'), p('30d', '30 dias'), p('90d', '90 dias'), p('all', 'Tudo')],
    [Markup.button.callback('⬅️ Minhas Entradas', 'me')],
  ]);
}

// ── Minhas Listas Privadas ──────────────────────────────────────────────────

export function kbMyPools(openPoolIds: string[], poolLabels: Record<string, string>) {
  const rows: ReturnType<typeof Markup.button.callback>[][] = [];
  for (const poolId of openPoolIds) {
    const label = poolLabels[poolId] ?? 'Bolao';
    rows.push([Markup.button.callback(`📤 Compartilhar: ${label}`, `my_pool_share:${poolId}`)]);
    rows.push([Markup.button.callback(`👁 Ver bolao: ${label}`, `gl_e:${poolId}`)]);
  }
  rows.push([Markup.button.callback('➕ Criar nova lista', 'cp')]);
  rows.push([Markup.button.callback('🏠 Menu', 'menu')]);
  return Markup.inlineKeyboard(rows);
}

export function kbMyPoolsBack() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('⬅️ Minhas Listas', 'my_pools')],
    [Markup.button.callback('🏠 Menu',          'menu')],
  ]);
}

export function kbPoolInvite(poolId: string) {
  return Markup.inlineKeyboard([
    [Markup.button.callback('✅ Entrar no bolao', `gl_e:${poolId}`)],
    [Markup.button.callback('🏠 Menu', 'menu')],
  ]);
}

// Wizard de criação de lista privada
export function kbWizardChampionships(championships: ChampionshipRow[]) {
  const rows = championships.map(c => [
    Markup.button.callback(c.name, `wiz_ch:${c.id}`),
  ]);
  rows.push([Markup.button.callback('❌ Cancelar', 'wiz_cancel')]);
  return Markup.inlineKeyboard(rows);
}

export function kbWizardMatches(matches: MatchRow[]) {
  if (matches.length === 0) {
    return Markup.inlineKeyboard([
      [Markup.button.callback('⬅️ Campeonatos', 'wiz_back_ch')],
      [Markup.button.callback('❌ Cancelar', 'wiz_cancel')],
    ]);
  }
  const rows = matches.map(m => {
    const label = `${m.home_team} × ${m.away_team} — ${fmtDate(m.kickoff_at)}`;
    return [Markup.button.callback(label, `wiz_m:${m.id}`)];
  });
  rows.push([Markup.button.callback('⬅️ Campeonatos', 'wiz_back_ch')]);
  rows.push([Markup.button.callback('❌ Cancelar', 'wiz_cancel')]);
  return Markup.inlineKeyboard(rows);
}

export function kbWizardGoalThreshold() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('Under/Over 1.5', 'wiz_thr:1.5'),
      Markup.button.callback('Under/Over 2.5', 'wiz_thr:2.5'),
      Markup.button.callback('Under/Over 3.5', 'wiz_thr:3.5'),
    ],
    [Markup.button.callback('❌ Cancelar', 'wiz_cancel')],
  ]);
}

export function kbWizardModality() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('1️⃣ Resultado 1X2', 'wiz_mod:dupla_chance_resultado')],
    [Markup.button.callback('🎲 Dupla Chance (1X/12/X2)', 'wiz_mod:dupla_chance')],
    [Markup.button.callback('⚽ Total de Gols', 'wiz_mod:total_de_gols')],
    [Markup.button.callback('📊 Placar Exato', 'wiz_mod:placar_exato')],
    [Markup.button.callback('❌ Cancelar', 'wiz_cancel')],
  ]);
}

export function kbWizardConfirm() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ Criar lista', 'wiz_confirm'),
      Markup.button.callback('❌ Cancelar', 'wiz_cancel'),
    ],
  ]);
}
