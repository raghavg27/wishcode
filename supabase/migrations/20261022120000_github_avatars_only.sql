-- Avatars load only from GitHub's avatar CDN. Any other https host would see
-- the IP of every visitor who views the developer, and the share-card routes
-- fetch avatars server-side. Drops avatars from any other host first.

update public.developers
set avatar_url = null, updated_at = now()
where avatar_url is not null and avatar_url !~ '^https://avatars\.githubusercontent\.com/';

alter table public.developers drop constraint developers_avatar_url_check;
alter table public.developers add constraint developers_avatar_url_check
  check (avatar_url is null or avatar_url ~ '^https://avatars\.githubusercontent\.com/');
