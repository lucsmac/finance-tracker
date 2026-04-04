# Metas Guiadas, Missoes e Nivel de Saude Financeira

## 1. Contexto Atual

Hoje a area de metas funciona como um CRUD simples de objetivos financeiros:

- a pessoa cria metas manuais
- escolhe tipo, periodo e valor
- informa progresso atual
- acompanha uma barra de progresso

Isso resolve o registro, mas ainda nao ajuda a pessoa a descobrir:

- qual deveria ser sua prioridade agora
- se ela esta tentando investir antes de estabilizar o basico
- qual proximo passo faz sentido para o momento financeiro dela
- quais comportamentos do dia a dia estao atrapalhando o avancar

O produto ja possui dados importantes para sair do modo "meta isolada" e ir para um modo "plano guiado":

- saldo inicial e gasto diario planejado
- transacoes por tipo, categoria, data e status de pagamento
- gastos fixos, parcelas e investimentos
- estimativas mensais por categoria
- despesas variaveis registradas por dia

## 2. Visao de Produto

Transformar a aba de metas em um **hub de progresso financeiro** com 4 pilares:

1. **Nivel de saude financeira**
2. **Plano guiado por etapa**
3. **Missoes praticas e acionaveis**
4. **Metas estruturais de longo prazo**

Em vez de perguntar "qual meta voce quer criar?", o produto passa a responder:

- "voce esta no nivel X"
- "seu foco agora deveria ser Y"
- "estas 3 missoes tem maior impacto para sua situacao"
- "ao concluir isso, voce desbloqueia a proxima etapa"

## 3. Problema que a Feature Resolve

- reduz paralisia de quem nao sabe por onde comecar
- evita metas desconectadas da realidade da pessoa
- cria sensacao de progresso mesmo antes de grandes resultados
- liga comportamento diario ao objetivo de longo prazo
- aumenta recorrencia, porque sempre existe uma proxima acao concreta

## 4. Proposta de Experiencia

### 4.1 Nova estrutura da area

A aba `Metas` passa a ser organizada em 4 blocos:

1. **Meu nivel hoje**
2. **Plano recomendado**
3. **Missoes da semana / do mes**
4. **Objetivos estruturais**

### 4.2 Fluxo principal

1. O sistema avalia a situacao atual da pessoa.
2. Classifica em um nivel de maturidade financeira.
3. Sugere uma trilha recomendada.
4. Cria missoes pequenas, claras e mensuraveis.
5. Converte grandes objetivos em etapas.
6. Recalcula sugestoes com base no comportamento recente.

## 5. Modelo de Nivel de Saude Financeira

### 5.1 Objetivo

Dar contexto e ordem de prioridade. O nivel nao e um "score de credito", e sim um indicador interno de organizacao e preparo financeiro.

### 5.2 Niveis sugeridos

#### Nivel 0 - Sem Base

Perfil:

- ainda nao configurou a base do app
- nao tem previsao minima confiavel
- cadastros insuficientes para orientar decisoes

Foco:

- configurar saldo inicial
- definir gasto diario
- cadastrar compromissos fixos
- registrar primeiras entradas e saidas

#### Nivel 1 - Organizando a Casa

Perfil:

- ja registra dados
- ainda existe descontrole recorrente
- pode haver atraso em compromissos ou alta variacao

Foco:

- reduzir caos do fluxo mensal
- criar previsibilidade
- evitar novo endividamento

#### Nivel 2 - Estabilizando

Perfil:

- fluxo mensal mais previsivel
- compromissos em dia na maior parte do tempo
- comeca a sobrar algum valor

Foco:

- criar colchao de seguranca
- reduzir risco de romper o caixa

#### Nivel 3 - Protegido

Perfil:

- reserva iniciada ou parcialmente formada
- rotina financeira com menor volatilidade
- capacidade de executar metas com consistencia

Foco:

- completar reserva de emergencia
- melhorar taxa de poupanca mensal

#### Nivel 4 - Acumulando

Perfil:

- reserva minima concluida
- sobra recorrente
- comeca a construir patrimonio

Foco:

- investir com regularidade
- atingir primeiros marcos de patrimonio

#### Nivel 5 - Investidor em Evolucao

