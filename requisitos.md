# AutoMoney - Documento de Requisitos

## 1. Visão Geral

**Objetivo:** Aplicação web para controle de finanças pessoais com foco em orçamento diário baseado em estimativas. O sistema usa um valor diário padrão fixo, calculado a partir das estimativas de gastos mensais do usuário, permitindo acompanhar se os gastos reais estão acima ou abaixo do planejado.

**Conceito central:** O usuário define quanto espera gastar por mês em cada categoria. O sistema calcula um valor diário padrão fixo. Dia a dia, o usuário registra os gastos reais, que afetam apenas o saldo — não o valor diário dos próximos dias.

**Usuário:** Uso pessoal (single-user).

---

## 2. Regras de Negócio

### 2.1 Valor Diário Padrão (Core)

Este é o coração do sistema.

#### Definição
```
valor_diário_padrão = soma(estimativas_mensais_ativas) / 30
```

#### Regras
1. **Calculado uma vez** com base nas estimativas do usuário
2. **Fixo ao longo do mês** — não muda com gastos reais
3. **Só recalcula** quando o usuário altera alguma estimativa mensal
4. **Aplica-se a todos os dias** igualmente

#### Exemplo
```
Estimativas mensais:
- Mercado: R$ 800
- Transporte: R$ 300
- Farmácia: R$ 150
- Lanches/Saídas: R$ 450

Total: R$ 1.700
Valor Diário Padrão = 1.700 / 30 = R$ 56,67
```

### 2.2 Registro de Gastos Diários

#### O que acontece quando registra um gasto:

1. **Atualiza o saldo** (diminui)
2. **Registra o gasto real do dia** (para comparação)
3. **NÃO altera** o valor diário padrão
4. **NÃO afeta** os dias seguintes

#### Exemplo de fluxo diário
```
Valor Diário Padrão: R$ 56,67
Saldo inicial: R$ 5.000

Dia 1:
- Gastou: R$ 40,00
- Saldo: R$ 4.960,00
- Variação: +R$ 16,67 (economizou)

Dia 2:
- Gastou: R$ 80,00
- Saldo: R$ 4.880,00
- Variação: -R$ 23,33 (gastou a mais)

Dia 3:
- Gastou: R$ 0,00
- Saldo: R$ 4.880,00
- Variação: +R$ 56,67 (economizou tudo)

Valor Diário Padrão continua R$ 56,67 em todos os dias.
```

### 2.3 Atualização do Saldo

```
saldo_atual = saldo_anterior + entradas - saídas
```

**Saídas incluem:**
- Gastos variáveis (mercado, transporte, etc)
- Gastos fixos (aluguel, contas)
- Parcelas
- Investimentos

**Início do mês:** Saldo inicial = saldo final do mês anterior

### 2.4 Gastos Fixos e Parcelas

- **NÃO entram** no cálculo do valor diário padrão
- Têm data específica de vencimento
- Afetam o saldo quando pagos
- Devem ser visualizados separadamente (compromissos do mês)

### 2.5 Investimentos

| Ação | Efeito no Saldo | Efeito no Patrimônio |
|------|-----------------|----------------------|
| Aplicar | - (diminui) | + (aumenta) |
| Resgatar | + (aumenta) | - (diminui) |

- Investimentos **NÃO entram** no valor diário padrão
- São tratados como saída do saldo disponível
- Ficam registrados no patrimônio investido

### 2.6 Transações Recorrentes

**Entradas/Gastos Fixos Recorrentes:**
- Sistema gera automaticamente no dia configurado
- Usuário pode editar/cancelar ocorrências individuais

**Parcelamentos:**
- Ao criar, gera todas as N parcelas futuras
- Cada parcela é uma transação individual
- Ligadas por `installment_group_id`

### 2.7 Metas de Economia/Investimento

- Define valor ou % a economizar/investir por mês
- Serve como referência, não bloqueia gastos
- Mostra progresso ao longo do mês

