# Operacao, producao e relatorios

## Fluxo operacional atual

O fluxo principal da plataforma deve ser lido assim:

1. cliente
2. orcamento
3. pedido
4. venda
5. estoque
6. financeiro
7. relatorios

O financeiro nao e mais o caminho principal para registrar venda. A venda deve nascer em `Vendas`, enquanto o financeiro acompanha os efeitos gerados pelas operacoes.

Os formularios de `Orcamentos` e `Pedidos` ja seguem uma organizacao mais operacional:

- informacoes principais no topo
- itens em bloco proprio
- observacoes no final
- resumo lateral ou final de revisao
- barra fixa com a acao principal

As telas de apoio e gestao agora seguem o mesmo shell visual:

- `grupos de itens`
- `usuarios`
- `perfis e permissoes`
- `auditoria`
- `empresa`
- `parametros`

## Orcamentos e pedidos

- `Novo orcamento` pesquisa cliente no servidor, sem depender de lista carregada inteira na abertura
- a selecao do cliente precisa sobreviver a erro de validacao e troca de item
- `Pedido` continua sendo compromisso operacional
- `Venda` continua sendo fato comercial e financeiro
- pedido pronto ou atendido nao vira receita sozinho
- quando um pedido estiver pronto para faturamento, a interface deve orientar `Gerar venda`
- quando a venda ja existir, a proxima acao deve ser `Abrir venda`

## Vendas e financeiro

### Vendas

A tela de `Vendas` concentra o registro operacional da venda com itens:

- selecao de cliente
- inclusao de itens
- busca sob demanda por nome, SKU, EAN e grupo
- foco inicial em pesquisa, sem carregar o catalogo inteiro na abertura
- descontos
- totais
- conclusao da venda
- carrinho lateral fixo no desktop
- preco do item do catalogo somente leitura no carrinho
- saida automatica de estoque para itens fisicos
- bloqueio por saldo insuficiente quando estoque negativo estiver desabilitado
- validacao do saldo usando a mesma disponibilidade FIFO exibida na tela
- bloco final de sucesso com proxima acao
- alerta de alteracoes nao salvas

### Financeiro

O modulo financeiro deve ser entendido como leitura e tratamento dos efeitos financeiros:

- `Visao financeira`
- `A receber`
- `A pagar`
- `Caixa e bancos`
- `Lancamentos manuais`

Quando existir origem automatica, a tela deve deixar claro:

- `Origem: Venda`
- `Origem: Entrada`
- `Origem: Pedido`
- `Origem: Orcamento`

Para vendas com itens, a origem deve apontar para a propria tela comercial da venda, sem parecer um lancamento manual generico.

Lancamento manual continua existindo, mas como excecao operacional.

### Regra entre pedido e financeiro

Nesta fase, a regra adotada e:

- pedido atendido ou pronto nao gera financeiro automaticamente
- pedido atendido deve orientar faturamento pela tela de `Vendas`
- o financeiro passa a considerar o valor somente depois da venda gerada
- a visao financeira mostra pedidos prontos como pendencia de faturamento, nao como receita realizada

Quando houver necessidade de detalhar itens em um lancamento manual:

- usar isso apenas como excecao
- nao tratar como alternativa principal a `Vendas`
- manter o mesmo padrao de `MoneyInput` e `QuantityInput`

## Entradas de estoque

A tela de `Entradas` trabalha em tres etapas:

1. `Documento`
2. `Itens`
3. `Financeiro e revisao`

O objetivo dessa estrutura e:

- reduzir erro de preenchimento
- preservar os dados ao navegar entre etapas
- deixar o impacto financeiro e de estoque visivel antes da confirmacao

O custo unitario e os demais campos monetarios agora seguem um padrao compartilhado de digitacao:

- aceita `10,00`, `10,05`, `100,50`
- aceita colagem com `R$` e com ponto decimal
- preserva o valor ao voltar de etapa
- formata no blur sem atrapalhar a digitacao
- preserva o valor ao avancar e voltar etapas
- preserva o valor em erro de validacao

## Producao

O modulo de producao continua separado da composicao.

### Fluxo recomendado

1. cadastrar o item final
2. montar a composicao
3. revisar disponibilidade de materiais
4. iniciar a producao
5. concluir a producao

### Informacoes esperadas na tela

- pedido relacionado, quando houver
- produto
- quantidade
- materiais necessarios
- disponibilidade
- responsavel
- status
- acao principal
- impedimento explicito quando faltar material

Custos detalhados, historico, consumo e auditoria devem aparecer em camadas secundarias da interface.

## Relatorios

Os relatorios estao sendo consolidados para um mesmo padrao:

- titulo
- descricao
- periodo
- filtros
- resumo
- tabela
- exportacao
- paginacao

### Categorias de navegacao

- Comercial
- Vendas
- Estoque
- Producao
- Financeiro
- Leads

### Comportamentos esperados

- filtros preservados ao voltar
- filtros na URL
- estado vazio orientando o usuario
- carregamento visivel
- exportacao com feedback
- bloqueio de clique duplicado na exportacao

## O que validar na homologacao

### Operacao comercial

- cliente criado e editado sem perder dados
- orcamento aprovado
- pedido criado a partir de orcamento
- venda concluida com feedback claro

### Operacao e estoque

- entrada confirmada com revisao final
- custo unitario aceitando moeda em `pt-BR` sem travar zeros
- movimentacao administrativa com motivo
- movimentacao permitindo trocar o item antes de registrar
- producao com disponibilidade de material
- venda fisica reduzindo saldo e gerando rastro em movimentacoes
- venda fisica usando o mesmo saldo FIFO mostrado na tela

### Financeiro

- leitura clara de contas a receber
- leitura clara de contas a pagar
- origem clicavel quando houver vinculo operacional

### Gestao

- relatorios com filtros coerentes
- exportacao CSV com feedback

## Pendencias visuais reais

Na fase atual, os principais pontos ainda sujeitos a refinamento sao:

- formularios longos de `vendas` e `financeiro`
- rodada final de responsividade e acessibilidade nos fluxos mais densos
- cobertura automatizada inicial de interface antes da homologacao ampla
- regularizacao administrativa dos itens que ainda possuem saldo registrado sem camada FIFO correspondente

## Diagnostico de saldo e FIFO

O projeto agora possui um diagnostico dedicado:

- `npm run inventory:diagnose`
- `npm run inventory:backfill-fifo`

Ele compara:

- saldo registrado no produto
- saldo por movimentos confirmados
- saldo disponivel nas camadas FIFO
- quantidade ja consumida por FIFO

Esse diagnostico deve ser usado antes de regularizar dados antigos do piloto.

Se o resultado indicar:

- `saldoRegistrado > 0`
- `saldoMovimentos = saldoRegistrado`
- `saldoFifoDisponivel = 0`

trata-se de saldo legado sem camada FIFO disponivel. A regularizacao recomendada e:

- criar documento auditavel de saldo inicial ou entrada
- recriar a camada FIFO com origem rastreavel
- nao liberar venda real desse item antes da regularizacao

Na base piloto local usada nesta rodada, os itens `Banner` e `item teste 1` ja foram reconciliados com camadas FIFO reaproveitando movimentos de entrada confirmados.
