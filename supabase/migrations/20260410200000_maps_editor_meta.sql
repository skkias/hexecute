-- Map editor: reference image visibility, spawn markers, location labels (viewBox space).
alter table public.maps
  add column if not exists editor_meta jsonb not null default '{"show_reference_image":true,"spawn_markers":[],"location_labels":[]}'::jsonb;