Perfil:

- reserva concluida
- investimentos recorrentes
- disciplina de manutencao

Foco:

- evoluir consistencia
- aumentar aporte
- construir metas maiores

### 5.3 Regras iniciais de classificacao

Para o MVP, a classificacao deve ser baseada em regras explicitas, nao em IA.

Sugestao de sinais:

- completude de setup
- existencia de renda recorrente
- quantidade de compromissos vencidos nao pagos
- variacao recente entre gasto planejado e gasto realizado
- existencia de investimentos
- tamanho estimado da reserva de emergencia

Exemplo de heuristica inicial:

- `Nivel 0`: setup incompleto
- `Nivel 1`: setup completo, mas ha compromissos atrasados ou descontrole recorrente
- `Nivel 2`: sem atrasos relevantes, mas reserva estimada menor que 1 mes
- `Nivel 3`: reserva entre 1 e 5 meses
- `Nivel 4`: reserva >= 6 meses e investimento acumulado < R$ 10.000
- `Nivel 5`: reserva >= 6 meses e investimento acumulado >= R$ 10.000

Observacao:

- a reserva pode ser estimada inicialmente por `saldo disponivel dedicado + investimentos de liquidez + metas de reserva`
- se isso nao estiver disponivel com confianca, o sistema pede confirmacao manual do valor atual reservado

## 6. Trilhas Recomendadas

Cada nivel libera uma trilha principal. A pessoa pode ter metas paralelas, mas a interface destaca uma prioridade principal.

### 6.1 Trilha 1: Sair do aperto

Indicada quando:

- ha atraso de compromissos
- saldo projetado frequentemente fica negativo
- gasto variavel rompe o planejado em excesso

Objetivo macro:

- estabilizar o mes e parar de piorar a situacao

Missoes exemplo:

- quitar 1 fatura/cartao em atraso
- renegociar uma parcela pesada
- revisar 3 gastos recorrentes
- passar 7 dias sem ultrapassar o limite diario

### 6.2 Trilha 2: Montar reserva de emergencia

Indicada quando:

- fluxo mensal esta minimamente estavel
- reserva atual ainda e insuficiente

Objetivo macro:

- acumular de 1 a 6 meses do custo essencial

Missoes exemplo:

- calcular reserva ideal
- definir meta de aporte mensal
- completar primeiro marco de R$ 1.000
- atingir 1 mes de custo essencial

### 6.3 Trilha 3: Investir os primeiros 10 mil

Indicada quando:

- reserva minima concluida
- ha espaco para aportes

Objetivo macro:

- consolidar consistencia de investimento

Missoes exemplo:

- fazer 3 aportes consecutivos
- atingir R$ 2.500 investidos
- atingir R$ 5.000 investidos
- atingir R$ 10.000 investidos

## 7. Sistema de Missoes

### 7.1 Objetivo

Quebrar metas grandes em acoes concretas, com ganho de progresso frequente.

### 7.2 Tipos de missao

#### Missoes de configuracao

Exemplos:

- cadastrar renda principal
- cadastrar 5 compromissos fixos
- configurar gasto diario

#### Missoes de comportamento

Exemplos:

- ficar 5 dias sem estourar o planejado diario
- reduzir gasto em delivery em 20% no mes
- registrar despesas 7 dias seguidos

#### Missoes de saneamento financeiro

Exemplos:

- quitar cartao X
- quitar 2 parcelas em atraso
- zerar compromissos vencidos

#### Missoes de acumulacao

Exemplos:

- guardar primeiros R$ 300
- completar R$ 1.000 de reserva
- investir primeiro R$ 1.000

#### Missoes de consistencia

Exemplos:

- registrar 3 aportes mensais seguidos
- fechar 2 meses com variacao positiva

### 7.3 Estrutura da missao

Cada missao deve ter:

- `id`
- `templateKey`
- `title`
- `description`
- `category`
- `priority`
- `status`
- `startAt`
- `dueAt`
- `metricType`
- `targetValue`
- `currentValue`
- `rewardType`
- `goalJourneyId`
- `completionRule`
- `sourceRule`

### 7.4 Status da missao

