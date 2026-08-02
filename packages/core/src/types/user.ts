export type User = {
  id: string;
  telegramId: string;
  username?: string;
  virtualBalance: number;
  isBlocked: boolean;
  createdAt: Date;
};
