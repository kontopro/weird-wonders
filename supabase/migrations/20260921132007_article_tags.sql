create table public.article_tags (
  article_id uuid not null references public.articles(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (article_id, tag_id)
);

alter table public.article_tags enable row level security;

create index article_tags_tag_article_idx on public.article_tags (tag_id, article_id);
