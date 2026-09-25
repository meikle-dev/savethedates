-- /digital-save-the-date is a public marketing page (F059), so a names part cannot use it.
-- Keep this list identical to reservedNames in src/features/weddings/guest-link.ts. An existing
-- names part that is newly reserved is renamed rather than failing the migration.
update public.weddings set slug = slug || '-wedding' where slug = 'digital-save-the-date';
alter table public.weddings drop constraint wedding_slug_valid;
alter table public.weddings add constraint wedding_slug_valid check (
  slug is null or (char_length(slug) between 3 and 63
    and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    and slug not in ('account', 'auth', 'dashboard', 'api', 'media', 'preview', 'preview-photo', 'demo',
      'demo-no-photo', 'demo-long-names', 'pricing', 'features', 'guides', 'examples', 'privacy', 'terms',
      'support', 'robots', 'sitemap', 'favicon', 's', 'contact', 'refunds', 'assets', 'fonts',
      'digital-save-the-date'))
);
