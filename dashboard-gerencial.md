# Dashboard Gerencial

## O que foi criado

Foi estruturada a base do dashboard gerencial para consolidar os modulos do MVP em uma visao unica.

## Arquivos principais

- `src/repositories/dashboard/dashboard-repository.ts`
- `src/services/dashboard/dashboard-service.ts`
- `src/controllers/dashboard/dashboard-controller.ts`
- `src/app/api/dashboard/summary/route.ts`
- `src/app/(admin)/dashboard/page.tsx`

## Indicadores iniciais

- quantidade de clientes
- orcamentos em rascunho
- orcamentos aprovados
- pedidos em aberto
- pedidos em producao
- itens com estoque baixo
- receita pendente
- despesa pendente
- saldo projetado

## Papel do dashboard

O painel passa a entregar uma leitura gerencial mais rapida para:

- dono da grafica
- administrativo
- comercial
- financeiro

## Proximo passo recomendado

1. integrar baixa automatica de estoque por pedido
2. gerar contas a receber a partir de pedido ou faturamento
3. evoluir o site institucional configuravel por cliente

## Estado atual do projeto

A base arquitetural do MVP administrativo ja cobre:

- autenticacao e sessao
- usuarios, papeis e permissoes
- clientes
- orcamentos
- pedidos
- estoque
- financeiro
- dashboard gerencial
