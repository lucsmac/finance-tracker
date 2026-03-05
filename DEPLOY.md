# Guia de Deploy - AutoMoney

Este guia explica como fazer o deploy da aplicação AutoMoney na Vercel.

## Pré-requisitos

1. Conta no [Vercel](https://vercel.com) (gratuita)
2. Conta no [Supabase](https://supabase.com) (gratuita)
3. Código versionado no Git (GitHub, GitLab ou Bitbucket)

## Passo a Passo

### 1. Preparar o Supabase (Production)

Se você ainda não tem um projeto Supabase em produção:

1. Acesse [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Aguarde a criação do banco de dados
4. Vá em **SQL Editor** e execute o arquivo `supabase-schema.sql` ou as migrations em `supabase/migrations/`
5. Anote as credenciais:
   - **Project URL**: `https://seu-projeto.supabase.co`
   - **Anon Key**: Encontre em Settings > API > Project API keys > `anon` `public`

### 2. Deploy na Vercel

#### Opção A: Deploy via CLI (Recomendado)

```bash
# 1. Instalar Vercel CLI
npm i -g vercel

# 2. Fazer login
vercel login

# 3. Deploy (responda às perguntas ou aceite os padrões)
vercel

# 4. Configurar variáveis de ambiente
vercel env add VITE_SUPABASE_URL
# Cole a URL do seu projeto Supabase

vercel env add VITE_SUPABASE_ANON_KEY
# Cole a anon key do seu projeto Supabase

# 5. Deploy para produção
vercel --prod
```

#### Opção B: Deploy via Dashboard

1. Acesse [vercel.com/new](https://vercel.com/new)
2. Conecte seu repositório Git (GitHub/GitLab/Bitbucket)
3. Configure o projeto:
   - **Framework Preset**: Vite
   - **Build Command**: `pnpm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `pnpm install`

4. Adicione as **Variáveis de Ambiente**:
   ```
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui
   ```

5. Clique em **Deploy**

### 3. Configurações Pós-Deploy

#### Configurar Domínio (Opcional)

1. Vá em **Settings** > **Domains**
2. Adicione seu domínio personalizado
3. Siga as instruções para configurar DNS

#### Habilitar CORS no Supabase

1. No Supabase Dashboard, vá em **Authentication** > **URL Configuration**
2. Adicione a URL do seu site Vercel em **Site URL**:
   ```
   https://seu-app.vercel.app
   ```
3. Adicione também em **Redirect URLs**:
   ```
   https://seu-app.vercel.app/**
   ```

### 4. Verificar o Deploy

1. Acesse a URL fornecida pela Vercel (ex: `https://automoney.vercel.app`)
2. Teste o login/cadastro
3. Verifique se os dados estão sendo salvos no Supabase

## Deployments Automáticos

Após o primeiro deploy, a Vercel irá:
- Fazer deploy automático a cada push na branch principal
- Criar preview deployments para cada pull request
- Executar builds automáticos

## Troubleshooting

### Erro: "Failed to load environment variables"

- Verifique se as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estão configuradas
- Certifique-se de usar o prefixo `VITE_` (necessário para Vite)

### Erro: "Invalid API key"

- Confirme que está usando a **anon key** (não a service_role key)
- Verifique se copiou a chave completa sem espaços

### Erro: "CORS policy"

- Configure as URLs permitidas no Supabase (veja seção "Habilitar CORS")
- Adicione tanto a URL de produção quanto a de preview

### Build falhou

```bash
# Teste o build localmente primeiro
pnpm run build

# Se funcionar localmente, verifique:
# 1. Se todas as dependências estão no package.json
# 2. Se o Node.js version está compatível
# 3. Logs de build no dashboard da Vercel
```

## Comandos Úteis

```bash
# Ver deployments
vercel ls

# Ver logs do último deployment
vercel logs

# Abrir o projeto no dashboard
vercel open

# Remover um deployment
vercel rm [deployment-url]
```

## Alternativas à Vercel

Se preferir outras plataformas:

### Netlify

```bash
# netlify.toml já está configurado
npm i -g netlify-cli
netlify login
netlify deploy --prod
```

### Cloudflare Pages

1. Conecte seu repositório no dashboard
2. Configure:
   - Build command: `pnpm run build`
   - Build output: `dist`
   - Node version: `18` ou superior

## Recursos Adicionais

- [Documentação Vercel](https://vercel.com/docs)
- [Documentação Supabase](https://supabase.com/docs)
- [Vite Production Build](https://vite.dev/guide/build.html)
