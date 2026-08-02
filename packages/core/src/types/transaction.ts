export type TransactionType = 'entry' | 'prize' | 'refund' | 'bonus';

export type Transaction = {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  balanceAfter: number;
  poolId?: string;
  description: string;
  createdAt: Date;
};
