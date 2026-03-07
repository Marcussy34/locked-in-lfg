create table if not exists lesson.community_pot_distribution_snapshots (
  window_id bigint not null,
  wallet_address text not null,
  course_id text not null,
  current_streak integer not null,
  principal_amount bigint not null,
  weight bigint not null,
  payout_amount bigint not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (window_id, wallet_address, course_id),
  check (status in ('pending', 'distributed', 'failed'))
);

create index if not exists community_pot_distribution_snapshots_window_idx
  on lesson.community_pot_distribution_snapshots (window_id, status);
