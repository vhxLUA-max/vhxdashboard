-- ============================================================
--  Wipe all script users + reset execution counts
-- ============================================================

BEGIN;

-- 1. Wipe all player records (roblox users who ran scripts)
TRUNCATE TABLE unique_users     RESTART IDENTITY CASCADE;

-- 2. Wipe all tokens tied to those users
TRUNCATE TABLE user_tokens      RESTART IDENTITY CASCADE;

-- 3. Wipe all bans (they're tied to users that no longer exist)
TRUNCATE TABLE banned_users     RESTART IDENTITY CASCADE;
TRUNCATE TABLE fingerprint_bans RESTART IDENTITY CASCADE;
TRUNCATE TABLE hwid_bans        RESTART IDENTITY CASCADE;
TRUNCATE TABLE ip_bans          RESTART IDENTITY CASCADE;
TRUNCATE TABLE vpn_flags        RESTART IDENTITY CASCADE;

-- 4. Reset execution counts per game to zero
UPDATE game_executions SET
    count            = 0,
    daily_count      = 0,
    last_executed_at = NULL;

COMMIT;

-- Verify
SELECT 'unique_users'     AS tbl, COUNT(*) FROM unique_users
UNION ALL
SELECT 'user_tokens',              COUNT(*) FROM user_tokens
UNION ALL
SELECT 'banned_users',             COUNT(*) FROM banned_users
UNION ALL
SELECT 'game_executions total', COALESCE(SUM(count), 0) FROM game_executions;
