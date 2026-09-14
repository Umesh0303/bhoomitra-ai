
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
revoke execute on function public.is_reviewer(uuid) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;
grant execute on function public.is_reviewer(uuid) to authenticated, service_role;
