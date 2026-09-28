-- Site-specific starting data for FACTάκι. Not a migration: the structure
-- lives in `migrations/`, this file only fills it for one particular blog.
--
-- Apply once to a fresh project:  bunx supabase db push --include-seed
-- A new blog replaces this file with its own categories.
-- Safe to re-run: existing categories are updated, not duplicated.

insert into public.categories (name, slug, icon_key, sort_order)
values
  ('Επιστήμη', 'epistimi', 'science', 10),
  ('Ιστορία', 'istoria', 'history', 20),
  ('Τεχνολογία', 'technologia', 'technology', 30),
  ('Φύση', 'fysi', 'nature', 40),
  ('Διάστημα', 'diastima', 'space', 50),
  ('Πολιτισμός', 'politismos', 'culture', 60),
  ('Άνθρωπος', 'anthropos', 'human', 70),
  ('Καθημερινότητα', 'kathimerinotita', 'daily', 80)
on conflict (slug) do update
set
  name = excluded.name,
  icon_key = excluded.icon_key,
  sort_order = excluded.sort_order;

-- English names and addresses of the categories (the site publishes in el + en).
insert into public.category_translations (category_id, language, name, slug)
select c.id, 'en', t.name, t.slug
from (
  values
    ('epistimi', 'Science', 'science'),
    ('istoria', 'History', 'history'),
    ('technologia', 'Technology', 'technology'),
    ('fysi', 'Nature', 'nature'),
    ('diastima', 'Space', 'space'),
    ('politismos', 'Culture', 'culture'),
    ('anthropos', 'Humans', 'humans'),
    ('kathimerinotita', 'Everyday life', 'everyday-life')
) as t (category_slug, name, slug)
join public.categories c on c.slug = t.category_slug
on conflict (category_id, language) do update
set
  name = excluded.name,
  slug = excluded.slug;
