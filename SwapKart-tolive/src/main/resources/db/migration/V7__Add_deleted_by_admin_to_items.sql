-- Add deleted_by_admin column to items table to distinguish admin deletions from user deletions
ALTER TABLE IF EXISTS swapkartdb.items
ADD COLUMN IF NOT EXISTS deleted_by_admin BOOLEAN DEFAULT FALSE NOT NULL;

-- Add index to deleted_by_admin for faster lookups
CREATE INDEX IF NOT EXISTS idx_items_deleted_by_admin ON swapkartdb.items(deleted_by_admin);

