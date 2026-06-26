# UX Guidelines

## Objetivo

Este guia registra o padrao visual e operacional atual do painel administrativo da `Grafica Platform`.

Ele existe para evitar regressao de usabilidade, manter consistencia entre modulos e orientar novas telas sem recriar componentes nem mascaras locais.

## Separacao de temas

### Painel administrativo

Usar:

- linguagem visual neutra
- fundo claro
- superficies brancas
- contraste alto
- tipografia sem serifa
- densidade operacional moderada
- poucos elementos decorativos

Evitar:

- gradientes de landing page
- titulos serifados
- cartoes grandes sem funcao
- sombras pesadas

### Website

O website pode manter:

- cores configuraveis
- banners
- identidade promocional
- tipografia mais expressiva
- imagens reais ou mockups de materiais graficos
- CTA de conversao mais evidente que no painel
- secoes amplas e mais respiradas
- detalhes inspirados em papel, impressao, camadas e CMYK de forma controlada

O tema do website nao deve afetar o painel administrativo.

Para a versao atual da home publica:

- usar hero comercial com titulo forte, subtitulo curto e CTA principal
- usar cards e secoes com superficies brancas sobre fundo neutro claro
- evitar pagina com cara de cadastro publicado ou tabela exposta
- usar imagens reais dos servicos sempre que possivel
- preferir uma prova visual honesta a depoimentos ou numeros inventados
- destacar `WhatsApp` quando configurado
- manter o mesmo componente visual na pre-visualizacao administrativa e no website publicado
- manter `Salvar rascunho` separado de `Publicar alteracoes`

As regras completas do website ficam em `docs/website-guidelines.md`.

## Componentes oficiais

Os componentes administrativos oficiais ficam em `src/components/admin`.

### Layout e navegacao

- `AppShell`
- `Sidebar`
- `Topbar`
- `PageHeader`
- `Breadcrumb`
- `Drawer`
- `Tabs`

No shell atual:

- a navegacao principal diaria deve aparecer no topo em formato de pill
- `Inicio`, `Comercial`, `Operacao`, `Financeiro`, `Meu site` e `Relatorios` devem ficar como modulos principais
- `Cadastros` e `Configuracoes` devem ficar fora da fila principal do dia a dia
- a sidebar de desktop passa a ser contextual: menos grupos, mais foco no modulo ativo
- a largura expandida da sidebar continua entre aproximadamente `240px` e `256px`
- a largura recolhida continua entre aproximadamente `64px` e `72px`
- o controle de recolhimento continua dentro da propria sidebar
- o menu recolhido nao deve competir com o topo principal
- o `drawer` mobile continua sendo a navegacao principal em telas pequenas

Pendencias conhecidas do painel, registradas mas fora desta rodada:

- o shell hibrido ainda precisa de decisao final entre topo, sidebar ou outra simplificacao
- a tela de `Vendas` ainda precisa de ajuste fino de distribuicao de campos
- alguns formularios do painel ainda pedem acabamento visual final

No `Topbar`:

- mostrar marca, navegacao principal, breadcrumb e subnavegacao contextual
- usar pill/badge para o modulo ativo
- nao repetir o titulo principal da pagina
- manter o botao de abrir navegacao apenas no mobile
- concentrar empresa, usuario e saida no menu de perfil

Nos wrappers de pagina:

- usar `admin-page-shell`
- aplicar `admin-page-shell--narrow`, `admin-page-shell--medium` ou `admin-page-shell--wide` conforme a densidade do formulario
- evitar `padding` local no `main`
- evitar repetir `eyebrow` quando o breadcrumb ja contextualizar a pagina

### Formularios

- `FormSection`
- `Field`
- `SearchField`
- `StickyActionBar`
- `LoadingButton`

Campos numericos compartilhados:

- `MoneyInput`
- `DecimalInput`
- `PercentageInput`
- `QuantityInput`

Nos formularios de `orcamentos` e `pedidos`:

- abrir primeiro as informacoes principais
- manter itens em bloco proprio
- concentrar observacoes e revisao no final
- deixar apenas uma acao principal de salvamento
- usar confirmacao explicita para exclusao

No fluxo de `vendas`:

