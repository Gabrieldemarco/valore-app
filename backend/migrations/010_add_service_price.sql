ALTER TABLE appointments ADD COLUMN service_price DECIMAL(10,2);

UPDATE appointments a
SET service_price = s.price
FROM services s
WHERE a.tenant_id = s.tenant_id AND a.service = s.name AND a.service_price IS NULL;
