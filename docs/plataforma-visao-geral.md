# Plataforma Grafica Platform

## Proposito

A plataforma foi pensada para atender graficas rapidas em modelo multiempresa, com a `Ponto Print` como cliente piloto e base de validacao operacional.

Ela combina duas frentes em uma unica arquitetura:

- sistema administrativo interno
- site institucional configuravel por cliente

## Blocos do produto

### 1. Core da plataforma

- multiempresa
- autenticacao e sessao
- usuarios
- perfis e permissoes
- configuracoes por empresa

### 2. Operacao da grafica

- clientes
- orcamentos
- pedidos
- estoque
- movimentacoes
- financeiro
- dashboard

### 3. Presenca digital

- site por `slug`
- configuracao institucional
- banners e servicos
- captacao de leads
- conversao de lead em cliente e orcamento

## Padroes definidos

- stack: `Next.js + TypeScript + Prisma + PostgreSQL`
- arquitetura: `MVC + service layer`
- isolamento de dados por `companyId`
- formularios com validacao de frontend e backend
- seletores pesquisaveis para entidades operacionais

## O que foi consolidado nesta fase

- login funcionando com sessao
- CRUDs administrativos principais
- retorno para lista em fluxos relevantes
- inativacao de clientes quando exclusao nao for possivel
- lookup pesquisavel para clientes, itens, orcamentos aprovados, contas e vinculos financeiros
- item de orcamento e pedido com uso opcional de item catalogado e descricao manual
- cadastro de item com `EAN/GTIN` opcional
- producao de produto final com consumo automatico de materia-prima
- ficha tecnica de composicao para produto final
- categorias financeiras separadas por receita e despesa
- vendas avulsas com itens vinculados ao catalogo
- relatorios gerenciais com exportacao em CSV
- administracao do site com criacao, edicao, inativacao e exclusao de servicos e banners

## Principios de usabilidade

- toda entidade recorrente deve ser selecionavel por busca, nao apenas por `select` simples
- operacoes com filhos devem priorizar `inativar` antes de `excluir`
- formularios devem deixar claro o que e obrigatorio, o que e opcional e o que e sugerido
- catalogo de itens precisa servir ao estoque, ao comercial e ao site sem retrabalho

## Fase atual

A plataforma ja tem base suficiente para homologacao funcional do fluxo:

1. cliente
2. item
3. orcamento
4. aprovacao
5. pedido
6. estoque
7. financeiro
8. site e leads

## Pendencias estrategicas da proxima fase

- acabamento visual mais forte no administrativo e no site
- categorias de item
- conversao de embalagem e unidade
- localizacao fiscal brasileira de itens e vendas
- automacoes entre pedido, estoque e financeiro
- deploy, observabilidade e governanca de releases
- upload e biblioteca de imagens do site
- filtros avancados e exportacao PDF nos relatorios
