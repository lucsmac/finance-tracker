# Desenvolvimento Local com Supabase

Este guia mostra como configurar e usar o Supabase local com Docker para desenvolvimento.

## Pré-requisitos

- Docker e Docker Compose instalados
- Node.js e pnpm instalados

## Configuração Inicial

### 1. Iniciar o Supabase Local

```bash
# Iniciar todos os serviços do Supabase
docker-compose up -d

# Verificar se todos os serviços estão rodando
docker-compose ps

# Ver logs (se necessário)
docker-compose logs -f
```

### 2. Serviços Disponíveis

Após iniciar, você terá acesso a:

- **Studio (Dashboard)**: http://localhost:54323
  - Interface visual para gerenciar o banco, ver tabelas, executar SQL, etc.

- **API REST**: http://localhost:54321
  - Endpoint para todas as chamadas da aplicação

- **Database (PostgreSQL)**: localhost:54322
  - Acesso direto ao PostgreSQL (user: `postgres`, password: `postgres`)

- **Auth, Realtime, Storage**: Todos rodando localmente

### 3. Configurar Variáveis de Ambiente

O arquivo `.env.local` já deve estar configurado com as credenciais locais:

```env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Se não tiver, copie do exemplo:
```bash
cp .env.local.example .env.local
```

### 4. Aplicar Schema

O schema SQL (`supabase/migrations/01-schema.sql`) é aplicado automaticamente na primeira vez que o container inicia.

Para reaplicar o schema:

```bash
# Parar e remover todos os containers + volumes
docker-compose down -v

# Iniciar novamente (recria tudo do zero)
docker-compose up -d
```

### 5. Iniciar a Aplicação

```bash
# Instalar dependências (se ainda não instalou)
pnpm install

# Iniciar em modo dev
pnpm run dev
```

Acesse: http://localhost:5173

### 6. Criar Conta de Teste

Na primeira vez, você precisará criar uma conta:

1. Abra http://localhost:5173
2. Clique em "Sign Up" ou "Criar Conta"
3. Use qualquer email (ex: `test@test.com`) e senha
4. O email será auto-confirmado (não precisa verificar inbox)
5. Você será logado automaticamente

### 7. Popular com Dados de Teste (Opcional)

```bash
# 1. Criar uma conta no app (passo 6)
# 2. Pegar o USER_ID do Supabase Studio (http://localhost:54323)
#    - Vá em Authentication > Users
#    - Copie o UUID do seu usuário
# 3. Atualizar USER_ID no script scripts/seedMockData.ts
# 4. Executar:
npx tsx scripts/seedMockData.ts
```

## Comandos Úteis

### Gerenciar os Serviços

```bash
# Iniciar todos os serviços
docker-compose up -d

# Parar todos os serviços
docker-compose stop

# Parar e remover containers (mantém volumes/dados)
docker-compose down

# Parar, remover e limpar volumes (APAGA TODOS OS DADOS!)
docker-compose down -v

# Ver logs de todos os serviços
docker-compose logs -f

# Ver logs de um serviço específico
docker-compose logs -f db        # Banco de dados
docker-compose logs -f auth      # Autenticação
docker-compose logs -f rest      # API REST
docker-compose logs -f realtime  # Real-time
docker-compose logs -f studio    # Studio/Dashboard

# Reiniciar todos os serviços
docker-compose restart

# Reiniciar um serviço específico
docker-compose restart db
```

### Acessar o Banco Diretamente

```bash
# Via psql no container (porta 54322 é a porta externa)
docker-compose exec db psql -U postgres -d postgres

# Ou via psql local (se tiver instalado)
psql -h localhost -p 54322 -U postgres -d postgres

# Comandos úteis no psql:
# \dt                    - listar tabelas
# \d users               - descrever tabela users
# \du                    - listar usuários/roles do postgres
# SELECT * FROM users;   - consultar dados
# \q                     - sair
```

### Executar SQL Manualmente

```bash
# Via Docker Compose
docker-compose exec -T db psql -U postgres -d postgres < seu-arquivo.sql

# Executar comando SQL direto
docker-compose exec db psql -U postgres -d postgres -c "SELECT * FROM users;"

# Aplicar migration manualmente
docker-compose exec -T db psql -U postgres -d postgres < supabase/migrations/01-schema.sql
```

### Backup e Restore

```bash
# Fazer backup completo
docker-compose exec -T db pg_dump -U postgres postgres > backup-$(date +%Y%m%d).sql

# Restaurar backup
docker-compose exec -T db psql -U postgres -d postgres < backup-20260304.sql

