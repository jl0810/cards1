-- Add CHECK constraint to enforce valid Clerk ID format
-- BR-001: All users must have valid Clerk IDs (format: user_[alphanumeric])
-- This prevents "naked" user creation at the database level

ALTER TABLE "user_profiles" 
ADD CONSTRAINT "valid_clerk_id" 
CHECK ("clerkId" LIKE 'user_%' AND length("clerkId") >= 6);
