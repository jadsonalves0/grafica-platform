# Release Notes

## 2026-06-19 - Estabilizacao operacional do painel

### Corrigido

- padrao compartilhado para campos monetarios, percentuais e quantitativos
- custo unitario da entrada com digitacao natural em `pt-BR`
- venda usando saldo vendavel por FIFO como mesma fonte de verdade do backend
- mensagem operacional para falta de saldo FIFO
- tela de movimentacao sem item preso ao abrir pelo menu
- menu administrativo reorganizado por tarefa

### Melhorado

- venda com pesquisa sob demanda, sem carregar o catalogo inteiro ao abrir
- carrinho lateral fixo no desktop
- preco do item do catalogo como somente leitura no carrinho
- alerta de divergencia entre saldo registrado e saldo vendavel
- diagnostico operacional de estoque com `npm run inventory:diagnose`
- cobertura automatizada inicial para numericos, venda, movimentacao e shell

### Documentado

- regras dos campos numericos em `docs/campos-numericos.md`
- regras de estoque e FIFO em `docs/plataforma-visao-geral.md`
- roteiro atualizado de homologacao em `docs/roteiro-de-homologacao.md`
- padrao visual e operacional atualizado em `docs/ux-guidelines.md`

### Pendencias reais

- executar a bateria completa do Playwright no ambiente local de homologacao
- validar `build` no ambiente do usuario, porque este ambiente continua sujeito a bloqueio de `spawn`
- regularizar administrativamente os itens antigos com saldo registrado e FIFO zerado apontados pelo diagnostico
