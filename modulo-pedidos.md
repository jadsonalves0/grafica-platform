# Modulo de Pedidos

## O que foi criado

Foi estruturado o modulo de pedidos com:

- DTOs
- validacao
- repository
- service
- controller
- rotas de API
- telas iniciais da area interna

## Arquivos principais

- `src/repositories/orders/order-repository.ts`
- `src/services/orders/order-service.ts`
- `src/controllers/orders/order-controller.ts`
- `src/app/api/orders/route.ts`
- `src/app/api/orders/[orderId]/route.ts`
- `src/app/api/orders/[orderId]/status/route.ts`
- `src/app/(admin)/admin/pedidos/page.tsx`
- `src/app/(admin)/admin/pedidos/novo/page.tsx`

## Regras de negocio iniciais

- pedido pode nascer de orcamento aprovado
- pedido tambem pode ser criado manualmente
- pedido manual exige cliente e itens
- total do pedido e calculado no service
- pedido concluido nao pode ser editado
- status operacional e status de producao ficam separados

## Operacoes previstas

- criar pedido
- listar pedidos
- buscar pedido por id
- atualizar pedido
- atualizar status do pedido

## Permissoes envolvidas

- `orders.view`
- `orders.create`
- `orders.update`
- `orders.manage_status`

## Papel do modulo no produto

O pedido conecta:

- orcamento aprovado
- producao
- prazo
- entrega
- futura baixa financeira

## Proximo passo recomendado

1. iniciar o modulo de estoque
2. ou iniciar o modulo financeiro

Para a operacao da grafica, o melhor passo seguinte agora costuma ser `estoque`, porque ele conversa com pedido, insumo e custo.
