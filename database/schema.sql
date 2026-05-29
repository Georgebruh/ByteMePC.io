-- ByteMePC.io — MAIN DATABASE SCHEMA 
-- runs on PostgreSQL through Supabase
-- Some tables like builds, pinned_builds, and saved_builds are cascaded so that if a user is deleted, their builds are also deleted

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------
-- user profiles
-- each row is tied to a Supabase Auth account
-- the trigger at the bottom auto-creates this on sign-up
-- -------------------------------------------------------

CREATE TABLE profiles (
  user_id    UUID         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username   VARCHAR(50)  UNIQUE NOT NULL,
  avatar_url VARCHAR(500),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- ports lookup table
-- defined early because motherboards and GPUs both reference it
-- -------------------------------------------------------

CREATE TABLE port (
  type VARCHAR(50) PRIMARY KEY
);

-- -------------------------------------------------------
-- pc parts
-- every part has a brand and a price so the budget
-- auto-builder can do its thing
-- -------------------------------------------------------

CREATE TABLE cpu (
  cpu_id       SERIAL        PRIMARY KEY,
  name         VARCHAR(255)  NOT NULL,
  brand        VARCHAR(100)  NOT NULL,
  image_link   VARCHAR(500),
  core_numbers INT           NOT NULL CHECK (core_numbers > 0),
  frequency    FLOAT         NOT NULL CHECK (frequency > 0),    -- GHz
  socket       VARCHAR(50)   NOT NULL,                          -- matched against motherboard.socket
  price        NUMERIC(10,2) NOT NULL CHECK (price >= 0)
);

CREATE TABLE motherboard (
  mb_id      SERIAL        PRIMARY KEY,
  name       VARCHAR(255)  NOT NULL,
  brand      VARCHAR(100)  NOT NULL,
  image_link VARCHAR(500),
  wifi       VARCHAR(50),                                       -- null if no built-in wifi
  socket     VARCHAR(50)   NOT NULL,                            -- must match cpu.socket
  size       VARCHAR(50)   NOT NULL,                            -- ATX, mATX, ITX — matched against pc_case
  ram_slots  INT           NOT NULL CHECK (ram_slots > 0),
  ram_type   VARCHAR(10)   NOT NULL CHECK (ram_type IN ('DDR3', 'DDR4', 'DDR5')), -- must match ram.type
  price      NUMERIC(10,2) NOT NULL CHECK (price >= 0)
);

CREATE TABLE gpu (
  gpu_id     SERIAL        PRIMARY KEY,
  name       VARCHAR(255)  NOT NULL,
  brand      VARCHAR(100)  NOT NULL,
  image_link VARCHAR(500),
  core_clock INT           NOT NULL CHECK (core_clock > 0),    -- MHz
  memory     INT           NOT NULL CHECK (memory > 0),         -- GB
  tdp        INT           NOT NULL CHECK (tdp > 0),            -- watts, used for PSU check
  price      NUMERIC(10,2) NOT NULL CHECK (price >= 0)
);

CREATE TABLE ram (
  ram_id     SERIAL        PRIMARY KEY,
  name       VARCHAR(255)  NOT NULL,
  brand      VARCHAR(100)  NOT NULL,
  image_link VARCHAR(500),
  type       VARCHAR(10)   NOT NULL CHECK (type IN ('DDR3', 'DDR4', 'DDR5')), -- must match motherboard.ram_type
  capacity   INT           NOT NULL CHECK (capacity > 0),       -- GB
  speed      FLOAT         NOT NULL CHECK (speed > 0),           -- MHz
  price      NUMERIC(10,2) NOT NULL CHECK (price >= 0)
);

CREATE TABLE psu (
  psu_id            SERIAL        PRIMARY KEY,
  name              VARCHAR(255)  NOT NULL,
  brand             VARCHAR(100)  NOT NULL,
  image_link        VARCHAR(500),
  wattage           INT           NOT NULL CHECK (wattage > 0),
  form_factor       VARCHAR(50)   NOT NULL,                      -- ATX, SFX, etc.
  efficiency_rating VARCHAR(50)   NOT NULL,                      -- 80+ Gold, Platinum, etc.
  price             NUMERIC(10,2) NOT NULL CHECK (price >= 0)
);

CREATE TABLE storage (
  storage_id  SERIAL        PRIMARY KEY,
  name        VARCHAR(255)  NOT NULL,
  brand       VARCHAR(100)  NOT NULL,
  image_link  VARCHAR(500),
  type        VARCHAR(20)   NOT NULL CHECK (type IN ('SSD', 'HDD', 'NVMe')),
  capacity    INT           NOT NULL CHECK (capacity > 0),       -- GB
  interface   VARCHAR(50)   NOT NULL,                            -- SATA III, M.2 NVMe, M.2 SATA
  read_speed  INT,                                               -- MB/s, nullable for HDDs
  write_speed INT,                                               -- MB/s, nullable for HDDs
  price       NUMERIC(10,2) NOT NULL CHECK (price >= 0)
);

-- case is a reserved SQL word so we use pc_case
CREATE TABLE pc_case (
  case_id    SERIAL        PRIMARY KEY,
  name       VARCHAR(255)  NOT NULL,
  brand      VARCHAR(100)  NOT NULL,
  image_link VARCHAR(500),
  price      NUMERIC(10,2) NOT NULL CHECK (price >= 0)
);

-- which motherboard form factors fit inside a case (ATX, mATX, ITX)
-- a case can support multiple sizes, so this is a junction
CREATE TABLE case_supported_size (
  case_id INT         NOT NULL REFERENCES pc_case(case_id) ON DELETE CASCADE,
  size    VARCHAR(50) NOT NULL,
  PRIMARY KEY (case_id, size)
);

CREATE TABLE cpu_cooler (
  cooler_id  SERIAL        PRIMARY KEY,
  name       VARCHAR(255)  NOT NULL,
  brand      VARCHAR(100)  NOT NULL,
  image_link VARCHAR(500),
  type       VARCHAR(50)   NOT NULL,  -- Air, AIO 120mm, AIO 240mm, AIO 360mm
  tdp_rating INT           NOT NULL CHECK (tdp_rating > 0), -- max TDP it can dissipate in watts
  price      NUMERIC(10,2) NOT NULL CHECK (price >= 0)
);

-- a cooler can support multiple CPU sockets (e.g. LGA1700 and AM5)
CREATE TABLE cooler_socket (
  cooler_id INT         NOT NULL REFERENCES cpu_cooler(cooler_id) ON DELETE CASCADE,
  socket    VARCHAR(50) NOT NULL,
  PRIMARY KEY (cooler_id, socket)
);

-- -------------------------------------------------------
-- port junctions
-- which ports does each motherboard / GPU actually expose?
-- -------------------------------------------------------

CREATE TABLE motherboard_port (
  mb_id      INT         NOT NULL REFERENCES motherboard(mb_id) ON DELETE CASCADE,
  port_type  VARCHAR(50) NOT NULL REFERENCES port(type)         ON DELETE CASCADE,
  quantity   INT         NOT NULL DEFAULT 1 CHECK (quantity > 0),
  PRIMARY KEY (mb_id, port_type)
);

CREATE TABLE gpu_port (
  gpu_id    INT         NOT NULL REFERENCES gpu(gpu_id)  ON DELETE CASCADE,
  port_type VARCHAR(50) NOT NULL REFERENCES port(type)   ON DELETE CASCADE,
  quantity  INT         NOT NULL DEFAULT 1 CHECK (quantity > 0),
  PRIMARY KEY (gpu_id, port_type)
);

-- -------------------------------------------------------
-- saved pc builds
-- -------------------------------------------------------

-- a build is a named collection of parts belonging to one user
-- all part slots are nullable so the user can save mid-session
-- if a part gets removed from the catalogue, SET NULL keeps the build intact
CREATE TABLE builds (
  build_id    UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID          NOT NULL REFERENCES profiles(user_id)   ON DELETE CASCADE,
  name        VARCHAR(255)  NOT NULL,
  cpu_id      INT           REFERENCES cpu(cpu_id)         ON DELETE SET NULL,
  mb_id       INT           REFERENCES motherboard(mb_id)  ON DELETE SET NULL,
  gpu_id      INT           REFERENCES gpu(gpu_id)         ON DELETE SET NULL,
  psu_id      INT           REFERENCES psu(psu_id)         ON DELETE SET NULL,
  case_id     INT           REFERENCES pc_case(case_id)    ON DELETE SET NULL,
  cooler_id   INT           REFERENCES cpu_cooler(cooler_id) ON DELETE SET NULL,
  is_public   BOOLEAN       NOT NULL DEFAULT FALSE,
  views       INT           NOT NULL DEFAULT 0,                      -- incremented when someone views a public build
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- RAM gets its own junction because a build can have multiple sticks
-- e.g. 2x 16GB of the same kit = quantity 2, or two different kits as separate rows
CREATE TABLE build_ram (
  build_id UUID NOT NULL REFERENCES builds(build_id)  ON DELETE CASCADE,
  ram_id   INT  NOT NULL REFERENCES ram(ram_id)       ON DELETE CASCADE,
  quantity INT  NOT NULL DEFAULT 1 CHECK (quantity > 0),
  PRIMARY KEY (build_id, ram_id)
);

-- storage also gets a junction because a build can have multiple drives
-- e.g. one NVMe for the OS and one HDD for bulk storage
CREATE TABLE build_storage (
  build_id   UUID NOT NULL REFERENCES builds(build_id)      ON DELETE CASCADE,
  storage_id INT  NOT NULL REFERENCES storage(storage_id)   ON DELETE CASCADE,
  quantity   INT  NOT NULL DEFAULT 1 CHECK (quantity > 0),
  PRIMARY KEY (build_id, storage_id)
);

-- -------------------------------------------------------
-- favourites — users can heart any public build
-- -------------------------------------------------------

CREATE TABLE favorite_builds (
  user_id      UUID        NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  build_id     UUID        NOT NULL REFERENCES builds(build_id)  ON DELETE CASCADE,
  favorited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, build_id)
);

-- -------------------------------------------------------
-- pinned components — bookmark individual parts for quick access
-- one table per part type keeps foreign keys strict and enforced
-- -------------------------------------------------------

CREATE TABLE pinned_cpus (
  user_id   UUID        NOT NULL REFERENCES profiles(user_id)     ON DELETE CASCADE,
  cpu_id    INT         NOT NULL REFERENCES cpu(cpu_id)           ON DELETE CASCADE,
  pinned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, cpu_id)
);

