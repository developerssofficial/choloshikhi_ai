-- Atomic usage increment function
-- Returns the new request count, or -1 if quota exceeded
CREATE OR REPLACE FUNCTION increment_usage(
  p_user_id UUID,
  p_date DATE,
  p_max_requests INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  -- Upsert the usage row, incrementing request count
  INSERT INTO usage (user_id, date, requests, input_tokens, output_tokens, total_tokens)
  VALUES (p_user_id, p_date, 1, 0, 0, 0)
  ON CONFLICT (user_id, date) DO UPDATE
  SET requests = usage.requests + 1
  RETURNING requests INTO new_count;

  -- If somehow the count exceeds the limit, roll back by decrementing
  IF new_count > p_max_requests THEN
    UPDATE usage SET requests = requests - 1
    WHERE user_id = p_user_id AND date = p_date;
    RETURN -1;
  END IF;

  RETURN new_count;
END;
$$;
