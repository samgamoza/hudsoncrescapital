-- Wire the existing handle_new_user_role function to auth.users
drop trigger if exists on_auth_user_created_assign_role on auth.users;
create trigger on_auth_user_created_assign_role
after insert on auth.users
for each row execute function public.handle_new_user_role();

-- Backfill: assign investor role to any existing users missing one
insert into public.user_roles (user_id, role)
select u.id, 'investor'::public.app_role
from auth.users u
where not exists (
  select 1 from public.user_roles r where r.user_id = u.id
)
on conflict do nothing;