- usar tela propria, separada do lancamento manual
- iniciar por pesquisa, sem carregar o catalogo inteiro ao abrir
- abrir com cabecalho operacional mostrando cliente, origem e efeito financeiro
- manter a pesquisa e a inclusao de itens na area principal
- manter resumo, total e acao principal sempre visiveis
- deixar o carrinho fixo no desktop
- tratar preco do item do catalogo como somente leitura
- esconder custo, margem detalhada e informacoes tecnicas ate quando forem realmente necessarias
- usar alerta de saida sem salvar quando houver carrinho em andamento
- depois de concluir, oferecer `Abrir venda` e `Abrir conta a receber`

### Feedback

- `Alert`
- `Toast`
- `ConfirmDialog`
- `Skeleton`
- `EmptyState`

### Dados e resumo

- `SectionCard`
- `FilterBar`
- `StatusBadge`
- `MetricCard`

Nao criar variantes locais quando existir equivalente oficial.

## Arquitetura atual do menu

Os grupos principais da navegacao administrativa devem seguir a ordem operacional:

- `Inicio`
- `Comercial`
- `Operacao`
- `Financeiro`
- `Meu site`
- `Relatorios`

Na area auxiliar:

- `Configuracoes`
- `Cadastros`
- recolher menu
- perfil

### Estrutura recomendada

`Comercial`

- Clientes
- Orcamentos
- Pedidos
- Vendas

No detalhe de `Pedidos`:

- o bloco de `Faturamento` deve existir quando o pedido estiver em revisao, pronto para venda ou ja faturado
- `Pedido` continua sendo compromisso operacional
- `Venda` continua sendo o fato comercial e financeiro
- o usuario nao deve ir para `Financeiro` para faturar manualmente um pedido
- quando o pedido estiver pronto, a acao principal deve ser `Gerar venda`
- quando a venda ja existir, os atalhos devem expor `Abrir venda` e `Abrir conta a receber`

`Operacao`

- Producao
- Estoque
- Entradas
- Ajustes de estoque

`Financeiro`

- Visao geral
- Contas a receber
- Contas a pagar
- Caixa e bancos
- Lancamento manual

`Meu site`

- Visao geral
- Leads do site
- Visualizar site

`Cadastros`

- Produtos e servicos
- Grupos de itens
- Categorias financeiras

`Configuracoes`

- Empresa
- Usuarios e acessos
- Contas financeiras
- Regras operacionais
- Historico de alteracoes

## Padrao de pagina

Toda pagina deve seguir, sempre que fizer sentido, esta ordem:

1. breadcrumb
2. titulo
3. descricao curta
4. uma acao principal
5. busca
6. filtros principais
7. conteudo
8. estados de loading, erro ou vazio

## Acoes principais e secundarias

### Acao principal

Usar destaque visual apenas para a acao mais importante da pagina.

Exemplos:

- `Novo cliente`
- `Novo orcamento`
- `Salvar`
- `Confirmar entrada`
- `Concluir venda`

### Acoes secundarias

Usar estilo secundario, `link button` ou menu de contexto.

Evitar varias acoes com a mesma hierarquia visual.

### Acoes destrutivas

Sempre:

- cor de perigo
- confirmacao
- consequencia clara

## Formularios

### Regras gerais

- labels sempre acima do campo
- placeholder nao substitui label
- obrigatorios primeiro
- opcionais indicados
- uma coluna por padrao
- duas colunas apenas para campos curtos relacionados
- secoes secundarias recolhiveis
- acoes fixas no rodape em formularios longos

### Estrutura recomendada

1. informacoes principais
2. informacoes complementares
3. opcoes avancadas
4. acoes

### Campos monetarios, percentuais e quantidades

Todos os campos financeiros e decimais devem usar os componentes compartilhados.

Regras:

- moeda aceita digitacao natural em `pt-BR`
- colagem pode usar `R$`, virgula ou ponto decimal
- formatacao final acontece no blur, sem impedir a digitacao
- percentual aceita ate duas casas
- quantidade respeita a escala operacional e nao herda mascara de moeda
- valores digitados devem ser preservados em erro
- `orcamentos`, `pedidos`, `entradas`, `producao`, `ficha tecnica` e `lancamento manual` nao devem reimplementar mascaras locais

Campos detalhados e escalas atuais estao documentados em `docs/campos-numericos.md`.

### Campos de busca reutilizaveis

Buscas de item, produto, materia-prima e catalogo devem:

