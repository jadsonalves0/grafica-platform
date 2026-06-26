# Release Notes

## 2026-06-25 - Website Experience 1.0

### Entregue

- home publica comercial com hero mais forte, CTA principal e CTA secundario
- cabecalho publico com navegacao curta, CTA de orcamento e destaque de WhatsApp
- faixa de diferenciais configuraveis
- servicos em destaque com imagem e acao de `Solicitar orcamento`
- secao `Como funciona`
- secao de prova visual reaproveitando servicos e banners ativos
- chamada final de conversao
- secao de contato mais evidente
- rodape completo com links e canais da grafica

### Melhorado

- website publico agora renderizado no servidor, com SEO melhor e menos dependencia de `fetch` no cliente
- separacao mais clara entre `Salvar rascunho` e `Publicar alteracoes`
- preview real da home em desktop e mobile dentro do painel
- CTA de servico preenchendo o formulario publico com contexto
- formulario de lead mais comercial, preservando dados em erro
- CTA de WhatsApp com mensagem pre-preenchida quando o canal estiver configurado
- `next/image`, `robots`, `sitemap` e metadados basicos por empresa
- `Open Graph`, `canonical` e `LocalBusiness` no website publicado

### Sem migration

- a rodada reaproveita `SiteSetting`, `SiteService`, `SiteBanner`, `SiteLead` e `SitePage`
- o snapshot publicado da home e o rascunho passaram a usar `SitePage` com chaves separadas para evitar expor alteracoes nao publicadas

### Documentado

- diretrizes do website em `docs/website-guidelines.md`
- visao geral da home e publicacao em `docs/plataforma-visao-geral.md`
- homologacao do website em `docs/roteiro-de-homologacao.md`
- principios visuais do website em `docs/ux-guidelines.md`

### Pendencias reais

- validacao visual final com screenshots reais depende de navegador liberado no ambiente local
- `build` continua bloqueado neste ambiente por `spawn EPERM`
- rodada futura do painel ainda precisara revisar menu hibrido, distribuicao de campos em `Vendas` e acabamento fino de formularios longos

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
- `vendas` com cabecalho operacional mais claro para cliente, origem e reflexo financeiro
- conclusao de venda com acesso direto para `Abrir conta a receber`
- `pedidos` com bloco explicito de faturamento e atalhos para `Gerar venda`, `Abrir venda` e `Abrir conta a receber`
- `financeiro` com contas a receber abrindo a venda vinculada quando a origem for comercial
- shell administrativo em layout hibrido, com navegacao principal no topo e coluna lateral contextual
- alerta de divergencia entre saldo registrado e saldo vendavel
- diagnostico operacional de estoque com `npm run inventory:diagnose`
- regularizacao assistida de base piloto com `npm run inventory:backfill-fifo`
- cobertura automatizada inicial para numericos, venda, movimentacao e shell
- suite de integracao para entrada, camada FIFO, bloqueio acima do saldo e isolamento por empresa
- jornadas Playwright para orcamento com cliente pesquisado, pedido pronto para faturamento, venda vinculada ao pedido e navegacao financeira segmentada

### Documentado

- regras dos campos numericos em `docs/campos-numericos.md`
- regras de estoque e FIFO em `docs/plataforma-visao-geral.md`
- roteiro atualizado de homologacao em `docs/roteiro-de-homologacao.md`
- padrao visual e operacional atualizado em `docs/ux-guidelines.md`

### Pendencias reais

- executar a bateria completa do Playwright no ambiente local de homologacao
- validar `build` no ambiente do usuario, porque este ambiente continua sujeito a bloqueio de `spawn`
- acabamento visual final do formulario completo de lancamento manual
