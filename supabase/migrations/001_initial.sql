-- Wallets table for Circle wallet tracking
CREATE TABLE wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  circle_wallet_id TEXT,
  wallet_set_id TEXT,
  address TEXT,
  type TEXT DEFAULT 'sca',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transaction history
CREATE TABLE transaction_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  chain TEXT,
  tx_type TEXT,
  amount NUMERIC,
  tx_hash TEXT,
  gateway_wallet_address TEXT,
  status TEXT DEFAULT 'pending',
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- EOA signer wallets
CREATE TABLE eoa_wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id TEXT,
  address TEXT,
  chain TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
