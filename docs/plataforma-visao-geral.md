# Plataforma Grafica Platform

## Proposito

A `Grafica Platform` foi pensada para operacao de graficas rapidas em modelo multiempresa, com a `Ponto Print` como cliente piloto e base da homologacao operacional.

O produto combina:

- painel administrativo operacional
- website institucional configuravel por empresa

## Arquitetura

- stack: `Next.js + TypeScript + Prisma + PostgreSQL`
- arquitetura: `MVC + service layer`
- isolamento de dados por `companyId`
- autenticacao e sessao no backend
- validacao de frontend e backend
- foco em preservacao de historico operacional

## Separacao visual atual

### Painel administrativo

O painel administrativo agora possui identidade propria, separada do website:

- `AppShell` administrativo
- navegacao principal no topo com modulos em pill no desktop
- `Cadastros` e `Configuracoes` como menus auxiliares no topo
- abas contextuais por modulo abaixo do breadcrumb
- `drawer` de navegacao no celular
- topbar mais forte, com modulo ativo em pill e utilitarios separados do fluxo diario
- design system interno compartilhado
- superficies neutras e densidade operacional maior
- titulo principal concentrado no `PageHeader`, sem duplicacao na topbar

### Website publico

O website continua com identidade configuravel por empresa:

- cores da empresa
- logotipo e favicon
- home publica com hero comercial, servicos, diferenciais, como funciona, prova visual, CTA final, contato e rodape
- banners e servicos reutilizados como prova visual da grafica
- formulario de contato e leads com servico pre-selecionado
- CTA de WhatsApp em pontos principais da home quando o canal estiver configurado
- preview real em desktop e mobile dentro do painel
- separacao entre rascunho e publicado, sem expor alteracoes nao publicadas no `slug`
- SEO basico por empresa com metadados, `Open Graph`, `robots`, `sitemap` e `LocalBusiness`

O tema do website nao altera a legibilidade do painel administrativo.

## Design system em uso

Os componentes base do painel ficam em `src/components/admin` e hoje cobrem:

- `AppShell`
- `Topbar`
- `PageHeader`
- `Breadcrumb`
- `SectionCard`
- `FormSection`
- `Field`
- `SearchField`
- `FilterBar`
- `StatusBadge`
- `EmptyState`
- `Alert`
- `Toast`
- `ConfirmDialog`
- `Drawer`
- `Tabs`
- `StickyActionBar`
- `MetricCard`
- `Skeleton`
- `LoadingButton`

## Navegacao por tarefas

O menu administrativo esta organizado por tarefa:

- `Inicio`
- `Comercial`
- `Operacao`
- `Financeiro`
- `Meu site`
- `Relatorios`

Na area auxiliar da navegacao ficam:

- `Cadastros`
- `Configuracoes`
- perfil e saida

No desktop:

- os modulos principais ficam no topo
- `Cadastros` e `Configuracoes` ficam em area auxiliar
- a navegacao contextual do modulo aparece em abas abaixo do breadcrumb
- nao ha coluna lateral fixa competindo com a navegacao principal

Os itens exibidos respeitam o perfil visual do usuario, sem substituir a autorizacao do backend.

## Dashboard atual

O dashboard deixou de ser apenas uma tela de cadastro e passou a concentrar:

- acoes rapidas
- pendencias que exigem atencao
- resumo do periodo
- atividade recente

Os indicadores devem ser tratados como ponto de partida para o trabalho diario.

## Modulos atualmente disponiveis

### Operacao comercial

- clientes
- orcamentos
- pedidos
- vendas

### Operacao e estoque

- itens
- grupos de itens
- entradas
- estoque
- movimentacoes
- producao

### Financeiro e gestao

- visao financeira
- contas a receber
- contas a pagar
- caixa e bancos
- contas financeiras
- categorias financeiras
- lancamentos manuais
- relatorios
- empresa
- parametros
- usuarios
- auditoria

### Presenca digital

- configuracao guiada do website
- banners
- servicos
- leads do site
- visualizacao publica por `slug`
- preview de website em desktop e mobile
- publicacao com snapshot dedicado do conteudo publicado

## Fluxos consolidados nesta revisao visual

