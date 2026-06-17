# Versionamento e Publicacao

## Situacao atual

O repositorio Git local ja existe e a base esta pronta para seguir para GitHub, mas ainda nao ha remoto configurado nem primeiro commit consolidado.

## Estrategia recomendada

### Repositorio local

- usar `main` como linha principal
- criar branches por tema
- padronizar prefixos como:
  - `feature/`
  - `fix/`
  - `docs/`
  - `release/`

### Commits

Padrao simples e suficiente:

- `feat: adiciona busca de itens em orcamentos`
- `fix: corrige validacao de cliente`
- `docs: inicia documentacao da plataforma`

### O que nao deve subir

Ja esta protegido no `.gitignore`:

- `node_modules`
- `.next`
- `.env`
- logs

## Fluxo recomendado para GitHub

1. revisar a base local e separar o primeiro marco funcional
2. criar o primeiro commit da plataforma consolidada
3. criar repositorio remoto privado no GitHub
4. conectar o remoto `origin`
5. subir `main`
6. seguir com branches curtas por modulo

## Exemplo de rotina

1. ajustar o modulo
2. revisar localmente
3. criar commit pequeno e claro
4. subir branch
5. abrir pull request
6. homologar
7. mergear em `main`

## Estrutura minima para continuar profissionalmente

- repositorio privado no GitHub
- README principal atualizado
- pasta `docs/`
- changelog ou registro de releases
- backup do banco por ambiente
- definicao de ambientes:
  - local
  - homologacao
  - producao

## O que recomendo fazer amanha

- inicializar ou revisar o repositorio Git local
- subir o projeto para um repositorio privado no GitHub
- criar o primeiro marco como `v0.1.0-piloto`
- registrar bugs e ajustes de homologacao como issues

## Publicacao futura

### Site

O site institucional ja pode seguir para homologacao visual assim que as imagens definitivas e o texto comercial forem revisados.

### Administrativo

O painel ja tem fluxo suficiente para rodada de homologacao, mas ainda deve ir primeiro para ambiente de homologacao antes de qualquer uso operacional mais forte.

## Checklist de publicacao

- banco migrado
- seed revisado
- `.env` separado por ambiente
- build validado
- testes basicos do fluxo completo
- credenciais padrao trocadas
- usuarios de piloto revisados
- remoto GitHub configurado
- primeiro commit consolidado criado
- politica de backup do banco definida
