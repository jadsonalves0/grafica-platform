# Cadastro de Itens Profissional

## Objetivo

Transformar o cadastro de itens em uma base reutilizavel por:

- estoque
- orcamentos
- pedidos
- financeiro
- site e catalogo comercial

## O que o mercado costuma tratar como base minima

Em ERPs e plataformas de estoque mais maduras, o item normalmente combina:

- identificacao interna
- unidade de medida
- precificacao
- status
- classificacao
- formas de compra, venda e embalagem

Pelas referencias oficiais da documentacao do Odoo, produtos podem trabalhar com:

- unidades de medida diferentes para compra, estoque e venda
- multiplas embalagens por produto

Isso mostra que `unidade unica` e `descricao simples` funcionam no piloto, mas ficam limitadas quando a operacao cresce.

## Avaliacao para a Grafica Platform

### Obrigatorio agora

- nome do item
- tipo do item: materia-prima, servico, produto final
- unidade base
- SKU interno
- preco de custo
- preco de venda
- estoque minimo
- saldo atual
- status ativo/inativo

### Recomendado ja nesta fase

- `EAN/GTIN` para itens que tenham codigo de barras ou leitura por scanner
- pesquisa por nome, SKU e EAN/GTIN
- uso do item catalogado em orcamentos, pedidos e movimentacoes

### Recomendado para a proxima fase

- categoria de item
- fornecedor principal
- prazo de reposicao
- observacoes tecnicas de producao
- consumo padrao por servico
- unidade de compra diferente da unidade de estoque
- fator de conversao entre embalagem e unidade
- multiplas embalagens por item

### Recomendado para a fase fiscal/comercial mais avancada

- NCM
- origem fiscal
- CFOP padrao por operacao
- peso e dimensoes
- centro de custo ou familia comercial

## EAN ou GTIN: precisamos?

### Resposta curta

`Nao e obrigatorio para o piloto`, mas `vale muito a pena ter`.

### Quando faz muita diferenca

- itens revendidos
- insumos com leitura por scanner
- integracoes futuras com marketplaces ou ecommerce
- conciliacao entre estoque fisico e cadastro

### Decisao tomada

Foi iniciado o campo `EAN/GTIN` como opcional no cadastro de itens.

## Multiplas embalagens: precisamos?

### Resposta curta

`Nao como requisito imediato do piloto`, mas `sim como requisito de plataforma`.

### Por que isso importa

Uma grafica pode:

- comprar papel por pacote
- estocar por folha
- vender por unidade, metro quadrado ou lote

Tambem pode comprar:

- tinta por litro
- usar por mililitro
- vender por servico ou por impressao

Isso mostra que a plataforma vai precisar de:

- unidade de estoque
- unidade de compra
- unidade comercial
- conversao entre elas
- opcionalmente embalagem multipla

### Decisao tomada

Para o piloto:

- manter unidade base unica
- cadastrar `EAN/GTIN`
- usar busca/autocomplete de item

Para a proxima fase:

- abrir modelagem de `UoM` e `packaging`

## Campos recomendados por perfil de item

### Materia-prima

- nome
- SKU
- EAN/GTIN
- unidade
- custo
- estoque minimo
- gramatura ou espessura
- dimensao base
- fornecedor principal

### Produto final

- nome
- SKU
- EAN/GTIN
- unidade
- preco de venda
- custo
- embalagem
- categoria

### Servico

- nome
- SKU interno
- preco base
- unidade comercial
- observacao de producao

## O que ja foi executado

- lookup pesquisavel de item em orcamento
- lookup pesquisavel de item em pedido manual
- lookup pesquisavel de item em movimentacao de estoque
- preenchimento automatico de descricao e preco sugerido ao selecionar item
- campo `EAN/GTIN` no cadastro de item
- busca de item por nome, SKU e EAN/GTIN

## Referencias de mercado

- Odoo: unidades de medida e conversao
  - https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/inventory/product_management/configure/uom.html
- Odoo: embalagens e venda do mesmo produto em mais de uma apresentacao
  - https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/inventory/product_management/configure/packaging.html

Observacao:
As conclusoes sobre `EAN/GTIN` como campo recomendado para a plataforma sao uma inferencia de praticas de ERP, catalogo e leitura por scanner, nao uma obrigacao funcional do piloto.
