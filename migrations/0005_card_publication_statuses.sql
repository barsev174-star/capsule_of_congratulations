ALTER TABLE cards
  DROP CONSTRAINT IF EXISTS cards_status_check;

ALTER TABLE cards
  ADD CONSTRAINT cards_status_check
  CHECK (status IN ('draft', 'collecting', 'ready', 'closed', 'published'));

ALTER TABLE cards
  DROP CONSTRAINT IF EXISTS cards_payment_status_check;

ALTER TABLE cards
  ADD CONSTRAINT cards_payment_status_check
  CHECK (payment_status IN ('unpaid', 'paid'));
