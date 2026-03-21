-- ============================================================
--  vhxLUA Hub — Drop Unused Tables
--
--  KEEPS (actively used by the dashboard):
--    unique_users        — player execution records
--    game_executions     — per-game execution counts
--    game_status         — maintenance mode per game
--    banned_users        — username/userId bans
--    fingerprint_bans    — device fingerprint bans
--    hwid_bans           — hardware ID bans
--    ip_bans             — IP address bans
--    vpn_flags           — VPN/proxy detection logs
--    user_roles          — founder/admin/pro/moderator roles
--    user_tokens         — script access tokens
--    admins              — legacy admin check (still queried)
--    announcements       — banner announcements
--    changelog           — update posts
--    audit_log           — admin action history
--    feedback            — user feedback submissions
--
--  DROPS (Supabase defaults / never referenced in any src file):
--    profiles            — default Supabase starter table
--    scripts             — not used (scripts are on rscripts.net)
--    logs                — not used (audit_log is used instead)
--    sessions            — Supabase handles sessions internally
--    tokens              — not used (user_tokens is used instead)
--    todos               — Supabase example table
--    examples            — Supabase example table
-- ============================================================

-- Drop only if they exist — safe to run even if they're already gone
DROP TABLE IF EXISTS profiles  CASCADE;
DROP TABLE IF EXISTS scripts   CASCADE;
DROP TABLE IF EXISTS logs      CASCADE;
DROP TABLE IF EXISTS sessions  CASCADE;
DROP TABLE IF EXISTS tokens    CASCADE;
DROP TABLE IF EXISTS todos     CASCADE;
DROP TABLE IF EXISTS examples  CASCADE;

-- Verify what's left
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
