revoke all on function public.handle_new_user() from anon, authenticated;
revoke all on function public.refresh_worker_rating() from anon, authenticated;
revoke all on function public.has_role(uuid, public.app_role) from anon;

drop policy "workers public read verified" on public.workers;
create policy "workers public read verified" on public.workers for select using (verification_status = 'verified');
create policy "workers read own or admin" on public.workers for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));