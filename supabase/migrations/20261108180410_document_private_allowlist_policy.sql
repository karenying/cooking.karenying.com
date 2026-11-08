create policy allowlist_not_client_accessible on app_private.cookbook_allowlist
 for all to anon, authenticated using (false) with check (false);
