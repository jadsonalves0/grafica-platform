# Modulo de Orcamentos

## O que foi criado

Foi estruturado o modulo de orcamentos com:

- DTOs
- validacao
- repository
- service
- controller
- rotas de API
- telas iniciais da area interna

## Arquivos principais

- `src/repositories/quotes/quote-repository.ts`
- `src/services/quotes/quote-service.ts`
- `src/controllers/quotes/quote-controller.ts`
- `src/app/api/quotes/route.ts`
- `src/app/api/quotes/[quoteId]/route.ts`
- `src/app/api/quotes/[quoteId]/approve/route.ts`
- `src/app/(admin)/admin/orcamentos/page.tsx`
- `src/app/(admin)/admin/orcamentos/novo/page.tsx`

## Regras de negocio iniciais

- todo orcamento pertence a uma empresa
- todo orcamento pertence a um cliente
- itens podem ser livres ou vinculados a produto
- subtotal e total sao calculados no service
- desconto nao pode ser maior que o subtotal
- orcamento aprovado nao pode ser editado nem excluido

## Operacoes previstas

- criar orcamento
- listar orcamentos
- buscar orcamento por id
- atualizar orcamento
- aprovar orcamento
- excluir orcamento

## Permissoes envolvidas

- `quotes.view`
- `quotes.create`
- `quotes.update`
- `quotes.delete`
- `quotes.approve`

## Papel do modulo no produto

O orcamento passa a conectar:

- cliente
- atendimento comercial
- futura conversao em pedido
- futura geracao de contas a receber

## Proximo passo recomendado

1. iniciar o modulo de pedidos
2. ou iniciar o modulo de estoque

Para a operacao completa da grafica, o melhor passo seguinte costuma ser `pedidos`, porque ele recebe os orcamentos aprovados e empurra o fluxo para producao.
