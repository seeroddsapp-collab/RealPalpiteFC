// Regra 1: lista fecha 5 minutos antes do kickoff
export const POOL_LOCK_MINUTES_BEFORE_KICKOFF = 5;

// Regra 7: máximo de entradas por usuário por pool
export const MAX_ENTRIES_PER_USER_PER_POOL = 2;

export function shouldPoolClose(kickoffAt: Date, now: Date = new Date()): boolean {
  const diffMs = kickoffAt.getTime() - now.getTime();
  const diffMinutes = diffMs / (1000 * 60);
  return diffMinutes <= POOL_LOCK_MINUTES_BEFORE_KICKOFF;
}

export type EntryPermission =
  | { allowed: true }
  | { allowed: false; reason: string };

// Regra 8: cancelamento de entrada permitido até o fechamento do pool
export function canUserCancelEntry(kickoffAt: Date, now: Date = new Date()): boolean {
  return !shouldPoolClose(kickoffAt, now);
}

export function canUserEnterPool(existingUserEntryCount: number): EntryPermission {
  if (existingUserEntryCount >= MAX_ENTRIES_PER_USER_PER_POOL) {
    return {
      allowed: false,
      reason: `Limite de ${MAX_ENTRIES_PER_USER_PER_POOL} entradas por lista atingido`,
    };
  }
  return { allowed: true };
}
