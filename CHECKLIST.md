# RealPalpiteFC — Checklist de Implementação

> Marque cada item com `[x]` conforme for concluindo.  
> Atualize a seção **Status atual** sempre que parar o trabalho.

---

## Status atual

- **Última sessão:** —
- **Fase em andamento:** Fase 0 — Fundação do Projeto
- **Próximo passo:** Inicializar monorepo com pnpm workspaces (repositório já existe: github.com/seeroddsapp-collab/RealPalpiteFC)

---

## Fase 0 — Fundação do Projeto

- [x] Criar repositório no GitHub — https://github.com/seeroddsapp-collab/RealPalpiteFC
- [ ] Inicializar monorepo com `pnpm workspaces`
- [ ] Configurar TypeScript base — `tsconfig` raiz + `tsconfig` por pacote
- [ ] Configurar ESLint + Prettier compartilhados entre todos os pacotes
- [ ] Criar estrutura de pastas:
  - [ ] `apps/bot`
  - [ ] `apps/admin`
  - [ ] `packages/core`
  - [ ] `packages/sports-data`
  - [ ] `packages/database`
  - [ ] `supabase/migrations`
- [x] Criar projeto no Supabase — https://rczxqhvtqnpbtvzkjpml.supabase.co
- [ ] Criar `.env.example` em cada app com todas as variáveis necessárias
- [ ] Instalar e configurar `claude-mem` para memória persistente de sessão
- [ ] Atualizar `architecture.json` refletindo o estado inicial real

---

## Fase 1 — packages/core (Regras de Negócio)

> Lógica pura, sem dependência de frameworks. **Testes unitários obrigatórios.**

- [ ] Definir tipos TypeScript compartilhados: `Match`, `Pool`, `Entry`, `User`, `Modality`, `Tier`, `Transaction`
- [ ] `pool-calculator`: prêmio = soma das entradas × 95% quando há acertador (taxa da casa = 5%)
- [ ] `pool-calculator`: sem acertador com 2+ participantes — taxa 10%, devolução proporcional de 90%
- [ ] `pool-calculator`: 1 participante ao fechar — devolução 100% sem taxa
- [ ] `pool-calculator`: jogo cancelado ou adiado — devolução 100% a todos
- [ ] `pool-calculator`: divisão de prêmio por bilhete (não por usuário); resíduo de arredondamento fica com a casa
- [ ] `list-rules`: fechamento automático 5 min antes do kickoff; máx 2 entradas por usuário por pool
- [ ] Testes unitários cobrindo todos os cenários das Regras 1–9 do `PROJETO.md`
- [ ] Atualizar `architecture.json`

---

## Fase 2 — supabase/migrations (Schema do Banco)

> Toda mudança de schema **gera uma migration versionada**. Nunca alterar tabelas direto em produção.

- [ ] Migration: `users` — `telegram_id`, `username`, `virtual_balance`, `is_blocked`, `created_at`
- [ ] Migration: `championships` — `name`, `espn_code`, `football_data_code`, `modalities[]`, `is_active`
- [ ] Migration: `matches` — `championship_id`, `home_team`, `away_team`, `kickoff_at`, `status`, `result`
- [ ] Migration: `pools` — `match_id`, `modality`, `tier_brl`, `type` (global|private), `status`, `created_by`
- [ ] Migration: `entries` — `pool_id`, `user_id`, `prediction`, `amount`, `is_winner`
- [ ] Migration: `transactions` — `user_id`, `type`, `amount`, `balance_after`, `pool_id`, `description`
- [ ] Migration: `audit_log` — `admin_id`, `pool_id`, `previous_result`, `new_result`, `reason`, `created_at`
- [ ] Configurar Row Level Security (RLS) em todas as tabelas
- [ ] Atualizar `architecture.json` com schema completo e relacionamentos

---

## Fase 3 — packages/sports-data (Adapter de Dados)

> Único ponto de contato com APIs externas. Trocar provedor é configuração, não reescrita.