CREATE TABLE pinned_gpus (
  user_id   UUID        NOT NULL REFERENCES profiles(user_id)     ON DELETE CASCADE,
  gpu_id    INT         NOT NULL REFERENCES gpu(gpu_id)           ON DELETE CASCADE,
  pinned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, gpu_id)
);

CREATE TABLE pinned_motherboards (
  user_id   UUID        NOT NULL REFERENCES profiles(user_id)     ON DELETE CASCADE,
  mb_id     INT         NOT NULL REFERENCES motherboard(mb_id)    ON DELETE CASCADE,
  pinned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, mb_id)
);

CREATE TABLE pinned_rams (
  user_id   UUID        NOT NULL REFERENCES profiles(user_id)     ON DELETE CASCADE,
  ram_id    INT         NOT NULL REFERENCES ram(ram_id)           ON DELETE CASCADE,
  pinned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, ram_id)
);

CREATE TABLE pinned_psus (
  user_id   UUID        NOT NULL REFERENCES profiles(user_id)     ON DELETE CASCADE,
  psu_id    INT         NOT NULL REFERENCES psu(psu_id)           ON DELETE CASCADE,
  pinned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, psu_id)
);

CREATE TABLE pinned_storages (
  user_id    UUID        NOT NULL REFERENCES profiles(user_id)    ON DELETE CASCADE,
  storage_id INT         NOT NULL REFERENCES storage(storage_id)  ON DELETE CASCADE,
  pinned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, storage_id)
);

