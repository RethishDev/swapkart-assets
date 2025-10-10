DO $$
BEGIN
    -- Check if the users table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'swapkartdb' AND table_name = 'users') THEN
        
        -- Add active column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_schema = 'swapkartdb' 
                      AND table_name = 'users' 
                      AND column_name = 'active') THEN
            ALTER TABLE swapkartdb.users 
            ADD COLUMN active BOOLEAN DEFAULT TRUE NOT NULL;
            
            -- Add a comment to document the column
            COMMENT ON COLUMN swapkartdb.users.active IS 'Flag indicating if the user account is active (not deleted/banned)';
            
            -- Create an index for better query performance on active status
            CREATE INDEX idx_users_active ON swapkartdb.users(active);
            
            RAISE NOTICE 'Added active column to users table';
        ELSE
            RAISE NOTICE 'active column already exists in users table';
        END IF;
    ELSE
        RAISE NOTICE 'users table does not exist, skipping migration';
    END IF;
END $$;