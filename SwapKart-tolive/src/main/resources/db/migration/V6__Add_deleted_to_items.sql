-- Add deleted column to items table
ALTER TABLE IF EXISTS swapkartdb.items
ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE NOT NULL;

-- Add index to deleted for faster queries if needed
CREATE INDEX IF NOT EXISTS idx_items_deleted ON swapkartdb.items(deleted);
