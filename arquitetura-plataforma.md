# Arquitetura da Plataforma

## Diretriz principal

Esta plataforma deve nascer com foco em:

- robustez
- escalabilidade
- organizacao clara de codigo
- reaproveitamento para varias graficas

Por decisao do projeto, a arquitetura deve seguir o padrao `MVC`, adaptado para uma stack web moderna.

## O que significa usar MVC aqui

`MVC` significa separar o sistema em tres camadas principais:

- `Model`
- `View`
- `Controller`

### Model

E a camada que representa os dados e as regras de acesso ao banco.

No nosso caso, essa camada sera apoiada por:

- PostgreSQL
- Prisma

O `Model` vai representar entidades como:

- empresa
- usuario
- permissao
- cliente
- produto
- orcamento
- pedido
- lancamento financeiro
- configuracao do site

### View

E a camada de interface.

No nosso caso, teremos dois tipos de view:

- site institucional publico
- sistema interno autenticado

Essas telas podem ser construidas com `Next.js`, mantendo a separacao da interface em relacao as regras do negocio.

### Controller

E a camada responsavel por receber as requisicoes, validar entrada, chamar regras do negocio e devolver a resposta correta para a interface.

Exemplos:

- controller de autenticacao
- controller de usuarios
- controller de empresas
- controller de estoque
- controller de orcamentos
- controller financeiro
- controller do site

## Observacao importante

Em sistemas modernos, normalmente adicionamos tambem uma camada de `services` entre controller e model.

Isso ajuda a manter o projeto robusto e escalavel.

Entao, na pratica, usaremos um `MVC com service layer`.

Fluxo recomendado:

`View -> Controller -> Service -> Model -> Banco`

Essa abordagem preserva a ideia de MVC, mas evita controllers inchados e melhora muito a manutencao.

## Arquitetura recomendada

## Stack principal

- frontend e camada web: Next.js
- backend da aplicacao: Next.js com rotas organizadas por dominio ou NestJS
- banco de dados: PostgreSQL
- ORM: Prisma
- autenticacao: Auth.js ou implementacao propria com sessoes e permissoes
- cache futuro: Redis
- filas futuras: servico de fila para tarefas assincronas

## Estrutura logica sugerida

```text
src/
  app/
    (public)/
    (admin)/
    api/

  controllers/
    auth/
    companies/
    users/
    customers/
    inventory/
    quotes/
    orders/
    financial/
    site/

  services/
    auth/
    companies/
    users/
    customers/
    inventory/
    quotes/
    orders/
    financial/
    site/

  repositories/
    companies/
    users/
    customers/
    inventory/
    quotes/
    orders/
    financial/
    site/

  models/
    dto/
    enums/
    validators/

  lib/
    auth/
    db/
    permissions/
    tenant/
    utils/
```

## Como o MVC se encaixa nessa estrutura

### View

Fica em:

- `src/app/(public)`
- `src/app/(admin)`

### Controller

Fica em:

- `src/controllers`

Esses arquivos recebem dados da requisicao e delegam comportamento.

### Model

Fica distribuido entre:

- schema Prisma
- repositories
- DTOs
- validadores

O Prisma faz parte do acesso ao modelo persistido, mas nao substitui a organizacao do dominio.

## Por que nao deixar tudo direto no Next.js

Embora seja possivel colocar tudo dentro de rotas e componentes, isso enfraquece a arquitetura quando o projeto cresce.

Como o objetivo e escalar para varias graficas, precisamos evitar:

- regras de negocio espalhadas
- duplicacao de validacoes
- controllers gigantes
- dependencias fortes entre tela e banco

## Multiempresa e escalabilidade

Para o crescimento do produto, a estrutura precisa garantir:

- isolamento de dados por empresa
- controle de permissao por usuario
- configuracao do site por cliente
- evolucao modular dos recursos

Regras obrigatorias:

- toda entidade de negocio deve carregar `company_id`
- o contexto da empresa deve ser resolvido logo no inicio da requisicao
- controllers nunca devem consultar dados sem escopo da empresa, salvo administradores da plataforma

## Camadas por responsabilidade

### Controllers

Responsaveis por:

- receber parametros
- validar formato basico
- identificar usuario autenticado
- identificar empresa atual
- chamar services
- devolver resposta padronizada

### Services

Responsaveis por:

- regras de negocio
- fluxos de aprovacao
- calculos de orcamento
- movimentacoes de estoque
- consolidacao financeira
- aplicacao das regras de permissao

### Repositories

Responsaveis por:

- consultar e persistir dados
- encapsular chamadas do Prisma
- centralizar filtros comuns como `company_id`

## Exemplo pratico

Ao criar um orcamento:

1. a `View` envia os dados
2. o `QuoteController` recebe a requisicao
3. o `QuoteService` valida cliente, itens, calculos e permissao
4. o `QuoteRepository` grava os dados com Prisma
5. a resposta volta para a tela

## Beneficios dessa abordagem

- codigo mais limpo
- melhor manutencao
- menor risco de bagunca conforme crescer
- facilidade para novos desenvolvedores entrarem
- possibilidade de extrair modulos no futuro
- melhor base para transformar o sistema em produto SaaS

## Decisao recomendada para este projeto

Para equilibrar velocidade e qualidade, a melhor decisao neste momento e:

- usar `Next.js` como plataforma web
- usar `Prisma` para modelagem e acesso ao banco
- organizar o backend em `MVC com service layer`
- preparar desde o inicio os modulos de autenticacao, tenant e permissao

## Proximos passos tecnicos

1. Converter o banco para `schema.prisma`
2. Definir a estrutura inicial de pastas
3. Criar o core de autenticacao e multiempresa
4. Criar o controle de perfis e permissoes
5. Iniciar os modulos de clientes, estoque e orcamentos