### 2.8 Performance / Variação

A cada dia, calcular:
```
variação_dia = valor_diário_padrão - gasto_real_variável_dia
```

- **Positivo:** economizou naquele dia
- **Negativo:** gastou mais que o planejado

Acumulado do mês:
```
variação_acumulada = soma(variações_diárias)
```

### 2.9 Projeção de Saldo (Previsão)

O sistema deve projetar o saldo para os dias futuros até a próxima entrada de renda, alertando quando o dinheiro não será suficiente.

#### Cálculo da Projeção

Para cada dia futuro (de amanhã até a próxima renda):

```
saldo_projetado[dia] = saldo_projetado[dia_anterior] 
                       - valor_diário_padrão 
                       - gastos_fixos_do_dia 
                       - parcelas_do_dia
                       - investimentos_programados_do_dia
```

Onde:
- `saldo_projetado[hoje]` = saldo atual real
- `valor_diário_padrão` = estimativa de gasto variável por dia
- `gastos_fixos_do_dia` = contas/despesas fixas com vencimento naquele dia
- `parcelas_do_dia` = parcelas com vencimento naquele dia

#### Status Visual dos Dias

| Saldo Projetado | Status | Cor |
|-----------------|--------|-----|
| > valor_diário_padrão | Confortável | Verde |
| > 0 e ≤ valor_diário_padrão | Apertado | Amarelo |
| ≤ 0 | Sem saldo | Vermelho |

#### Regras da Projeção

1. **Período de projeção:** Do dia atual até a próxima entrada recorrente (ex: salário)
2. **Atualização:** Recalcula sempre que:
   - Um gasto é registrado
   - Uma entrada é registrada
   - Estimativas são alteradas
3. **Gastos fixos/parcelas:** Considerados nas datas de vencimento
4. **Entradas futuras:** Quando uma entrada recorrente cai no período, o saldo projetado aumenta

#### Exemplo de Projeção

```
Hoje: dia 20
Próximo salário: dia 5 do próximo mês (15 dias)
Saldo atual: R$ 600
Valor diário padrão: R$ 50
Parcela dia 25: R$ 200

Projeção:
- Dia 21: 600 - 50 = R$ 550 (verde)
- Dia 22: 550 - 50 = R$ 500 (verde)
- Dia 23: 500 - 50 = R$ 450 (verde)
- Dia 24: 450 - 50 = R$ 400 (verde)
- Dia 25: 400 - 50 - 200 = R$ 150 (amarelo)
- Dia 26: 150 - 50 = R$ 100 (amarelo)
- Dia 27: 100 - 50 = R$ 50 (amarelo)
- Dia 28: 50 - 50 = R$ 0 (vermelho)
- Dia 29: 0 - 50 = -R$ 50 (vermelho)
- ...
- Dia 5: Salário entra, saldo volta ao positivo
```

#### Alerta de Previsão

Quando houver dias em vermelho na projeção, exibir alerta:
- "⚠️ Saldo insuficiente a partir do dia X"
- "Você precisará de R$ Y a mais para fechar o período"

Cálculo do déficit:
```
déficit = |menor_saldo_projetado_negativo|
```

---

## 4. Funcionalidades

### 4.1 Dashboard (Tela Principal)

**Exibir:**
- **Valor Diário Padrão** (destaque principal)
- Gasto real de hoje (até agora)
- Variação do dia (economizou/gastou a mais)
- Saldo disponível atual
- Variação acumulada do mês
- **Projeção resumida:**
  - Dias até próxima renda
  - Status da projeção (ok / alerta)
  - Se houver dias em vermelho: "⚠️ Saldo insuficiente a partir do dia X"
- Compromissos próximos (fixos e parcelas)

**Ações rápidas:**
- Adicionar gasto variável
- Ver detalhes do dia
- Ver projeção completa

### 4.2 Gestão de Estimativas Mensais

