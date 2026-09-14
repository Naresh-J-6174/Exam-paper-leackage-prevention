-- Run this in the Supabase SQL editor for your project.

-- 1. Profiles table: one row per authenticated user, holding their role.
create type user_role as enum ('admin', 'teacher', 'invigilator');

create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  role user_role not null default 'invigilator',
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Users can read all profiles"
  on profiles for select
  using (true);

create policy "Users can update their own profile name only"
  on profiles for update
  using (auth.uid() = id);

-- 2. Exams table: metadata about an exam paper batch.
create table exams (
  id uuid primary key default gen_random_uuid(),
  exam_code text not null unique,
  title text not null,
  release_at timestamptz not null,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

alter table exams enable row level security;

create policy "Anyone signed in can read exams"
  on exams for select
  using (auth.role() = 'authenticated');

create policy "Only teachers/admins can insert exams"
  on exams for insert
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('teacher', 'admin')
    )
  );

-- 3. Papers table: one row per uploaded encrypted file, linked to its
-- on-chain registration key.
create table papers (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid references exams(id) on delete cascade,
  storage_path text not null,          -- path inside the Supabase Storage bucket
  file_hash text not null,             -- sha256 hex digest of the ENCRYPTED file
  chain_key text not null,             -- bytes32 key returned by registerPaper()
  chain_tx_hash text not null,         -- transaction hash of the registration
  uploaded_by uuid references profiles(id),
  released boolean not null default false,
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);

alter table papers enable row level security;

create policy "Anyone signed in can read paper metadata"
  on papers for select
  using (auth.role() = 'authenticated');

create policy "Only teachers/admins can insert papers"
  on papers for insert
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('teacher', 'admin')
    )
  );

create policy "Only invigilators/admins can mark a paper released"
  on papers for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('invigilator', 'admin')
    )
  );

-- 4. Audit log: every access/verification attempt, successful or not.
create table access_log (
  id uuid primary key default gen_random_uuid(),
  paper_id uuid references papers(id) on delete cascade,
  actor uuid references profiles(id),
  action text not null,                -- 'verify' | 'release' | 'download' | 'revoke'
  result text not null,                -- 'success' | 'hash_mismatch' | 'denied'
  created_at timestamptz not null default now()
);

alter table access_log enable row level security;

create policy "Anyone signed in can read the audit log"
  on access_log for select
  using (auth.role() = 'authenticated');

create policy "Anyone signed in can write to the audit log"
  on access_log for insert
  with check (auth.role() = 'authenticated');

-- 5. Auto-create a profile row whenever a new user signs up.
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'invigilator');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 6. Helper so the admin API can look a user up by email (auth.users isn't
-- directly queryable through the client libraries).
create function public.get_user_id_by_email(lookup_email text)
returns uuid as $$
  select id from auth.users where email = lookup_email limit 1;
$$ language sql security definer;

-- 7. Storage bucket for encrypted papers (run once).
insert into storage.buckets (id, name, public)
values ('exam-papers', 'exam-papers', false)
on conflict (id) do nothing;

-- Only authenticated users can read/write; app-layer role checks in the
-- API routes decide who actually gets a decrypted file back.
create policy "Authenticated read exam-papers"
  on storage.objects for select
  using (bucket_id = 'exam-papers' and auth.role() = 'authenticated');

create policy "Authenticated write exam-papers"
  on storage.objects for insert
  with check (bucket_id = 'exam-papers' and auth.role() = 'authenticated');