- `locked`
- `available`
- `in_progress`
- `completed`
- `expired`
- `dismissed`

### 7.5 Regras de composicao

- cada trilha principal mostra de 1 a 3 missoes prioritarias por vez
- deve haver mistura de "ganho rapido" e "ganho estrutural"
- missoes concluidas desbloqueiam proximas
- missoes podem ser sugeridas automaticamente ou criadas manualmente

### 7.6 Exemplo de missoes automaticas

#### Missao: Zerar cartao em atraso

Entradas necessarias:

- compromissos/transacoes da categoria cartao
- status vencido e nao pago

Regra:

- aparece se existir fatura vencida nao paga

Conclusao:

- quando o valor pendente daquele grupo for zero

#### Missao: Primeiros R$ 1.000 de reserva

Entradas necessarias:

- valor atual reservado
- valor alvo parcial

Regra:

- aparece quando reserva atual < R$ 1.000

Conclusao:

- quando o total reservado atingir R$ 1.000

#### Missao: 7 dias dentro do planejado

Entradas necessarias:

- gasto diario planejado
- gasto variavel efetivo por dia

Regra:

- aparece quando houver excesso frequente no diario

Conclusao:

- 7 dias validos dentro de janela de 14 dias

## 8. Metas Estruturais

As metas estruturais continuam existindo, mas agora em formato guiado e com templates.

### 8.1 Templates iniciais

#### Template: Zerar dividas de cartao

Campos:

- nome da divida
- saldo atual
- parcela minima ou fatura do mes
- data alvo
- prioridade

Indicadores:

- saldo restante
- percentual quitado
- prazo estimado

Missoes relacionadas:

- quitar proxima fatura
- nao gerar novo rotativo
- reduzir gasto da categoria mais critica

#### Template: Montar reserva de emergencia

Campos:

- renda media mensal
- custo essencial mensal
- tipo de renda: estavel, variavel, autonoma
- reserva atual
- alvo em meses

Indicadores:

- valor ideal da reserva
- meses cobertos hoje
- valor faltante
- aporte sugerido por mes

Missoes relacionadas:

- calcular reserva ideal
- atingir R$ 1.000
- atingir 1 mes
- atingir 3 meses
- atingir 6 meses

#### Template: Investir os primeiros R$ 10.000

Campos:

- valor ja investido
- aporte mensal desejado
- prazo alvo

Indicadores:

- acumulado atual
- faltante
- previsao de chegada no marco

Missoes relacionadas:

- primeiro aporte
- 3 aportes seguidos
- atingir R$ 2.500
- atingir R$ 5.000
- atingir R$ 10.000

### 8.2 Diferenca entre meta e missao

- **Meta** e o objetivo macro e duradouro
- **Missao** e a acao curta que empurra a meta para frente

## 9. Calculadora de Reserva de Emergencia

### 9.1 Objetivo

Dar uma resposta simples para "quanto eu deveria ter de reserva?".

### 9.2 Formula sugerida

`reserva_ideal = custo_essencial_mensal x multiplicador`

Multiplicador por perfil:

- renda estavel CLT: `6 meses`
- renda variavel: `9 meses`
- autonomo/freelancer: `12 meses`

### 9.3 Como calcular custo essencial mensal

No MVP, usar combinacao de:

- gastos fixos recorrentes
- parcelas obrigatorias ativas
- categorias essenciais marcadas nas estimativas
- ajuste manual opcional

Importante:

o schema atual nao diferencia obrigatorio x nao obrigatorio em todas as categorias. Portanto, a calculadora deve permitir edicao manual do custo essencial para evitar falsa precisao.

### 9.4 Saidas da calculadora

- custo essencial estimado
- multiplicador sugerido
- reserva ideal em reais
- meses cobertos hoje
- quanto falta
- sugestao de aporte mensal para atingir em 6, 12 e 18 meses

### 9.5 CTA principal

- `Transformar em meta`

Ao clicar:

- cria meta estruturada de reserva
- inicia missoes relacionadas
- salva snapshot do calculo

## 10. Motor de Recomendacao por Comportamento

### 10.1 Objetivo

Fazer a aba de metas responder ao comportamento recente da pessoa.

### 10.2 Sinais iniciais disponiveis no produto

