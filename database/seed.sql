-- ByteMePC.io seed data (TEST DATA FOR TESTING Xddddd)


-- -------------------------------------------------------
-- ports
-- -------------------------------------------------------

INSERT INTO port (type) VALUES
  ('USB-A 3.2'),
  ('USB-C 3.2'),
  ('USB-C Thunderbolt 4'),
  ('HDMI 2.1'),
  ('DisplayPort 1.4'),
  ('3.5mm Audio'),
  ('Ethernet RJ45'),
  ('M.2 NVMe'),
  ('SATA III'),
  ('PCIe x16');

-- -------------------------------------------------------
-- CPUs
-- -------------------------------------------------------

INSERT INTO cpu (name, brand, image_link, core_numbers, frequency, socket, price) VALUES
  ('Intel Core i9-14900K', 'Intel', NULL, 24, 3.2, 'LGA1700', 549.99),
  ('Intel Core i7-14700K', 'Intel', NULL, 20, 3.4, 'LGA1700', 379.99),
  ('Intel Core i5-14600K', 'Intel', NULL, 14, 3.5, 'LGA1700', 319.99),
  ('AMD Ryzen 9 7950X',    'AMD',   NULL, 16, 4.5, 'AM5',     699.99),
  ('AMD Ryzen 7 7700X',    'AMD',   NULL,  8, 4.5, 'AM5',     349.99),
  ('AMD Ryzen 5 7600X',    'AMD',   NULL,  6, 4.7, 'AM5',     229.99);

-- -------------------------------------------------------
-- motherboards
-- -------------------------------------------------------

INSERT INTO motherboard (name, brand, image_link, wifi, socket, size, ram_slots, ram_type, price) VALUES
  ('ROG Maximus Z790 Hero',   'ASUS',     NULL, 'Wi-Fi 6E', 'LGA1700', 'ATX',  4, 'DDR5', 599.99),
  ('MAG B760M Mortar WiFi',   'MSI',      NULL, 'Wi-Fi 6',  'LGA1700', 'mATX', 4, 'DDR4', 179.99),
  ('X670E AORUS Master',      'Gigabyte', NULL, 'Wi-Fi 6E', 'AM5',     'ATX',  4, 'DDR5', 449.99),
  ('B650M Pro RS',            'ASRock',   NULL, NULL,        'AM5',    'mATX', 2, 'DDR5', 149.99);

INSERT INTO motherboard_port (mb_id, port_type, quantity) VALUES
  (1, 'USB-A 3.2',           4),
  (1, 'USB-C 3.2',           2),
  (1, 'USB-C Thunderbolt 4', 1),
  (1, 'HDMI 2.1',            1),
  (1, 'Ethernet RJ45',       1),
  (2, 'USB-A 3.2',           4),
  (2, 'USB-C 3.2',           1),
  (2, 'Ethernet RJ45',       1),
  (3, 'USB-A 3.2',           4),
  (3, 'USB-C 3.2',           2),
  (3, 'USB-C Thunderbolt 4', 1),
  (3, 'Ethernet RJ45',       1),
  (4, 'USB-A 3.2',           2),
  (4, 'USB-C 3.2',           1),
  (4, 'Ethernet RJ45',       1);

-- -------------------------------------------------------
-- GPUs
-- -------------------------------------------------------

INSERT INTO gpu (name, brand, image_link, core_clock, memory, tdp, price) VALUES
  ('GeForce RTX 4090',       'NVIDIA', NULL, 2235, 24, 450, 1599.99),
  ('GeForce RTX 4080 Super', 'NVIDIA', NULL, 2295, 16, 320,  999.99),
  ('GeForce RTX 4070',       'NVIDIA', NULL, 1920, 12, 200,  599.99),
  ('Radeon RX 7900 XTX',     'AMD',    NULL, 1855, 24, 355,  899.99),
  ('Radeon RX 7800 XT',      'AMD',    NULL, 1624, 16, 263,  499.99);

