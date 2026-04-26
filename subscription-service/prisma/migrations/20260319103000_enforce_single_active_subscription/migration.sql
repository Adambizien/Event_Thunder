-- Step 1: fix existing duplicates by keeping the most recently updated active subscription per user.
WITH ranked AS (
  SELECT
    id,
    user_id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY updated_at DESC, created_at DESC
    ) AS row_num
  FROM subscriptions
  WHERE status = 'active'
), duplicates AS (
  SELECT id
  FROM ranked
  WHERE row_num > 1
)
UPDATE subscriptions AS s
SET
  status = 'canceled',
  canceled_at = COALESCE(s.canceled_at, NOW()),
  ended_at = COALESCE(s.ended_at, NOW()),
  updated_at = NOW()
FROM duplicates AS d
WHERE s.id = d.id;

-- Step 2: enforce one active subscription per user at DB level.
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_one_active_per_user_idx
ON subscriptions(user_id)
WHERE status = 'active';