- dias acima do gasto planejado
- sequencia de dias registrando despesas
- compromissos vencidos nao pagos
- existencia de novos investimentos
- percentual do mes com variacao positiva
- concentracao de excesso em categorias especificas

### 10.3 Regras iniciais de recomendacao

Exemplos:

- se houve excesso no gasto diario em `>= 5` dias nos ultimos `14`, sugerir missao de controle de variavel
- se ha compromisso vencido nao pago, priorizar trilha de estabilizacao
- se a pessoa ficou `30` dias sem registrar despesas variaveis, sugerir missao de consistencia de registro
- se completou reserva minima, destacar meta de primeiros R$ 10.000 investidos
- se aportou em `3` meses seguidos, liberar badge de consistencia e aumentar meta sugerida

### 10.4 Tom das recomendacoes

As recomendacoes devem ser:

- objetivas
- sem julgamento
- orientadas a proximo passo
- sempre acompanhadas de justificativa curta

Exemplo:

> Seu gasto variavel ficou acima do planejado em 6 dos ultimos 14 dias. Vale focar numa missao curta de controle esta semana.

## 11. Proposta de UI

### 11.1 Hero da tela

Elementos:

- nivel atual
- resumo do motivo
- barra de progresso para proximo nivel
- CTA principal da trilha atual

Exemplo:

- `Nivel 2 - Estabilizando`
- `Voce ja tem uma rotina mais previsivel. O proximo passo e formar sua reserva minima.`
- `Faltam R$ 1.850 para completar 1 mes de reserva.`

### 11.2 Bloco "Missoes em foco"

Cada card deve mostrar:

- titulo
- por que isso importa
- progresso
- prazo
- CTA

CTAs possiveis:

- `Registrar progresso`
- `Ver como concluir`
- `Marcar como resolvido`
- `Abrir calculadora`

### 11.3 Bloco "Marcos"

Lista visual de checkpoints:

- quitar atrasos
- primeiros R$ 1.000 guardados
- 1 mes de reserva
- 3 meses de reserva
- 6 meses de reserva
- primeiros R$ 10.000 investidos

### 11.4 Bloco "Sugestoes para voce"

Cards dinâmicos baseados em regras:

- revisar delivery
- pausar novo parcelamento
- reforcar aporte este mes
- corrigir categoria com desvio recorrente

## 12. Roadmap Recomendado

### Fase 1 - Guiado sem grande refactor

Objetivo:

entregar valor rapido usando a estrutura atual do app.

Escopo:

- redesign da aba de metas
- templates guiados de metas
- calculadora de reserva
- nivel financeiro por regras simples
- missoes basicas derivadas de regras

Dependencia tecnica:

- pode reaproveitar `transactions`, `investments`, `user_configs`, `estimates`
- requer pequena evolucao do modelo de `goals`

### Fase 2 - Missoes e progresso automatizado

Escopo:

- engine de recomendacao por regras
- progresso de missao automatico
- badges e marcos
- historico de conclusoes

### Fase 3 - Personalizacao forte

Escopo:

- recomendacao adaptativa por comportamento consolidado
- score de disciplina
- explicacoes mais inteligentes da prioridade sugerida
- comparacao entre planejamento e execucao por ciclo

## 13. Spec Tecnica

### 13.1 Mudancas minimas no dominio

O modelo atual de `goals` e muito generico. Para suportar trilhas guiadas, o ideal e separar:

- meta estruturada
- missao
- snapshot de diagnostico

### 13.2 Tabelas sugeridas

#### `goal_journeys`

Representa a trilha macro em andamento.

Campos sugeridos:

- `id`
- `user_id`
- `journey_type` (`stabilize`, `emergency_fund`, `first_10k`, `debt_free`)
- `status` (`active`, `paused`, `completed`, `dismissed`)
- `priority`
- `started_at`
- `completed_at`
- `source` (`system`, `user`)
- `meta`

#### `goals_v2`

Representa a meta estruturada.

Campos sugeridos:

- `id`
- `user_id`
- `journey_id`
- `template_key`
- `title`
- `goal_kind`
- `target_amount`
- `current_amount`
- `target_date`
- `status`
- `config`
- `created_at`
- `updated_at`

