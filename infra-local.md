# Infraestrutura Local Necessaria

## Situacao atual do ambiente

O desenvolvimento estrutural do projeto esta avancando normalmente, mas algumas ferramentas locais ainda nao estao disponiveis no terminal atual.

### O que foi identificado

- `node` existe apenas dentro do app e retorna `acesso negado`
- `npm` nao esta disponivel
- `git` nao esta disponivel

## O que isso impacta

Sem essas ferramentas, ainda nao foi possivel:

- instalar dependencias
- gerar o client do Prisma
- rodar migracoes
- subir o projeto
- inicializar versionamento local com Git

## O que precisa ser feito na maquina

Quando voce quiser destravar essa parte, a maquina precisa ter:

1. `Node.js LTS`
2. `npm`
3. `Git`

Todos precisam estar acessiveis no terminal.

## O que continua possivel mesmo assim

Mesmo sem essas ferramentas, foi possivel e continua possivel:

- estruturar arquitetura
- modelar banco
- criar schema Prisma
- criar rotas
- criar services e controllers
- montar telas iniciais
- preparar seed

## Proximo uso dessas ferramentas

Assim que elas estiverem disponiveis, a ordem recomendada e:

1. `npm install`
2. `npx prisma generate`
3. `npx prisma migrate dev`
4. `npm run prisma:seed`
5. `npm run dev`
6. `git init`
