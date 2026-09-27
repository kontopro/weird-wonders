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
