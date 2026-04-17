-- PRABUDDHA 2026 — Supabase SQL Schema


-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  user_id    SERIAL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  email      VARCHAR(255) UNIQUE NOT NULL,
  phone      VARCHAR(20)  NOT NULL,
  college    VARCHAR(255) NOT NULL,
  year       INT          NOT NULL,
  password   VARCHAR(255) NOT NULL,   -- bcrypt hash
  role       VARCHAR(50)  NOT NULL DEFAULT 'participant'
               CHECK (role IN ('participant','admin','volunteer','faculty','organizer')),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. EVENTS TABLE
CREATE TABLE IF NOT EXISTS events (
  event_id    SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  category    VARCHAR(100) NOT NULL,
  description TEXT         NOT NULL,
  rules       TEXT,
  schedule    TIMESTAMPTZ  NOT NULL,
  venue       VARCHAR(255) NOT NULL,
  prize       VARCHAR(255),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_schedule  ON events(schedule);

-- 3. REGISTRATIONS TABLE
CREATE TABLE IF NOT EXISTS registrations (
  registration_id SERIAL PRIMARY KEY,
  user_id         INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  event_id        INT NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, event_id)   -- prevent duplicate registrations
);

CREATE INDEX IF NOT EXISTS idx_reg_user  ON registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_reg_event ON registrations(event_id);

-- 4. QUERIES TABLE
CREATE TABLE IF NOT EXISTS queries (
  query_id   SERIAL PRIMARY KEY,
  user_id    INT          REFERENCES users(user_id) ON DELETE SET NULL,
  name       VARCHAR(255) NOT NULL,
  email      VARCHAR(255) NOT NULL,
  subject    VARCHAR(255),
  question   TEXT         NOT NULL,
  response   TEXT,
  status     VARCHAR(20)  NOT NULL DEFAULT 'Pending'
               CHECK (status IN ('Pending','Resolved')),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_queries_status ON queries(status);
CREATE INDEX IF NOT EXISTS idx_queries_user   ON queries(user_id);

-- SEED DATA — sample events
INSERT INTO events (name, category, description, rules, schedule, venue, prize) VALUES
(
  'Cook Your Code',
  'Coding',
  'Solve algorithmic challenges in 3 hours. Individual or duo. Test your logic and speed under pressure.',
  'Individual or 2-member teams. Languages: C, C++, Java, Python. No internet during contest. Plagiarism = disqualification.',
  '2026-04-17 09:30:00+05:30',
  'R-213',
  '₹15,000'
),
(
  'Dev Your Web',
  'Web Dev',
  'Build a fully functional responsive website in under 3 hours from a given brief.',
  'Individual or 2-member teams. HTML, CSS, JS and frameworks allowed. Judged on design and functionality.',
  '2026-04-17 10:00:00+05:30',
  'R-211',
  '₹15,000'
),
(
  'Dev Vibe',
  'Web Dev',
  'Design and code a responsive website in 2 hours. No templates allowed.',
  'Individual only. HTML, CSS, JS allowed. No frameworks or templates. Judged on design + functionality.',
  '2026-04-17 14:30:00+05:30',
  'R-309',
  '₹10,000'
),
(
  'Robo Challenge',
  'Robotics',
  'Build and battle your autonomous or RC-controlled robot in the arena.',
  'Teams of 2–4. Robot weight max 5 kg. Battery powered only. Flame weapons not allowed.',
  '2026-04-17 13:30:00+05:30',
  'Arena',
  '₹20,000'
),
(
  'Cypher Climb',
  'Coding',
  'A series of cryptographic puzzles and CTF challenges to crack step by step.',
  'Individual or 2-member teams. 90-minute time limit. Hints cost points.',
  '2026-04-17 14:00:00+05:30',
  'R-218',
  '₹8,000'
)
ON CONFLICT DO NOTHING;