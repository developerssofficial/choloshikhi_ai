-- Enable Supabase Realtime for DM messages
-- This allows the frontend to subscribe to new messages in real-time

ALTER PUBLICATION supabase_realtime ADD TABLE dm_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE dm_conversations;
