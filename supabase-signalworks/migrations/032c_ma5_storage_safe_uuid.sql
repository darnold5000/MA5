-- MA5 → Signal Works destination migration 032c
-- Patch: safe UUID parsing in storage exercise-video policy.
--
-- Apply when 032b (or early 032) was applied with:
--   ma5_storage_path_segment(name, 3)::uuid
-- which errors on malformed paths during policy evaluation.
--
-- Idempotent. Does not recreate buckets or other policies.
--
-- Verify:
--   select to_regprocedure('public.ma5_storage_path_segment_uuid(text,integer)');
--   select public.ma5_storage_path_segment_uuid('not-a-uuid/exercises/x/file.mp4', 1);
--   -- null, no error

create or replace function public.ma5_storage_path_segment_uuid(
  object_name text,
  segment_idx integer
)
returns uuid
language plpgsql
stable
set search_path = public
as $$
declare
  segment text;
begin
  segment := public.ma5_storage_path_segment(object_name, segment_idx);
  if segment is null then
    return null;
  end if;

  begin
    return segment::uuid;
  exception
    when invalid_text_representation then
      return null;
  end;
end;
$$;

comment on function public.ma5_storage_path_segment_uuid(text, integer) is
  'Safe UUID parse for a storage path segment; returns null on malformed input.';

revoke all on function public.ma5_storage_path_segment_uuid(text, integer) from public;
grant execute on function public.ma5_storage_path_segment_uuid(text, integer)
  to anon, authenticated, service_role;

drop policy if exists ma5_exercise_videos_select_assigned on storage.objects;
create policy ma5_exercise_videos_select_assigned
on storage.objects
for select
to authenticated
using (
  bucket_id = 'ma5-exercise-videos'
  and public.ma5_storage_path_segment(name, 2) = 'exercises'
  and public.ma5_storage_path_segment_uuid(name, 3) is not null
  and public.ma5_client_can_read_exercise(
    public.ma5_storage_path_tenant_id(name),
    public.ma5_storage_path_segment_uuid(name, 3)
  )
);
