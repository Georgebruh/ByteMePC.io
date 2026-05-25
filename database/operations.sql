-- ByteMePC.io common operations reference
-- INSERT and DELETE patterns for every table
-- replace placeholder values (marked with <>) before use


-- -------------------------------------------------------
-- profiles
-- -------------------------------------------------------

-- profiles are auto-created on sign-up via trigger, but here's the manual form:
INSERT INTO profiles (user_id, username)
VALUES ('<uuid>', '<username>');

-- update avatar
UPDATE profiles SET avatar_url = '<url>' WHERE user_id = '<uuid>';

-- delete a profile — cascades to builds, favorites, and all pinned tables
DELETE FROM profiles WHERE user_id = '<uuid>';


-- -------------------------------------------------------
-- pc parts — INSERT
-- -------------------------------------------------------

INSERT INTO cpu (name, brand, image_link, core_numbers, frequency, socket, price)
VALUES ('<name>', '<brand>', '<image_url_or_null>', <cores>, <ghz>, '<socket>', <price>);

INSERT INTO motherboard (name, brand, image_link, wifi, socket, size, ram_slots, ram_type, price)
VALUES ('<name>', '<brand>', '<image_url_or_null>', '<wifi_or_null>', '<socket>', '<ATX|mATX|ITX>', <slots>, '<DDR4|DDR5>', <price>);

INSERT INTO gpu (name, brand, image_link, core_clock, memory, tdp, price)
VALUES ('<name>', '<brand>', '<image_url_or_null>', <mhz>, <gb_vram>, <tdp_watts>, <price>);

INSERT INTO ram (name, brand, image_link, type, capacity, speed, price)
VALUES ('<name>', '<brand>', '<image_url_or_null>', '<DDR4|DDR5>', <gb>, <mhz>, <price>);

INSERT INTO psu (name, brand, image_link, wattage, form_factor, efficiency_rating, price)
VALUES ('<name>', '<brand>', '<image_url_or_null>', <watts>, '<ATX|SFX>', '<80+ Gold|80+ Platinum|etc>', <price>);

INSERT INTO storage (name, brand, image_link, type, capacity, interface, read_speed, write_speed, price)
VALUES ('<name>', '<brand>', '<image_url_or_null>', '<SSD|HDD|NVMe>', <gb>, '<SATA III|M.2 NVMe|M.2 SATA>', <read_or_null>, <write_or_null>, <price>);

INSERT INTO pc_case (name, brand, image_link, price)
VALUES ('<name>', '<brand>', '<image_url_or_null>', <price>);

-- then add which sizes it supports (run once per supported size)
INSERT INTO case_supported_size (case_id, size) VALUES (<case_id>, '<ATX|mATX|ITX>');

INSERT INTO cpu_cooler (name, brand, image_link, type, tdp_rating, price)
VALUES ('<name>', '<brand>', '<image_url_or_null>', '<Air|AIO 120mm|AIO 240mm|AIO 360mm>', <max_tdp_watts>, <price>);

-- then add which sockets it fits (run once per supported socket)
INSERT INTO cooler_socket (cooler_id, socket) VALUES (<cooler_id>, '<LGA1700|AM5|etc>');

INSERT INTO port (type) VALUES ('<port_name>');

-- port assignments for motherboards and GPUs
INSERT INTO motherboard_port (mb_id, port_type, quantity) VALUES (<mb_id>, '<port_type>', <qty>);
INSERT INTO gpu_port          (gpu_id, port_type, quantity) VALUES (<gpu_id>, '<port_type>', <qty>);


-- -------------------------------------------------------
-- pc parts — DELETE
-- -------------------------------------------------------

-- deleting a part NULLs it out in any builds (ON DELETE SET NULL)
-- junction rows (ports, sockets, sizes) are removed automatically (ON DELETE CASCADE)

DELETE FROM cpu         WHERE cpu_id     = <id>;
DELETE FROM motherboard WHERE mb_id      = <id>;
DELETE FROM gpu         WHERE gpu_id     = <id>;
DELETE FROM ram         WHERE ram_id     = <id>;
DELETE FROM psu         WHERE psu_id     = <id>;
DELETE FROM storage     WHERE storage_id = <id>;
DELETE FROM pc_case     WHERE case_id    = <id>;
DELETE FROM cpu_cooler  WHERE cooler_id  = <id>;
DELETE FROM port        WHERE type       = '<port_name>';

-- remove a single port assignment
DELETE FROM motherboard_port    WHERE mb_id     = <mb_id>     AND port_type = '<port_type>';
DELETE FROM gpu_port            WHERE gpu_id    = <gpu_id>    AND port_type = '<port_type>';

-- remove a single size from a case
DELETE FROM case_supported_size WHERE case_id   = <case_id>   AND size      = '<size>';

-- remove a socket from a cooler
DELETE FROM cooler_socket       WHERE cooler_id = <cooler_id> AND socket    = '<socket>';


-- -------------------------------------------------------
-- builds — INSERT
-- -------------------------------------------------------

