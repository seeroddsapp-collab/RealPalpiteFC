# Bot de Bolões Esportivos para Telegram — Documento do Projeto

## 1. Visão Geral

Sistema de bolões esportivos (pools de apostas entre usuários) operado via bot de Telegram, com o objetivo final de ser vendido/licenciado como solução **white-label** para empresas de apostas esportivas já autorizadas pela Secretaria de Prêmios e Apostas (SPA) no Brasil.

**Modelo de negócio:** plataforma de bolões esportivos com fluxo financeiro real via PIX — depósito, apostas e saques. Na fase atual, operado pelos fundadores para validação do produto. Futuramente pode ser licenciado como solução white-label para operadoras.

## 2. Fases do Projeto

1. **MVP real**: grupo próprio no Telegram, fluxo completo com PIX real entre os fundadores — depósito, apostas, ganhos e saques.
2. **Validação de fluxo**: ajuste de regras, UX e mensagens com base no uso real.
3. **Abertura para usuários**: expansão gradual após validação interna.
4. **Produto comercial (white-label)**: licenciamento da plataforma para outros operadores via API/integração.

## 3. Fluxo do Usuário

```
🏠 Início
 └─ Listas Globais | Minhas Listas Privadas | Criar Lista

📋 Listas Globais
 └─ Campeonato (Brasileirão / Liga Argentina / Libertadores / Champions / ...)
     └─ Jogo (ex: FLA x COR — dia/hora)
         └─ Modalidade (Dupla Chance | Total de Gols | Placar Exato)
             └─ Tiers de valor disponíveis, com prêmio estimado em tempo real
                 └─ Entrar na lista (até 2 entradas por usuário)
```

- Listas **Globais**: valores de entrada fixos e padronizados por modalidade (ver seção 5), para concentrar liquidez.
- Listas **Privadas/Personalizadas**: valor de entrada livre, definido pelo criador, uso entre amigos.
- Pool **dinâmico**: sem número fixo de vagas. A lista fica aberta até o fechamento (ver seção 4) e o prêmio cresce conforme mais gente entra.

## 4. Regras de Negócio (fonte da verdade)

| # | Regra |
|---|---|
| 1 | Lista fecha para novas entradas **5 minutos antes** do horário de início da partida |
| 2 | Prêmio = soma de todas as entradas da lista × **95%** (quando há acertador) |
| 3 | Com acertador(es): taxa da casa = **5%**, prêmio dividido igualmente entre os **bilhetes vencedores** (não entre pessoas — ver regra 7) |
| 4 | Sem nenhum acertador, **com 2+ participantes**: taxa da casa = **10%**, devolução proporcional de **90%** a cada participante, de acordo com o valor que cada um entrou |
| 5 | Lista com **apenas 1 participante** ao fechar: devolução de **100%**, sem taxa |
| 6 | Jogo **cancelado ou adiado**: devolução de **100%** a todos os participantes |
| 7 | Cada usuário pode ter **até 2 entradas** (bilhetes) na mesma lista. Cada entrada é um palpite independente e conta separadamente na divisão do prêmio |
| 8 | Resíduos de arredondamento na divisão do prêmio ficam retidos pela casa |
| 9 | Modalidades consideram apenas o **tempo normal (90 min)** — prorrogação e pênaltis ficam fora do escopo por enquanto |
| 10 | Fonte de dados **primária: ESPN** (endpoints não-oficiais). **Fallback: football-data.org** em caso de indisponibilidade ou divergência |
| 11 | Toda correção manual de resultado deve passar por um **painel/comando de admin com log de auditoria** (quem alterou, quando, valor anterior e novo) |

## 5. Modalidades e Tiers (Listas Globais)

| Modalidade | Dificuldade | Tiers disponíveis (R$) | Cobertura de dados (MVP) |
|---|---|---|---|
| Dupla Chance / Resultado | Fácil | 5 / 10 / 25 | ESPN + football-data.org (grátis) |
| Total de Gols (Over/Under) | Média | 5 / 10 / 25 / 50 | ESPN + football-data.org (grátis) |
| Placar Exato | Difícil | 10 / 25 / 50 | ESPN + football-data.org (grátis) |
| Escanteios / Cartões / Faltas | — | *Fase 2* | Requer provedor de stats pago (ex: API-Football plano pago, FootyStats) |

