# Guia de Migrations - AutoMoney

## Estrutura de Migrations

O projeto usa migrations do Supabase localizadas em `supabase/migrations/`:

```
supabase/migrations/
├── 00-init-roles.sql          # Configuração inicial de roles
├── 01-schema.sql              # Schema principal (tabelas, RLS, etc)
├── 02-auth-triggers.sql       # Triggers de sincronização auth → users
└── 20260304_add_daily_plans.sql # Adiciona tabela daily_plans
```

## Aplicar Migrations em Produção

### Opção 1: Via Supabase CLI (Recomendado)

```bash
# 1. Instalar Supabase CLI
npm install -g supabase

# 2. Fazer login
supabase login

# 3. Linkar com seu projeto em produção
supabase link --project-ref seu-project-id

# 4. Aplicar todas as migrations
supabase db push

# 5. Verificar status
supabase migration list
```

### Opção 2: Script Automatizado (Node.js)

Se você tem Node.js mas não quer instalar o CLI:

```bash
# 1. Configure a service_role key em scripts/applyMigrations.ts
# 2. Execute:
npx tsx scripts/applyMigrations.ts
```

⚠️ **Nota**: Este script pode ter limitações. Em caso de erro, use a Opção 3.

### Opção 3: Manualmente via Dashboard

Se você não pode/quer instalar o CLI, execute as migrations manualmente:

1. Acesse [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá em **SQL Editor**
3. Execute cada arquivo de migration na ordem:

#### Passo 1: Execute `00-init-roles.sql`
```sql
-- (Copie e cole o conteúdo do arquivo)
```

#### Passo 2: Execute `01-schema.sql`
```sql
-- (Copie e cole o conteúdo do arquivo)
```

#### Passo 3: Execute `02-auth-triggers.sql` ⭐ **IMPORTANTE**
```sql
-- Este fix o problema de PGRST116 ao criar saldo
-- (Copie e cole o conteúdo do arquivo)
```

#### Passo 4: Execute `20260304_add_daily_plans.sql`
```sql
-- (Copie e cole o conteúdo do arquivo)
```

## Fix Específico: Erro PGRST116 ao Criar Saldo

O erro ocorre porque não há sincronização automática entre `auth.users` e `public.users`.

**Solução:** Execute apenas o arquivo `supabase/migrations/02-auth-triggers.sql`

Este arquivo contém:
- Função `handle_new_user()` que sincroniza auth.users → public.users
- Trigger automático em novos cadastros
- Backfill para usuários existentes

## Criar Nova Migration

```bash
# Se você tiver o CLI instalado
supabase migration new nome_da_migration

# Isso cria: supabase/migrations/TIMESTAMP_nome_da_migration.sql
```

Ou crie manualmente:
```bash
touch supabase/migrations/$(date +%Y%m%d%H%M%S)_nome_da_migration.sql
```

## Verificar Migrations Aplicadas

### Via CLI
```bash
supabase migration list
```

### Via Dashboard
1. Vá em **Database** > **Migrations**
2. Verifique quais já foram aplicadas

### Via SQL
```sql
SELECT * FROM supabase_migrations.schema_migrations
ORDER BY version DESC;
```

## Troubleshooting

### "Permission denied for schema auth"

Certifique-se de executar como superuser ou adicione:
```sql
GRANT USAGE ON SCHEMA auth TO postgres, authenticated, service_role;
```

### "Trigger already exists"

Use `DROP TRIGGER IF EXISTS` antes de criar:
```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created ...
```

### "Function already exists"

Use `CREATE OR REPLACE FUNCTION`:
```sql
CREATE OR REPLACE FUNCTION handle_new_user() ...
```

## Boas Práticas

1. **Sempre teste localmente primeiro** (com Docker Supabase)
2. **Execute migrations em ordem** (00, 01, 02, etc)
3. **Faça backup antes** de migrations em produção
4. **Use transações** para migrations complexas:
   ```sql
   BEGIN;
   -- suas mudanças aqui
   COMMIT; -- ou ROLLBACK se algo der errado
   ```
5. **Nunca delete migrations antigas** - apenas crie novas

## Ambiente Local

Para rodar Supabase localmente com Docker:

```bash
# Iniciar Supabase local
supabase start

# Aplicar migrations localmente
supabase db reset

# Parar Supabase local
supabase stop
```

O arquivo `docker-compose.yml` já está configurado no projeto.
