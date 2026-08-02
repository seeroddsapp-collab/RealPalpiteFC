export type Modality =
  | 'dupla_chance_resultado'
  | 'dupla_chance'
  | 'total_de_gols'
  | 'placar_exato';

export type PoolType = 'global' | 'private';

export type PoolStatus = 'open' | 'closed' | 'resolved' | 'cancelled';

// Tiers disponíveis por modalidade (listas globais)
export const TIERS_BY_MODALITY: Record<Modality, number[]> = {
  dupla_chance_resultado: [5, 10, 25],
  dupla_chance: [5, 10, 25],
  total_de_gols: [5, 10, 25, 50],
  placar_exato: [10, 25, 50],
};

type BasePool = {
  id: string;
  matchId: string;
  tierBrl: number;
  type: PoolType;
  status: PoolStatus;
  createdBy: string;
  createdAt: Date;
  closedAt?: Date;
};

// Discriminated union garante que goalThreshold é obrigatório apenas em total_de_gols
export type Pool =
  | (BasePool & { modality: 'dupla_chance_resultado' })
  | (BasePool & { modality: 'dupla_chance' })
  | (BasePool & { modality: 'total_de_gols'; goalThreshold?: number })
  | (BasePool & { modality: 'placar_exato' });
