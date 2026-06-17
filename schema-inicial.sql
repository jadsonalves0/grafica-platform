CREATE TABLE companies (
  id UUID PRIMARY KEY,
  legal_name VARCHAR(200) NOT NULL,
  trade_name VARCHAR(200) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  document VARCHAR(30),
  email VARCHAR(200),
  phone VARCHAR(30),
  whatsapp VARCHAR(30),
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
  id UUID PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  email VARCHAR(200) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(30),
  is_platform_admin BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  last_login_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE company_users (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  user_id UUID NOT NULL REFERENCES users(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (company_id, user_id)
);

CREATE TABLE roles (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  name VARCHAR(120) NOT NULL,
  code VARCHAR(120) NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (company_id, code)
);

CREATE TABLE permissions (
  id UUID PRIMARY KEY,
  module VARCHAR(80) NOT NULL,
  action VARCHAR(80) NOT NULL,
  code VARCHAR(120) NOT NULL UNIQUE,
  description VARCHAR(255)
);

CREATE TABLE role_permissions (
  id UUID PRIMARY KEY,
  role_id UUID NOT NULL REFERENCES roles(id),
  permission_id UUID NOT NULL REFERENCES permissions(id),
  UNIQUE (role_id, permission_id)
);

CREATE TABLE company_user_roles (
  id UUID PRIMARY KEY,
  company_user_id UUID NOT NULL REFERENCES company_users(id),
  role_id UUID NOT NULL REFERENCES roles(id),
  UNIQUE (company_user_id, role_id)
);

CREATE TABLE customers (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  name VARCHAR(200) NOT NULL,
  document VARCHAR(30),
  email VARCHAR(200),
  phone VARCHAR(30),
  whatsapp VARCHAR(30),
  address_zip_code VARCHAR(20),
  address_street VARCHAR(200),
  address_number VARCHAR(20),
  address_district VARCHAR(120),
  address_city VARCHAR(120),
  address_state VARCHAR(80),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_categories (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  name VARCHAR(120) NOT NULL,
  type VARCHAR(40) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  category_id UUID REFERENCES product_categories(id),
  name VARCHAR(200) NOT NULL,
  sku VARCHAR(80),
  unit VARCHAR(20) NOT NULL,
  type VARCHAR(40) NOT NULL,
  cost_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  sale_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  minimum_stock NUMERIC(12,3) NOT NULL DEFAULT 0,
  current_stock NUMERIC(12,3) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (company_id, sku)
);

CREATE TABLE stock_movements (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  product_id UUID NOT NULL REFERENCES products(id),
  movement_type VARCHAR(30) NOT NULL,
  quantity NUMERIC(12,3) NOT NULL,
  unit_cost NUMERIC(12,2),
  reference_type VARCHAR(40),
  reference_id UUID,
  notes TEXT,
  created_by_user_id UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE quotes (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  code VARCHAR(60) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  issue_date DATE NOT NULL,
  valid_until DATE,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by_user_id UUID REFERENCES users(id),
  approved_by_user_id UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (company_id, code)
);

CREATE TABLE quote_items (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  quote_id UUID NOT NULL REFERENCES quotes(id),
  product_id UUID REFERENCES products(id),
  description VARCHAR(255) NOT NULL,
  quantity NUMERIC(12,3) NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  total_price NUMERIC(12,2) NOT NULL
);

CREATE TABLE orders (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  quote_id UUID REFERENCES quotes(id),
  code VARCHAR(60) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'open',
  production_status VARCHAR(30) NOT NULL DEFAULT 'pending',
  delivery_date DATE,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by_user_id UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (company_id, code)
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  order_id UUID NOT NULL REFERENCES orders(id),
  product_id UUID REFERENCES products(id),
  description VARCHAR(255) NOT NULL,
  quantity NUMERIC(12,3) NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  total_price NUMERIC(12,2) NOT NULL
);

CREATE TABLE financial_accounts (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  name VARCHAR(120) NOT NULL,
  type VARCHAR(40) NOT NULL,
  initial_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE financial_entries (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  account_id UUID NOT NULL REFERENCES financial_accounts(id),
  customer_id UUID REFERENCES customers(id),
  order_id UUID REFERENCES orders(id),
  quote_id UUID REFERENCES quotes(id),
  entry_type VARCHAR(20) NOT NULL,
  category VARCHAR(80) NOT NULL,
  description VARCHAR(255) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  due_date DATE NOT NULL,
  paid_at TIMESTAMP,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  created_by_user_id UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE site_settings (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL UNIQUE REFERENCES companies(id),
  primary_color VARCHAR(20),
  secondary_color VARCHAR(20),
  accent_color VARCHAR(20),
  logo_url TEXT,
  favicon_url TEXT,
  hero_title VARCHAR(255),
  hero_subtitle TEXT,
  about_text TEXT,
  contact_email VARCHAR(200),
  contact_phone VARCHAR(30),
  contact_whatsapp VARCHAR(30),
  instagram_url TEXT,
  facebook_url TEXT,
  address_full TEXT,
  is_site_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE site_pages (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  page_key VARCHAR(80) NOT NULL,
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(160) NOT NULL,
  meta_title VARCHAR(200),
  meta_description VARCHAR(255),
  content_json TEXT,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (company_id, slug)
);

CREATE TABLE site_services (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  title VARCHAR(160) NOT NULL,
  short_description TEXT,
  image_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE site_banners (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  title VARCHAR(160),
  subtitle TEXT,
  image_url TEXT,
  cta_label VARCHAR(80),
  cta_link TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE site_leads (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id),
  name VARCHAR(200) NOT NULL,
  email VARCHAR(200),
  phone VARCHAR(30),
  whatsapp VARCHAR(30),
  subject VARCHAR(160),
  message TEXT,
  requested_service VARCHAR(160),
  status VARCHAR(30) NOT NULL DEFAULT 'new',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