## 6. Arquitetura Técnica

```
[Usuário no Telegram]
        │
        ▼
[Bot — Render] ── cron de verificação de resultado (a cada 1-2 min)
        │
        ▼
   [Supabase] ── Postgres + Auth (fonte única de dados)
        ▲
        │
[Painel Admin — Vercel / Next.js]
```

- **Render**: hospeda o processo do bot (Node.js/Python) e os cron jobs de verificação de resultado. Escolhido por permitir cron frequente e execuções mais longas no tier gratuito, ao contrário do Vercel.
- **Supabase**: banco de dados Postgres gerenciado + autenticação, usado tanto pelo bot quanto pelo painel admin.
- **Vercel**: hospeda o painel administrativo (baixo tráfego, sem necessidade de cron frequente — encaixe ideal para esse componente).
- **ESPN (endpoints não-oficiais)**: fonte primária de dados esportivos, cobertura forte de ligas sul-americanas (`bra.1`, `arg.1`, `conmebol.libertadores`, etc).
- **football-data.org**: fonte de fallback e cobertura de ligas europeias (Champions League, Premier League, etc), API oficial com contrato.

## 7. Painel Administrativo — Funcionalidades

- Dashboard de listas ativas (arrecadação em tempo real, participantes)
- Histórico de listas resolvidas (ganhadores, valores pagos, taxas retidas)
- Métricas de receita (taxas por período)
- Intervenção manual em resultados, com log de auditoria
- Gestão de usuários (saldo, histórico, bloqueio)
- Gestão de campeonatos/modalidades/tiers sem alteração de código

## 8. Organização de Código (Monorepo)

```
bolao-platform/
├── apps/
│   ├── bot/              # Roda no Render
│   └── admin/            # Roda no Vercel (Next.js)
├── packages/
│   ├── core/             # Regras de negócio puras (cálculo de prêmio, taxas, validações)
│   ├── sports-data/      # Adapter ESPN / football-data.org
│   └── database/         # Cliente Supabase + repositórios
└── supabase/
    └── migrations/       # Schema versionado do banco
```

Princípios:
- `packages/core` nunca importa de `apps/*` — lógica de negócio isolada e testável.
- Trocar provedor de dados esportivos é configuração, não reescrita (via `sports-data`).
- TypeScript em todo o projeto, com tipos compartilhados entre bot e admin.
- Migrations versionadas do Supabase — nunca alterar schema direto em produção sem gerar migration.
- Testes automatizados obrigatórios para `packages/core`, especialmente cálculo de prêmio/taxa.

## 9. Riscos e Pontos de Atenção

- **Regulatório (futuro)**: escala comercial requer estrutura jurídica adequada. Na fase atual de teste entre fundadores, foco está na validação técnica do produto.
- **Dependência de API não-oficial (ESPN)**: pode quebrar ou ser bloqueada sem aviso — daí a importância do fallback e do painel de correção manual.
- **Assimetria de informação**: fechamento 5 min antes do jogo permite que escalações titulares (divulgadas ~1h antes) influenciem palpites tardios — decisão consciente, aceita por ora em favor de mais engajamento.

## 10. Roadmap

- [x] Estrutura do monorepo e schema inicial no Supabase
- [x] Bot funcional com fluxo completo (`/start`, `/entrar`, `/extrato`, `/criarlista`)
- [x] Integração com ESPN + football-data.org via adapter
- [x] Cron de verificação e resolução automática de listas
- [x] Painel admin completo (dashboard + intervenção manual + gestão de usuários/campeonatos)
- [ ] Fluxo PIX real — depósito via QR Code, saque com aprovação admin, regras de rollover
- [ ] Testes end-to-end com PIX real entre os fundadores
- [ ] Abertura para usuários externos
- [ ] Preparação comercial (métricas, pitch, white-label)