- shell administrativo novo
- separacao clara entre painel e website
- menu por tarefas
- menu por permissao visual
- dashboard orientado a atencao
- listagens de `clientes`, `orcamentos`, `pedidos`, `vendas`, `entradas`, `estoque`, `usuarios`, `perfis`, `auditoria`, `grupos de itens` e `categorias financeiras` no padrao atual
- `clientes` com formulario em secoes, validacao mais clara e confirmacoes acessiveis
- `orcamentos` e `pedidos` com formularios reorganizados em blocos operacionais, resumo lateral e barra fixa de acao
- `orcamentos` com busca de cliente no servidor, preservando a selecao durante o preenchimento
- shell administrativo consolidado com navegacao superior unica no desktop
- listagens principais com indicadores mais baixos, menos espaco vazio e maior aproveitamento da primeira dobra
- wrappers de `novo`, `editar` e `detalhe` padronizados com larguras consistentes e sem padding local
- `orcamentos`, `pedidos`, `vendas`, `entradas`, `producao`, `relatorios`, `leads do site`, `empresa`, `parametros` e `movimentacoes` alinhados ao mesmo shell visual
- `orcamentos`, `pedidos`, `lancamentos manuais`, `producao` e `ficha tecnica` usando o mesmo padrao compartilhado de campos monetarios, percentuais e quantitativos
- `vendas` com fluxo proprio de operacao, separado do formulario generico do financeiro
- `vendas` com cabecalho operacional para cliente, origem e situacao financeira
- `vendas` com pesquisa sob demanda, sem carregar o catalogo inteiro ao abrir
- `vendas` com carrinho lateral fixo no desktop e foco inicial na busca
- `vendas` com preco de item do catalogo somente leitura no carrinho
- `vendas` usando saldo vendavel por FIFO como fonte de verdade visual e transacional
- `vendas` com reflexo de estoque para itens fisicos na mesma transacao do registro comercial
- `vendas` com acesso direto para a conta a receber gerada ao concluir
- `estoque` com consumo FIFO protegido por lock transacional no produto e nas camadas elegiveis
- `estoque` com aviso explicito quando saldo registrado e saldo FIFO ainda nao coincidem
- `estoque` com rotina de regularizacao para bases piloto que possuem movimentos confirmados sem camada FIFO correspondente
- `movimentacoes` sem item preso ao abrir pelo menu e com troca de item confiavel
- `financeiro` com leitura de origem operacional, incluindo entrada, pedido, orcamento e lancamento manual
- `financeiro` com origem clicavel tambem para vendas registradas pela tela propria
- `financeiro` separado em `visao geral`, `contas a receber`, `contas a pagar`, `caixa e bancos` e `lancamentos manuais`
- `pedidos` mostrando proxima acao de faturamento com `Gerar venda` ou `Abrir venda`, em vez de virar receita automaticamente
- `pedidos` com bloco explicito de faturamento, incluindo atalho para `Abrir conta a receber` quando a venda ja existir
- `lancamento manual` tratado visualmente como excecao e nao como fluxo concorrente a venda
- `producao` com destaque para impedimento por falta de material no lote atual
- `ficha tecnica` tratada com linguagem operacional voltada a materiais, consumo padrao e custo estimado
- `relatorios` com aba preservada na URL e exportacao com feedback visual
- `entradas` em etapas
- configuracao do website em fluxo guiado
- website publico server-side, sem depender de `fetch` client-side para montar a home
- financeiro organizado em `a receber`, `a pagar` e `caixa e bancos`

## Website Experience 1.0

O website publico entrou em uma rodada propria de evolucao comercial, separada do painel administrativo.

### Estrutura atual da home

- cabecalho publico com navegação curta, CTA principal e WhatsApp
- hero comercial com titulo forte, subtitulo, CTA principal e CTA secundario
- faixa de diferenciais
- servicos em destaque com imagem e CTA para orcamento
- secao `Como funciona`
- secao de prova visual reaproveitando servicos e banners
- chamada final de conversao
- formulario de lead com servico pre-selecionado
- painel de contato
- rodape mais completo

### Modelo de configuracao e publicacao

O fluxo administrativo de `Meu site` continua guiado, mas agora separa com mais clareza:

- identidade
- pagina inicial
- servicos
- contato
- revisao e publicacao

O conteudo da home usa duas referencias internas:

- `HOME_DRAFT` para o rascunho editado no painel
- `HOME` para o snapshot publicado consumido pelo `slug` publico

Isso garante que:

- salvar rascunho nao altera imediatamente o website publicado
- a pre-visualizacao administrativa usa o mesmo componente visual da home publica
- o website publico mostra apenas o snapshot publicado

### Leads e conversao

O website publico agora prioriza captacao comercial:

- formulario com `nome`, `WhatsApp`, `e-mail opcional`, `servico desejado` e `mensagem`
- servico escolhido na home chega preenchido ao formulario
- CTA de WhatsApp com mensagem pre-preenchida quando o canal estiver configurado
- origem `website` preservada no lead salvo
- URL da pagina, caminho e parametros UTM registrados no lead
- referencia curta do contato exibida ao concluir o envio
- contato visivel tambem no rodape e no painel lateral da secao de contato

