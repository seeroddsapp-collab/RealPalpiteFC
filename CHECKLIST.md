# RealPalpiteFC — Checklist de Implementação

> Marque cada item com `[x]` conforme for concluindo.  
> Atualize a seção **Status atual** sempre que parar o trabalho.

---

## Status atual

- **Última sessão:** 2026-08-03
- **Fase concluída:** Fase 6 — apps/admin (painel administrativo completo no ar em rpfc-admin.vercel.app; design navy/gold; paginação, busca, páginas Partidas/Entradas/Audit/Detalhe de usuário implementadas)
- **Próximo passo:** Fase 7 — Testes MVP (adicionar bot ao grupo do Telegram e validar fluxo completo com partidas reais)
- **Gaps conhecidos (pós-admin):** dashboard sem gráfico de arrecadação; sem trigger manual de sync no admin; saldo inicial do usuário = 0 (sem mecanismo de depósito por ora); comandos `/saldo` e `/meus_palpites` não implementados no bot

---

## Fase 0 — Fundação do Projeto

- [x] Criar repositório no GitHub — https://github.com/seeroddsapp-collab/RealPalpiteFC
- [x] Inicializar monorepo com `pnpm workspaces`
- [x] Configurar TypeScript base — `tsconfig.base.json` raiz + `tsconfig.json` por pacote
- [x] Configurar ESLint + Prettier compartilhados entre todos os pacotes
- [x] Criar estrutura de pastas:
  - [x] `apps/bot`
  - [x] `apps/admin`
  - [x] `packages/core`
  - [x] `packages/sports-data`
  - [x] `packages/database`
  - [x] `supabase/migrations`
- [x] Criar projeto no Supabase — https://rczxqhvtqnpbtvzkjpml.supabase.co
- [x] Criar `.env.example` em cada app com todas as variáveis necessárias
- [x] Instalar e configurar `claude-mem` para memória persistente de sessão
- [ ] Atualizar `architecture.json` refletindo o estado inicial real

---

## Fase 1 — packages/core (Regras de Negócio)

> Lógica pura, sem dependência de frameworks. **Testes unitários obrigatórios.**

- [x] Definir tipos TypeScript compartilhados: `Match`, `Pool`, `Entry`, `User`, `Modality`, `Tier`, `Transaction`
- [x] `pool-calculator`: prêmio = soma das entradas × 95% quando há acertador (taxa da casa = 5%)
- [x] `pool-calculator`: sem acertador com 2+ participantes — taxa 10%, devolução proporcional de 90%
- [x] `pool-calculator`: 1 participante ao fechar — devolução 100% sem taxa
- [x] `pool-calculator`: jogo cancelado ou adiado — devolução 100% a todos
- [x] `pool-calculator`: divisão de prêmio por bilhete (não por usuário); resíduo de arredondamento fica com a casa
- [x] `list-rules`: fechamento automático 5 min antes do kickoff; máx 2 entradas por usuário por pool
- [x] Testes unitários cobrindo todos os cenários das Regras 1–9 do `PROJETO.md` (31 testes, 3 arquivos)
- [x] Atualizar `architecture.json`

---

## Fase 2 — supabase/migrations (Schema do Banco)

> Toda mudança de schema **gera uma migration versionada**. Nunca alterar tabelas direto em produção.

- [x] Migration: `users` — `telegram_id`, `username`, `virtual_balance`, `is_blocked`, `created_at`
- [x] Migration: `championships` — `name`, `espn_code`, `football_data_code`, `modalities[]`, `is_active`
- [x] Migration: `matches` — `championship_id`, `home_team`, `away_team`, `kickoff_at`, `status`, `result`
- [x] Migration: `pools` — `match_id`, `modality`, `tier_brl`, `type` (global|private), `status`, `created_by`
- [x] Migration: `entries` — `pool_id`, `user_id`, `prediction`, `amount`, `is_winner`
- [x] Migration: `transactions` — `user_id`, `type`, `amount`, `balance_after`, `pool_id`, `description`
- [x] Migration: `audit_log` — `admin_id`, `pool_id`, `previous_result`, `new_result`, `reason`, `created_at`
- [x] Configurar Row Level Security (RLS) em todas as tabelas
- [x] Atualizar `architecture.json` com schema completo e relacionamentos

---

## Fase 3 — packages/sports-data (Adapter de Dados)

> Único ponto de contato com APIs externas. Trocar provedor é configuração, não reescrita.

- [x] Definir interface comum do provedor: `SportsDataProvider` com `getMatch()` e `getUpcomingMatches()`
- [x] ESPN adapter — endpoints não-oficiais: scoreboard + summary para `bra.1`, `arg.1`, Libertadores…
- [x] football-data.org adapter — API oficial: Champions, Premier League, La Liga, Série A Brasil…
- [x] Lógica de fallback: ESPN → football-data.org com detecção de erro/null automática (`SportsDataService`)
- [x] 33 testes com ambos os provedores mockados via injeção de dependência (`FetchFn`)
- [x] Atualizar `architecture.json`

---

## Fase 4 — packages/database (Repositórios)

