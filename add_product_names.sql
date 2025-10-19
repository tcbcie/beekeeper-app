-- Add Varroa Treatment Product Name category and values to existing settings database

-- Category: Varroa Treatment Product Name
INSERT INTO dropdown_categories (category_name, category_key, description)
VALUES ('Varroa Treatment Product Name', 'varroa_treatment_product', 'Product names for varroa mite treatments')
ON CONFLICT (category_key) DO NOTHING;

INSERT INTO dropdown_values (category_id, value, display_order, is_active)
SELECT id, 'Apiguard', 1, TRUE FROM dropdown_categories WHERE category_key = 'varroa_treatment_product'
ON CONFLICT (category_id, value) DO NOTHING;

INSERT INTO dropdown_values (category_id, value, display_order, is_active)
SELECT id, 'ApiLife Var', 2, TRUE FROM dropdown_categories WHERE category_key = 'varroa_treatment_product'
ON CONFLICT (category_id, value) DO NOTHING;

INSERT INTO dropdown_values (category_id, value, display_order, is_active)
SELECT id, 'Apistan', 3, TRUE FROM dropdown_categories WHERE category_key = 'varroa_treatment_product'
ON CONFLICT (category_id, value) DO NOTHING;

INSERT INTO dropdown_values (category_id, value, display_order, is_active)
SELECT id, 'Apivar', 4, TRUE FROM dropdown_categories WHERE category_key = 'varroa_treatment_product'
ON CONFLICT (category_id, value) DO NOTHING;

INSERT INTO dropdown_values (category_id, value, display_order, is_active)
SELECT id, 'Formic Pro', 5, TRUE FROM dropdown_categories WHERE category_key = 'varroa_treatment_product'
ON CONFLICT (category_id, value) DO NOTHING;

INSERT INTO dropdown_values (category_id, value, display_order, is_active)
SELECT id, 'Mite Away Quick Strips', 6, TRUE FROM dropdown_categories WHERE category_key = 'varroa_treatment_product'
ON CONFLICT (category_id, value) DO NOTHING;

INSERT INTO dropdown_values (category_id, value, display_order, is_active)
SELECT id, 'Oxalic Acid', 7, TRUE FROM dropdown_categories WHERE category_key = 'varroa_treatment_product'
ON CONFLICT (category_id, value) DO NOTHING;
