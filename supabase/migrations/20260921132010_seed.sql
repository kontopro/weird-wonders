insert into public.site_settings (
  id,
  name,
  tagline,
  default_language,
  theme_key,
  layout_key,
  branding,
  seo_config
)
values (
  true,
  'FACTάκι',
  'Μικρό fact. Μεγάλη έκπληξη.',
  'el',
  'factaki',
  'editorial',
  '{"wordmark":{"primary":"FACT","accent":"άκι"}}'::jsonb,
  '{"title":"FACTάκι — Μικρό fact. Μεγάλη έκπληξη.","description":"Απρόσμενα και τεκμηριωμένα facts από την επιστήμη, την ιστορία, τη φύση, την τεχνολογία και τον πολιτισμό.","socialTitle":"FACTάκι — Κάθε μέρα κάτι που δεν ήξερες","socialDescription":"Μικρές πληροφορίες που κρύβουν μεγάλες εκπλήξεις."}'::jsonb
)
on conflict (id) do update
set
  name = excluded.name,
  tagline = excluded.tagline,
  default_language = excluded.default_language,
  theme_key = excluded.theme_key,
  layout_key = excluded.layout_key,
  branding = excluded.branding,
  seo_config = excluded.seo_config;

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
