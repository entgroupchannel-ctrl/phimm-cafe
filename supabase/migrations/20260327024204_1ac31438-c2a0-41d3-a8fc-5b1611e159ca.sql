ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS protein_g numeric(6,1),
  ADD COLUMN IF NOT EXISTS carbs_g numeric(6,1),
  ADD COLUMN IF NOT EXISTS fat_g numeric(6,1),
  ADD COLUMN IF NOT EXISTS fiber_g numeric(6,1),
  ADD COLUMN IF NOT EXISTS sodium_mg numeric(8,1),
  ADD COLUMN IF NOT EXISTS health_score integer;