> Cliente Supabase e repositórios reutilizáveis. SQL nunca exposto fora desta camada.

- [x] Configurar cliente Supabase com tipagem manual alinhada ao schema (`database.types.ts`)
- [x] `UsersRepository`: criar, buscar por `telegram_id`/`id`, upsert, atualizar saldo, bloquear
- [x] `PoolsRepository`: criar, buscar abertos por partida, buscar abertos/fechados global, fechar, resolver, cancelar
- [x] `EntriesRepository`: criar, buscar por pool/usuário, contar por usuário+pool, resolver (marcar winners/losers)
- [x] `TransactionsRepository`: criar, extrato paginado por usuário, soma de taxas por pool
- [x] `AuditRepository`: criar, buscar por pool, buscar por admin
- [x] `ChampionshipsRepository`: buscar ativos, buscar por id
- [x] `MatchesRepository`: criar, buscar por id/campeonato, buscar partidas próximas (cron), buscar em andamento, atualizar status
- [x] Classe `Db` agrega todos os repositórios — instância única via `new Db(url, key)`
- [x] Build TypeScript limpo (sem erros)

---

## Fase 5 — apps/bot (Interface Telegram)

> Hospedado no Render. Toda lógica de cálculo **delegada ao `packages/core`**.

- [x] Setup do projeto Telegraf (Node.js/TypeScript) + integração com `packages/*`
- [x] `/start`: registro automático do novo usuário + mensagem de boas-vindas com saldo inicial
- [x] Menu principal com `InlineKeyboard`: Listas Globais | Minhas Listas | Criar Lista
- [x] Fluxo de navegação: Campeonato → Jogo → Modalidade → Tier → Confirmar entrada
- [x] `/entrar`: validações (lista aberta, ≤ 2 entradas, saldo suficiente) + débito no saldo
- [x] `/extrato`: histórico de transações paginado + saldo atual em pontos virtuais
- [x] `/criarlista`: fluxo de criação de pool privado com valor livre definido pelo criador
- [x] Notificações push: resultado disponível, prêmio creditado, devolução realizada
- [x] Cron: fechar pools 5 min antes do kickoff de cada partida aberta
- [x] Cron: verificar resultados de partidas em andamento a cada 1–2 min via `sports-data`
- [x] Resolução automática: calcular vencedores via `core`, creditar prêmio/devolução, registrar transações
- [x] Tratamento de erros com mensagens amigáveis (sem stack traces expostos ao usuário)
- [x] Variáveis de ambiente documentadas para deploy no Render
- [x] Build TypeScript limpo (zero erros)
- [x] ~~Imagens de partida geradas via template PNG~~ — removido (ECONNRESET no Render free tier 0.1 CPU; sharp muito pesado); bot opera só com texto por enquanto
- [x] Logo de campeonato buscado da ESPN e armazenado em `championships.logo_url` (sync automático)
- [x] Logo do bot configurado no BotFather (640×360 px)
- [x] Validação de limite de 2 entradas por bolão — alerta visível ao usuário (answerCbQuery fix)
- [x] **Minhas Entradas** completo:
  - [x] Menu com Ativas / Finalizadas Recentes / Histórico / Gestão de Banca
  - [x] Ativas: lista de entradas abertas como botões clicáveis; tela de detalhe por entrada
  - [x] Finalizadas Recentes: últimas 15 entradas resolvidas/canceladas
  - [x] Histórico com filtros de período (7d / 30d / 90d / Tudo) e resultado (Todas / Ganhos / Perdas)
  - [x] Gestão de Banca: investido, prêmios, devoluções, taxa retida real, aproveitamento — filtro por período
- [x] **Cancelamento de entrada** (Regra 8):
  - [x] Permitido até 5 min antes do kickoff (mesmo critério do fechamento do pool)
  - [x] Devolução de 100% do valor apostado
  - [x] Pool permanece aberta (outros participantes não são afetados)
  - [x] Não restringe re-entrada (limite de 2 entradas continua contando normalmente)
  - [x] Fluxo: Detalhe → Confirmar cancelamento → Processado (exclusão + transação de refund + saldo atualizado)
- [x] **Gaps de fluxo resolvidos:**
  - [x] Tier salvo corretamente na sessão do wizard (bug: `__tier` nunca era persistido)
  - [x] Fluxo de convite e entrada em pool privada via deep link (`?start=join_{poolId}`)
  - [x] Notificação de fechamento de pool enviada a todos os participantes (cron)
  - [x] Criador pode ver suas pools privadas em "Minhas Listas" (`my_pools`) com link de compartilhamento
  - [x] Toast do Telegram ao abrir Histórico / Recentes / Banca vazios
  - [x] Seção de cancelamento adicionada ao "Como Jogar"
