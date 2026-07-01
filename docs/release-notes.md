# Release Notes

## 2026-06-30 - Cadastro formal de fornecedores

### Entregue

- novo cadastro de `Fornecedores` em `Cadastros`
- migration manual `20260630103000_suppliers_registry_foundation`
- API, servico e paginas para criar, editar, inativar e excluir fornecedor com protecao de historico
- vinculacao opcional de `Entradas` a fornecedor cadastrado
- reaproveitamento de fornecedor cadastrado na importacao de XML por documento ou nome
- mapeamento `fornecedor-item` agora apontando tambem para o cadastro formal
- sugestoes de compra e lista de compra com link para o fornecedor quando ele estiver mapeado

### Melhorado

- pre-entradas geradas por sugestao ou por lista de compra carregam `supplierId`, nome e documento de referencia
- entradas continuam preservando nome e documento do proprio documento, mesmo quando existe fornecedor cadastrado vinculado
- testes de integracao passaram a cobrir fornecedor formal no XML e nas sugestoes de compra

### Validado

- `npm run prisma:apply-manual 20260630103000_suppliers_registry_foundation`
- `lint`
- `build`
- `test:integration`

## 2026-06-29 - Entrada Inteligente v0.4 - fundacao de XML

### Entregue

- migration manual `20260629213000_inventory_xml_import_foundation`
- suporte a importacao de `XML` de `NF-e`
- criacao de rascunho de entrada sem confirmar estoque
- conciliacao de item importado com produto interno
- anexo operacional do XML original
- mapeamento persistente entre item do fornecedor e item interno

### Melhorado

- repositorio de entradas passou a tolerar item importado ainda sem `productId`
- confirmacao da entrada importada bloqueia enquanto houver item sem conciliacao
- confirmacao da entrada importada agora tambem bloqueia sugestoes de conciliacao ate a confirmacao explicita do usuario
- consulta de entradas e detalhe passou a usar leitura segura para o novo modelo, mesmo sem regenerar o client do Prisma neste ambiente
- nova acao `Importar XML` em `Estoque > Entradas > Nova entrada`
- detalhe da entrada importada mostra status de conciliacao por item
- detalhe da entrada importada agora permite revisar documento, itens e financeiro antes da confirmacao
- detalhe da entrada importada agora permite cadastrar um novo item interno a partir da linha pendente
- detalhe da entrada importada agora permite confirmar sugestoes de conciliacao em lote
- detalhe da entrada agora aceita anexos manuais como DANFE, boleto, comprovante, recibo, foto e orcamento do fornecedor
- o XML original importado passou a ficar protegido contra exclusao manual
- anexos operacionais podem ser abertos pelo proprio detalhe da entrada
- contas a pagar ou despesas pagas geradas pela confirmacao ficam visiveis e navegaveis no detalhe da entrada

### Validado

- `lint`
- `build`
- `test:unit`
- `test:integration`
- `prisma validate`
- aplicacao local da migration manual no banco

### Documentado

- fluxo em `docs/entrada-inteligente-xml.md`

### Pendencias reais

- adicionar leitura de XML por upload mais rico
- permitir adicionar ou remover linhas diretamente no rascunho importado
- avaliar nova rodada de interface para a tela de entradas apos uso real

## 2026-06-30 - Compras assistidas iniciais

### Entregue

- nova tela `Sugestoes de compra` em `Operacao`
- API dedicada para listar reposicoes sugeridas
- calculo baseado em estoque minimo, saldo disponivel e custo de referencia
- reaproveitamento do ultimo fornecedor mapeado por item
- suporte a unidade de compra e fator de conversao nas sugestoes
- acao `Gerar pre-entrada` a partir da sugestao, abrindo o rascunho direto em `Entradas`
- nova tela `Lista de compra`, agrupada por fornecedor
- selecao de itens na tela de sugestoes para montar lista parcial
- impressao simples da lista operacional
- acao `Gerar pre-entrada do grupo`, reunindo varios itens do mesmo fornecedor em um unico rascunho

### Validado

- `lint`
- `build`
- `test:integration`

### Pendencias reais

