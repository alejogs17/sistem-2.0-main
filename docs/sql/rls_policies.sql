-- Enable Row Level Security (RLS) and add baseline policies.
-- Adjust these to your multi-tenant model as needed.

-- Categories
alter table if exists public.categories enable row level security;
drop policy if exists categories_select on public.categories;
drop policy if exists categories_insert on public.categories;
drop policy if exists categories_update on public.categories;
drop policy if exists categories_delete on public.categories;
create policy categories_select on public.categories for select to authenticated using (true);
create policy categories_insert on public.categories for insert to authenticated with check (true);
create policy categories_update on public.categories for update to authenticated using (true) with check (true);
create policy categories_delete on public.categories for delete to authenticated using (true);

-- Vendors
alter table if exists public.vendors enable row level security;
drop policy if exists vendors_select on public.vendors;
drop policy if exists vendors_insert on public.vendors;
drop policy if exists vendors_update on public.vendors;
drop policy if exists vendors_delete on public.vendors;
create policy vendors_select on public.vendors for select to authenticated using (true);
create policy vendors_insert on public.vendors for insert to authenticated with check (true);
create policy vendors_update on public.vendors for update to authenticated using (true) with check (true);
create policy vendors_delete on public.vendors for delete to authenticated using (true);

-- Products
alter table if exists public.products enable row level security;
drop policy if exists products_select on public.products;
drop policy if exists products_insert on public.products;
drop policy if exists products_update on public.products;
drop policy if exists products_delete on public.products;
create policy products_select on public.products for select to authenticated using (true);
create policy products_insert on public.products for insert to authenticated with check (true);
create policy products_update on public.products for update to authenticated using (true) with check (true);
create policy products_delete on public.products for delete to authenticated using (true);

-- Customers
alter table if exists public.customers enable row level security;
drop policy if exists customers_select on public.customers;
drop policy if exists customers_insert on public.customers;
drop policy if exists customers_update on public.customers;
drop policy if exists customers_delete on public.customers;
create policy customers_select on public.customers for select to authenticated using (true);
create policy customers_insert on public.customers for insert to authenticated with check (true);
create policy customers_update on public.customers for update to authenticated using (true) with check (true);
create policy customers_delete on public.customers for delete to authenticated using (true);

-- Stocks (assumes a user_id column present)
alter table if exists public.stocks enable row level security;
drop policy if exists stocks_select on public.stocks;
drop policy if exists stocks_insert on public.stocks;
drop policy if exists stocks_update on public.stocks;
drop policy if exists stocks_delete on public.stocks;
create policy stocks_select on public.stocks for select to authenticated using (coalesce(user_id, auth.uid()) = auth.uid());
create policy stocks_insert on public.stocks for insert to authenticated with check (coalesce(user_id, auth.uid()) = auth.uid());
create policy stocks_update on public.stocks for update to authenticated using (coalesce(user_id, auth.uid()) = auth.uid()) with check (coalesce(user_id, auth.uid()) = auth.uid());
create policy stocks_delete on public.stocks for delete to authenticated using (coalesce(user_id, auth.uid()) = auth.uid());

-- Sells (assumes a user_id column present)
alter table if exists public.sells enable row level security;
drop policy if exists sells_select on public.sells;
drop policy if exists sells_insert on public.sells;
drop policy if exists sells_update on public.sells;
drop policy if exists sells_delete on public.sells;
create policy sells_select on public.sells for select to authenticated using (coalesce(user_id, auth.uid()) = auth.uid());
create policy sells_insert on public.sells for insert to authenticated with check (coalesce(user_id, auth.uid()) = auth.uid());
create policy sells_update on public.sells for update to authenticated using (coalesce(user_id, auth.uid()) = auth.uid()) with check (coalesce(user_id, auth.uid()) = auth.uid());
create policy sells_delete on public.sells for delete to authenticated using (coalesce(user_id, auth.uid()) = auth.uid());

-- Sell Details (assumes a user_id column present)
alter table if exists public.sell_details enable row level security;
drop policy if exists selldetails_select on public.sell_details;
drop policy if exists selldetails_insert on public.sell_details;
drop policy if exists selldetails_update on public.sell_details;
drop policy if exists selldetails_delete on public.sell_details;
create policy selldetails_select on public.sell_details for select to authenticated using (coalesce(user_id, auth.uid()) = auth.uid());
create policy selldetails_insert on public.sell_details for insert to authenticated with check (coalesce(user_id, auth.uid()) = auth.uid());
create policy selldetails_update on public.sell_details for update to authenticated using (coalesce(user_id, auth.uid()) = auth.uid()) with check (coalesce(user_id, auth.uid()) = auth.uid());
create policy selldetails_delete on public.sell_details for delete to authenticated using (coalesce(user_id, auth.uid()) = auth.uid());

-- Notes:
-- 1) If you don't use per-user scoping (no user_id column), replace the USING/CHECK clause with (true)
--    to allow all authenticated users to read/write.
-- 2) Ensure your JWT contains the user id (default in Supabase) and your client uses the anon key with RLS enabled.

