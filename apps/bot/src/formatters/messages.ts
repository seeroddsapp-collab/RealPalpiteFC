import type { MatchRow, PoolRow, TransactionRow, EntryRow, Json } from '@realpalpitefc/database';

export function fmtBrl(amount: number): string {
  return `R$${amount.toFixed(2).replace('.', ',')}`;
}

export function fmtDate(isoString: string): string {
  return new Date(isoString).toLocaleString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
}

export function fmtModality(modality: PoolRow['modality']): string {
  const m: Record<PoolRow['modality'], string> = {
    dupla_chance_resultado: 'Resultado 1X2',
    dupla_chance: 'Dupla Chance',
    total_de_gols: 'Total de Gols',
    placar_exato: 'Placar Exato',
  };
  return m[modality];
}

export function decodePred(
  modality: PoolRow['modality'],
  pred: string,
  homeTeam: string,
  awayTeam: string,
): string {
  switch (modality) {
    case 'dupla_chance_resultado':
      if (pred === 'h') return `🏠 *${homeTeam}* vence`;
      if (pred === 'd') return '🤝 Empate';
      return `✈️ *${awayTeam}* vence`;
    case 'dupla_chance':
      if (pred === '1x') return `🏠🤝 *${homeTeam}* vence ou Empate`;
      if (pred === 'x2') return `🤝✈️ Empate ou *${awayTeam}* vence`;
      return `🏠✈️ *${homeTeam}* ou *${awayTeam}* vence`;
    case 'total_de_gols': {
      const [c, t] = pred.split('_');
      const label = c === 'o' ? 'Over' : 'Under';
      return `⚽ ${label} ${t} gols`;
    }
    case 'placar_exato': {
      const [h, a] = pred.split('-');
      return `📊 ${homeTeam} *${h}* x *${a}* ${awayTeam}`;
    }
  }
}

// ── Mensagens (todas usam Markdown v1) ─────────────────────────────────────

export function msgWelcome(
  firstName: string | null | undefined,
  username: string | null | undefined,
  balance: number,
): string {
  const name = firstName ?? (username ? `@${username}` : 'jogador');
  return (
    `⚽ *Ola, ${name}! Bem-vindo ao RealPalpiteFC*\n\n` +
    `💰 Saldo disponivel: *${fmtBrl(balance)}*\n\n` +
    `Pronto para palpitar? Escolha uma partida e tente multiplicar seu saldo. Boa sorte! 🤞`
  );
}

export function msgHowToPlay(): string {
  return (
    `📖 *Como Jogar*\n\n` +

    `*1. Escolha uma partida*\n` +
    `Acesse _Listas Globais_, escolha o campeonato e a partida que quer palpitar.\n\n` +

    `*2. Escolha um bolao*\n` +
    `Cada partida tem ate 4 tipos de bolao:\n` +
    `• 1️⃣ *Resultado 1X2* — acerte exatamente: Casa, Empate ou Fora\n` +
    `• 🎲 *Dupla Chance* — cubra 2 desfechos: 1X, 12 ou X2\n` +
    `• ⚽ *Total de Gols* — Over ou Under o limite de gols\n` +
    `• 📊 *Placar Exato* — acerte o placar final\n\n` +

    `*3. Faca seu palpite e confirme a entrada*\n` +
    `O valor e debitado do seu saldo. Voce pode entrar ate *2 vezes* no mesmo bolao.\n\n` +

    `*4. Aguarde o resultado*\n` +
    `As listas fecham *5 minutos* antes do inicio da partida. Apenas o *tempo normal* (90 min) conta — prorrogacao e penaltis nao entram.\n\n` +

    `🚫 *Cancelamento de entrada*\n` +
    `Arrependeu? Voce pode cancelar sua entrada ate *5 minutos* antes do inicio da partida.\n` +
    `• Devolucao de *100%* do valor apostado\n` +
    `• O bolao continua aberto para os demais participantes\n` +
    `• Cancelar nao impede de entrar novamente (limite de 2 entradas ainda vale)\n` +
    `Acesse _Minhas Entradas > Ativas_, toque na entrada e escolha *Cancelar entrada*.\n\n` +

    `🏆 *Como se ganha*\n` +
    `• Com acertadores: premio = total arrecadado x 95% dividido entre os vencedores\n` +
    `• Sem acertadores: 90% e devolvido a todos os participantes\n` +
    `• Partida cancelada ou adiada: devolucao de 100%\n` +
    `• Bolao com apenas 1 participante ao fechar: devolucao de 100%\n\n` +

    `_Boa sorte! 🤞_`
  );
}

