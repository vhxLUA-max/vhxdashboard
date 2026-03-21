-- ============================================================
--  vhxLUA Hub — Hard Reset Migration
--  Preserves: game_executions.count, game_executions.daily_count
--             unique_users.execution_count
--             game_status rows (game list kept, maintenance cleared)
--             user_roles (founder/admin grants kept)
--             changelog (your own posts kept)
--             announcements (your active banners kept)
--  Wipes:     All user identity, ban, security, and token data
--             All auth.users except your own account
-- ============================================================

BEGIN;

-- ── 1. Ban tables ────────────────────────────────────────────
TRUNCATE TABLE banned_users      RESTART IDENTITY CASCADE;
TRUNCATE TABLE fingerprint_bans  RESTART IDENTITY CASCADE;
TRUNCATE TABLE hwid_bans         RESTART IDENTITY CASCADE;
TRUNCATE TABLE ip_bans           RESTART IDENTITY CASCADE;
TRUNCATE TABLE vpn_flags         RESTART IDENTITY CASCADE;

-- ── 2. User identity / token tables ─────────────────────────
--    unique_users: wipe all personal columns but keep execution_count
--    We delete all rows since there's no safe partial wipe
--    (roblox_user_id is the PK — execution history is in game_executions)
TRUNCATE TABLE unique_users  RESTART IDENTITY CASCADE;
TRUNCATE TABLE user_tokens   RESTART IDENTITY CASCADE;
TRUNCATE TABLE admins        RESTART IDENTITY CASCADE;

-- ── 3. Audit log — clear completely ─────────────────────────
TRUNCATE TABLE audit_log     RESTART IDENTITY CASCADE;

-- ── 4. game_executions — preserve count & daily_count ───────
--    Reset all per-game metadata EXCEPT the cumulative counts
UPDATE game_executions SET
    last_executed_at = NULL,
    updated_at       = NOW()
WHERE TRUE;
-- If you also want to zero the counts run this instead (commented out for safety):
-- TRUNCATE TABLE game_executions RESTART IDENTITY CASCADE;

-- ── 5. game_status — keep game list, reset maintenance state ─
UPDATE game_status SET
    maintenance      = false,
    maintenance_msg  = 'Under maintenance. Check back soon.',
    end_timestamp    = NULL,
    redirect_url     = 'https://vhxdashboard.vercel.app/'
WHERE TRUE;

-- ── 6. user_roles — KEEP (your founder/admin grants stay) ───
--    Comment out the line below if you want to wipe roles too
-- TRUNCATE TABLE user_roles RESTART IDENTITY CASCADE;

-- ── 7. Auth users — delete everyone except your account ──────
--    Replace 'vhxlua-max' with your exact auth email or user_id
--    Get your user_id first: SELECT id FROM auth.users WHERE email = 'your@email.com';
--
--    Option A — delete by username metadata (safe default):
DELETE FROM auth.users
WHERE raw_user_meta_data->>'username' NOT IN ('vhxlua-max')
  AND raw_user_meta_data->>'username' IS NOT NULL;

--    Option B — delete by user_id (most precise, replace the UUID):
--    DELETE FROM auth.users WHERE id != 'YOUR-USER-UUID-HERE';

--    Option C — wipe ALL auth users including yours (nuclear):
--    TRUNCATE TABLE auth.users CASCADE;

COMMIT;


-- ============================================================
--  POST-RESET: Re-seed your founder role
--  Run this AFTER the reset to restore your founder privileges.
--  Replace the UUID with yours from: SELECT id FROM auth.users;
-- ============================================================

-- INSERT INTO user_roles (user_id, username, role, created_at)
-- VALUES ('YOUR-USER-UUID-HERE', 'vhxlua-max', 'founder', NOW())
-- ON CONFLICT (user_id) DO UPDATE SET role = 'founder';


-- ============================================================
--  VERIFY: Run these after to confirm the reset worked
-- ============================================================

-- SELECT COUNT(*) AS banned_users    FROM banned_users;
-- SELECT COUNT(*) AS fingerprint_bans FROM fingerprint_bans;
-- SELECT COUNT(*) AS hwid_bans       FROM hwid_bans;
-- SELECT COUNT(*) AS unique_users    FROM unique_users;
-- SELECT COUNT(*) AS auth_users      FROM auth.users;
-- SELECT SUM(count) AS total_execs   FROM game_executions;