- [x] **Total de Gols — multi-threshold:**
  - [x] `TotalDeGolsPrediction` alterado de string para `{ choice: 'over' | 'under'; threshold: 1.5 | 2.5 | 3.5 }`
  - [x] Threshold passa a ser **por palpite** (não mais por pool) — múltiplos thresholds coexistem na mesma lista
  - [x] Keyboard mostra 6 opções: Over/Under × 1.5 / 2.5 / 3.5 (tanto listas globais quanto privadas)
  - [x] Wizard de criação ainda pede threshold padrão para referência (exibição no label da lista)
  - [x] `parsePrediction`, `evaluatePrediction`, `decodePred`, `fmtPredFromDb` e `resolution.service` atualizados
  - [x] Testes unitários atualizados (8 casos de total_de_gols cobrindo todos os thresholds)
  - [x] Build e type-check limpos (`pnpm --filter @realpalpitefc/core build && tsc --noEmit`)
- [x] Deploy no Render (Web Service free tier) — webhook mode via `RENDER_EXTERNAL_URL`; UptimeRobot pinga `/health` a cada 5min para manter serviço acordado
- [x] BotFather configurado: descrição, texto sobre, foto de perfil (logo 640×360)
- [x] **Navegação tier-first:** `gl_p:{matchId}` mostra botões de valor (R$5/10/25/50) → `gl_tier:{matchId}:{tier}` lista modalidades do tier escolhido
- [x] **Pools completas por partida:** sync cria 13 pools por partida (todos os tiers × todas as modalidades); auto-cria pools faltantes nas partidas já existentes na próxima sincronização
- [x] Atualizar `architecture.json` com comandos, fluxos e crons implementados

---

## Fase 6 — apps/admin (Painel Administrativo)

> Hospedado na Vercel. Next.js + Supabase Auth. **Não duplica lógica do `packages/core`.**

- [x] Setup Next.js 15 App Router + Supabase Auth (SSR via `@supabase/ssr`) com acesso restrito a administradores
- [x] Middleware de autenticação: redireciona `/` e rotas protegidas para `/login` se não autenticado
- [x] Layout base: sidebar com logo, ícones SVG (lucide-react), estado ativo por rota, logout; design navy/gold
- [x] Dashboard: cards de Pools Abertas, Total de Pools, Usuários, Arrecadação 7d, Taxas 30d + tabela de pools recentes
- [x] Pools: lista paginada (50/página) com filtro por status, busca por time, contagem de entradas, arrecadado por pool, link "Intervir"
- [x] Partidas: lista paginada de todas as partidas sincronizadas com filtro por status, busca, campeonato, resultado e kickoff
- [x] Entradas: lista paginada de todos os palpites com usuário, partida, modalidade, palpite, valor e resultado (ganhou/perdeu)
- [x] Usuários: lista paginada com busca por @username, saldo, nº de palpites, bloquear/desbloquear; link para detalhe
- [x] Detalhe do usuário: stats (saldo, total palpites, vitórias, derrotas) + histórico de palpites + extrato de transações
- [x] Campeonatos: lista com contagem de partidas por liga, edição de ESPN code, ativar/desativar
- [x] Intervenção em resultado (`/dashboard/resultado/[poolId]`): formulário com placar + motivo, gravação no `audit_log`
- [x] Audit Log: histórico paginado de todas as intervenções de resultado
- [x] Identidade visual: paleta navy (`#0D0F1A`) + gold (`#C9A84C`) derivada do logo `logorp.png`
- [x] Componentes reutilizáveis: `StatusBadge`, `Pagination`, `SearchBar`, `NavItem`
- [x] `createAdminClient` com `SERVICE_ROLE_KEY` para queries sem restrição de RLS
- [x] `export const dynamic = 'force-dynamic'` em todas as páginas (evita falha de prerender)
- [x] Deploy na Vercel (rpfc-admin.vercel.app) — repositório público para contornar restrição Hobby plan
- [x] Vars de ambiente na Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Dashboard: gráfico de arrecadação por dia (últimos 7/30 dias) — pendente
- [ ] Admin: trigger manual de sincronização de partidas/resultados — pendente

---

## Fase 7 — Testes MVP (Grupo Próprio)

> Validação com usuários reais usando pontos virtuais. **Pré-requisito para qualquer pitch comercial.**

- [ ] Adicionar bot ao grupo do Telegram e promovê-lo a administrador do grupo
- [ ] Teste do fluxo completo de ponta a ponta com pontos virtuais
- [ ] Documentar bugs e lacunas de UX identificados durante o uso real
- [ ] Corrigir bugs críticos e refinar textos e mensagens do bot
- [ ] Validar cron de verificação de resultado em produção com partidas reais
- [ ] Validar resolução automática com resultado real de pelo menos 3 partidas completas
- [ ] Registrar métricas de engajamento iniciais para embasar o pitch comercial

---

## Fase 8 — Preparação Comercial (White-label)

> Apenas após validação do MVP. Dinheiro real **somente via operadora licenciada pela SPA**.

- [ ] Dashboard de métricas de engajamento para apresentação a potenciais clientes
- [ ] Definir e documentar contrato de integração com carteira da operadora (interface/API)
- [ ] Implementar adapter de pagamento real como ponto substituível (sem custódia própria neste repo)
- [ ] Configuração de branding por cliente: nome, logo, textos — sem alterar código-fonte
- [ ] Preparar materiais de pitch comercial com dados reais coletados no MVP