CREATE TABLE pinned_cases (
  user_id   UUID        NOT NULL REFERENCES profiles(user_id)     ON DELETE CASCADE,
  case_id   INT         NOT NULL REFERENCES pc_case(case_id)      ON DELETE CASCADE,
  pinned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, case_id)
);

CREATE TABLE pinned_coolers (
  user_id   UUID        NOT NULL REFERENCES profiles(user_id)     ON DELETE CASCADE,
  cooler_id INT         NOT NULL REFERENCES cpu_cooler(cooler_id) ON DELETE CASCADE,
  pinned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, cooler_id)
);

-- -------------------------------------------------------
-- triggers
-- -------------------------------------------------------

-- whenever a build row changes, update its timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER builds_updated_at
  BEFORE UPDATE ON builds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- when someone signs up, immediately give them a profile row
-- uses their supplied username, or falls back to the email prefix
--
-- search_path is pinned explicitly because the trigger fires under the
-- auth schema and SECURITY DEFINER functions don't inherit the caller's
-- path. Without this, INSERT INTO profiles raises "relation does not
-- exist" and the whole /signup request returns 500.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- top_favourited_builds: return the top N public builds ranked by favourite count.
-- SECURITY DEFINER bypasses the per-owner RLS on favorite_builds so anyone
-- (including signed-out visitors on the landing page) can see popularity
-- without exposing *who* favourited what.
CREATE OR REPLACE FUNCTION public.top_favourited_builds(limit_count INT DEFAULT 3)
RETURNS TABLE (build_id UUID, fav_count BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT b.build_id, COALESCE(COUNT(fb.user_id), 0) AS fav_count
  FROM builds b
  LEFT JOIN favorite_builds fb ON fb.build_id = b.build_id
  WHERE b.is_public = TRUE
  GROUP BY b.build_id
  ORDER BY fav_count DESC, b.updated_at DESC
  LIMIT limit_count;
$$;

GRANT EXECUTE ON FUNCTION public.top_favourited_builds(INT) TO anon, authenticated;

-- -------------------------------------------------------
-- this is the RLS PART
-- row level security — nobody reads or writes data that isn't theirs.
-- catalogue + lookup tables keep RLS on (Supabase advisor flags any public
-- table without it) and get a permissive SELECT policy below so anyone can
-- browse parts without signing in. writes to those tables happen via the
-- service role (seed scripts / admin), never from the SPA.
-- -------------------------------------------------------

ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE builds              ENABLE ROW LEVEL SECURITY;
ALTER TABLE build_ram           ENABLE ROW LEVEL SECURITY;
ALTER TABLE build_storage       ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_builds     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pinned_cpus         ENABLE ROW LEVEL SECURITY;
ALTER TABLE pinned_gpus         ENABLE ROW LEVEL SECURITY;
ALTER TABLE pinned_motherboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE pinned_rams         ENABLE ROW LEVEL SECURITY;
ALTER TABLE pinned_psus         ENABLE ROW LEVEL SECURITY;
ALTER TABLE pinned_storages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pinned_cases        ENABLE ROW LEVEL SECURITY;
ALTER TABLE pinned_coolers      ENABLE ROW LEVEL SECURITY;

-- catalogue + lookup + junction tables
ALTER TABLE cpu                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE motherboard         ENABLE ROW LEVEL SECURITY;
ALTER TABLE gpu                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE ram                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE psu                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage             ENABLE ROW LEVEL SECURITY;
ALTER TABLE pc_case             ENABLE ROW LEVEL SECURITY;
ALTER TABLE cpu_cooler          ENABLE ROW LEVEL SECURITY;
ALTER TABLE port                ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_supported_size ENABLE ROW LEVEL SECURITY;
ALTER TABLE cooler_socket       ENABLE ROW LEVEL SECURITY;
ALTER TABLE motherboard_port    ENABLE ROW LEVEL SECURITY;
ALTER TABLE gpu_port            ENABLE ROW LEVEL SECURITY;

-- your profile should be yours alone
CREATE POLICY "profiles: owner select" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "profiles: owner update" ON profiles FOR UPDATE USING (auth.uid() = user_id);

-- public builds are visible to everyone; private builds only to the owner
CREATE POLICY "builds: public or owner select"
  ON builds FOR SELECT
  USING (is_public = TRUE OR auth.uid() = user_id);

CREATE POLICY "builds: owner insert"
  ON builds FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "builds: owner update"
  ON builds FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "builds: owner delete"
  ON builds FOR DELETE
  USING (auth.uid() = user_id);

-- build_ram and build_storage follow the same visibility as their parent build
CREATE POLICY "build_ram: readable if build is accessible"
  ON build_ram FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM builds b
      WHERE b.build_id = build_ram.build_id
        AND (b.is_public = TRUE OR b.user_id = auth.uid())
    )
  );

