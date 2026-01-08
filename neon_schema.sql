-- Run this in Neon SQL Editor once.

create extension if not exists pgcrypto;

create table if not exists articles (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  title text not null,
  category text not null default 'General',
  content text not null,
  is_public boolean not null default false,
  fingerprint text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists articles_user_fingerprint_uq
  on articles (user_id, fingerprint)
  where fingerprint is not null;

create index if not exists articles_user_created_at_idx
  on articles (user_id, created_at desc);

create index if not exists articles_public_created_at_idx
  on articles (is_public, created_at desc);

create table if not exists life_records (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  images jsonb not null default '[]'::jsonb,
  description text not null default '',
  is_public boolean not null default false,
  fingerprint text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists life_records_user_fingerprint_uq
  on life_records (user_id, fingerprint)
  where fingerprint is not null;

create index if not exists life_records_user_created_at_idx
  on life_records (user_id, created_at desc);

create index if not exists life_records_public_created_at_idx
  on life_records (is_public, created_at desc);