-- step 1: create the build (parts are optional — NULL until the user picks them)
INSERT INTO builds (user_id, name, description, budget, cpu_id, mb_id, gpu_id, psu_id, case_id, cooler_id, is_public)
VALUES (
  '<user_uuid>',
  '<build_name>',
  '<description_or_null>',
  <budget_or_null>,
  <cpu_id_or_null>,
  <mb_id_or_null>,
  <gpu_id_or_null>,
  <psu_id_or_null>,
  <case_id_or_null>,
  <cooler_id_or_null>,
  FALSE
)
RETURNING build_id;  -- grab this UUID for the next steps

-- step 2: attach RAM sticks (one row per RAM model)
INSERT INTO build_ram (build_id, ram_id, quantity)
VALUES ('<build_uuid>', <ram_id>, <qty>);

-- step 3: attach storage drives (one row per drive model)
INSERT INTO build_storage (build_id, storage_id, quantity)
VALUES ('<build_uuid>', <storage_id>, <qty>);

-- swap out a single part
UPDATE builds
SET cpu_id    = <new_cpu_id>,
    updated_at = NOW()
WHERE build_id = '<build_uuid>' AND user_id = '<user_uuid>';

-- make a build public or private
UPDATE builds SET is_public = TRUE  WHERE build_id = '<build_uuid>';
UPDATE builds SET is_public = FALSE WHERE build_id = '<build_uuid>';

-- bump the view counter when someone opens a public build
UPDATE builds SET views = views + 1 WHERE build_id = '<build_uuid>';

-- swap a RAM stick
DELETE FROM build_ram WHERE build_id = '<build_uuid>' AND ram_id = <old_ram_id>;
INSERT INTO build_ram (build_id, ram_id, quantity) VALUES ('<build_uuid>', <new_ram_id>, <qty>);

-- swap a storage drive
DELETE FROM build_storage WHERE build_id = '<build_uuid>' AND storage_id = <old_storage_id>;
INSERT INTO build_storage (build_id, storage_id, quantity) VALUES ('<build_uuid>', <new_storage_id>, <qty>);


-- -------------------------------------------------------
-- builds — DELETE
-- -------------------------------------------------------

-- delete an entire build (cascades to build_ram, build_storage, favorite_builds)
DELETE FROM builds WHERE build_id = '<build_uuid>' AND user_id = '<user_uuid>';

-- remove just a RAM stick from a build
DELETE FROM build_ram WHERE build_id = '<build_uuid>' AND ram_id = <ram_id>;

-- remove just a storage drive from a build
DELETE FROM build_storage WHERE build_id = '<build_uuid>' AND storage_id = <storage_id>;


-- -------------------------------------------------------
-- favourites — INSERT / DELETE
-- -------------------------------------------------------

INSERT INTO favorite_builds (user_id, build_id) VALUES ('<user_uuid>', '<build_uuid>');

DELETE FROM favorite_builds WHERE user_id = '<user_uuid>' AND build_id = '<build_uuid>';


-- -------------------------------------------------------
-- pinned components — INSERT / DELETE
-- -------------------------------------------------------

-- pin
INSERT INTO pinned_cpus         (user_id, cpu_id)     VALUES ('<user_uuid>', <cpu_id>);
INSERT INTO pinned_gpus         (user_id, gpu_id)     VALUES ('<user_uuid>', <gpu_id>);
INSERT INTO pinned_motherboards (user_id, mb_id)      VALUES ('<user_uuid>', <mb_id>);
INSERT INTO pinned_rams         (user_id, ram_id)     VALUES ('<user_uuid>', <ram_id>);
INSERT INTO pinned_psus         (user_id, psu_id)     VALUES ('<user_uuid>', <psu_id>);
INSERT INTO pinned_storages     (user_id, storage_id) VALUES ('<user_uuid>', <storage_id>);
INSERT INTO pinned_cases        (user_id, case_id)    VALUES ('<user_uuid>', <case_id>);
INSERT INTO pinned_coolers      (user_id, cooler_id)  VALUES ('<user_uuid>', <cooler_id>);

-- unpin
DELETE FROM pinned_cpus         WHERE user_id = '<user_uuid>' AND cpu_id     = <cpu_id>;
DELETE FROM pinned_gpus         WHERE user_id = '<user_uuid>' AND gpu_id     = <gpu_id>;
DELETE FROM pinned_motherboards WHERE user_id = '<user_uuid>' AND mb_id      = <mb_id>;
DELETE FROM pinned_rams         WHERE user_id = '<user_uuid>' AND ram_id     = <ram_id>;
DELETE FROM pinned_psus         WHERE user_id = '<user_uuid>' AND psu_id     = <psu_id>;
DELETE FROM pinned_storages     WHERE user_id = '<user_uuid>' AND storage_id = <storage_id>;
DELETE FROM pinned_cases        WHERE user_id = '<user_uuid>' AND case_id    = <case_id>;
DELETE FROM pinned_coolers      WHERE user_id = '<user_uuid>' AND cooler_id  = <cooler_id>;


-- -------------------------------------------------------
-- compatibility queries
-- -------------------------------------------------------

