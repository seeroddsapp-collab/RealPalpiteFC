import type { SupabaseClient } from '@realpalpitefc/database';

export type GhostSettings = {
  enabled: boolean;
  maxInitial: number;
  ratioAtClose: number;
  fillRate: number; // 0–100: chance (%) de cada pool receber fantasmas
};

export async function getGhostSettings(client: SupabaseClient): Promise<GhostSettings> {
  const { data } = await (client as any).from('platform_settings').select('key, value');
  const map = Object.fromEntries(
    ((data ?? []) as Array<{ key: string; value: string }>).map(r => [r.key, r.value]),
  );
  return {
    enabled:      map['ghost_mode_enabled'] === 'true',
    maxInitial:   Number(map['ghost_max_initial']    ?? 15),
    ratioAtClose: Number(map['ghost_ratio_at_close'] ?? 3),
    fillRate:     Number(map['ghost_fill_rate']      ?? 60),
  };
}

export function randomGhostCount(max: number): number {
  return Math.max(1, Math.floor(Math.random() * max) + 1);
}
