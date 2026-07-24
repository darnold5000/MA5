-- MA5 → Signal Works migration 043
-- Community board: staff can read/post; clients remain tenant members.
--
-- Prerequisite: 029_ma5_rls_policies (ma5_community_posts policies)

begin;

drop policy if exists ma5_community_posts_select on public.ma5_community_posts;
create policy ma5_community_posts_select
on public.ma5_community_posts
for select
to authenticated
using (
  public.ma5_is_tenant_member(tenant_id)
  or public.ma5_is_tenant_staff(tenant_id)
);

drop policy if exists ma5_community_posts_insert on public.ma5_community_posts;
create policy ma5_community_posts_insert
on public.ma5_community_posts
for insert
to authenticated
with check (
  author_user_id = auth.uid()
  and (
    public.ma5_is_tenant_member(tenant_id)
    or public.ma5_is_tenant_staff(tenant_id)
  )
);

drop policy if exists ma5_community_posts_update on public.ma5_community_posts;
create policy ma5_community_posts_update
on public.ma5_community_posts
for update
to authenticated
using (
  author_user_id = auth.uid()
  or public.ma5_is_tenant_staff(tenant_id)
)
with check (
  author_user_id = auth.uid()
  or public.ma5_is_tenant_staff(tenant_id)
);

drop policy if exists ma5_community_posts_delete on public.ma5_community_posts;
create policy ma5_community_posts_delete
on public.ma5_community_posts
for delete
to authenticated
using (
  author_user_id = auth.uid()
  or public.ma5_is_tenant_staff(tenant_id)
);

commit;
