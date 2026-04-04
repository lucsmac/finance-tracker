# AutoMoney App

Aplicação de gestão financeira pessoal com sistema único de valor diário padrão.

## Setup

### 1. Instalar dependências

```bash
pnpm install
```

### 2. Configurar Supabase

Crie o arquivo `.env.local` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://urprwefnujrdrqwkafan.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_-TbToYSdn7OBRXmKz2mFsA_VnAYWjBm
VITE_PUBLIC_APP_URL=https://seu-dominio-publico.com
```

### 3. Executar Schema SQL

O schema já foi executado! Se precisar refazer:

1. Acesse: https://supabase.com/dashboard/project/urprwefnujrdrqwkafan/sql/new
2. Copie o conteúdo de `supabase-schema.sql`
3. Execute no SQL Editor

### 4. Rodar o app

```bash
pnpm run dev
```

### 5. Criar conta e popular dados

1. Abra o app no navegador
2. Clique em "Criar Conta"
3. Cadastre-se com email e senha (mínimo 6 caracteres)
4. Confirme o email (verifique caixa de entrada/spam)
5. Faça login

**Para popular com dados de exemplo:**

1. Após login, pegue seu User ID:
   - Acesse: https://supabase.com/dashboard/project/urprwefnujrdrqwkafan/auth/users
   - Copie o UUID do seu usuário

2. Pegue a Service Role Key:
   - Acesse: https://supabase.com/dashboard/project/urprwefnujrdrqwkafan/settings/api
   - Copie a chave "service_role" (NÃO compartilhe!)

3. Edite `scripts/seedMockData.ts`:
   - Substitua `USER_ID` pelo UUID copiado
   - Substitua `supabaseServiceKey` pela chave service_role

4. Execute o seed:
   ```bash
   npx tsx scripts/seedMockData.ts
   ```

5. Recarregue o app - dados devem aparecer!

## Estrutura do Projeto

```
src/
├── lib/
│   ├── supabase.ts           # Cliente Supabase
│   ├── api/                  # Camada de acesso a dados
│   │   ├── estimates.ts
│   │   ├── transactions.ts
│   │   ├── investments.ts
│   │   ├── goals.ts
│   │   └── config.ts
│   └── hooks/                # React hooks com real-time
│       ├── useAuth.ts
│       ├── useEstimates.ts
│       ├── useTransactions.ts
│       ├── useInvestments.ts
│       ├── useGoals.ts
│       └── useConfig.ts
└── app/
    ├── components/           # Componentes da UI
    └── data/
        └── mockData.ts       # Interfaces TypeScript e funções utilitárias
```

## Arquitetura

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Pattern**: Repository Pattern (API Layer + React Hooks)
- **Estado**: Component-level state + Supabase real-time subscriptions

## Status da Implementação

✅ **Concluído:**
- Supabase setup e schema
- Autenticação (signup/login/logout)
- API layer para todas entidades
- React hooks com real-time
- Componente Auth UI

🚧 **Em progresso:**
- Migração de componentes para usar Supabase
- Próximos: EstimatesManager, CommitmentsView, GoalsView, InvestmentsView, Dashboard

## Build para Produção

```bash
pnpm run build
```

## Lógica de Negócio

### Valor Diário Padrão

```
valor_diário_padrão = soma(estimativas_mensais_ativas) / 30
```

- **Fixo durante o mês** - só muda se o usuário alterar estimativas
- Usado para comparar gastos variáveis diários

### Tipos de Transação

- **expense_variable**: Gastos do dia a dia (contam para comparação com valor diário)
- **expense_fixed**: Contas fixas com vencimento (não contam para valor diário)
- **installment**: Parcelas de compras (não contam para valor diário)
- **income**: Entradas/salário
- **investment**: Aplicações financeiras

### Projeção de Saldo

```
saldo_projetado = saldo_atual - (valor_diário_padrão × dias) - gastos_fixos - parcelas
```

Projeta até a próxima entrada recorrente, alertando quando o saldo ficar negativo.

---

Para mais detalhes, veja `CLAUDE.md` na raiz do projeto.
