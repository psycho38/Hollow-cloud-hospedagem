# Hollow Cloud no Netlify

## Arquitetura atual

O Netlify hospeda o frontend React. A API Express deve continuar rodando em um serviço Node separado, porque o checkout Stripe e os endpoints `/api/*` não são servidos pelo build estático do Netlify.

O login/Auth permanece desativado nesta versão.

## Variáveis do Netlify

Configure estas variáveis em **Site configuration → Environment variables**:

```text
BASE_PATH=/
PORT=5173
VITE_API_BASE_URL=https://URL-PUBLICA-DA-SUA-API
```

`VITE_API_BASE_URL` deve ser a URL pública do serviço que executa `artifacts/api-server`. Não coloque uma URL `localhost` aqui.

## Build

O `netlify.toml` já configura:

```text
Build command: pnpm install --frozen-lockfile && pnpm --filter @workspace/hollow-cloud run build
Publish directory: artifacts/hollow-cloud/dist/public
```

O redirect para `/index.html` mantém as rotas `/`, `/bots`, `/plans` e `/settings` funcionando ao atualizar a página.

## Variáveis da API

No serviço que hospeda a API:

```text
PORT=<fornecida pelo provedor>
REPLIT_DOMAINS=<opcional, usado como fallback para os links de retorno do Stripe>
```

A integração Stripe atual usa o conector do Replit. Portanto, mantenha a API em um ambiente Replit para que o conector continue autenticando automaticamente. Se a API for movida para Render, Railway ou outro provedor, troque o conector por `STRIPE_SECRET_KEY` e a integração correspondente antes de publicar.

## Stripe

O checkout do Pro está configurado para `R$ 12/mês`. O CPF é coletado pelo Checkout hospedado do Stripe, não pelo frontend.

O frontend não deve receber nem armazenar:

- `STRIPE_SECRET_KEY`
- tokens do GitHub
- CPF
- `SESSION_SECRET`

Esses valores, quando necessários, devem ficar somente nas variáveis protegidas do serviço de backend.