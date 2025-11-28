-- Add notification preferences to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "new_message": true,
  "new_comment": true,
  "new_review": true,
  "listing_sold": true
}'::jsonb;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_notification_preferences 
ON profiles USING GIN (notification_preferences);

-- Comment
COMMENT ON COLUMN profiles.notification_preferences IS 'User preferences for different types of notifications';
