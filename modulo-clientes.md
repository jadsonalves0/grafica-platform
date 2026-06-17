# Modulo de Clientes

## O que foi criado

Foi estruturado o modulo de clientes no mesmo padrao da plataforma:

- DTOs
- validacao
- repository
- service
- controller
- rotas de API
- telas iniciais da area interna

## Arquivos principais

- `src/repositories/customers/customer-repository.ts`
- `src/services/customers/customer-service.ts`
- `src/controllers/customers/customer-controller.ts`
- `src/app/api/customers/route.ts`
- `src/app/api/customers/[customerId]/route.ts`
- `src/app/(admin)/admin/clientes/page.tsx`
- `src/app/(admin)/admin/clientes/novo/page.tsx`

## Operacoes previstas

- criar cliente
- listar clientes
- buscar cliente por id
- atualizar cliente
- excluir cliente

## Regras importantes

- todo cliente pertence a uma empresa
- acesso depende de permissao
- usuarios comuns so operam dentro da propria grafica
- plataforma pode atravessar empresas quando autorizado

## Permissoes envolvidas

- `customers.view`
- `customers.create`
- `customers.update`
- `customers.delete`

## Papel do modulo no produto

O cadastro de clientes passa a ser base para:

- orcamentos
- pedidos
- contas a receber
- historico comercial

## Proximo passo recomendado

1. iniciar o modulo de orcamentos
2. ou iniciar o modulo de estoque

Para a operacao da grafica, o melhor proximo passo costuma ser `orcamentos`, porque ele conecta atendimento, cliente e faturamento.
