# Site Institucional Configuravel

## O que foi criado

Foi estruturada a base do site configuravel por cliente com:

- configuracao administrativa do site
- cadastro de servicos exibidos
- cadastro de banners
- endpoint publico por slug da grafica
- rota publica preparada para renderizacao por empresa

## Arquivos principais

- `src/repositories/site/site-repository.ts`
- `src/services/site/site-service.ts`
- `src/controllers/site/site-controller.ts`
- `src/app/api/site/settings/route.ts`
- `src/app/api/site/services/route.ts`
- `src/app/api/site/banners/route.ts`
- `src/app/api/public/site/[slug]/route.ts`
- `src/app/(admin)/admin/site/page.tsx`
- `src/app/[slug]/page.tsx`

## O que essa estrutura permite

- configurar identidade visual por empresa
- configurar hero e textos principais
- configurar contato e redes sociais
- configurar servicos
- configurar banners de destaque
- renderizar um site publico por slug

## Papel no produto

Essa camada fecha a proposta da plataforma como:

- sistema interno multiempresa
- site institucional reutilizavel por cliente

## Proximo passo recomendado

1. criar editores reais para configuracao de site
2. ligar a pagina publica ao endpoint dinamico
3. preparar layout institucional final da Ponto Print como piloto
4. integrar lead com cliente e orcamento automatico
