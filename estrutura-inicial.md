# Estrutura Inicial do Projeto

## O que foi preparado

Esta base inicial ja deixa o projeto orientado para:

- PostgreSQL com Prisma
- arquitetura MVC com service layer
- multiempresa
- separacao entre site publico e sistema interno

## Arquivos criados

### Banco e modelagem

- `prisma/schema.prisma`
- `schema-inicial.sql`
- `modelagem-banco.md`

### Arquitetura

- `arquitetura-plataforma.md`
- `estrutura-inicial.md`

### Base tecnica do codigo

- `src/lib/db/prisma.ts`
- `src/lib/tenant/tenant-context.ts`
- `src/lib/permissions/permission-types.ts`
- `src/controllers/base/base-controller.ts`
- `src/controllers/companies/company-controller.ts`
- `src/services/base/base-service.ts`
- `src/services/companies/company-service.ts`
- `src/repositories/base/tenant-repository.ts`
- `src/repositories/companies/company-repository.ts`

## Como essa base se organiza

### prisma

Guarda a definicao oficial do banco de dados.

### src/lib

Guarda infraestrutura compartilhada, como:

- conexao com banco
- contexto da empresa
- regras base de permissao

### src/controllers

Recebem a requisicao e devolvem resposta.

### src/services

Aplicam a regra de negocio.

### src/repositories

Centralizam o acesso ao banco com Prisma.

## Beneficio desta escolha

Essa estrutura evita que a regra do negocio fique espalhada nas telas ou nas rotas. Isso sera importante quando o sistema crescer para:

- mais modulos
- mais usuarios
- mais clientes
- mais personalizacao de site

## Proximo passo recomendado

1. inicializar o projeto web com Next.js e TypeScript
2. instalar Prisma e dependencias
3. conectar com PostgreSQL
4. gerar o client Prisma
5. criar o modulo de autenticacao
6. criar o modulo de empresas, usuarios e permissoes
