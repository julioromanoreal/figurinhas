# Figurinhas Copa 2026

PWA para tracking de figurinhas da Copa do Mundo FIFA 2026 Panini.

## Stack

- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Hosting**: Vercel (frontend) + Supabase (backend)

## Configuração

### 1. Crie o projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto gratuito
2. Vá em **SQL Editor** e execute os arquivos de migração na ordem:
   - `supabase/migrations/001_schema.sql`
   - `supabase/migrations/002_rls.sql`
3. Copie a **Project URL** e a **anon key** em **Settings → API**

### 2. Configure as variáveis de ambiente

```bash
cp .env.local.example .env.local
```

Edite `.env.local` com suas credenciais do Supabase.

### 3. Execute o seed (dados das figurinhas)

```bash
# Adicione também SUPABASE_SERVICE_ROLE_KEY no .env.local
npm run seed
```

### 4. Execute localmente

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

## Deploy no Vercel

1. Faça push do repositório para o GitHub
2. Acesse [vercel.com](https://vercel.com) e importe o repositório
3. Configure as variáveis de ambiente:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL` (URL do seu app no Vercel, ex: `https://figurinhas.vercel.app`)
4. Deploy!

## Configurar Auth no Supabase (obrigatório para magic link)

1. No Supabase, vá em **Authentication → URL Configuration**
2. Adicione em **Redirect URLs**: `https://seu-app.vercel.app/auth/callback`

## Funcionalidades

- ✅ Cadastro e login com e-mail/senha ou magic link
- ✅ 980 figurinhas da Copa 2026 organizadas por categoria
- ✅ Marcar figurinhas como possuídas/faltando
- ✅ Controle de repetidas (com contador)
- ✅ Sincronização em tempo real entre colaboradores
- ✅ Compartilhar coleção com a família
- ✅ QR Code para análise de trocas
- ✅ PWA — instale no celular como um app
- ✅ Progresso da coleção com barra visual
- ✅ Filtros: Todos / Tenho / Faltam / Repetidas
- ✅ Busca por número ou nome do jogador

## Como usar a troca por QR Code

1. Na tela da sua coleção, toque em **☰ → QR Code para troca**
2. Mostre o QR Code para outra pessoa
3. Ela escaneia com a câmera e abre o link
4. O app analisa automaticamente:
   - Suas repetidas que ela precisa
   - As repetidas dela que você precisa