- gerar lista de compra propriamente dita
- iniciar fase de OCR para cupom, recibo e comprovante

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
- formulario de lead agora registra origem `website`, URL da pagina, referrer e parametros UTM
- formulario de lead agora devolve uma referencia curta de atendimento apos o envio
- CTA de WhatsApp com mensagem pre-preenchida quando o canal estiver configurado
- CTA de WhatsApp dependente do canal agora some da publicacao quando o canal nao estiver configurado
- mapa incorporado exibido na home publicada quando configurado
- secao `Trabalhos` escondida na versao publica quando nao houver conteudo suficiente
- `next/image`, `robots`, `sitemap` e metadados basicos por empresa
- `Open Graph`, `canonical` e `LocalBusiness` no website publicado

### Base reutilizada

- a rodada reaproveita `SiteSetting`, `SiteService`, `SiteBanner`, `SiteLead` e `SitePage`
- o snapshot publicado da home e o rascunho passaram a usar `SitePage` com chaves separadas para evitar expor alteracoes nao publicadas

## 2026-06-26 - Website Experience 1.0 - consolidacao de lead e publicacao

### Corrigido

- lead publico agora registra contexto de origem com `origin`, `pageUrl`, `pagePath`, `referrerUrl` e parametros UTM
- `SiteLead` recebeu migration pequena e auditavel para preservar esse contexto na base local
- feedback de sucesso do formulario agora mostra referencia curta do contato
- secao `Trabalhos` nao exibe texto interno de administrador para visitantes finais
- mapa configurado passou a renderizar no site publicado

### Melhorado

- rodape do website com links sociais quando configurados
- hero principal usa texto alternativo configuravel para a imagem
- metadados publicos usam URL absoluta para `canonical`, `Open Graph` e `LocalBusiness`
- cobertura unitaria ampliada para contexto de lead
- Playwright do website ampliado para validar UTM, origem e mapa

### Documentado

- diretrizes do website em `docs/website-guidelines.md`
- visao geral da home e publicacao em `docs/plataforma-visao-geral.md`
- homologacao do website em `docs/roteiro-de-homologacao.md`
- principios visuais do website em `docs/ux-guidelines.md`

### Pendencias reais

- validacao funcional completa do Playwright ainda depende de ambiente com spawn de navegador liberado
- rodada futura do painel ainda precisara revisar distribuicao de campos em `Vendas` e acabamento fino de formularios longos

## 2026-06-26 - Navegacao administrativa definitiva

### Corrigido

- shell administrativo deixou de competir entre topo e coluna lateral no desktop
- `Cadastros` e `Configuracoes` passaram a funcionar como menus auxiliares reais no topo
- menu mobile permaneceu em `drawer`, sem duplicar a logica do desktop

### Melhorado

- o desktop agora usa uma unica navegacao persistente, com modulos principais em pill
- a navegacao contextual do modulo ativo ficou concentrada em abas abaixo do breadcrumb
- os testes de shell, pedidos e navegacao financeira foram ajustados para refletir a estrutura final do menu

### Pendencias reais

- a tela de `Vendas` ainda precisa de ajuste fino de distribuicao de campos
- alguns formularios do painel ainda pedem acabamento visual final

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
- conclusao de venda com acesso direto para `Abrir conta a receber` quando a venda ficar pendente e `Abrir financeiro` quando recebida no ato
- `pedidos` com bloco explicito de faturamento direto, sem obrigar passagem pela tela de vendas para concluir pedido entregue
- `pedidos` com acoes `Faturar pedido` e `Receber agora`, alem de atalhos para `Abrir venda` e `Abrir conta a receber` quando a venda ja existir
- `financeiro` com `Contas a receber` exibindo apenas titulos em aberto e abrindo a venda vinculada quando a origem for comercial
- shell administrativo consolidado com navegacao superior unica no desktop
- alerta de divergencia entre saldo registrado e saldo vendavel
- diagnostico operacional de estoque com `npm run inventory:diagnose`
- regularizacao assistida de base piloto com `npm run inventory:backfill-fifo`
- cobertura automatizada inicial para numericos, venda, movimentacao e shell
- suite de integracao para entrada, camada FIFO, bloqueio acima do saldo, faturamento direto de pedido e baixa financeira
- jornadas Playwright para orcamento com cliente pesquisado, pedido entregue faturado na propria tela e navegacao financeira segmentada

### Documentado

- regras dos campos numericos em `docs/campos-numericos.md`
- regras de estoque e FIFO em `docs/plataforma-visao-geral.md`
- roteiro atualizado de homologacao em `docs/roteiro-de-homologacao.md`
- padrao visual e operacional atualizado em `docs/ux-guidelines.md`

### Pendencias reais

- executar a bateria completa do Playwright no ambiente local de homologacao
- acabamento visual final do formulario completo de lancamento manual
