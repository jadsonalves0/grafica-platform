# Roteiro de Homologacao

## Objetivo

Validar o fluxo completo da plataforma com foco no piloto da `Ponto Print`.

## Bloco 1. Acesso

1. entrar no login
2. validar dashboard
3. validar menu lateral
4. validar permissao de acesso por modulo

## Bloco 2. Catalogo e clientes

1. cadastrar item com SKU
2. cadastrar item com `EAN/GTIN`
3. buscar item por nome
4. buscar item por SKU
5. buscar item por EAN/GTIN
6. editar item
7. cadastrar cliente
8. editar cliente
9. inativar cliente

## Bloco 3. Orcamento

1. criar orcamento
2. pesquisar cliente por busca
3. pesquisar item do catalogo por nome ou SKU
4. selecionar item e conferir preenchimento automatico
5. ajustar descricao manualmente
6. salvar
7. editar
8. aprovar proposta

## Bloco 4. Pedido

1. criar pedido manual
2. pesquisar cliente
3. pesquisar item catalogado
4. salvar pedido manual
5. criar pedido a partir de orcamento aprovado
6. alterar status do pedido
7. alterar status de producao

## Bloco 5. Estoque

1. registrar entrada
2. registrar saida
3. registrar ajuste
4. buscar item por nome, SKU ou EAN/GTIN
5. validar saldo atualizado
6. abrir movimentacao a partir de dois itens diferentes e confirmar que o item corrente troca corretamente
7. abrir composicao do produto final
8. salvar ficha tecnica com materias-primas
9. apontar producao e conferir baixa dos materiais e entrada do produto final

## Bloco 6. Financeiro

1. cadastrar conta financeira
2. cadastrar lancamento
3. vincular cliente
4. vincular pedido
5. vincular orcamento
6. alterar status financeiro
7. cadastrar categoria de receita
8. cadastrar categoria de despesa
9. registrar venda avulsa com itens
10. registrar despesa avulsa sem itens

## Bloco 7. Site e leads

1. configurar texto principal do site
2. cadastrar servico com imagem
3. editar servico existente
4. inativar banner
5. publicar site
6. abrir preview por `slug`
7. enviar lead
8. converter lead em cliente
9. gerar orcamento a partir do lead

## Bloco 8. Cenarios de risco

1. tentar duplicar cliente por e-mail
2. tentar duplicar cliente por documento
3. tentar cadastrar item com SKU repetido
4. tentar cadastrar item com EAN/GTIN repetido
5. tentar excluir cliente com filhos
6. tentar movimentar estoque para saldo negativo

## Resultado esperado

Ao final dessa rodada, a plataforma deve estar apta para:

- operacao assistida do piloto
- refinamento visual
- priorizacao de backlog
- preparacao de deploy de homologacao