- [ ] Definir interface comum do provedor: `getMatch()`, `getLiveScore()`, `getMatchStatus()`
- [ ] ESPN adapter — endpoints não-oficiais: `bra.1`, `arg.1`, Libertadores, Sudamericana, Copa do Brasil…
- [ ] football-data.org adapter — API oficial: Champions, Premier League, La Liga, Série A…
- [ ] Lógica de fallback: ESPN → football-data.org com detecção de erro/indisponibilidade
- [ ] Testes com ambos os provedores mockados verificando contrato da interface comum
- [ ] Atualizar `architecture.json`

---

## Fase 4 — packages/database (Repositórios)

> Cliente Supabase e repositórios reutilizáveis. SQL nunca exposto fora desta camada.

- [ ] Configurar cliente Supabase compartilhado com tipagem gerada (`supabase gen types`)
- [ ] `UsersRepository`: criar usuário, buscar por `telegram_id`, atualizar saldo virtual
- [ ] `PoolsRepository`: criar pool, buscar abertos por partida, fechar, marcar como resolvido
- [ ] `EntriesRepository`: criar entrada, buscar por pool, contar entradas por usuário no pool
- [ ] `TransactionsRepository`: registrar débito/crédito, extrato paginado por usuário
- [ ] `AuditRepository`: registrar intervenção manual, buscar log por pool ou por admin
- [ ] `MatchesRepository`: CRUD de partidas + busca por campeonato e janela de data
- [ ] Atualizar `architecture.json`

---

## Fase 5 — apps/bot (Interface Telegram)

> Hospedado no Render. Toda lógica de cálculo **delegada ao `packages/core`**.

- [ ] Setup do projeto Telegraf (Node.js/TypeScript) + integração com `packages/*`
- [ ] `/start`: registro automático do novo usuário + mensagem de boas-vindas com saldo inicial
- [ ] Menu principal com `InlineKeyboard`: Listas Globais | Minhas Listas | Criar Lista
- [ ] Fluxo de navegação: Campeonato → Jogo → Modalidade → Tier → Confirmar entrada
- [ ] `/entrar`: validações (lista aberta, ≤ 2 entradas, saldo suficiente) + débito no saldo
- [ ] `/extrato`: histórico de transações paginado + saldo atual em pontos virtuais
- [ ] `/criarlista`: fluxo de criação de pool privado com valor livre definido pelo criador
- [ ] Notificações push: resultado disponível, prêmio creditado, devolução realizada
- [ ] Cron: fechar pools 5 min antes do kickoff de cada partida aberta
- [ ] Cron: verificar resultados de partidas em andamento a cada 1–2 min via `sports-data`
- [ ] Resolução automática: calcular vencedores via `core`, creditar prêmio/devolução, registrar transações
- [ ] Tratamento de erros com mensagens amigáveis (sem stack traces expostos ao usuário)
- [ ] Variáveis de ambiente documentadas para deploy no Render
- [ ] Deploy no Render + configurar webhook (ou long-polling) do Telegram Bot API
- [ ] Atualizar `architecture.json` com comandos, fluxos e crons implementados

---

## Fase 6 — apps/admin (Painel Administrativo)

> Hospedado na Vercel. Next.js + Supabase Auth. **Não duplica lógica do `packages/core`.**

- [ ] Setup Next.js + Supabase Auth com acesso restrito a administradores
- [ ] Layout base: sidebar de navegação + header com sessão do admin
- [ ] Dashboard: pools ativos com arrecadação total e participantes em tempo real
- [ ] Dashboard: histórico de pools resolvidos — ganhadores, prêmios pagos, taxas retidas
- [ ] Métricas de receita: taxas por período com filtros de data e campeonato
- [ ] Intervenção em resultado: formulário com campos obrigatórios + gravação no `audit_log`
- [ ] Gestão de usuários: saldo atual, histórico de transações, bloquear/desbloquear
- [ ] Gestão de campeonatos/modalidades/tiers: CRUD completo sem alterar código-fonte
- [ ] Deploy na Vercel + atualizar `architecture.json`

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