# Backup apenas de uma tabela
docker-compose exec -T db pg_dump -U postgres -t users postgres > users-backup.sql
```

### Supabase Studio

Acesse http://localhost:54323 para:
- Ver e editar dados das tabelas
- Executar queries SQL
- Gerenciar autenticação (ver usuários, criar novos)
- Monitorar logs
- Ver configurações de RLS (Row Level Security)

## Desenvolvimento

```bash
# Instalar dependências
pnpm install

# Iniciar app em dev
pnpm run dev

# Build para produção
pnpm run build

# Preview do build
pnpm run preview
```

## Troubleshooting

### Portas já estão em uso

Se alguma porta já estiver ocupada (54321, 54322, 54323):

```bash
# Ver quem está usando as portas
sudo lsof -i :54321
sudo lsof -i :54322
sudo lsof -i :54323

# Opção 1: Parar o serviço conflitante
# Opção 2: Mudar as portas no docker-compose.yml
# Exemplo: "54322:5432" vira "54332:5432"
```

### Containers não iniciam

```bash
# Ver logs detalhados de todos os serviços
docker-compose logs

# Ver logs de um serviço específico
docker-compose logs db
docker-compose logs auth
docker-compose logs kong

# Verificar se o Docker está rodando
docker ps

# Recriar tudo do zero
docker-compose down -v
docker-compose up -d
```

### Schema não foi aplicado / Tabelas não existem

O schema SQL só é aplicado na primeira inicialização. Se você:
- Modificou o schema depois de criar o container
- As tabelas não foram criadas corretamente

Solução:

```bash
# Recriar o banco completamente
docker-compose down -v
docker-compose up -d

# Ou aplicar manualmente
docker-compose exec -T db psql -U postgres -d postgres < supabase/migrations/01-schema.sql
```

### Erro de autenticação / "Invalid API key"

Verifique se `.env.local` tem as chaves corretas:

```env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
```

Depois reinicie o app:
```bash
# Parar o Vite (Ctrl+C)
pnpm run dev
```

### Real-time não funciona

```bash
# Verificar se o serviço realtime está rodando
docker-compose ps realtime

# Ver logs do realtime
docker-compose logs -f realtime

# Reiniciar o serviço
docker-compose restart realtime
```

### Dados não aparecem no app

1. Verifique se todos os containers estão rodando: `docker-compose ps`
2. Verifique `.env.local` tem as URLs corretas
3. Abra o Supabase Studio (http://localhost:54323) e veja se as tabelas existem
4. Teste a conexão com o banco: `docker-compose exec db psql -U postgres -d postgres -c "SELECT NOW();"`
5. Verifique os logs do app (no terminal onde rodou `pnpm run dev`)
6. Verifique o console do browser (F12) por erros

### Studio não abre / Erro 404

```bash
# Verificar se o studio está rodando
docker-compose ps studio

# Ver logs
docker-compose logs -f studio

# Reiniciar
docker-compose restart studio kong
```

## Mudando entre Supabase Cloud e Local

### Para usar Supabase Local (Docker):

1. Certifique-se de que o Docker está rodando:
```bash
docker-compose up -d
docker-compose ps  # Todos devem estar "Up"
```

2. Configure `.env.local`:
```env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

3. Reinicie o app: `pnpm run dev`

### Para usar Supabase Cloud:

1. Configure `.env.local` com suas credenciais do Supabase:
```env
VITE_SUPABASE_URL=https://urprwefnujrdrqwkafan.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_-TbToYSdn7OBRXmKz2mFsA_VnAYWjBm
```

2. Reinicie o app: `pnpm run dev`

**Dica**: Os dados entre local e cloud são completamente separados. Se quiser migrar dados, use backup/restore ou seed scripts.

## Limpeza

Para remover completamente o ambiente Docker:

```bash
# Remove containers e volumes (mantém imagens Docker)
docker-compose down -v

# Remove containers, volumes E imagens (liberando mais espaço)
docker-compose down -v --rmi all

# Ver espaço usado pelo Docker
docker system df

# Limpar tudo que não está sendo usado (cuidado!)
docker system prune -a --volumes
```

## Diferenças entre Local e Cloud

| Aspecto | Supabase Local | Supabase Cloud |
|---------|---------------|----------------|
| **Dados** | Armazenados localmente no Docker | Armazenados na nuvem Supabase |
| **Acesso** | Apenas na sua máquina | Acessível de qualquer lugar |
| **Performance** | Rápido (sem latência de rede) | Depende da internet |
| **Uptime** | Precisa rodar `docker-compose up` | Sempre disponível |
| **Custos** | Grátis (usa recursos locais) | Plano free ou pago |
| **Backups** | Manual (você gerencia) | Automático (Supabase gerencia) |
| **Colaboração** | Um dev por vez | Múltiplos devs simultaneamente |
| **Real-time** | Funciona localmente | Funciona globalmente |

**Recomendação**: Use Local para desenvolvimento, Cloud para staging/produção.
