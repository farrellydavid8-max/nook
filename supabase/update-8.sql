-- Nook update 8: gameplay clips in updates.
-- Lets the photos storage accept short videos (MP4, MOV, WebM) up to 50 MB.
-- Paste into Supabase → SQL Editor → New query → Run.
update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'video/mp4', 'video/quicktime', 'video/webm']
where id = 'photos';
