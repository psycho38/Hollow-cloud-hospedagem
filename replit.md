# Hollow Cloud

Painel de hospedagem para bots com controle de status, metadados, fontes e planos.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/hollow-cloud/src/pages/hollow-pages.tsx` — telas do dashboard, fleet, detalhes do bot, planos e configurações
- `artifacts/hollow-cloud/src/components/shell.tsx` — navegação lateral e cabeçalho responsivo
- `artifacts/hollow-cloud/src/index.css` — tokens visuais e utilitários do Hollow Cloud
- `lib/api-spec/openapi.yaml` — contrato da API para dashboard, bots e atividade
- `artifacts/api-server/src/routes/hollow-cloud.ts` — endpoints de demonstração do produto

## Architecture decisions

- A interface usa o cliente React gerado a partir do OpenAPI para manter as ações do painel tipadas.
- O primeiro MVP usa dados em memória no servidor para validar o produto sem bloquear o design em integrações externas.
- A identidade visual usa uma base slate, aqua como sinal operacional e âmbar para estados de atenção.

## Product

O Hollow Cloud permite acompanhar bots hospedados, adicionar uma fonte GitHub ou ZIP, editar nome/título/descrição, ligar e desligar bots, remover deployments e comparar os planos Free e Pro. A conta e os provedores de login estão representados na tela de configurações e serão conectados ao OAuth do usuário.

## User preferences

- O produto deve se chamar Hollow Cloud.
- O plano Free deve permitir 3 bots e 524 MB de memória total.

## Gotchas

- A API atual é um MVP em memória; reiniciar o workflow restaura os bots de demonstração.
- OAuth (Gmail/GitHub/Discord), pagamentos e execução real de ZIPs ainda precisam das integrações e credenciais do usuário.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