- usar `type="search"` quando houver campo textual livre
- usar `autoComplete="off"` ou valor semanticamente neutro
- evitar `name`, `id` ou `aria-label` com termos como `document`, `cpf`, `cnpj`, `doc` ou `identification`
- preferir nomes como `quoteItemSearch`, `orderItemSearch`, `catalogItemSearch`, `inventoryMovementItemSearch`
- preservar acessibilidade por teclado mesmo com autocomplete do navegador desativado

### Validacao

Toda validacao deve responder:

1. o que aconteceu
2. onde esta o problema
3. como corrigir

Exemplo recomendado:

`Nao foi possivel salvar o item. O SKU informado ja esta em uso. Informe um SKU diferente.`

Evitar:

`Erro ao salvar.`

## Listagens

Toda listagem deve usar:

- `PageHeader`
- `FilterBar`
- `SectionCard`
- `EmptyState`
- `Skeleton`

Mostrar apenas o necessario para identificar e decidir.

Sempre que possivel:

- titulo curto
- filtros e busca na mesma faixa no desktop
- indicadores compactos
- pelo menos alguns registros visiveis na primeira dobra
- uma unica superficie para filtros e conteudo principal
- mesma largura operacional entre listagem e telas de `novo`, `editar` e `detalhe`

Filtros devem:

- ser simples
- poder ser limpos
- preservar estado ao voltar
- aparecer na URL quando fizer sentido

## Status

Usar sempre `StatusBadge`.

### Semantica

- verde: concluido ou pago
- amarelo: pendente ou atencao
- vermelho: erro, cancelado, vencido
- azul: em andamento
- cinza: rascunho ou inativo

Nunca usar apenas cor sem texto.

## Estados vazios

Um estado vazio deve conter:

- titulo claro
- descricao curta
- proximo passo

Exemplo:

- `Nenhum cliente encontrado`
- `Ajuste os filtros ou cadastre o primeiro cliente.`

## Loading e feedback

### Loading

Usar:

- `Skeleton` para carregamento de pagina
- botoes com `Salvando...`, `Confirmando...`, `Concluindo venda...`

### Sucesso

Usar mensagens curtas e especificas:

- `Cliente atualizado com sucesso.`
- `Entrada confirmada e estoque atualizado.`
- `Venda concluida com sucesso.`

### Erro

Mostrar contexto e correcao esperada.

Em relatorios:

- exportacao deve mostrar `Gerando arquivo...`
- o clique deve ficar bloqueado durante a geracao
- o sistema deve devolver confirmacao de sucesso ou falha visivel

## Confirmacoes

Usar `ConfirmDialog` apenas em acoes relevantes:

- excluir
- inativar
- confirmar entrada
- concluir venda
- cancelar documento
- publicar website

## Estoque e FIFO

Para itens com controle de estoque, a disponibilidade operacional deve seguir a mesma fonte usada na conclusao da venda:

`saldo vendavel = soma das quantidades disponiveis nas camadas FIFO elegiveis`

Quando houver divergencia entre saldo registrado e saldo vendavel:

- alertar visualmente na venda e no estoque
- bloquear venda acima do saldo FIFO disponivel
- orientar regularizacao administrativa

O diagnostico padrao fica em:

- `npm run inventory:diagnose`

O consumo transacional usa lock no produto e nas camadas elegiveis antes da baixa FIFO, para impedir concorrencia sobre a mesma disponibilidade.

Quando o piloto local tiver movimentos de entrada confirmados sem camada correspondente e sem consumo posterior, a regularizacao assistida pode usar:

- `npm run inventory:backfill-fifo`

## Responsividade

Prioridades mobile:

1. vendas
2. dashboard
3. pedidos
4. entradas
5. producao
6. financeiro

No celular:

- menu vira `drawer`
- formularios usam uma coluna
- acoes principais ficam acessiveis
- tabelas largas viram listas ou cartoes
- nao depender de `hover`
- evitar rolagem horizontal

## Acessibilidade

Sempre validar:

- foco visivel
- labels associados
- contraste adequado
- navegacao por teclado
- dialogos com foco
- retorno de foco ao fechar
- mensagens de erro anunciaveis
- texto junto com status visual
- `aria-current` no item ativo
- `aria-expanded` no controle da sidebar

Nao remover `outline` sem substituicao visivel.
