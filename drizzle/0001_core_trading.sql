-- NexoraTrade core application tables.
-- Apply only to the dedicated development Neon branch before production promotion.
CREATE TABLE IF NOT EXISTS demo_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL UNIQUE,
  name text NOT NULL DEFAULT 'Main demo',
  initial_balance numeric(24,8) NOT NULL DEFAULT 100000 CHECK (initial_balance >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS demo_accounts_user_id_idx ON demo_accounts(user_id);

CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL UNIQUE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS market_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES assets(id),
  price numeric(30,12) NOT NULL CHECK (price > 0),
  source text NOT NULL,
  is_stale boolean NOT NULL DEFAULT false,
  quoted_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS market_quotes_asset_time_idx ON market_quotes(asset_id, quoted_at DESC);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES demo_accounts(id),
  asset_id uuid NOT NULL REFERENCES assets(id),
  side text NOT NULL CHECK (side IN ('buy','sell')),
  order_type text NOT NULL CHECK (order_type IN ('market','limit')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','filled','canceled','rejected')),
  quantity numeric(30,12) NOT NULL CHECK (quantity > 0),
  limit_price numeric(30,12),
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT orders_account_idempotency_uq UNIQUE(account_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS orders_account_created_idx ON orders(account_id, created_at DESC);

CREATE TABLE IF NOT EXISTS fills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id),
  quantity numeric(30,12) NOT NULL CHECK (quantity > 0),
  price numeric(30,12) NOT NULL CHECK (price > 0),
  fee numeric(30,12) NOT NULL DEFAULT 0 CHECK (fee >= 0),
  filled_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES demo_accounts(id),
  entry_type text NOT NULL,
  amount numeric(30,12) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  reference_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ledger_entries_account_created_idx ON ledger_entries(account_id, created_at DESC);

CREATE TABLE IF NOT EXISTS positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES demo_accounts(id),
  asset_id uuid NOT NULL REFERENCES assets(id),
  quantity numeric(30,12) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  average_entry_price numeric(30,12) NOT NULL DEFAULT 0 CHECK (average_entry_price >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT positions_account_asset_uq UNIQUE(account_id, asset_id)
);

CREATE TABLE IF NOT EXISTS watchlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  name text NOT NULL DEFAULT 'My watchlist',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS watchlists_user_id_idx ON watchlists(user_id);
CREATE TABLE IF NOT EXISTS watchlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  watchlist_id uuid NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES assets(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT watchlist_items_watch_asset_uq UNIQUE(watchlist_id, asset_id)
);

CREATE TABLE IF NOT EXISTS lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  content text NOT NULL,
  level text NOT NULL DEFAULT 'beginner',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS learning_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  lesson_id uuid NOT NULL REFERENCES lessons(id),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT learning_progress_user_lesson_uq UNIQUE(user_id, lesson_id)
);
CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id text,
  event_type text NOT NULL,
  target_type text,
  target_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_events_created_idx ON audit_events(created_at DESC);

INSERT INTO assets (symbol, name) VALUES
  ('AAPL','Apple Inc.'),
  ('MSFT','Microsoft Corporation'),
  ('NVDA','NVIDIA Corporation'),
  ('TSLA','Tesla, Inc.'),
  ('AMZN','Amazon.com, Inc.'),
  ('GOOGL','Alphabet Inc.'),
  ('META','Meta Platforms, Inc.'),
  ('AMD','Advanced Micro Devices, Inc.'),
  ('SPY','SPDR S&P 500 ETF Trust'),
  ('QQQ','Invesco QQQ Trust'),
  ('BTC-USD','Bitcoin / US Dollar'),
  ('ETH-USD','Ethereum / US Dollar')
ON CONFLICT (symbol) DO NOTHING;

CREATE OR REPLACE FUNCTION execute_demo_market_order(
  p_user_id text,
  p_symbol text,
  p_side text,
  p_quantity numeric,
  p_idempotency_key text,
  p_price numeric,
  p_quote_time bigint,
  p_market_state text
) RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
  v_account demo_accounts%ROWTYPE;
  v_asset assets%ROWTYPE;
  v_order orders%ROWTYPE;
  v_position positions%ROWTYPE;
  v_has_position boolean := false;
  v_cash numeric(30,12);
  v_notional numeric(30,12);
  v_new_quantity numeric(30,12);
  v_new_average numeric(30,12);
  v_realized_pnl numeric(30,12) := 0;
  v_quote_age numeric;
BEGIN
  IF p_user_id IS NULL OR length(p_user_id) = 0 THEN
    RETURN jsonb_build_object('ok',false,'code','UNAUTHORIZED','message','Sign in to use a demo account.');
  END IF;
  IF p_side NOT IN ('buy','sell') OR p_quantity IS NULL OR p_quantity <= 0 OR p_quantity > 1000000 OR p_price IS NULL OR p_price <= 0 THEN
    RETURN jsonb_build_object('ok',false,'code','INVALID_ORDER','message','Order side, quantity, or quote is invalid.');
  END IF;
  IF p_quote_time IS NULL OR p_quote_time <= 0 THEN
    RETURN jsonb_build_object('ok',false,'code','INVALID_QUOTE','message','The provider did not supply a valid quote timestamp.');
  END IF;

  v_quote_age := extract(epoch FROM now()) - p_quote_time;
  IF (upper(coalesce(p_market_state,'')) IN ('REGULAR','PRE','POST') AND v_quote_age > 1800)
     OR (upper(coalesce(p_market_state,'')) NOT IN ('REGULAR','PRE','POST') AND v_quote_age > 129600) THEN
    RETURN jsonb_build_object('ok',false,'code','STALE_QUOTE','message','The market quote is too old to execute a demo order. Refresh the quote and try again.');
  END IF;

  INSERT INTO demo_accounts (user_id, name, initial_balance)
  VALUES (p_user_id, 'Main demo', 100000)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_account FROM demo_accounts WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok',false,'code','ACCOUNT_UNAVAILABLE','message','The demo account could not be created.');
  END IF;

  SELECT * INTO v_order FROM orders
  WHERE account_id = v_account.id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN jsonb_build_object('ok',true,'duplicate',true,'orderId',v_order.id,'status',v_order.status,'symbol',p_symbol,'side',v_order.side,'quantity',v_order.quantity);
  END IF;

  SELECT * INTO v_asset FROM assets WHERE symbol = upper(p_symbol) AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok',false,'code','UNSUPPORTED_SYMBOL','message','This instrument is not enabled for demo trading.');
  END IF;

  INSERT INTO market_quotes(asset_id, price, source, is_stale, quoted_at)
  VALUES (v_asset.id, p_price, 'Yahoo Finance chart data', false, to_timestamp(p_quote_time))
  ON CONFLICT DO NOTHING;

  SELECT * INTO v_position FROM positions
  WHERE account_id = v_account.id AND asset_id = v_asset.id FOR UPDATE;
  v_has_position := FOUND;
  IF NOT v_has_position THEN
    v_position.quantity := 0;
    v_position.average_entry_price := 0;
  END IF;

  SELECT v_account.initial_balance + coalesce(sum(amount), 0) INTO v_cash
  FROM ledger_entries WHERE account_id = v_account.id;
  v_notional := p_quantity * p_price;

  IF p_side = 'buy' AND v_cash < v_notional THEN
    RETURN jsonb_build_object('ok',false,'code','INSUFFICIENT_CASH','message','There is not enough virtual cash for this order.','availableCash',v_cash,'estimatedCost',v_notional);
  END IF;
  IF p_side = 'sell' AND v_position.quantity < p_quantity THEN
    RETURN jsonb_build_object('ok',false,'code','INSUFFICIENT_POSITION','message','You cannot sell more units than your demo account holds.','availableQuantity',v_position.quantity);
  END IF;

  INSERT INTO orders(account_id, asset_id, side, order_type, status, quantity, idempotency_key)
  VALUES(v_account.id, v_asset.id, p_side, 'market', 'filled', p_quantity, p_idempotency_key)
  RETURNING * INTO v_order;

  INSERT INTO fills(order_id, quantity, price, fee)
  VALUES(v_order.id, p_quantity, p_price, 0);

  IF p_side = 'buy' THEN
    v_new_quantity := v_position.quantity + p_quantity;
    v_new_average := ((v_position.quantity * v_position.average_entry_price) + v_notional) / v_new_quantity;
    INSERT INTO positions(account_id, asset_id, quantity, average_entry_price, updated_at)
    VALUES(v_account.id, v_asset.id, v_new_quantity, v_new_average, now())
    ON CONFLICT(account_id, asset_id) DO UPDATE
      SET quantity = excluded.quantity, average_entry_price = excluded.average_entry_price, updated_at = now();
    INSERT INTO ledger_entries(account_id, entry_type, amount, reference_id, metadata)
    VALUES(v_account.id, 'trade_buy', -v_notional, v_order.id,
      jsonb_build_object('symbol',v_asset.symbol,'side',p_side,'quantity',p_quantity,'price',p_price));
  ELSE
    v_new_quantity := v_position.quantity - p_quantity;
    v_realized_pnl := (p_price - v_position.average_entry_price) * p_quantity;
    UPDATE positions SET quantity = v_new_quantity,
      average_entry_price = CASE WHEN v_new_quantity = 0 THEN 0 ELSE average_entry_price END,
      updated_at = now()
    WHERE account_id = v_account.id AND asset_id = v_asset.id;
    INSERT INTO ledger_entries(account_id, entry_type, amount, reference_id, metadata)
    VALUES(v_account.id, 'trade_sell', v_notional, v_order.id,
      jsonb_build_object('symbol',v_asset.symbol,'side',p_side,'quantity',p_quantity,'price',p_price,'realizedPnl',v_realized_pnl));
  END IF;

  SELECT v_account.initial_balance + coalesce(sum(amount), 0) INTO v_cash
  FROM ledger_entries WHERE account_id = v_account.id;

  RETURN jsonb_build_object(
    'ok',true,'duplicate',false,'accountId',v_account.id,'orderId',v_order.id,
    'symbol',v_asset.symbol,'side',p_side,'status','filled','quantity',p_quantity,
    'price',p_price,'notional',v_notional,'realizedPnl',v_realized_pnl,
    'availableCash',v_cash,'positionQuantity',v_new_quantity,
    'quoteTime',p_quote_time,'marketState',p_market_state
  );
END;
$function$;
