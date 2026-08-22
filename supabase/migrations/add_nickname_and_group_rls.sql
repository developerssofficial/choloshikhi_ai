-- Add nickname column to student_profiles
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS nickname TEXT;

-- Add nickname to group_messages for display purposes
-- (nickname is looked up from student_profiles at query time)

-- Fix RLS policies for groups: only group members can see the group
-- Drop existing overly-permissive policies
DROP POLICY IF EXISTS "Anyone can view public groups" ON groups;
DROP POLICY IF EXISTS "Authenticated users can create groups" ON groups;
DROP POLICY IF EXISTS "Group creator can update" ON groups;
DROP POLICY IF EXISTS "Group creator can delete" ON groups;

-- Groups: only members can see their own groups
CREATE POLICY "Members can view own groups" ON groups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
    )
  );

-- Groups: any authenticated user can create
CREATE POLICY "Authenticated users can create groups" ON groups
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- Groups: only creator (owner) can update
CREATE POLICY "Creator can update group" ON groups
  FOR UPDATE USING (auth.uid() = creator_id);

-- Groups: only creator can delete
CREATE POLICY "Creator can delete group" ON groups
  FOR DELETE USING (auth.uid() = creator_id);

-- Group members: only group members can see who's in the group
DROP POLICY IF EXISTS "Group members can view" ON group_members;
CREATE POLICY "Members can view group members" ON group_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
    )
  );

-- Group members: only owner/admin can add members
DROP POLICY IF EXISTS "Group owner can add members" ON group_members;
CREATE POLICY "Owner can add members" ON group_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('owner', 'admin')
    )
  );

-- Group members: owner can remove members, members can leave
DROP POLICY IF EXISTS "Members can leave or owner can remove" ON group_members;
CREATE POLICY "Members can leave or owner can remove" ON group_members
  FOR DELETE USING (
    auth.uid() = user_id  -- leaving
    OR EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'owner'
    )
  );

-- Group messages: only members can view
DROP POLICY IF EXISTS "Members can view messages" ON group_messages;
CREATE POLICY "Members can view messages" ON group_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_messages.group_id
      AND group_members.user_id = auth.uid()
    )
  );

-- Group messages: only members can send
DROP POLICY IF EXISTS "Members can send messages" ON group_messages;
CREATE POLICY "Members can send messages" ON group_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_messages.group_id
      AND group_members.user_id = auth.uid()
    )
  );
