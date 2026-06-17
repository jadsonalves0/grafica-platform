# Modelagem Inicial do Banco de Dados

## Objetivo

Esta modelagem foi pensada para uma plataforma SaaS de graficas rapidas com:

- multiempresa
- usuarios e permissoes
- sistema interno
- site institucional configuravel por cliente

A `Ponto Print` sera o piloto, mas a estrutura deve servir para qualquer grafica rapida.

## Principios da modelagem

- toda entidade de negocio pertence a uma empresa
- usuarios podem existir na plataforma e ser vinculados a uma ou mais empresas
- permissoes devem controlar acesso por modulo e por acao
- o site institucional deve carregar configuracoes por empresa
- leads e pedidos vindos do site devem entrar vinculados a empresa correta

## Entidades principais

### Core da plataforma

- companies
- users
- company_users
- roles
- permissions
- role_permissions
- company_user_roles

### Operacao interna

- customers
- product_categories
- products
- stock_movements
- quotes
- quote_items
- orders
- order_items
- financial_accounts
- financial_entries

### Site institucional

- site_settings
- site_pages
- site_services
- site_banners
- site_leads

## Tabelas do core

### companies

Representa cada grafica cliente da plataforma.

Campos principais:

- id
- legal_name
- trade_name
- slug
- document
- email
- phone
- whatsapp
- status
- created_at
- updated_at

Observacoes:

- `slug` pode ser usado em subdominio, rota publica ou identificacao da empresa
- `status` pode ter valores como active, trial, suspended, canceled

### users

Representa usuarios globais da plataforma.

Campos principais:

- id
- name
- email
- password_hash
- phone
- is_platform_admin
- status
- last_login_at
- created_at
- updated_at

### company_users

Relaciona usuarios as empresas.

Campos principais:

- id
- company_id
- user_id
- is_active
- created_at

Observacoes:

- um usuario pode participar de mais de uma empresa
- cada grafica controla quais usuarios estao ativos no seu ambiente

### roles

Perfis de acesso.

Campos principais:

- id
- company_id nullable
- name
- code
- is_system
- created_at

Observacoes:

- papeis globais podem ter `company_id` nulo
- papeis personalizados da empresa devem ficar vinculados ao `company_id`

### permissions

Catalogo de permissoes disponiveis.

Campos principais:

- id
- module
- action
- code
- description

Exemplos:

- customers.view
- customers.create
- customers.update
- customers.delete
- quotes.approve
- financial.view

### role_permissions

Relaciona papeis com permissoes.

Campos principais:

- id
- role_id
- permission_id

### company_user_roles

Relaciona cada usuario da empresa aos papeis recebidos.

Campos principais:

- id
- company_user_id
- role_id

## Tabelas operacionais

### customers

Clientes finais da grafica.

Campos principais:

- id
- company_id
- name
- document
- email
- phone
- whatsapp
- address_zip_code
- address_street
- address_number
- address_district
- address_city
- address_state
- notes
- created_at
- updated_at

### product_categories

Categorias de itens.

Campos principais:

- id
- company_id
- name
- type
- created_at

Exemplos de `type`:

- raw_material
- service
- finished_product

### products

Itens vendidos, produzidos ou consumidos.

Campos principais:

- id
- company_id
- category_id
- name
- sku
- unit
- type
- cost_price
- sale_price
- minimum_stock
- current_stock
- is_active
- created_at
- updated_at

Observacoes:

- `type` ajuda a separar insumo, servico e produto final
- `current_stock` pode ser mantido por performance, com auditoria em `stock_movements`

### stock_movements

Historico completo de movimentacao de estoque.

Campos principais:

- id
- company_id
- product_id
- movement_type
- quantity
- unit_cost
- reference_type
- reference_id
- notes
- created_by_user_id
- created_at

Exemplos de `movement_type`:

- input
- output
- adjustment

Exemplos de `reference_type`:

- manual
- quote
- order
- purchase

### quotes

Orcamentos emitidos pela grafica.

Campos principais:

- id
- company_id
- customer_id
- code
- status
- issue_date
- valid_until
- subtotal
- discount_amount
- total_amount
- notes
- created_by_user_id
- approved_by_user_id nullable
- created_at
- updated_at

Exemplos de `status`:

- draft
- sent
- approved
- rejected
- expired

### quote_items

Itens do orcamento.

Campos principais:

- id
- company_id
- quote_id
- product_id nullable
- description
- quantity
- unit_price
- total_price

Observacoes:

- `product_id` pode ser nulo para servicos avulsos ou itens personalizados

### orders

Pedidos gerados a partir de orcamentos aprovados ou criados diretamente.

Campos principais:

- id
- company_id
- customer_id
- quote_id nullable
- code
- status
- production_status
- delivery_date nullable
- total_amount
- notes
- created_by_user_id
- created_at
- updated_at

Exemplos de `status`:

- open
- in_progress
- completed
- canceled

### order_items

Itens do pedido.

Campos principais:

- id
- company_id
- order_id
- product_id nullable
- description
- quantity
- unit_price
- total_price

### financial_accounts

Contas ou caixas da empresa.

Campos principais:

- id
- company_id
- name
- type
- initial_balance
- is_active
- created_at

Exemplos de `type`:

- cash
- bank
- digital_wallet

### financial_entries

Lancamentos financeiros.

Campos principais:

- id
- company_id
- account_id
- customer_id nullable
- order_id nullable
- quote_id nullable
- entry_type
- category
- description
- amount
- due_date
- paid_at nullable
- status
- created_by_user_id
- created_at
- updated_at

Exemplos:

- `entry_type`: income, expense
- `status`: pending, paid, overdue, canceled

## Tabelas do site institucional

### site_settings

Configuracoes gerais do site por empresa.

Campos principais:

- id
- company_id
- primary_color
- secondary_color
- accent_color
- logo_url
- favicon_url
- hero_title
- hero_subtitle
- about_text
- contact_email
- contact_phone
- contact_whatsapp
- instagram_url
- facebook_url
- address_full
- is_site_published
- created_at
- updated_at

### site_pages

Conteudo editavel por pagina.

Campos principais:

- id
- company_id
- page_key
- title
- slug
- meta_title
- meta_description
- content_json
- is_published
- updated_at

Observacoes:

- `page_key` pode ter valores como home, about, services, contact
- `content_json` ajuda a permitir flexibilidade futura

### site_services

Lista de servicos exibidos no site.

Campos principais:

- id
- company_id
- title
- short_description
- image_url
- sort_order
- is_active

### site_banners

Banners e destaques da home.

Campos principais:

- id
- company_id
- title
- subtitle
- image_url
- cta_label
- cta_link
- sort_order
- is_active

### site_leads

Leads e pedidos de contato vindos do site.

Campos principais:

- id
- company_id
- name
- email
- phone
- whatsapp
- subject
- message
- requested_service
- status
- created_at

Exemplos de `status`:

- new
- contacted
- converted
- archived

## Relacionamentos principais

```text
companies 1:N company_users
users 1:N company_users

roles 1:N role_permissions
permissions 1:N role_permissions

company_users 1:N company_user_roles
roles 1:N company_user_roles

companies 1:N customers
companies 1:N products
companies 1:N quotes
companies 1:N orders
companies 1:N financial_entries
companies 1:1 site_settings
companies 1:N site_pages
companies 1:N site_services
companies 1:N site_leads

customers 1:N quotes
customers 1:N orders

quotes 1:N quote_items
orders 1:N order_items

products 1:N stock_movements
products 1:N quote_items
products 1:N order_items
```

## Regras obrigatorias de multiempresa

- toda tabela de negocio deve ter `company_id`
- toda consulta autenticada deve filtrar por `company_id`
- toda chave unica de negocio deve considerar o contexto da empresa quando necessario
- administradores da plataforma podem atravessar empresas, usuarios comuns nao
- arquivos e imagens tambem devem ser segregados por empresa

## Campos padrao recomendados

Para quase todas as tabelas, vale padronizar:

- id
- created_at
- updated_at
- deleted_at nullable, se houver exclusao logica

## Indices recomendados

- companies.slug unique
- users.email unique
- company_users unique company_id + user_id
- roles unique company_id + code
- permissions.code unique
- products unique company_id + sku
- quotes unique company_id + code
- orders unique company_id + code
- site_pages unique company_id + slug

## Decisoes boas para o MVP

- comecar com RBAC simples: usuarios recebem papeis, e papeis recebem permissoes
- manter `current_stock` e tambem historico de movimentacao
- salvar configuracao do site por empresa desde o inicio
- permitir itens livres em orcamentos para nao travar operacoes reais da grafica

## Pontos para a proxima etapa

1. transformar esta modelagem em diagrama ER
2. converter as tabelas para schema Prisma
3. definir enums oficiais de status e tipos
4. desenhar as regras de permissao por tela
5. estruturar a navegacao inicial do sistema e do site
