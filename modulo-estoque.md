# Modulo de Estoque

## O que foi criado

Foi estruturado o modulo de estoque com:

- cadastro de itens
- movimentacao de estoque
- listagem de saldo por item
- historico de movimentacoes

## Arquivos principais

- `src/repositories/inventory/inventory-repository.ts`
- `src/services/inventory/inventory-service.ts`
- `src/controllers/inventory/inventory-controller.ts`
- `src/app/api/inventory/products/route.ts`
- `src/app/api/inventory/movements/route.ts`
- `src/app/(admin)/admin/estoque/page.tsx`
- `src/app/(admin)/admin/estoque/novo/page.tsx`
- `src/app/(admin)/admin/estoque/movimentar/page.tsx`

## Regras de negocio iniciais

- todo item pertence a uma empresa
- estoque so pode ser operado dentro da propria grafica
- saida nao pode deixar saldo negativo
- ajuste define diretamente o saldo atual do item
- entradas e saidas atualizam `current_stock`

## Permissoes envolvidas

- `inventory.view`
- `inventory.create`
- `inventory.update`

## Papel do modulo no produto

O estoque conecta:

- insumos
- produtos finais
- custo operacional
- futura baixa por pedido e producao

## Proximo passo recomendado

1. iniciar o modulo financeiro
2. ou integrar baixa automatica de estoque com pedidos

Para fechar o MVP administrativo, o melhor proximo passo agora costuma ser `financeiro`.
