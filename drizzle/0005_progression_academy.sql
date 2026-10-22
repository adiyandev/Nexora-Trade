-- Progression ledger and seeded beginner lessons for the development environment.
-- Apply only to the dedicated development Neon branch.
CREATE TABLE IF NOT EXISTS xp_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  source text NOT NULL,
  source_id text NOT NULL,
  amount integer NOT NULL CHECK (amount > 0),
  idempotency_key text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT xp_ledger_user_idempotency_uq UNIQUE (user_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS xp_ledger_user_created_idx ON xp_ledger(user_id, created_at DESC);

INSERT INTO lessons (slug, title, content, level)
VALUES
('market-basics', 'How a demo market works', '{"minutes":5,"summary":"Understand what a market quote represents in NexoraTrade.","sections":[{"heading":"A price is a snapshot","body":"A quote is the simulated price of one instrument at a particular time. In NexoraTrade, quotes are generated for practice and do not represent a real exchange."},{"heading":"Price is not profit","body":"Owning an instrument does not guarantee a gain. Your unrealized result changes as the simulated price moves."}],"quiz":{"question":"What do NexoraTrade prices represent?","options":["Guaranteed future value","Simulated prices for practice","Live executable exchange prices"],"answer":1,"explanation":"NexoraTrade uses fictional instruments and simulated prices; it does not connect to a brokerage."},"xp":25}', 'beginner'),
('orders-101', 'Market orders explained', '{"minutes":6,"summary":"Learn how a simulated market order is reviewed and filled.","sections":[{"heading":"Market order","body":"A market order asks the demo engine to buy or sell at its current simulated quote. The eventual fill can differ from the estimate shown during review."},{"heading":"Check before confirming","body":"Review the side, symbol, quantity, estimated value, cash and available position before you confirm. A sell cannot exceed the units you hold."}],"quiz":{"question":"What should you do before confirming a market order?","options":["Ignore the estimated value","Review symbol, side, quantity and available funds","Assume the price cannot change"],"answer":1,"explanation":"Review the order details and account constraints before submitting."},"xp":30}', 'beginner'),
('portfolio-risk', 'Portfolio value and risk', '{"minutes":7,"summary":"Distinguish cash, market value, equity and risk.","sections":[{"heading":"Equity","body":"Portfolio equity is virtual cash plus the current simulated market value of your open positions. Unrealized profit or loss changes with the quote."},{"heading":"Position sizing","body":"Large positions can magnify the impact of price moves. Practise with small sizes and never assume a past result predicts the next one."}],"quiz":{"question":"What is portfolio equity in this demo?","options":["Only the initial balance","Virtual cash plus the market value of open positions","The number of orders submitted"],"answer":1,"explanation":"Equity combines remaining cash and the marked value of open positions."},"xp":35}', 'beginner'),
('limit-vs-market', 'Market vs. limit orders', '{"minutes":6,"summary":"Compare immediate execution requests with price-constrained orders.","sections":[{"heading":"Market order","body":"A market order prioritizes execution at the current simulated quote; the fill price may vary."},{"heading":"Limit order","body":"A limit order specifies a price boundary. It may remain unfilled if the market never reaches that price. NexoraTrade currently supports simulated market orders only; limit-order controls are not enabled yet."}],"quiz":{"question":"Why might a limit order remain unfilled?","options":["Its price condition was never reached","It always executes instantly","It has no price"],"answer":0,"explanation":"A limit order is conditional and may not execute when its limit is not reached."},"xp":30}', 'beginner')
ON CONFLICT (slug) DO NOTHING;