#### `goal_missions`

Representa cada missao acionavel.

Campos sugeridos:

- `id`
- `user_id`
- `journey_id`
- `goal_id`
- `template_key`
- `title`
- `description`
- `metric_type`
- `target_value`
- `current_value`
- `priority`
- `status`
- `started_at`
- `due_at`
- `completed_at`
- `rule_payload`

#### `financial_health_snapshots`

Snapshot do diagnostico periodico.

Campos sugeridos:

- `id`
- `user_id`
- `financial_level`
- `score`
- `reason_codes`
- `reserve_target_amount`
- `reserve_current_amount`
- `monthly_essential_cost`
- `snapshot_date`

### 13.3 Alternativa MVP com menos tabelas

Se quisermos reduzir complexidade inicial:

- manter `goals` para metas macro
- criar apenas `goal_missions`
- criar `financial_health_snapshots`
- guardar `template_key`, `journey_type` e `config` em JSON

Essa opcao reduz impacto e acelera entrega, embora fique menos elegante no longo prazo.

### 13.4 Regras de calculo que podem nascer no frontend

No MVP, estes calculos podem ser feitos no frontend ou em hooks compartilhados:

- classificacao de nivel financeiro
- calculadora de reserva
- sugestoes de missoes
- recomendacoes baseadas em regras

Depois, vale mover para camada comum ou edge function para:

- consistencia entre telas
- historico de snapshots
- menor duplicacao

## 14. Impacto no Frontend Atual

Arquivos naturalmente impactados:

- `src/app/components/GoalsView.tsx`
- `src/lib/hooks/useGoals.ts`
- `src/lib/api/goals.ts`
- `src/app/data/mockData.ts`

Novos modulos sugeridos:

- `src/lib/domain/financialHealth.ts`
- `src/lib/domain/goalMissions.ts`
- `src/lib/domain/emergencyFund.ts`
- `src/lib/domain/goalRecommendations.ts`
- `src/lib/hooks/useGoalMissions.ts`
- `src/lib/hooks/useFinancialHealth.ts`

## 15. KPIs de Produto

Para medir se a feature esta funcionando:

- percentual de usuarios que criam uma meta guiada
- percentual de usuarios que concluem a primeira missao
- quantidade media de missoes concluidas por mes
- usuarios com reserva calculada e transformada em meta
- usuarios que avancam de nivel em janela de 90 dias
- recorrencia na aba de metas

## 16. Riscos e Cuidados

### 16.1 Falsa precisao

O app nao deve fingir certeza matematica quando os dados estao incompletos.

Mitigacao:

- mostrar nivel de confianca do diagnostico
- pedir confirmacoes pontuais
- permitir override manual em valores-chave

### 16.2 Excesso de gamificacao

Missoes devem ajudar, nao infantilizar.

Mitigacao:

- usar linguagem sobria
- focar em utilidade pratica
- evitar excesso de medalhas ou celebracoes vazias

### 16.3 Prioridade errada

Nao faz sentido empurrar investimento antes de estabilizar atrasos e reserva minima.

Mitigacao:

- usar trilhas com precedencia
- explicar por que determinada trilha esta priorizada

## 17. Recomendacao Final

Sequencia recomendada para implementacao:

1. Redesenhar `Metas` para virar hub guiado.
2. Criar **nivel financeiro** com heuristica simples.
3. Lançar **calculadora de reserva** com CTA para virar meta.
4. Adicionar **templates guiados** para:
   - zerar dividas de cartao
   - montar reserva de emergencia
   - investir os primeiros R$ 10.000
5. Adicionar **missoes automaticas** derivadas dessas metas.
6. Evoluir para recomendacao baseada em comportamento.

## 18. Escopo Recomendado de MVP

Se precisarmos cortar para entregar rapido, o MVP ideal e:

- nivel financeiro
- calculadora de reserva
- meta guiada de reserva
- meta guiada de primeiros R$ 10.000
- 5 a 8 templates de missao por regras simples
- cards de sugestao baseados nos dados dos ultimos 30 dias

Isso ja muda a percepcao da area de metas de "cadastro manual" para "orientacao pratica".
