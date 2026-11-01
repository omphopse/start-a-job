-- Apply after 202610300001_initial.sql. Existing jobs are preserved.
begin;
alter table public.jobs drop constraint jobs_experience_level_check;
alter table public.jobs add constraint jobs_experience_level_check check (experience_level in ('fresher','0-1','1-3','3-5','5-6','6-9','10-14','15+'));
create table public.categories (name text primary key check(length(trim(name)) between 2 and 80));
alter table public.categories enable row level security;
create policy categories_read on public.categories for select using (true);
create policy categories_admin_insert on public.categories for insert to authenticated with check (public.is_admin());
grant select on public.categories to anon, authenticated;
grant insert on public.categories to authenticated;
grant all on public.categories to service_role;
insert into public.categories(name) values
('Data entry'),
('Customer support'),
('Accounts'),
('HR'),
('Administration'),
('Government'),
('Software Development'),
('Frontend Development'),
('Backend Development'),
('Full Stack Development'),
('Mobile Development'),
('QA and Testing'),
('DevOps'),
('Cloud Engineering'),
('Cybersecurity'),
('Data Analytics'),
('Data Science'),
('AI and Machine Learning'),
('Database Administration'),
('Network Engineering'),
('IT Support'),
('UI and UX Design'),
('Product Management'),
('Business Analysis'),
('Embedded Systems'),
('Game Development'),
('Technical Writing'),
('IT Consulting')
on conflict do nothing;
insert into public.categories(name) select distinct category from public.jobs on conflict do nothing;
alter table public.jobs add constraint jobs_category_fkey foreign key(category) references public.categories(name);
commit;
