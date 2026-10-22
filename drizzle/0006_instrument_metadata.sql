-- Persist fictional instrument metadata for the Nexora Demo Exchange.
-- Apply only to the dedicated development Neon branch.
ALTER TABLE assets ADD COLUMN IF NOT EXISTS sector text NOT NULL DEFAULT 'Other';
ALTER TABLE assets ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT 'Fictional Nexora demo instrument.';

UPDATE assets SET sector = 'Technology', description = 'Fictional diversified software and digital infrastructure group.' WHERE symbol = 'OMNI';
UPDATE assets SET sector = 'Financials', description = 'Fictional digital banking and investment services company.' WHERE symbol = 'VLT';
UPDATE assets SET sector = 'Industrials', description = 'Fictional aerospace engineering and orbital systems company.' WHERE symbol = 'HALO';
UPDATE assets SET sector = 'Financials', description = 'Fictional retail and commercial banking group.' WHERE symbol = 'BRIK';
UPDATE assets SET sector = 'Technology', description = 'Fictional developer tools and cybersecurity software company.' WHERE symbol = 'PWN';
UPDATE assets SET sector = 'Energy', description = 'Fictional renewable power and grid storage operator.' WHERE symbol = 'BLX';
UPDATE assets SET sector = 'Technology', description = 'Fictional cloud infrastructure and data services company.' WHERE symbol = 'BYTE';
UPDATE assets SET sector = 'Technology', description = 'Fictional semiconductor design and fabrication company.' WHERE symbol = 'CHIP';
UPDATE assets SET sector = 'Healthcare', description = 'Fictional medical technology and healthcare systems company.' WHERE symbol = 'MEDI';
UPDATE assets SET sector = 'Financials', description = 'Fictional digital payments and consumer finance company.' WHERE symbol = 'LOOT';
UPDATE assets SET sector = 'Industrials', description = 'Fictional robotics and industrial automation company.' WHERE symbol = 'OBBY';
UPDATE assets SET sector = 'Consumer Staples', description = 'Fictional beverage and consumer products company.' WHERE symbol = 'SLRP';
UPDATE assets SET sector = 'Industrials', description = 'Fictional robotics and manufacturing automation company.' WHERE symbol = 'ROBO';
UPDATE assets SET sector = 'Real Estate', description = 'Fictional property investment and commercial development trust.' WHERE symbol = 'LAND';
UPDATE assets SET sector = 'Utilities', description = 'Fictional electric power generation and grid services company.' WHERE symbol = 'POWR';
UPDATE assets SET sector = 'Consumer Discretionary', description = 'Fictional premium retail and lifestyle group.' WHERE symbol = 'DOMO';
UPDATE assets SET sector = 'Financials', description = 'Fictional insurance and risk management services company.' WHERE symbol = 'INSR';
