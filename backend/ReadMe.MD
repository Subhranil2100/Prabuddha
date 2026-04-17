PRABUDDHA 2026 — Backend API
Node.js + Express backend with Supabase (PostgreSQL) for the PRABUDDHA 2026 Tech Fest website.

# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_SERVICE_KEY, JWT_SECRET

# 3. Run SQL schema in Supabase SQL Editor
#    → paste contents of schema.sql

# 4. Start the server
npm run dev        # development (nodemon)
npm start          # production
Project Structure
prabuddha-backend/
├── server.js               # Entry point
├── schema.sql              # Supabase SQL (run once)
├── .env.example
├── config/
│   └── supabase.js         # Supabase client
├── middleware/
│   └── auth.js             # JWT protect + restrictTo
└── routes/
    ├── auth.js             # /api/auth
    ├── events.js           # /api/events
    ├── registrations.js    # /api/registrations
    ├── queries.js          # /api/queries
    └── users.js            # /api/users
API Endpoints
Auth
Method	URL	Auth	Description
POST	/api/auth/register	—	Register new user
POST	/api/auth/login	—	Login, receive JWT
Register body:

{
  "name": "Rahul Das",
  "email": "rahul@example.com",
  "phone": "9876543210",
  "college": "TINT",
  "year": 3,
  "password": "secret123",
  "role": "participant"   // optional, default: participant
}
Login body:

{ "email": "rahul@example.com", "password": "secret123" }
Events (Public read, Admin write)
Method	URL	Auth	Description
GET	/api/events	—	List all events
GET	/api/events/:id	—	Single event
POST	/api/events	admin/organizer	Create event
PUT	/api/events/:id	admin/organizer	Update event
DELETE	/api/events/:id	admin/organizer	Delete event
Query params for GET /api/events:

?category=Coding — filter by category
?search=robot — search name + description
?upcoming=true — only future events
?sort=schedule&order=asc — sort (schedule / name / category)
Registrations
Method	URL	Auth	Description
POST	/api/registrations	user	Register for event(s)
GET	/api/registrations/me	user	My registrations
GET	/api/registrations	admin/organizer	All registrations
DELETE	/api/registrations/:id	user/admin	Cancel registration
Register body:

{ "event_ids": [1, 3] }
Queries (Contact form)
Method	URL	Auth	Description
POST	/api/queries	—	Submit a query
GET	/api/queries	admin/organizer	View all queries
PUT	/api/queries/:id/respond	admin/organizer	Respond + resolve
Submit body:

{
  "name": "Priya",
  "email": "priya@example.com",
  "subject": "Event Details",
  "question": "What is the team size for Robo Challenge?"
}
Respond body:

{ "response": "Teams of 2–4 members are allowed." }
Users
Method	URL	Auth	Description
GET	/api/users/me	user	Own profile
GET	/api/users	admin/organizer	All users
GET	/api/users/:id	admin/organizer	Single user
PUT	/api/users/:id/role	admin	Change user role
Connecting the Frontend
In your index.html / JS, replace the dummy submitReg and submitQuery functions:

// Registration form submit
async function submitReg(e) {
  e.preventDefault();
  const token = localStorage.getItem('prabuddha_token');
  const payload = {
    name:     e.target.name.value,
    email:    e.target.email.value,
    phone:    e.target.phone.value,
    college:  e.target.college.value,
    year:     parseInt(e.target.year.value),
    password: e.target.password.value,
    role:     e.target.role.value || 'participant',
  };

  // Step 1: register user account
  const res = await fetch('http://localhost:5000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) { alert(data.error); return; }

  localStorage.setItem('prabuddha_token', data.token);

  // Step 2: register for selected events
  const selectedEvents = [...e.target.events.selectedOptions].map(o => parseInt(o.value));
  if (selectedEvents.length) {
    await fetch('http://localhost:5000/api/registrations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${data.token}`,
      },
      body: JSON.stringify({ event_ids: selectedEvents }),
    });
  }

  document.getElementById('successMsg').style.display = 'block';
  e.target.reset();
}

// Contact / query form submit
async function submitQuery(e) {
  e.preventDefault();
  const res = await fetch('http://localhost:5000/api/queries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name:     e.target[0].value,
      email:    e.target[1].value,
      subject:  e.target[2].value,
      question: e.target[3].value,
    }),
  });
  if (res.ok) {
    document.getElementById('querySuccess').style.display = 'block';
    e.target.reset();
  }
}

// Load events dynamically from backend
async function fetchEvents(filter = 'all') {
  const url = filter === 'all'
    ? 'http://localhost:5000/api/events'
    : `http://localhost:5000/api/events?category=${encodeURIComponent(filter)}`;
  const res  = await fetch(url);
  const data = await res.json();
  return data.events;
}