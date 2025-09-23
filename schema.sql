-- schema.sql for Budgeasy (PostgreSQL)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email varchar(320) NOT NULL UNIQUE,
  password_hash varchar(255) NOT NULL,
  name varchar(120),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  name varchar(80) NOT NULL,
  icon varchar(200),
  color varchar(7) DEFAULT '#06B6D4',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  type varchar(10) NOT NULL CHECK (type IN ('expense','income')),
  amount numeric(12,2) NOT NULL,
  date timestamptz NOT NULL,
  category_id uuid REFERENCES categories(id),
  method varchar(40),
  note varchar(500),
  attachment_url varchar(500),
  recurring_rule jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE budgets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id),
  month date,
  amount numeric(12,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, category_id, month)
);

CREATE INDEX idx_transactions_user_date ON transactions (user_id, date);
CREATE INDEX idx_transactions_user_category ON transactions (user_id, category_id);
