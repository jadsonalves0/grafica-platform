# Versionamento e Publicacao

## Situacao atual

O projeto ja esta conectado ao GitHub em:

- `https://github.com/jadsonalves0/grafica-platform`

A branch principal atual e:

- `main`

## Estrategia recomendada

### Estrategia de branches

- usar `main` como linha principal
- criar branches por tema
- padronizar prefixos como:
  - `feature/`
  - `fix/`
  - `docs/`
  - `release/`

Exemplos:

- `feature/entrada-por-documento`
- `fix/estoque-fifo-venda`
- `docs/roteiro-homologacao`

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
2. criar commits pequenos por bloco funcional
3. criar branch curta para cada frente
4. subir a branch para o GitHub
5. homologar
6. mergear em `main`

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

## Rotina minima recomendada

1. atualizar a branch local:
   - `git pull`
2. criar uma branch de trabalho:
   - `git checkout -b feature/nome-da-melhoria`
3. implementar um bloco pequeno
4. validar:
   - `npm run lint`
   - `npx tsc --noEmit`
5. salvar:
   - `git add .`
   - `git commit -m "feat: descricao objetiva"`
6. publicar:
   - `git push -u origin feature/nome-da-melhoria`

## Convencao simples de commits

- `feat:` nova funcionalidade
- `fix:` correcao de bug
- `refactor:` reorganizacao interna sem mudar regra
- `docs:` documentacao
- `chore:` ajuste tecnico ou operacional

## Releases sugeridas

Para nao complicar nesta fase, use marcos simples:

- `v0.1.0` base operacional inicial
- `v0.2.0` entradas, FIFO e venda rapida
- `v0.3.0` relatorios, dashboard e website refinado

Quando quiser marcar uma versao:

- `git tag v0.1.0`
- `git push origin v0.1.0`

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