export function msgMainMenu(balance: number): string {
  return `🏠 *Menu Principal*\n\n💰 Saldo: *${fmtBrl(balance)}*\n\nO que voce quer fazer?`;
}

export function msgMinhaConta(balance: number, pixKey: string | null): string {
  const pixLine = pixKey
    ? `🔑 Chave PIX: \`${pixKey}\``
    : `🔑 Chave PIX: _não cadastrada_`;
  return (
    `💼 *Minha Conta*\n\n` +
    `💰 Saldo: *${fmtBrl(balance)}*\n` +
    `${pixLine}`
  );
}

export function msgMinhaContaPixKey(pixKey: string | null, pixKeyType: string | null): string {
  if (!pixKey) {
    return (
      `🔑 *Minha Chave PIX*\n\n` +
      `Nenhuma chave cadastrada.\n\n` +
      `_Cadastre sua chave para poder sacar seus ganhos._`
    );
  }
  const tipos: Record<string, string> = {
    cpf: 'CPF', phone: 'Celular', email: 'E-mail', random_key: 'Chave aleatória',
  };
  return (
    `🔑 *Minha Chave PIX*\n\n` +
    `Tipo: *${tipos[pixKeyType ?? ''] ?? pixKeyType}*\n` +
    `Chave: \`${pixKey}\``
  );
}

export function msgChampionships(): string {
  return (
    `🏆 *Escolha o campeonato:*\n\n` +
    `_Exibindo apenas campeonatos com partidas nos proximos 21 dias._\n` +
    `_Outros campeonatos podem estar em recesso ou entre temporadas._`
  );
}

export function msgNoChampionships(): string {
  return '😕 Nenhum campeonato ativo no momento.';
}

export function msgMatches(champName: string): string {
  return `📅 *${champName}* - Proximas partidas:`;
}

export function msgNoMatches(): string {
  return '😕 Nenhuma partida disponivel nos proximos 21 dias.';
}

export function msgTodayMatches(groups: Array<{ champName: string; matches: MatchRow[] }>): string {
  if (groups.length === 0) {
    return (
      `⚽ *Jogos de Hoje*\n\n` +
      `Nenhum jogo agendado para hoje.\n` +
      `Veja os campeonatos abaixo para jogos dos próximos dias.`
    );
  }
  let msg = `⚽ *Jogos de Hoje*\n\n`;
  for (const group of groups) {
    msg += `🏆 *${group.champName}*\n`;
    for (const m of group.matches) {
      const time = new Date(m.kickoff_at).toLocaleTimeString('pt-BR', {
        hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
      });
      msg += `${m.home_team} × ${m.away_team} — ${time}\n`;
    }
    msg += `\n`;
  }
  return msg.trimEnd() + `\n\nSelecione um jogo para apostar:`;
}

export function msgTierSelect(match: MatchRow): string {
  return (
    `⚽ *${match.home_team} × ${match.away_team}*\n` +
    `_${fmtDate(match.kickoff_at)}_\n\n` +
    `💰 Escolha o valor de entrada:`
  );
}

export function msgPools(match: MatchRow): string {
  return (
    `⚽ *${match.home_team} x ${match.away_team}*\n` +
    `_${fmtDate(match.kickoff_at)}_\n\n` +
    `*Tipos de bolao:*\n` +
    `1️⃣ *Resultado 1X2* — acerte exatamente: Casa, Empate ou Fora\n` +
    `🎲 *Dupla Chance* — escolha 2 desfechos: 1X, 12 ou X2\n` +
    `⚽ *Total de Gols* — acerte se serao mais ou menos gols\n` +
    `📊 *Placar Exato* — acerte o placar final\n\n` +
    `🌐 _Global = aberto a todos_  |  🔒 _Privado = por convite_`
  );
}

export function msgNoPools(): string {
  return '😕 Nenhuma lista aberta para esta partida.';
}

export function msgPoolDetail(pool: PoolRow, match: MatchRow, entryCount: number): string {
  const prize = fmtBrl(entryCount * pool.tier_brl * 0.95);
  return (
    `🎯 *${fmtModality(pool.modality)}* - ${fmtBrl(pool.tier_brl)} por entrada\n` +
    `⚽ *${match.home_team} x ${match.away_team}*\n` +
    `_${fmtDate(match.kickoff_at)}_\n\n` +
    `👥 Participantes: *${entryCount}*\n` +
    `🏆 Premio se acertar: *~${prize}* _(taxa de 5%)_\n\n` +
    `_Escolha seu palpite:_`
  );
}

