# Operacao, Producao e Relatorios

## Producao de itens

O modulo de producao foi pensado para produtos finais que dependem de materias-primas ou semiacabados.

### Fluxo recomendado

1. cadastrar o item no estoque com tipo `Produto final`
2. abrir a tela de `Composicao`
3. montar a ficha tecnica informando:
   - item consumido
   - quantidade por unidade produzida
   - percentual de perda
   - observacoes operacionais
4. abrir a tela de `Producao`
5. informar a quantidade produzida
6. confirmar o apontamento

### O que o sistema faz ao registrar a producao

- calcula o consumo previsto da receita
- verifica saldo disponivel das materias-primas
- baixa automaticamente o estoque consumido
- gera entrada automatica do produto final
- recalcula o custo unitario do produto final com base no lote
- grava historico de consumo por material

## Financeiro reestruturado

O financeiro agora trabalha com tres camadas:

1. `contas financeiras`
   - caixa
   - banco
   - carteira digital

2. `categorias financeiras`
   - receita
   - despesa

3. `lancamentos`
   - simples
   - venda avulsa com itens
   - despesa avulsa

### Venda avulsa com itens

Quando o usuario ativa a opcao de venda avulsa com itens:

- o valor total passa a ser calculado pelos itens
- os produtos podem ser pesquisados pelo catalogo
- a descricao e o valor ainda podem ser ajustados no contexto do lancamento

## Relatorios disponiveis

A tela de relatorios consolida:

- clientes
- leads
- orcamentos
- pedidos
- itens e estoque
- movimentacoes
- producoes
- lancamentos financeiros

### Exportacoes

Cada bloco pode ser exportado em CSV para:

- analise externa
- envio ao contador
- conferencia operacional
- backup gerencial rapido

## Leitura operacional minima do piloto

### Comercial

- leads novos
- orcamentos aprovados
- pedidos em aberto

### Operacao

- itens com estoque em reposicao
- produtos finais com composicao pronta
- producoes recentes

### Financeiro

- receita pendente
- despesa pendente
- despesa vencida
- vendas avulsas com itens

## Pendencias naturais da proxima fase

- relatorios com filtros por periodo
- exportacao em PDF
- dashboards com graficos
- apontamento de producao a partir de pedido
- baixa financeira automatica a partir de regras comerciais

## Ajustes operacionais consolidados

- a movimentacao de estoque passa a respeitar a troca real do item selecionado, inclusive quando a tela e aberta a partir de outro cadastro
- o cadastro de pedido oferece cadastro rapido de cliente quando a busca nao encontra o registro
- a tela financeira usa categorias vindas de cadastro previo e aceita venda avulsa com itens associados
- o administrativo do site agora permite manter servicos e banners ja cadastrados sem recriar tudo do zero
