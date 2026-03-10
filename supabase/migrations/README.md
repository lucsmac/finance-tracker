# Migrations do AutoMoney

Este diretório contém as migrations do banco de dados Supabase.

## Ordem de Execução

As migrations devem ser executadas em ordem numérica/alfabética:

1. `00-init-roles.sql` - Configuração inicial de roles e permissões
2. `01-schema.sql` - Schema completo (tabelas, indexes, RLS policies)
3. `02-auth-triggers.sql` - **CRÍTICO**: Sincronização auth.users → public.users
4. `20260304_add_daily_plans.sql` - Adiciona feature de planejamento diário
5. `add_balance_start_date.sql` - Adiciona data de início do saldo ao user_configs

## Como Aplicar

### Em Produção

Veja o arquivo [MIGRATIONS.md](../../MIGRATIONS.md) na raiz do projeto.

**Opção rápida**: Copie e cole cada arquivo no **Supabase Dashboard > SQL Editor**

### Localmente

```bash
# Com Supabase CLI
supabase db reset

# Ou com Docker Compose
docker-compose up -d
```

## Migration Importante: 02-auth-triggers.sql

Esta migration é **essencial** para evitar o erro:
```
PGRST116: Cannot coerce the result to a single JSON object
```

Ela garante que quando um usuário se cadastra via Supabase Auth, um registro correspondente é criado automaticamente na tabela `public.users`.

### O que faz:
- Cria função `handle_new_user()`
- Adiciona trigger `on_auth_user_created` em `auth.users`
- Faz backfill de usuários existentes

## Criar Nova Migration

```bash
# Via CLI
supabase migration new nome_da_migration

# Manual
touch supabase/migrations/$(date +%Y%m%d%H%M%S)_nome_da_migration.sql
```

## Troubleshooting

Se você receber erro **PGRST116** ao tentar criar saldo inicial, significa que a migration `02-auth-triggers.sql` não foi aplicada.

**Solução rápida**: Execute apenas este arquivo no SQL Editor do Supabase.