**Tela para configurar as estimativas:**
- Listar categorias de gastos variáveis
- Definir valor estimado para cada categoria
- Ver total e valor diário calculado
- Ativar/desativar categorias

**Ao alterar qualquer valor:**
- Recalcular valor diário padrão
- Aplicar a partir do dia atual

### 4.3 Calendário/Timeline do Mês

**Dias passados (até hoje):**
- Gasto real registrado
- Valor diário padrão (referência)
- Variação (+/-)
- Saldo real ao final do dia
- Cor baseada na variação:
  - Verde: gastou menos que o diário
  - Vermelho: gastou mais que o diário

**Dia atual:**
- Destaque visual
- Gasto parcial (até agora)
- Saldo atual

**Dias futuros (projeção):**
- Saldo projetado
- Gastos fixos/parcelas previstos
- **Cor baseada no saldo projetado:**
  - Verde: saldo > valor diário padrão (confortável)
  - Amarelo: saldo > 0, mas ≤ valor diário padrão (apertado)
  - Vermelho: saldo ≤ 0 (sem saldo para gastar)

**Visualização:**
- Mostrar período até próxima entrada de renda
- Linha do tempo com cores indicando saúde financeira
- Ao tocar/clicar em um dia futuro: ver detalhes da projeção

### 4.4 Gestão de Transações

- Listar transações (filtros por mês, tipo, categoria, natureza)
- Criar transação:
  - Gasto variável (dia a dia)
  - Gasto fixo (recorrente ou único)
  - Parcelamento
  - Entrada
  - Investimento
- Editar/Excluir transação

### 4.5 Projeção de Saldo

**Tela dedicada para visualizar a projeção completa:**

- Período: hoje até próxima entrada de renda
- Lista dia a dia com:
  - Data
  - Saldo projetado
  - Gastos previstos (fixos/parcelas)
  - Status (verde/amarelo/vermelho)
- Gráfico de linha mostrando evolução do saldo
- Resumo:
  - Total de dias até próxima renda
  - Dias confortáveis (verde)
  - Dias apertados (amarelo)
  - Dias sem saldo (vermelho)
  - Déficit total (se houver)

**Simulação "E se?":**
- Permitir adicionar gasto hipotético para ver impacto na projeção
- Ex: "Se eu gastar R$ 300 hoje, como fica?"

### 4.6 Compromissos do Mês

- Listar todos os gastos fixos e parcelas do mês
- Status: pago / pendente
- Total comprometido
- Próximos vencimentos

### 4.7 Investimentos

- Saldo por categoria de investimento
- Histórico de aplicações e resgates
- Patrimônio total investido
- Registrar rendimento

### 4.8 Metas e Economia

- Definir meta mensal (valor ou %)
- Acompanhar progresso
- Histórico de metas

### 4.9 Relatórios

- Gastos variáveis vs valor diário padrão (gráfico de linha)
- Gastos por categoria (pizza)
- Evolução do saldo
- Comparativo mês a mês
- Taxa de economia
- **Precisão da projeção:** comparar projeções passadas com o que realmente aconteceu

### 4.10 Configurações

- Gerenciar categorias
- Configurar dia de início do "mês financeiro"
- **Configurar entrada principal** (salário/renda para cálculo da projeção)
- Exportar dados

---

## 5. Fluxos Principais

### 5.1 Primeiro Acesso

1. Definir saldo inicial
2. Cadastrar entradas recorrentes (salário)
3. Cadastrar gastos fixos (aluguel, contas)
4. **Configurar estimativas mensais** (mercado, transporte, etc)
5. Sistema calcula valor diário padrão
6. Pronto para usar

### 5.2 Uso Diário

1. Abrir app → ver valor diário padrão e gasto de hoje
2. Registrar gastos variáveis conforme acontecem
3. Ver variação do dia atualizada
4. Saldo atualiza automaticamente

### 5.3 Virada de Mês