### Evolucoes adicionais desta rodada

- mapa incorporado exibido na home publicada quando configurado
- secao `Trabalhos` escondida do site publico quando nao houver conteudo suficiente
- rodape com links sociais quando configurados
- CTA de WhatsApp oculto no site publicado quando o canal nao estiver configurado

## Modulos ainda com consolidacao visual parcial

Os modulos abaixo ja funcionam e ja seguem o shell atual, mas ainda merecem rodada final de acabamento fino, mobile e acessibilidade:

- alguns formularios longos mais densos, especialmente `vendas` e `lancamentos financeiros`
- detalhes profundos finais de `producao` e `composicao`
- refinamentos finais de relatorios detalhados e filtros avancados por relatorio
- execucao completa da bateria automatizada de navegador no ambiente local de homologacao
- rodada final de acabamento visual do formulario completo de `lancamento manual`

## Principios operacionais definidos

- cada pagina deve ter uma acao principal clara
- filtros precisam ser simples e previsiveis
- estados vazios devem orientar o proximo passo
- erros devem explicar o problema e como corrigir
- formularios longos devem priorizar os campos essenciais
- dados digitados nao devem se perder em erro de validacao
- operacoes criticas devem exibir confirmacao com consequencia

## Campos monetarios e decimais

Os formularios operacionais passaram a compartilhar componentes reutilizaveis:

- `MoneyInput`
- `DecimalInput`
- `PercentageInput`
- `QuantityInput`

Regras atuais:

- moeda aceita digitacao natural em `pt-BR` e normaliza colagem com `R$`, virgula ou ponto
- percentual aceita ate duas casas
- quantidade respeita escala operacional e nao reaproveita a mascara de moeda
- formatacao final acontece ao perder o foco, sem impedir a digitacao

## Estoque, saldo e FIFO

Para itens com controle de estoque, a disponibilidade usada em `Vendas` passa a seguir a mesma fonte validada no backend:

`saldo vendavel = soma das quantidades disponiveis nas camadas FIFO elegiveis`

Quando houver divergencia entre:

- saldo registrado no produto
- saldo por movimentos confirmados
- saldo disponivel em camadas FIFO

o sistema deve:

- alertar visualmente a divergencia
- bloquear venda acima do saldo FIFO disponivel
- orientar regularizacao administrativa

Comando de diagnostico disponivel:

- `npm run inventory:diagnose`
- `npm run inventory:backfill-fifo` para base piloto local, quando houver movimentos de entrada confirmados sem camada e sem saidas consumidas

## Situacao da homologacao

A plataforma esta em fase de preparacao para homologacao operacional real com a `Ponto Print`.

Os focos imediatos dessa preparacao sao:

- terminar a consolidacao visual dos fluxos P0
- sincronizar a documentacao com a interface atual
- adicionar cobertura inicial automatizada de interface
- validar desktop, mobile, acessibilidade e permissoes por perfil

## Pendencias administrativas registradas para rodada futura

Estas pendencias foram mantidas fora da branch do website:

- a tela de `Vendas` ainda possui campos mal distribuidos em alguns estados
- alguns campos de `Vendas` ainda estouram visualmente em larguras menores
- formularios longos do painel ainda precisam de acabamento fino final

## Validacao automatizada atual

A plataforma possui uma base inicial de testes de interface com `Playwright`, cobrindo:

- login e shell principal
- cadastro de item
- entrada salva e confirmada
- criacao de orcamento com cliente pesquisado
- criacao de pedido a partir de orcamento aprovado
- venda concluida
- venda com item fisico reduzindo saldo em estoque
- navegacao segmentada do financeiro
- configuracao e publicacao do website

Essa cobertura ainda e incremental, mas ja serve para detectar regressao visual e de fluxo nos principais caminhos do piloto.

Na bateria atual, o login pela interface continua coberto explicitamente, enquanto as jornadas seguintes aproveitam autenticacao automatizada por API para reduzir ruido e focar no modulo validado.

O projeto tambem possui uma suite de integracao para o nucleo de estoque:

- `npm run test:integration`

Essa suite cobre:

- entrada gerando camada FIFO
- consumo FIFO com saldo exato
- bloqueio acima do saldo disponivel
- item de servico sem consumo de camada
- cancelamento de entrada sem consumo previo
- regularizacao manual incidindo no item correto
- isolamento por empresa
