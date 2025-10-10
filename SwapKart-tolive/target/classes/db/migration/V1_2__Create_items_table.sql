-- Create items table
CREATE TABLE IF NOT EXISTS swapkartdb.items (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) DEFAULT 0.00,
    category VARCHAR(50) NOT NULL,
    type VARCHAR(20) NOT NULL,
    city VARCHAR(50) NOT NULL,
    pincode VARCHAR(6) NOT NULL,
    itemcondition VARCHAR(20) NOT NULL DEFAULT 'GOOD',
    user_id BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    is_available BOOLEAN DEFAULT TRUE,
    active BOOLEAN DEFAULT TRUE,
    CONSTRAINT fk_user
        FOREIGN KEY (user_id)
        REFERENCES swapkartdb.users(id)
        ON DELETE CASCADE
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_items_user_id ON swapkartdb.items(user_id);
CREATE INDEX IF NOT EXISTS idx_items_category ON swapkartdb.items(category);
CREATE INDEX IF NOT EXISTS idx_items_type ON swapkartdb.items(type);
CREATE INDEX IF NOT EXISTS idx_items_city ON swapkartdb.items(city);
CREATE INDEX IF NOT EXISTS idx_items_pincode ON swapkartdb.items(pincode);