-- CPUs that fit a given motherboard
SELECT c.*
FROM cpu c
JOIN motherboard mb ON mb.socket = c.socket
WHERE mb.mb_id = <mb_id>
ORDER BY c.price;

-- motherboards that accept a given CPU
SELECT mb.*
FROM motherboard mb
JOIN cpu c ON c.socket = mb.socket
WHERE c.cpu_id = <cpu_id>
ORDER BY mb.price;

-- RAM that works in a given motherboard
SELECT r.*
FROM ram r
JOIN motherboard mb ON mb.ram_type = r.type
WHERE mb.mb_id = <mb_id>
ORDER BY r.price;

-- coolers that fit a given CPU socket
SELECT cc.*
FROM cpu_cooler cc
JOIN cooler_socket cs ON cs.cooler_id = cc.cooler_id
JOIN cpu c ON c.socket = cs.socket
WHERE c.cpu_id = <cpu_id>
ORDER BY cc.price;

-- cases that accept a given motherboard size
SELECT pc.*
FROM pc_case pc
JOIN case_supported_size css ON css.case_id = pc.case_id
JOIN motherboard mb ON mb.size = css.size
WHERE mb.mb_id = <mb_id>
ORDER BY pc.price;

-- is the PSU powerful enough for the selected CPU + GPU?
SELECT
  b.build_id,
  b.name,
  p.wattage                           AS psu_watts,
  COALESCE(g.tdp, 0)                  AS gpu_tdp,
  COALESCE(c.core_numbers * 15, 0)    AS cpu_tdp_estimate,
  COALESCE(g.tdp, 0) + COALESCE(c.core_numbers * 15, 0) AS total_tdp,
  p.wattage >= (COALESCE(g.tdp, 0) + COALESCE(c.core_numbers * 15, 0)) AS psu_ok
FROM builds b
LEFT JOIN cpu c  ON c.cpu_id  = b.cpu_id
LEFT JOIN gpu g  ON g.gpu_id  = b.gpu_id
LEFT JOIN psu p  ON p.psu_id  = b.psu_id
WHERE b.build_id = '<build_uuid>';

-- all public builds with full part names (good for the public feed)
SELECT
  b.build_id,
  b.name        AS build_name,
  b.views,
  pr.username,
  c.name        AS cpu,
  mb.name       AS motherboard,
  g.name        AS gpu,
  p.name        AS psu,
  ca.name       AS case_name,
  co.name       AS cooler,
  b.created_at
FROM builds b
JOIN  profiles    pr ON pr.user_id  = b.user_id
LEFT JOIN cpu      c  ON c.cpu_id   = b.cpu_id
LEFT JOIN motherboard mb ON mb.mb_id = b.mb_id
LEFT JOIN gpu      g  ON g.gpu_id   = b.gpu_id
LEFT JOIN psu      p  ON p.psu_id   = b.psu_id
LEFT JOIN pc_case  ca ON ca.case_id  = b.case_id
LEFT JOIN cpu_cooler co ON co.cooler_id = b.cooler_id
WHERE b.is_public = TRUE
ORDER BY b.views DESC, b.created_at DESC;

-- total price of a build (sum all parts including RAM and storage)
SELECT
  b.build_id,
  b.name,
  b.budget,
  COALESCE(c.price,  0)
  + COALESCE(mb.price, 0)
  + COALESCE(g.price,  0)
  + COALESCE(p.price,  0)
  + COALESCE(ca.price, 0)
  + COALESCE(co.price, 0)
  + COALESCE(ram_total.total, 0)
  + COALESCE(sto_total.total, 0) AS total_price
FROM builds b
LEFT JOIN cpu         c  ON c.cpu_id     = b.cpu_id
LEFT JOIN motherboard mb ON mb.mb_id     = b.mb_id
LEFT JOIN gpu         g  ON g.gpu_id     = b.gpu_id
LEFT JOIN psu         p  ON p.psu_id     = b.psu_id
LEFT JOIN pc_case     ca ON ca.case_id   = b.case_id
LEFT JOIN cpu_cooler  co ON co.cooler_id = b.cooler_id
LEFT JOIN (
  SELECT br.build_id, SUM(r.price * br.quantity) AS total
  FROM build_ram br JOIN ram r ON r.ram_id = br.ram_id
  GROUP BY br.build_id
) ram_total ON ram_total.build_id = b.build_id
LEFT JOIN (
  SELECT bs.build_id, SUM(s.price * bs.quantity) AS total
  FROM build_storage bs JOIN storage s ON s.storage_id = bs.storage_id
  GROUP BY bs.build_id
) sto_total ON sto_total.build_id = b.build_id
WHERE b.build_id = '<build_uuid>';

-- a user's favourited builds
SELECT b.*, pr.username
FROM favorite_builds fb
JOIN builds   b  ON b.build_id  = fb.build_id
JOIN profiles pr ON pr.user_id  = b.user_id
WHERE fb.user_id = '<user_uuid>'
ORDER BY fb.favorited_at DESC;
