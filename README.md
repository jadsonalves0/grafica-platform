# Plataforma para Graficas Rapidas

Planejamento inicial de uma plataforma SaaS para graficas rapidas, tendo a Ponto Print como cliente piloto.

## Estado atual

O projeto ja avancou da fase de planejamento e hoje conta com uma base funcional para:

- autenticacao
- multiempresa
- clientes
- itens e estoque
- orcamentos
- pedidos
- financeiro
- dashboard
- site institucional configuravel
- leads e conversao comercial

Tambem ja existe uma base inicial de documentacao em:

- `docs/plataforma-visao-geral.md`
- `docs/cadastro-de-itens-profissional.md`
- `docs/versionamento-e-publicacao.md`
- `docs/roteiro-de-homologacao.md`

## Repositorio e versionamento

Repositorio principal:

- `https://github.com/jadsonalves0/grafica-platform`

Fluxo simples recomendado para o time:

1. manter `main` como linha principal estavel;
2. criar branches curtas por tema:
   - `feature/...`
   - `fix/...`
   - `docs/...`
3. usar commits pequenos e claros:
   - `feat: adiciona entrada por documento`
   - `fix: corrige consumo FIFO na venda`
   - `docs: atualiza roteiro de homologacao`
4. validar localmente antes de subir:
   - `npm run lint`
   - `npx tsc --noEmit`
5. subir para o GitHub e homologar por bloco funcional.

## Visao do produto

O projeto nao deve nascer como um sistema exclusivo para uma unica grafica. A estrategia correta e criar uma plataforma reutilizavel, capaz de atender diferentes graficas com configuracoes proprias.

A `Ponto Print` sera o piloto da operacao, validando o produto antes da expansao para outros clientes.

## Objetivo principal

Construir uma plataforma unica com duas frentes:

1. sistema de gestao interna para graficas
2. site institucional configuravel por cliente

## Conceito da solucao

Cada grafica deve poder usar a plataforma com sua propria identidade e seus proprios dados, sem misturar informacoes entre empresas.

Isso significa que a plataforma precisa nascer com:

- multiempresa
- cadastro de usuarios
- controle de perfis e permissoes
- configuracao de site por cliente
- configuracao de catalogo, servicos e contatos por cliente

## Estrutura macro do produto

### 1. Painel administrativo da plataforma

Area usada pela equipe dona do produto para:

- cadastrar novas graficas
- ativar ou bloquear clientes
- definir plano ou recursos disponiveis
- acompanhar uso da plataforma
- configurar parametros globais

### 2. Sistema interno da grafica

Area usada por cada cliente para:

- estoque
- orcamentos
- pedidos
- producao
- contas a pagar
- contas a receber
- fluxo de caixa
- relatorios
- usuarios e permissoes

### 3. Site institucional por cliente

Cada grafica deve poder ter seu proprio site, com:

- logo
- cores
- textos
- banners
- servicos
- contatos
- links sociais
- formulario de orcamento
- integracao com WhatsApp

## Requisitos essenciais do produto

### Multiempresa

Cada empresa precisa ter isolamento completo de dados, incluindo:

- clientes
- produtos
- estoque
- pedidos
- financeiro
- configuracoes
- usuarios vinculados a empresa

### Usuarios e acesso

O sistema deve permitir:

- cadastro de usuarios
- login seguro
- redefinicao de senha
- associacao de usuario a empresa
- perfis de acesso
- permissoes por tela e por acao

Perfis iniciais sugeridos:

- administrador da plataforma
- administrador da grafica
- vendedor
- financeiro
- producao
- estoque

### Permissoes

O controle de acesso deve considerar:

- permissao para visualizar modulo
- permissao para criar
- permissao para editar
- permissao para excluir
- permissao para aprovar etapas especificas

### Site configuravel

Cada cliente precisa conseguir configurar, pelo menos:

- nome da empresa
- slogan
- logo
- paleta de cores
- telefone e WhatsApp
- endereco
- horarios
- textos institucionais
- lista de servicos
- imagens de portfolio
- formularios e destinos de contato

## Estrategia recomendada

Para acelerar o crescimento do produto sem retrabalho, a plataforma deve ser pensada desde o inicio como `white-label leve`, mesmo que a primeira entrega use a marca da Ponto Print.

O ideal e separar o projeto em camadas:

### Camada 1. Core da plataforma

- autenticacao
- multiempresa
- usuarios
- permissoes
- configuracoes por cliente

### Camada 2. Operacao da grafica

- clientes
- estoque
- orcamentos
- pedidos
- financeiro
- relatorios

### Camada 3. Presenca digital

- site institucional
- captacao de leads
- pagina de orcamento
- integracao com canais de atendimento

## Recomendacao tecnica

Uma arquitetura simples, moderna e escalavel:

- frontend web: Next.js
- backend principal: Next.js full-stack ou NestJS
- banco de dados: PostgreSQL
- ORM: Prisma
- autenticacao: Auth.js ou equivalente
- armazenamento de imagens e arquivos: servico compativel com objetos

Se quisermos ganhar velocidade no MVP, da para iniciar com um monolito web moderno com:

- area publica para sites
- area autenticada para operacao interna
- camada de tenants por empresa

## MVP recomendado

### Plataforma

- cadastro de empresa
- cadastro de usuario
- login
- perfil e permissao
- separacao de dados por empresa

### Sistema interno

- cadastro de clientes
- cadastro de insumos, materiais e produtos
- entrada e saida de estoque
- criacao de orcamento
- conversao de orcamento em pedido
- contas a pagar e receber
- fluxo de caixa diario

### Site institucional

- home
- sobre
- servicos
- contato
- formulario de orcamento
- configuracao basica visual por cliente

## Ordem de desenvolvimento

1. Definir o core multiempresa
2. Modelar usuarios, perfis e permissoes
3. Modelar configuracoes do site por cliente
4. Construir os modulos internos do MVP
5. Construir o site institucional base
6. Integrar leads do site com o sistema
7. Validar operacao com a Ponto Print
8. Ajustar para replicacao em outras graficas

## Ponto Print como piloto

A Ponto Print sera usada para:

- validar os modulos
- testar a experiencia real da operacao
- identificar necessidades especificas do segmento
- ajustar o modelo antes da comercializacao

## Informacoes que ainda precisamos confirmar

- quais servicos sao mais comuns entre graficas rapidas alvo
- como o calculo de orcamento costuma funcionar
- se o processo inclui ordem de servico e producao
- quais perfis de usuario cada grafica costuma ter
- quais partes do site cada cliente podera editar sozinho
- se o modelo comercial sera mensalidade, setup ou ambos
