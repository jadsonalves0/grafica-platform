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

## Vendas e financeiro

### Vendas

A tela de `Vendas` concentra o registro operacional da venda com itens:

- selecao de cliente
- inclusao de itens
- busca por nome, SKU, EAN e grupo
- descontos
- totais
- conclusao da venda
- saida automatica de estoque para itens fisicos
- bloqueio por saldo insuficiente quando estoque negativo estiver desabilitado
- bloco final de sucesso com proxima acao
- alerta de alteracoes nao salvas

### Financeiro

O modulo financeiro deve ser entendido como leitura e tratamento dos efeitos financeiros:

- `A receber`
- `A pagar`
- `Caixa e bancos`

Quando existir origem automatica, a tela deve deixar claro:

- `Origem: Venda`
- `Origem: Entrada`
- `Origem: Pedido`
- `Origem: Orcamento`

Para vendas com itens, a origem deve apontar para a propria tela comercial da venda, sem parecer um lancamento manual generico.

Lancamento manual continua existindo, mas como excecao operacional.

## Entradas de estoque

A tela de `Entradas` trabalha em tres etapas:

1. `Documento`
2. `Itens`
3. `Financeiro e revisao`

O objetivo dessa estrutura e:

- reduzir erro de preenchimento
- preservar os dados ao navegar entre etapas
- deixar o impacto financeiro e de estoque visivel antes da confirmacao

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
- movimentacao administrativa com motivo
- producao com disponibilidade de material
- venda fisica reduzindo saldo e gerando rastro em movimentacoes

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
- validacao manual final do reflexo de estoque das vendas fisicas na base local de homologacao
