-- Multi-tenant preparation: add user_id with default auth.uid() and helpful indexes
-- Replace '00000000-0000-0000-0000-000000000000' with an existing user UUID to backfill if desired.

-- Stocks
alter table if exists public.stocks add column if not exists user_id uuid default auth.uid();
create index if not exists idx_stocks_user_id on public.stocks(user_id);

-- Sells
alter table if exists public.sells add column if not exists user_id uuid default auth.uid();
create index if not exists idx_sells_user_id on public.sells(user_id);

-- Sell Details
alter table if exists public.sell_details add column if not exists user_id uuid default auth.uid();
create index if not exists idx_selldetails_user_id on public.sell_details(user_id);

-- Optional backfill for existing rows (uncomment and set your admin UUID)
-- update public.stocks set user_id = '00000000-0000-0000-0000-000000000000' where user_id is null;
-- update public.sells set user_id = '00000000-0000-0000-0000-000000000000' where user_id is null;
-- update public.sell_details set user_id = '00000000-0000-0000-0000-000000000000' where user_id is null;

