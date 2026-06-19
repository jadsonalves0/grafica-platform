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
- menu lateral recolhivel no desktop
- `drawer` de navegacao no celular
- topbar simplificada e compacta
- design system interno compartilhado
- superficies neutras e densidade operacional maior
- menu recolhido com atalhos apenas dos modulos principais no desktop, sem afetar a navegacao expandida no mobile
- controle de recolhimento integrado a propria sidebar
- titulo principal concentrado no `PageHeader`, sem duplicacao na topbar

### Website publico

O website continua com identidade configuravel por empresa:

- cores da empresa
- banners
- servicos
- textos institucionais
- formulario de contato e leads

O tema do website nao altera a legibilidade do painel administrativo.

## Design system em uso

Os componentes base do painel ficam em `src/components/admin` e hoje cobrem:

- `AppShell`
- `Sidebar`
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
- `Vendas`
- `Producao`
- `Estoque`
- `Financeiro`
- `Website`
- `Relatorios`
- `Cadastros`
- `Administracao`

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

- leads
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
- contas financeiras
- categorias financeiras
- lancamentos
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

## Fluxos consolidados nesta revisao visual

- shell administrativo novo
- separacao clara entre painel e website
- menu por tarefas
- menu por permissao visual
- dashboard orientado a atencao
- listagens de `clientes`, `orcamentos` e `pedidos` no padrao atual
- `clientes` com formulario em secoes, validacao mais clara e confirmacoes acessiveis
- `orcamentos` e `pedidos` com formularios reorganizados em blocos operacionais, resumo lateral e barra fixa de acao
- shell administrativo compactado com sidebar mais estreita, topbar mais baixa e filtros mais densos
- listagens principais com indicadores mais baixos, menos espaco vazio e maior aproveitamento da primeira dobra
- `orcamentos`, `pedidos`, `vendas`, `entradas`, `producao`, `relatorios` e `leads do site` parcialmente migrados para o padrao novo
- `entradas` em etapas
- configuracao do website em fluxo guiado
- financeiro organizado em `a receber`, `a pagar` e `caixa e bancos`

## Modulos ainda com consolidacao visual parcial

Os modulos abaixo ja funcionam, mas ainda merecem rodada final de acabamento visual, mobile e acessibilidade:

- formulario de vendas
- formulario de lancamentos financeiros
- detalhes mais profundos de producao
- alguns relatorios detalhados
- validacao de interface automatizada

## Principios operacionais definidos

- cada pagina deve ter uma acao principal clara
- filtros precisam ser simples e previsiveis
- estados vazios devem orientar o proximo passo
- erros devem explicar o problema e como corrigir
- formularios longos devem priorizar os campos essenciais
- dados digitados nao devem se perder em erro de validacao
- operacoes criticas devem exibir confirmacao com consequencia

## Situacao da homologacao

A plataforma esta em fase de preparacao para homologacao operacional real com a `Ponto Print`.

Os focos imediatos dessa preparacao sao:

- terminar a consolidacao visual dos fluxos P0
- sincronizar a documentacao com a interface atual
- adicionar cobertura inicial automatizada de interface
- validar desktop, mobile, acessibilidade e permissoes por perfil

## Validacao automatizada atual

A plataforma possui uma base inicial de testes de interface com `Playwright`, cobrindo:

- login e shell principal
- cadastro de item
- entrada salva e confirmada
- venda concluida
- configuracao e publicacao do website

Essa cobertura ainda e incremental, mas ja serve para detectar regressao visual e de fluxo nos principais caminhos do piloto.

Na bateria atual, o login pela interface continua coberto explicitamente, enquanto as jornadas seguintes aproveitam autenticacao automatizada por API para reduzir ruido e focar no modulo validado.
