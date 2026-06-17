# Seed Inicial da Plataforma

## Objetivo

Este seed foi criado para deixar o ambiente inicial da plataforma pronto com:

- permissoes base
- perfis padrao do sistema
- empresa piloto da Ponto Print
- usuario administrador da Ponto Print
- usuario administrador da plataforma

## Arquivo principal

- `prisma/seed.mjs`

## O que o seed cadastra

### Permissoes

- `companies.view`
- `companies.create`
- `companies.update`
- `users.view`
- `users.create`
- `customers.view`
- `customers.create`
- `inventory.view`
- `inventory.update`
- `quotes.view`
- `quotes.create`
- `quotes.approve`
- `financial.view`
- `financial.manage`
- `site.view`
- `site.update`

### Perfis do sistema

- `platform_admin`
- `company_admin`
- `sales`
- `financial`
- `inventory`
- `production`

### Empresas

- `ponto-print`
- `graficaplatform-core`

### Usuarios iniciais

- `admin@pontoprint.local`
- `platform.admin@graficaplatform.local`

## Senha inicial provisoria

Os usuarios iniciais recebem:

- `Trocar123!`

Essa senha e apenas de bootstrap e deve ser trocada assim que o projeto estiver rodando em ambiente real.

## Como executar

Quando `Node` e `npm` estiverem funcionando no ambiente:

1. rodar `npm install`
2. rodar `npx prisma generate`
3. rodar `npm run prisma:seed`

## Observacoes importantes

- o seed foi feito com `upsert`, entao pode ser executado novamente sem duplicar os registros principais
- o hash de senha atual ainda e provisorio e acompanha o estado atual da arquitetura
- quando o hasher real for implantado, o seed deve ser ajustado para seguir o mesmo padrao seguro
