# Setup Inicial

## Estado atual

O projeto ja possui:

- estrutura base do Next.js preparada em arquivos
- schema Prisma inicial
- arquitetura MVC com service layer
- base de multiempresa

## Limitacao atual do ambiente

Neste ambiente, `Node` e `npm` nao estao disponiveis para uso normal no momento. Por isso, a instalacao de dependencias e a execucao do projeto ainda nao puderam ser feitas aqui.

## Passos para subir o projeto quando o ambiente estiver pronto

1. Instalar Node.js em versao LTS
2. Rodar `npm install`
3. Criar o arquivo `.env` a partir de `.env.example`
4. Ajustar a `DATABASE_URL`
5. Rodar `npx prisma generate`
6. Rodar `npx prisma migrate dev`
7. Rodar `npm run prisma:seed`
8. Rodar `npm run dev`

## Ordem recomendada de implementacao

1. autenticacao
2. empresas
3. usuarios e permissoes
4. clientes
5. estoque
6. orcamentos
7. pedidos
8. financeiro
9. configuracao do site por cliente