export function msgConfirmEntry(
  pool: PoolRow,
  match: MatchRow,
  predLabel: string,
  currentBalance: number,
): string {
  const after = fmtBrl(currentBalance - pool.tier_brl);
  return (
    `✅ *Confirmar entrada?*\n\n` +
    `🎯 ${fmtModality(pool.modality)} - ${fmtBrl(pool.tier_brl)}\n` +
    `⚽ ${match.home_team} x ${match.away_team}\n` +
    `📊 Palpite: ${predLabel}\n\n` +
    `💰 Saldo atual: *${fmtBrl(currentBalance)}*\n` +
    `💸 Saldo apos: *${after}*`
  );
}

export function msgEntryOk(pool: PoolRow, predLabel: string): string {
  return (
    `🎉 *Entrada confirmada!*\n\n` +
    `${fmtModality(pool.modality)} - ${fmtBrl(pool.tier_brl)}\n` +
    `Palpite: ${predLabel}\n\n` +
    `_Boa sorte! 🤞_`
  );
}

export function msgExtrato(balance: number, txs: TransactionRow[]): string {
  const icons: Record<TransactionRow['type'], string> = {
    entry: '📤',
    prize: '🏆',
    refund: '↩️',
    bonus: '🎁',
    deposit: '📥',
    withdrawal: '💸',
  };
  const labels: Record<TransactionRow['type'], string> = {
    entry: 'Entrada',
    prize: 'Premio',
    refund: 'Devolucao',
    bonus: 'Bonus',
    deposit: 'Deposito',
    withdrawal: 'Saque',
  };

  if (txs.length === 0) {
    return `💰 Saldo: *${fmtBrl(balance)}*\n\n_Nenhuma movimentacao ainda._`;
  }

  const lines = txs
    .map(tx => {
      const isDebit = tx.type === 'entry' || tx.type === 'withdrawal';
      const sign = isDebit ? '-' : '+';
      return `${icons[tx.type]} ${labels[tx.type]}: ${sign}${fmtBrl(tx.amount)} > ${fmtBrl(tx.balance_after)}\n_${tx.description}_`;
    })
    .join('\n\n');

  return `💰 *Saldo: ${fmtBrl(balance)}*\n\n*Ultimas movimentacoes:*\n\n${lines}`;
}

export function msgPoolResolved(
  scenario: string,
  amount: number,
  poolInfo: string,
): string {
  if (scenario === 'with_winners') {
    return `🏆 *Voce ganhou!* Premio de *${fmtBrl(amount)}* creditado!\n_${poolInfo}_`;
  }
  if (amount > 0) {
    return `↩️ *Devolucao* de *${fmtBrl(amount)}* creditada!\n_${poolInfo}_`;
  }
  return `📋 _Lista encerrada sem ganhadores._\n_${poolInfo}_`;
}

// ── Minhas Entradas ─────────────────────────────────────────────────────────

export type EntryDetail = {
  entry: EntryRow;
  pool: PoolRow;
  match: MatchRow;
  prizeOrRefund?: number; // valor recebido (prize ou refund)
};

export function fmtPredFromDb(
  modality: PoolRow['modality'],
  pred: Json,
  homeTeam: string,
  awayTeam: string,
): string {
  const p = pred as string | { homeScore: number; awayScore: number };
  switch (modality) {
    case 'dupla_chance_resultado':
      if (p === 'home') return `🏠 ${homeTeam} vence`;
      if (p === 'draw') return '🤝 Empate';
      return `✈️ ${awayTeam} vence`;
    case 'dupla_chance':
      if (p === '1x') return `🏠🤝 ${homeTeam} ou Empate`;
      if (p === 'x2') return `🤝✈️ Empate ou ${awayTeam}`;
      return `🏠✈️ ${homeTeam} ou ${awayTeam}`;
    case 'total_de_gols': {
      const g = pred as { choice: 'over' | 'under'; threshold: number };
      const label = g.choice === 'over' ? '⚽ Over' : '🔒 Under';
      return `${label} ${g.threshold} gols`;
    }
    case 'placar_exato': {
      const s = p as { homeScore: number; awayScore: number };
      return `📊 ${homeTeam} ${s.homeScore}×${s.awayScore} ${awayTeam}`;
    }
  }
}

function fmtPoolStatus(status: PoolRow['status']): string {
  switch (status) {
    case 'open':      return '🟢 aberta';
    case 'closed':    return '🔒 aguardando resultado';
    case 'resolved':  return '✅ resolvida';
    case 'cancelled': return '🚫 cancelada';
  }
}

export function msgMyEntriesAtivasList(count: number): string {
  if (count === 0) return '🟢 *ENTRADAS ATIVAS*\n\n_Nenhuma entrada ativa no momento._';
  return `🟢 *ENTRADAS ATIVAS* (${count})\n\nSelecione uma entrada para ver detalhes ou cancelar:`;
}

