-- Create item_images table
CREATE TABLE IF NOT EXISTS swapkartdb.item_images (
    item_id BIGINT NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    PRIMARY KEY (item_id, image_url),
    CONSTRAINT fk_item
        FOREIGN KEY (item_id)
        REFERENCES swapkartdb.items(id)
        ON DELETE CASCADE
);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_item_images_item_id ON swapkartdb.item_images(item_id);
