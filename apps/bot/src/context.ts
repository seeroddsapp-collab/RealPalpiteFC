import { Context, Scenes } from 'telegraf';
import type { UserRow } from '@realpalpitefc/database';

export interface CreatePoolSession {
  champId?: string;
  champName?: string;
  matchId?: string;
  matchLabel?: string;
  modality?: string;
  goalThreshold?: number;
  tier?: number;
}

// Dados no nível raiz do session (fora do __scenes gerenciado pelo Scene)
export interface BotSession extends Scenes.WizardSession<Scenes.WizardSessionData> {
  user?: UserRow;
  createPool?: CreatePoolSession;
}

// D = Scenes.WizardSessionData → é o dado INTERNO em __scenes, gerenciado pelo telegraf
export interface BotContext extends Context {
  session: BotSession;
  scene: Scenes.SceneContextScene<BotContext, Scenes.WizardSessionData>;
  wizard: Scenes.WizardContextWizard<BotContext>;
}