export function msgEntryDetail(
  entry: EntryRow,
  pool: PoolRow,
  match: MatchRow,
  canCancel: boolean,
): string {
  const pred = fmtPredFromDb(pool.modality, entry.prediction, match.home_team, match.away_team);
  const statusLine = canCancel
    ? '🟢 Cancelamento disponivel ate 5 min antes do inicio'
    : '🔒 Prazo de cancelamento encerrado';

  return (
    `⚽ *${match.home_team} × ${match.away_team}*\n` +
    `📅 ${fmtDate(match.kickoff_at)}\n\n` +
    `🎯 ${fmtModality(pool.modality)} · ${fmtBrl(pool.tier_brl)}\n` +
    `📊 Palpite: ${pred}\n\n` +
    `_${statusLine}_`
  );
}

export function msgCancelConfirm(pool: PoolRow, match: MatchRow): string {
  return (
    `⚠️ *Confirmar cancelamento?*\n\n` +
    `⚽ ${match.home_team} × ${match.away_team}\n` +
    `🎯 ${fmtModality(pool.modality)} · ${fmtBrl(pool.tier_brl)}\n\n` +
    `*${fmtBrl(pool.tier_brl)} serao devolvidos ao seu saldo.*`
  );
}

export function msgCancelOk(amount: number): string {
  return `✅ *Entrada cancelada!*\n\n↩️ *${fmtBrl(amount)}* devolvidos ao seu saldo.`;
}

export function msgMyEntriesMenu(): string {
  return '📋 *Minhas Entradas*\n\nO que voce quer ver?';
}

export function msgMyEntriesAtivas(details: EntryDetail[]): string {
  if (details.length === 0) {
    return '🟢 *ENTRADAS ATIVAS*\n\n_Nenhuma entrada ativa no momento._';
  }

  const lines = details.map(({ entry, pool, match }) => {
    const pred = fmtPredFromDb(pool.modality, entry.prediction, match.home_team, match.away_team);
    return (
      `⚽ *${match.home_team} × ${match.away_team}*\n` +
      `📅 ${fmtDate(match.kickoff_at)} | ${fmtModality(pool.modality)} · ${fmtBrl(pool.tier_brl)}\n` +
      `📊 ${pred} | ${fmtPoolStatus(pool.status)}`
    );
  });

  return `🟢 *ENTRADAS ATIVAS* (${details.length})\n\n${lines.join('\n\n')}`;
}

export function msgMyEntriesRecentes(details: EntryDetail[]): string {
  if (details.length === 0) {
    return '🏁 *FINALIZADAS RECENTES*\n\n_Nenhuma entrada finalizada ainda._';
  }

  const lines = details.map(({ entry, pool, match, prizeOrRefund }) => {
    const pred = fmtPredFromDb(pool.modality, entry.prediction, match.home_team, match.away_team);
    let resultLine: string;
    if (pool.status === 'cancelled') {
      resultLine = `↩️ Cancelada · devolvido ${fmtBrl(prizeOrRefund ?? entry.amount)}`;
    } else if (entry.is_winner === true) {
      resultLine = `🏆 *GANHOU* · premio ${fmtBrl(prizeOrRefund ?? 0)}`;
    } else if (entry.is_winner === false) {
      resultLine = `❌ *PERDEU* · ${fmtBrl(entry.amount)}`;
    } else {
      resultLine = `⏳ Aguardando resultado`;
    }
    return (
      `⚽ *${match.home_team} × ${match.away_team}*\n` +
      `📅 ${fmtDate(match.kickoff_at)} | ${fmtModality(pool.modality)}\n` +
      `📊 ${pred}\n` +
      resultLine
    );
  });

  return `🏁 *FINALIZADAS RECENTES* (${details.length})\n\n${lines.join('\n\n')}`;
}

export type HistFilter = { period: '7d' | '30d' | '90d' | 'all'; outcome: 'all' | 'won' | 'lost' };

const PERIOD_LABEL: Record<HistFilter['period'], string> = {
  '7d': '7 dias', '30d': '30 dias', '90d': '90 dias', 'all': 'Todo o historico',
};
const OUTCOME_LABEL: Record<HistFilter['outcome'], string> = {
  'all': 'Todas', 'won': 'Ganhos', 'lost': 'Perdas',
};