INSERT INTO gpu_port (gpu_id, port_type, quantity) VALUES
  (1, 'HDMI 2.1',        1),
  (1, 'DisplayPort 1.4', 3),
  (2, 'HDMI 2.1',        1),
  (2, 'DisplayPort 1.4', 3),
  (3, 'HDMI 2.1',        1),
  (3, 'DisplayPort 1.4', 3),
  (4, 'HDMI 2.1',        1),
  (4, 'DisplayPort 1.4', 2),
  (5, 'HDMI 2.1',        1),
  (5, 'DisplayPort 1.4', 3);

-- -------------------------------------------------------
-- RAM
-- -------------------------------------------------------

INSERT INTO ram (name, brand, image_link, type, capacity, speed, price) VALUES
  ('Dominator Titanium DDR5-6000 32GB', 'Corsair',  NULL, 'DDR5', 32, 6000, 129.99),
  ('Trident Z5 DDR5-5600 16GB',         'G.Skill',  NULL, 'DDR5', 16, 5600,  69.99),
  ('Fury Beast DDR4-3200 16GB',         'Kingston', NULL, 'DDR4', 16, 3200,  44.99),
  ('Vengeance DDR4-3600 32GB',          'Corsair',  NULL, 'DDR4', 32, 3600,  79.99);

-- -------------------------------------------------------
-- PSUs
-- -------------------------------------------------------

INSERT INTO psu (name, brand, image_link, wattage, form_factor, efficiency_rating, price) VALUES
  ('RM1000x',            'Corsair',   NULL, 1000, 'ATX', '80+ Gold',     179.99),
  ('SuperNOVA 850 G6',   'EVGA',      NULL,  850, 'ATX', '80+ Gold',     149.99),
  ('Straight Power 750W','be quiet!', NULL,  750, 'ATX', '80+ Platinum', 119.99),
  ('Focus GX-650',       'Seasonic',  NULL,  650, 'ATX', '80+ Gold',      99.99);

-- -------------------------------------------------------
-- storage
-- -------------------------------------------------------

INSERT INTO storage (name, brand, image_link, type, capacity, interface, read_speed, write_speed, price) VALUES
  ('990 Pro 1TB',       'Samsung',  NULL, 'NVMe', 1000, 'M.2 NVMe', 7450, 6900,  99.99),
  ('WD Black SN850X 2TB','Western Digital', NULL, 'NVMe', 2000, 'M.2 NVMe', 7300, 6600, 139.99),
  ('870 EVO 1TB',       'Samsung',  NULL, 'SSD',  1000, 'SATA III', 560,  530,   79.99),
  ('Barracuda 2TB',     'Seagate',  NULL, 'HDD',  2000, 'SATA III', NULL, NULL,  49.99);

-- -------------------------------------------------------
-- PC cases
-- -------------------------------------------------------

INSERT INTO pc_case (name, brand, image_link, price) VALUES
  ('O11 Dynamic EVO',   'Lian Li',          NULL, 179.99),
  ('Define 7',          'Fractal Design',   NULL, 169.99),
  ('H510',              'NZXT',             NULL,  79.99),
  ('Pop Mini Air',      'Fractal Design',   NULL,  89.99);

-- which sizes fit in each case
INSERT INTO case_supported_size (case_id, size) VALUES
  (1, 'ATX'),
  (1, 'mATX'),
  (2, 'ATX'),
  (2, 'mATX'),
  (2, 'ITX'),
  (3, 'ATX'),
  (3, 'mATX'),
  (4, 'mATX'),
  (4, 'ITX');

-- -------------------------------------------------------
-- CPU coolers
-- -------------------------------------------------------

INSERT INTO cpu_cooler (name, brand, image_link, type, tdp_rating, price) VALUES
  ('NH-D15',            'Noctua',        NULL, 'Air',       250,  99.99),
  ('Dark Rock Pro 4',   'be quiet!',     NULL, 'Air',       250,  89.99),
  ('H150i Elite Capellix','Corsair',     NULL, 'AIO 360mm', 300, 179.99),
  ('Hyper 212 Black',   'Cooler Master', NULL, 'Air',       150,  34.99);

-- which CPU sockets each cooler supports
INSERT INTO cooler_socket (cooler_id, socket) VALUES
  (1, 'LGA1700'),
  (1, 'AM5'),
  (2, 'LGA1700'),
  (2, 'AM5'),
  (3, 'LGA1700'),
  (3, 'AM5'),
  (4, 'LGA1700'),
  (4, 'AM5');
