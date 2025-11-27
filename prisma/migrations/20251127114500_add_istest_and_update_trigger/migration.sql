-- Add isTest field to plaid_items
ALTER TABLE "plaid_items" 
ADD COLUMN "isTest" BOOLEAN NOT NULL DEFAULT false;

-- Update the prevent_deletion trigger to allow deletion of test items
CREATE OR REPLACE FUNCTION prevent_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Allow deletion if it's a test item
    IF OLD."isTest" = true THEN
        RETURN OLD;
    END IF;
    
    -- Otherwise, prevent deletion for production data
    RAISE EXCEPTION 'Deletion from this table is not allowed. Set status to inactive instead.';
END;
$$ LANGUAGE plpgsql;

-- The trigger is already created, just updating the function
-- No need to recreate the trigger itself