CREATE POLICY "build_ram: owner all"
  ON build_ram FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM builds b
      WHERE b.build_id = build_ram.build_id
        AND b.user_id = auth.uid()
    )
  );

CREATE POLICY "build_storage: readable if build is accessible"
  ON build_storage FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM builds b
      WHERE b.build_id = build_storage.build_id
        AND (b.is_public = TRUE OR b.user_id = auth.uid())
    )
  );

CREATE POLICY "build_storage: owner all"
  ON build_storage FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM builds b
      WHERE b.build_id = build_storage.build_id
        AND b.user_id = auth.uid()
    )
  );

-- favourites and all pinned tables are completely private to each user
CREATE POLICY "favorites: owner all"           ON favorite_builds    FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "pinned_cpus: owner all"         ON pinned_cpus         FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "pinned_gpus: owner all"         ON pinned_gpus         FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "pinned_motherboards: owner all" ON pinned_motherboards FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "pinned_rams: owner all"         ON pinned_rams         FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "pinned_psus: owner all"         ON pinned_psus         FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "pinned_storages: owner all"     ON pinned_storages     FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "pinned_cases: owner all"        ON pinned_cases        FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "pinned_coolers: owner all"      ON pinned_coolers      FOR ALL USING (auth.uid() = user_id);

-- catalogue + lookup + junction tables: world-readable to anon + authenticated.
-- no INSERT/UPDATE/DELETE policies exist for these, so any write attempt from
-- the SPA's anon/auth keys is blocked by default — only the service role bypasses RLS.
CREATE POLICY "cpu: public read"                 ON cpu                 FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "motherboard: public read"         ON motherboard         FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "gpu: public read"                 ON gpu                 FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "ram: public read"                 ON ram                 FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "psu: public read"                 ON psu                 FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "storage: public read"             ON storage             FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "pc_case: public read"             ON pc_case             FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "cpu_cooler: public read"          ON cpu_cooler          FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "port: public read"                ON port                FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "case_supported_size: public read" ON case_supported_size FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "cooler_socket: public read"       ON cooler_socket       FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "motherboard_port: public read"    ON motherboard_port    FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "gpu_port: public read"            ON gpu_port            FOR SELECT TO anon, authenticated USING (TRUE);
