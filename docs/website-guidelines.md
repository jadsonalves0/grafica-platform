# Website Guidelines

## Objetivo

Este documento registra o padrao atual do website publico da `Grafica Platform` para que a home continue comercial, configuravel por empresa e separada do painel administrativo.

## Escopo atual

A versao `Website Experience 1.0` cobre:

- home publica comercial
- configuracao guiada pelo painel
- preview desktop e mobile
- rascunho separado de publicacao
- captacao de leads
- CTA de WhatsApp
- SEO basico
- responsividade
- acessibilidade essencial

Esta versao nao cobre:

- e-commerce
- pagamento online
- blog
- login de cliente
- editor drag-and-drop
- portfolio completo com filtros
- uploads complexos de arquivos

## Estrutura da home

A home publica deve seguir esta ordem:

1. cabecalho publico
2. hero principal
3. diferenciais
4. servicos em destaque
5. como funciona
6. prova visual
7. chamada final de conversao
8. formulario de lead e contato
9. rodape

## Linguagem visual

O website deve transmitir:

- criatividade
- agilidade
- confianca
- proximidade
- acabamento profissional

Direcao visual recomendada:

- fundo neutro claro
- cards brancos
- sombras discretas
- cantos arredondados
- imagens reais ou mockups de produtos graficos
- referencias leves a papel, camadas, recortes e impressao
- destaque de cor concentrado em CTAs

Evitar:

- template generico
- excesso de gradientes
- muitos blocos identicos
- carrossel automatico agressivo
- animacoes pesadas
- depoimentos ou projetos inventados

## Campos configuraveis

O fluxo administrativo de `Meu site` esta dividido em:

1. Identidade
2. Pagina inicial
3. Servicos
4. Contato
5. Revisar e publicar

### Identidade

- cores principais
- logotipo
- favicon

### Pagina inicial

- titulo do hero
- subtitulo do hero
- texto de apoio da marca
- imagem principal
- `eyebrow` do hero
- CTA principal
- CTA secundario
- titulo da secao de servicos
- titulo da secao de diferenciais
- ate quatro diferenciais
- titulo da secao `Como funciona`
- tres passos configuraveis
- titulo da prova visual
- mensagem de estado vazio da prova visual
- titulo e texto da chamada final
- titulo da secao de contato
- horario de atendimento
- texto do botao de WhatsApp
- `meta title`
- `meta description`
- imagem social

### Servicos

- titulo
- descricao curta
- imagem
- ordem
- ativo ou inativo

### Contato

- WhatsApp
- telefone
- e-mail
- endereco
- Instagram
- Facebook
- mapa incorporado, quando configurado

## Publicacao

O website usa dois estados internos:

- `HOME_DRAFT`: rascunho atual do painel
- `HOME`: snapshot publicado consumido pelo `slug`

Regras:

- `Salvar rascunho` nao altera o site publico
- `Publicar alteracoes` cria ou atualiza o snapshot publicado
- a pre-visualizacao usa o mesmo componente do site publico, mas alimentado com dados de rascunho
- o `slug` publico deve ler apenas o snapshot publicado

Antes de publicar, validar:

- titulo principal
- CTA principal
- pelo menos um servico ativo
- canal de contato
- `slug`

## Leads e conversao

O formulario publico trabalha com:

- nome
- WhatsApp
- e-mail opcional
- servico desejado
- mensagem

Regras:

- o servico clicado na home deve chegar preenchido ao formulario
- o lead deve ser salvo com origem `website`
- o lead deve registrar a URL da pagina e o caminho visitado
- o lead deve registrar `utm_source`, `utm_medium`, `utm_campaign`, `utm_content` e `utm_term` quando presentes
- o WhatsApp deve aparecer apenas quando configurado
- a mensagem de sucesso deve orientar o retorno da equipe
- a mensagem de sucesso deve exibir uma referencia curta quando possivel
- os dados nao devem ser apagados em caso de erro

## Regras de imagem

- usar `next/image`
- reservar espaco da imagem para evitar `layout shift`
- lazy loading abaixo da dobra
- texto alternativo em imagens relevantes
- placeholder elegante quando nao houver imagem
- nao carregar todas as imagens no primeiro render

Quando nao houver imagens suficientes:

- reaproveitar banners e servicos
- exibir mensagem orientando o administrador apenas na pre-visualizacao, nao no site publicado

## SEO

O website publicado deve revisar:

- `title`
- `meta description`
- `canonical`
- `Open Graph`
- imagem social
- favicon
- headings em ordem
- `robots`
- `sitemap`
- `LocalBusiness`, quando houver dados suficientes

## Performance

Diretrizes atuais:

- preferir `Server Components`
- usar `Client Components` apenas nas interacoes do formulario e do configurador
- evitar bibliotecas pesadas de animacao
- otimizar imagens
- nao carregar codigo administrativo no website publico

## Acessibilidade

Validar:

- foco visivel
- navegacao por teclado
- contraste
- landmarks
- labels corretos no formulario
- mensagens de erro compreensiveis
- CTA com nomes claros
- menu mobile acessivel
- ausencia de rolagem horizontal em `360px`

## Pendencias conhecidas fora desta rodada

Estas pendencias pertencem ao painel administrativo e nao devem contaminar a branch do website:

- revisar a solucao final de navegacao hibrida do painel
- reorganizar melhor campos da tela de `Vendas`
- concluir acabamento fino de formularios longos do painel
