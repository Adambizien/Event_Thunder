ALTER TABLE subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_user_id_key;

DROP INDEX IF EXISTS subscriptions_user_id_key;
DROP INDEX IF EXISTS subscriptions_user_id_unique;
