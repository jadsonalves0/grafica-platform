# Release Notes

## 2026-06-25 - Estabilizacao operacional do painel

### Corrigido

- padrao compartilhado para campos monetarios, percentuais e quantitativos
- custo unitario da entrada com digitacao natural em `pt-BR`
- `orcamentos`, `pedidos`, `producao`, `ficha tecnica` e `lancamento manual` migrados para o mesmo padrao numerico
- venda usando saldo vendavel por FIFO como mesma fonte de verdade do backend
- mensagem operacional para indisponibilidade de saldo sem expor regra interna ao usuario
- comparacao `uuid` x `text` corrigida no lock transacional do FIFO
- tela de movimentacao sem item preso ao abrir pelo menu
- `Novo orcamento` com busca de cliente no servidor
- `Pedido` salvando e atualizando o cabecalho imediatamente apos alteracao de andamento
- `Financeiro` segmentado em visao geral, contas a receber, contas a pagar, caixa e bancos e lancamentos manuais
- menu administrativo reorganizado por tarefa

### Melhorado

- venda com pesquisa sob demanda, sem carregar o catalogo inteiro ao abrir
- carrinho lateral fixo no desktop
- preco do item do catalogo como somente leitura no carrinho
- alerta de divergencia entre saldo registrado e saldo vendavel
- diagnostico operacional de estoque com `npm run inventory:diagnose`
- regularizacao assistida de base piloto com `npm run inventory:backfill-fifo`
- cobertura automatizada inicial para numericos, venda, movimentacao e shell
- suite de integracao para entrada, camada FIFO, bloqueio acima do saldo e isolamento por empresa
- jornadas Playwright para orcamento com cliente pesquisado, pedido pronto para faturamento e navegacao financeira segmentada

### Documentado

- regras dos campos numericos em `docs/campos-numericos.md`
- regras de estoque e FIFO em `docs/plataforma-visao-geral.md`
- roteiro atualizado de homologacao em `docs/roteiro-de-homologacao.md`
- padrao visual e operacional atualizado em `docs/ux-guidelines.md`

### Pendencias reais

- executar a bateria completa do Playwright no ambiente local de homologacao
- validar `build` no ambiente do usuario, porque este ambiente continua sujeito a bloqueio de `spawn`
- acabamento visual final do formulario completo de lancamento manual
