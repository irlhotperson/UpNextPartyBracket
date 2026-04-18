-- Add ready-up tracking for dual-confirmation match start
ALTER TABLE matches ADD COLUMN ready_a_id UUID REFERENCES players(id) ON DELETE SET NULL;
ALTER TABLE matches ADD COLUMN ready_b_id UUID REFERENCES players(id) ON DELETE SET NULL;