1. Sistema calcula saldo final e variação total
2. Gera transações recorrentes do novo mês
3. Novo saldo inicial = saldo final anterior
4. Valor diário padrão continua o mesmo (a menos que mude estimativas)

### 5.4 Alterar Estimativas

1. Acessar configuração de estimativas
2. Alterar valor de uma ou mais categorias
3. Sistema recalcula valor diário padrão
4. Novo valor se aplica a partir de hoje

### 5.5 Pagar Gasto Fixo / Parcela

1. Na lista de compromissos, marcar como pago
2. Ou registrar manualmente a transação
3. Saldo é atualizado
4. Valor diário padrão não muda

### 5.6 Registrar Investimento

1. Selecionar "Investir"
2. Informar valor e categoria
3. Saldo diminui
4. Patrimônio investido aumenta

---

## 6. Casos de Borda

### 6.1 Saldo Negativo
- Permitir saldo negativo
- Não afeta valor diário padrão
- Alerta visual

### 6.2 Nenhuma Estimativa Cadastrada
- Valor diário padrão = R$ 0
- Alertar usuário para configurar

### 6.3 Alterar Estimativa no Meio do Mês
- Novo valor diário se aplica imediatamente
- Dias anteriores mantêm o valor antigo no histórico

### 6.4 Editar Transação Passada
- Recalcular saldos dos dias subsequentes
- Variações diárias são recalculadas
- Valor diário padrão não muda

### 6.5 Gasto Muito Acima do Diário
- Permitir (não é limite rígido)
- Mostrar claramente a variação negativa

### 6.6 Dia sem Nenhum Gasto
- Variação = +valor_diário_padrão (100% economizado)
- Saldo fica igual

### 6.7 Projeção sem Entrada Recorrente Cadastrada
- Se não há salário/renda recorrente definida
- Projetar até o final do mês atual
- Alertar: "Configure sua renda recorrente para projeção mais precisa"

### 6.8 Múltiplas Entradas no Período
- Se há mais de uma entrada no período (ex: salário + freelance)
- Considerar todas na projeção
- Saldo projetado aumenta na data de cada entrada

### 6.9 Projeção Cruza Virada de Mês
- Se próxima renda é no mês seguinte
- Projeção deve cruzar a virada naturalmente
- Não "resetar" nada na virada

---

## 7. Requisitos Não-Funcionais

### 7.1 Performance
- Carregamento inicial < 2s
- Atualização de saldo em tempo real

### 7.2 Persistência
- Dados devem persistir entre sessões
- Backup/export em JSON

### 7.3 Responsividade
- Mobile-first (uso principal)
- Desktop como secundário

### 7.4 Offline
- Desejável: funcionar offline com sync posterior
- MVP: pode exigir conexão

---

## 8. Fora do Escopo (MVP)

- Multi-usuário / compartilhamento
- Integração com bancos (Open Finance)
- Importação de extratos
- Notificações push
- App nativo (será web)

---

## 9. Glossário

| Termo | Definição |
|-------|-----------|
| Valor Diário Padrão | Valor fixo calculado: soma das estimativas / 30 |
| Estimativa Mensal | Quanto o usuário espera gastar por mês em cada categoria variável |
| Gasto Variável | Despesas do dia a dia (mercado, transporte, etc) |
| Gasto Fixo | Despesa com valor e data conhecidos (aluguel, contas) |
| Variação | Diferença entre valor diário padrão e gasto real |
| Compromissos | Gastos fixos e parcelas com vencimento no mês |
| Patrimônio Investido | Soma de todos os investimentos ativos |
| Projeção | Previsão do saldo futuro até próxima renda |
| Déficit | Valor negativo projetado (quanto falta para fechar o período) |
| Dia Confortável | Dia com saldo projetado > valor diário padrão (verde) |
| Dia Apertado | Dia com saldo projetado > 0 mas ≤ valor diário (amarelo) |
| Dia Sem Saldo | Dia com saldo projetado ≤ 0 (vermelho) |
