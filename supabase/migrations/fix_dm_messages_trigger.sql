-- Fix: dm_messages INSERT trigger was failing with
-- "record 'new' has no field 'conversation_id'" (code 42703)
-- Drop the broken trigger and recreate properly

DROP TRIGGER IF EXISTS on_dm_message_updated ON dm_messages;
DROP FUNCTION IF EXISTS update_dm_conversation_timestamp();

-- Recreate trigger function: update dm_conversations.updated_at on new message
CREATE OR REPLACE FUNCTION update_dm_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE dm_conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_dm_message_insert
  AFTER INSERT ON dm_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_dm_conversation_timestamp();
