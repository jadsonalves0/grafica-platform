# UX Guidelines

## Objetivo

Este guia registra o padrao visual e operacional atual do painel administrativo da `Grafica Platform`.

Ele existe para evitar regressao de usabilidade durante a consolidacao da plataforma.

## Separacao de temas

### Painel administrativo

Usar:

- linguagem visual neutra
- fundo claro
- superficies brancas
- contraste alto
- tipografia sem serifa
- poucos elementos decorativos
- densidade operacional moderada

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

O tema do website nao deve afetar o painel administrativo.

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

No `Sidebar`:

- a largura expandida deve ficar entre aproximadamente `240px` e `256px`
- a largura recolhida deve ficar entre aproximadamente `64px` e `72px`
- o menu recolhido no desktop deve mostrar apenas os modulos principais
- o controle de recolhimento deve ficar dentro da propria sidebar
- o item ativo precisa continuar evidente no estado recolhido
- o `drawer` mobile nao deve herdar o estado recolhido do desktop

No `Topbar`:

- mostrar breadcrumb compacto quando a pagina exigir contexto
- nao repetir o titulo principal da pagina
- manter o botao de abrir navegacao apenas no mobile
- concentrar empresa, usuario e saida no menu de perfil

### Formularios

- `FormSection`
- `Field`
- `SearchField`
- `StickyActionBar`
- `LoadingButton`

Nos formularios de `orcamentos` e `pedidos`:

- abrir primeiro as informacoes principais
- manter itens em bloco proprio
- concentrar observacoes e revisao no final
- deixar apenas uma acao principal de salvamento
- usar confirmacao explicita para exclusao

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

### Erro

Mostrar contexto e correcao esperada.

## Confirmacoes

Usar `ConfirmDialog` apenas em acoes relevantes:

- excluir
- inativar
- confirmar entrada
- concluir venda
- cancelar documento
- publicar website

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

Nao remover `outline` sem substituicao visivel.