export function msgMyEntriesHist(details: EntryDetail[], filter: HistFilter): string {
  const header =
    `📊 *HISTORICO* | ${PERIOD_LABEL[filter.period]} | ${OUTCOME_LABEL[filter.outcome]}\n` +
    `_(${details.length} entradas)_`;

  if (details.length === 0) {
    return `${header}\n\n_Nenhuma entrada neste periodo._`;
  }

  const lines = details.map(({ entry, pool, match, prizeOrRefund }) => {
    const pred = fmtPredFromDb(pool.modality, entry.prediction, match.home_team, match.away_team);
    let icon: string;
    if (pool.status === 'cancelled') {
      icon = `↩️ devolvido ${fmtBrl(prizeOrRefund ?? entry.amount)}`;
    } else if (entry.is_winner === true) {
      icon = `🏆 premio ${fmtBrl(prizeOrRefund ?? 0)}`;
    } else {
      icon = `❌ ${fmtBrl(entry.amount)}`;
    }
    const day = new Date(match.kickoff_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' });
    return `• ${day} *${match.home_team} × ${match.away_team}* | ${fmtModality(pool.modality)}\n  ${pred} → ${icon}`;
  });

  return `${header}\n\n${lines.join('\n\n')}`;
}

export function msgMyEntriesBanca(
  summary: { invested: number; prizes: number; refunds: number },
  entryCount: number,
  wonCount: number,
  resolvedCount: number,
  period: HistFilter['period'],
  balance: number,
): string {
  const net = summary.prizes + summary.refunds - summary.invested;
  const netLabel = net >= 0 ? `+${fmtBrl(net)}` : fmtBrl(net);
  const netIcon  = net >= 0 ? '📈' : '📉';
  const acerto   = resolvedCount > 0 ? Math.round((wonCount / resolvedCount) * 100) : 0;

  return (
    `💰 *GESTAO DE BANCA* | ${PERIOD_LABEL[period]}\n\n` +
    `📊 *Resumo*\n` +
    `Apostas realizadas: *${entryCount}*\n` +
    `💸 Investido: *${fmtBrl(summary.invested)}*\n` +
    `🏆 Ganho: *${fmtBrl(summary.prizes)}*\n` +
    `↩️ Devolvido: *${fmtBrl(summary.refunds)}*\n` +
    `${netIcon} Resultado liquido: *${netLabel}*\n\n` +
    `🎯 *Desempenho*\n` +
    `Acertos: *${wonCount}/${resolvedCount}* (${acerto}%)\n` +
    `💰 Saldo atual: *${fmtBrl(balance)}*`
  );
}

// ── Listas Privadas (criadas pelo usuário) ──────────────────────────────────

export function msgMyPools(
  pools: PoolRow[],
  matchMap: Record<string, MatchRow>,
  entryCounts: Record<string, number>,
): string {
  if (pools.length === 0) {
    return (
      `🔒 *Minhas Listas Privadas*\n\n` +
      `Voce ainda nao criou nenhuma lista privada.\n\n` +
      `Use *Criar Lista Privada* para comecar!`
    );
  }

  const abertas   = pools.filter(p => p.status === 'open').length;
  const encerradas = pools.length - abertas;

  let text =
    `🔒 *Minhas Listas Privadas*\n\n` +
    `${pools.length} lista${pools.length > 1 ? 's' : ''} — ${abertas} aberta${abertas !== 1 ? 's' : ''} · ${encerradas} encerrada${encerradas !== 1 ? 's' : ''}\n\n`;

  for (const pool of pools) {
    const match = matchMap[pool.match_id];
    if (!match) continue;
    const count  = entryCounts[pool.id] ?? 0;
    const status = pool.status === 'open' ? '🟢' : pool.status === 'resolved' ? '🏁' : '🔴';
    text += `${status} ${match.home_team} × ${match.away_team}\n`;
    text += `   ${fmtModality(pool.modality)} · ${fmtBrl(pool.tier_brl)} · ${count} participante${count !== 1 ? 's' : ''}\n\n`;
  }

  return text.trimEnd();
}

export function msgPoolInvite(pool: PoolRow, match: MatchRow): string {
  return (
    `🎯 *Voce foi convidado para um bolao privado!*\n\n` +
    `⚽ *${match.home_team} × ${match.away_team}*\n` +
    `📅 ${fmtDate(match.kickoff_at)}\n` +
    `🎯 ${fmtModality(pool.modality)} · ${fmtBrl(pool.tier_brl)}\n\n` +
    `Toque em *Entrar no bolao* para participar!`
  );
}

export function msgPoolClosedNotification(match: MatchRow): string {
  return (
    `🔒 *Bolao fechado!*\n\n` +
    `⚽ ${match.home_team} × ${match.away_team}\n` +
    `A partida comeca em instantes — boa sorte! 🤞`
  );
}
