# Matriz de Campos Numericos

Esta matriz registra o padrao atual dos principais campos monetarios, percentuais e quantitativos da `Grafica Platform`.

| Campo | Tipo | Escala | Permite zero | Permite negativo | Componente usado |
| --- | --- | --- | --- | --- | --- |
| Item > preco de venda | moeda | 2 casas | sim | nao | `MoneyInput` |
| Item > custo de referencia | moeda | 2 casas | sim | nao | `MoneyInput` |
| Item > estoque minimo | quantidade | ate 3 casas | sim | nao | `QuantityInput` |
| Item > margem desejada | percentual | ate 2 casas | sim | nao | `PercentageInput` |
| Grupo de itens > margem padrao | percentual | ate 2 casas | sim | nao | `PercentageInput` |
| Entrada > quantidade do item | quantidade | ate 3 casas | nao | nao | `QuantityInput` |
| Entrada > custo unitario | moeda | 2 casas | sim, quando a natureza permitir | nao | `MoneyInput` |
| Entrada > subtotal do item | moeda | 2 casas | sim | nao | calculado |
| Entrada > total do documento | moeda | 2 casas | sim | nao | calculado |
| Venda > quantidade do item | quantidade | ate 3 casas | nao | nao | `QuantityInput` |
| Venda > desconto por item | moeda | 2 casas | sim | nao | `MoneyInput` |
| Venda > subtotal do item | moeda | 2 casas | sim | nao | calculado |
| Venda > total da venda | moeda | 2 casas | sim | nao | calculado |
| Orcamento > quantidade do item | quantidade | ate 3 casas | nao | nao | `QuantityInput` |
| Orcamento > preco unitario | moeda | 2 casas | sim | nao | `MoneyInput` |
| Orcamento > desconto | moeda | 2 casas | sim | nao | `MoneyInput` |
| Pedido > quantidade do item | quantidade | ate 3 casas | nao | nao | `QuantityInput` |
| Pedido > preco unitario | moeda | 2 casas | sim | nao | `MoneyInput` |
| Pedido > desconto | moeda | 2 casas | sim | nao | `MoneyInput` |
| Ficha tecnica > consumo padrao | quantidade | ate 3 casas | sim | nao | `QuantityInput` |
| Ficha tecnica > perda prevista | percentual | ate 2 casas | sim | nao | `PercentageInput` |
| Producao > quantidade planejada | quantidade | ate 3 casas | nao | nao | `QuantityInput` |
| Producao > quantidade produzida | quantidade | ate 3 casas | sim | nao | `QuantityInput` |
| Conta financeira > saldo inicial | moeda | 2 casas | sim | sim, conforme tipo da conta | `MoneyInput` |
| Lancamento manual > valor | moeda | 2 casas | nao | nao | `MoneyInput` |
| Parametros > margem minima | percentual | ate 2 casas | sim | nao | `PercentageInput` |
| Parametros > margem padrao | percentual | ate 2 casas | sim | nao | `PercentageInput` |
| Parametros > desconto regular | percentual | ate 2 casas | sim | nao | `PercentageInput` |
| Parametros > desconto gerencial | percentual | ate 2 casas | sim | nao | `PercentageInput` |

## Regras compartilhadas

- a digitacao deve seguir `pt-BR`, com suporte a virgula e ponto decimal
- a colagem pode incluir `R$` sem quebrar a normalizacao
- a formatacao final acontece ao perder o foco
- a validacao final deve acontecer tambem no backend
- valores financeiros nao devem usar ponto flutuante JavaScript como fonte de verdade transacional
