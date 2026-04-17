let currentUser = null;
let currentToken = null;

function loadAuthState() {
  const token = localStorage.getItem('prabuddha_token');
  const user  = localStorage.getItem('prabuddha_user');
  if (token && user) {
    try {
      currentToken = token;
      currentUser  = JSON.parse(user);
    } catch {
      clearAuthState();
    }
  }
}

function saveAuthState(token, user) {
  currentToken = token;
  currentUser  = user;
  localStorage.setItem('prabuddha_token', token);
  localStorage.setItem('prabuddha_user',  JSON.stringify(user));
}

function clearAuthState() {
  currentToken = null;
  currentUser  = null;
  localStorage.removeItem('prabuddha_token');
  localStorage.removeItem('prabuddha_user');
}

function isLoggedIn() {
  return !!currentToken && !!currentUser;
}

function updateAuthUI() {
  const navAuth = document.getElementById('navAuth');
  if (isLoggedIn()) {
    navAuth.innerHTML = `
      <span class="nav-user-info">👤 ${currentUser.name || currentUser.email}</span>
      <button class="btn-nav-logout" onclick="logout()">Logout</button>
    `;
    document.getElementById('loggedInPanel').style.display = 'block';
    document.getElementById('authTabs').style.display      = 'none';
    document.getElementById('panelRegister').style.display = 'none';
    document.getElementById('panelLogin').style.display    = 'none';
    document.getElementById('loggedInName').textContent    = currentUser.name  || '—';
    document.getElementById('loggedInEmail').textContent   = currentUser.email || '—';
    loadMyRegistrations();
    populateExtraEventsCheckboxes();
  } else {
    navAuth.innerHTML = `
      <button class="btn-nav-login" onclick="switchAuthTab('login')">Login</button>
      <a href="#register" class="nav-cta">Register Now</a>
    `;
    document.getElementById('loggedInPanel').style.display = 'none';
    document.getElementById('authTabs').style.display      = 'flex';
    document.getElementById('myRegsSection').style.display = 'none';
    switchAuthTab('register');
  }
}

async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (currentToken) headers['Authorization'] = `Bearer ${currentToken}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

let allEvents = [];   // cache

async function loadEvents(category) {
  const grid = document.getElementById('eventsGrid');
  grid.innerHTML = '<div class="events-loading"><span class="spinner"></span> LOADING EVENTS...</div>';

  try {
    const url = category && category !== 'all'
      ? `/api/events?category=${encodeURIComponent(category)}`
      : '/api/events';
    const { ok, data } = await apiFetch(url);
    if (!ok) throw new Error(data.error || 'Failed to fetch events');

    allEvents = data.events || [];
    renderEventCards(allEvents);
    populateEventCheckboxes();     // keep checkboxes in sync
  } catch (err) {
    grid.innerHTML = `<div class="events-error">⚠ Could not load events from server.<br><small>${err.message}</small></div>`;
    // Fallback to static data so the page isn't empty
    allEvents = staticFallbackEvents;
    renderEventCards(allEvents);
    populateEventCheckboxes();
  }
}

function renderEventCards(events) {
  const grid = document.getElementById('eventsGrid');
  if (!events.length) {
    grid.innerHTML = '<div class="events-loading" style="color:var(--muted)">No events found.</div>';
    return;
  }
  grid.innerHTML = events.map(e => {
    const schedDate = e.schedule ? new Date(e.schedule) : null;
    const timeStr   = schedDate
      ? schedDate.toLocaleDateString('en-IN', { month:'short', day:'numeric' }) + ', ' +
        schedDate.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })
      : '—';
    // Rules as array
    const rulesArr = e.rules
      ? e.rules.split(/\.\s+|\n/).map(r => r.trim()).filter(Boolean)
      : [];
    const safeE = JSON.stringify({ ...e, _rulesArr: rulesArr }).replace(/'/g, '&apos;');
    return `
      <div class="event-card reveal" onclick='openModal(${safeE})'>
        <div class="event-cat">${(e.category || '').toUpperCase()}</div>
        <div class="event-name">${e.name}</div>
        <div class="event-desc">${e.description}</div>
        <div class="event-meta">
          <span><strong>${timeStr}</strong></span>
          <span><strong>${e.venue || '—'}</strong></span>
        </div>
        ${e.prize ? `<div class="prize-badge">${e.prize}</div>` : ''}
      </div>
    `;
  }).join('');
  observeReveal();
}

function filterEvents(cat, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadEvents(cat === 'all' ? null : cat);
}

function populateEventCheckboxes() {
  const container = document.getElementById('eventsCheckboxes');
  if (!allEvents.length) {
    container.innerHTML = '<div style="color:var(--muted);font-size:0.8rem;font-family:\'Share Tech Mono\',monospace;">No events available.</div>';
    return;
  }
  container.innerHTML = allEvents.map(e => `
    <label class="checkbox-item">
      <input type="checkbox" name="event_ids" value="${e.event_id}"/> ${e.name}
    </label>
  `).join('');
}

function populateExtraEventsCheckboxes() {
  const container = document.getElementById('extraEventsCheckboxes');
  if (!allEvents.length) {
    container.innerHTML = '<div style="color:var(--muted);font-size:0.8rem;">No events available.</div>';
    return;
  }
  container.innerHTML = allEvents.map(e => `
    <label class="checkbox-item">
      <input type="checkbox" name="extra_event_ids" value="${e.event_id}"/> ${e.name}
    </label>
  `).join('');
}

function openModal(e) {
  document.getElementById('modal-title').textContent = e.name;
  document.getElementById('modal-desc').textContent  = e.description;
  const schedDate = e.schedule ? new Date(e.schedule) : null;
  const timeStr   = schedDate
    ? schedDate.toLocaleDateString('en-IN', { month:'short', day:'numeric' }) + ', ' +
      schedDate.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })
    : '—';
  document.getElementById('modal-cat').textContent =
    `${e.category} | ${timeStr} | ${e.venue || '—'}${e.prize ? ' | Prize: ' + e.prize : ''}`;
  const rules = e._rulesArr && e._rulesArr.length
    ? e._rulesArr
    : (e.rules ? [e.rules] : ['See event details on the day.']);
  document.getElementById('modal-rules').innerHTML = rules.map(r => `<li>${r}</li>`).join('');
  document.getElementById('eventModal').classList.add('open');
}
function closeModal() {
  document.getElementById('eventModal').classList.remove('open');
}
document.getElementById('eventModal').addEventListener('click', function(ev) {
  if (ev.target === this) closeModal();
});

async function submitReg(e) {
  e.preventDefault();
  const form = e.target;
  const btn  = document.getElementById('regSubmitBtn');
  const successEl = document.getElementById('successMsg');
  const errorEl   = document.getElementById('regErrorMsg');
  successEl.style.display = 'none';
  errorEl.style.display   = 'none';

  const selectedEventIds = [...form.querySelectorAll('input[name="event_ids"]:checked')]
    .map(cb => parseInt(cb.value));

  if (!selectedEventIds.length) {
    errorEl.textContent = '⚠ Please select at least one event.';
    errorEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> REGISTERING...';

  try {
    // Step 1: Create account
    const payload = {
      name:     form.name.value.trim(),
      email:    form.email.value.trim(),
      phone:    form.phone.value.trim(),
      college:  form.college.value.trim(),
      year:     parseInt(form.year.value),
      password: form.password.value,
      role:     form.role.value || 'participant',
    };

    const { ok: regOk, data: regData } = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!regOk) {
      const msg = regData.errors
        ? regData.errors.map(err => err.msg).join(', ')
        : (regData.error || 'Registration failed');
      throw new Error(msg);
    }

    saveAuthState(regData.token, regData.user);

    // Step 2: Register for selected events
    const { ok: evOk, data: evData } = await apiFetch('/api/registrations', {
      method: 'POST',
      body: JSON.stringify({ event_ids: selectedEventIds }),
    });

    if (!evOk) {
      // Account was created; warn but don't block
      console.warn('Event registration partial failure:', evData.error);
    }

    successEl.textContent = `✅ Registration successful! Welcome, ${regData.user.name}. Confirmation sent to ${regData.user.email}.`;
    successEl.style.display = 'block';
    form.reset();
    updateAuthUI();
  } catch (err) {
    errorEl.textContent = `⚠ ${err.message}`;
    errorEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'COMPLETE REGISTRATION →';
  }
}

async function submitLogin(e) {
  e.preventDefault();
  const form    = e.target;
  const btn     = document.getElementById('loginSubmitBtn');
  const successEl = document.getElementById('loginSuccessMsg');
  const errorEl   = document.getElementById('loginErrorMsg');
  successEl.style.display = 'none';
  errorEl.style.display   = 'none';

  btn.disabled    = true;
  btn.innerHTML   = '<span class="spinner"></span> LOGGING IN...';

  try {
    const { ok, data } = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: form.email.value.trim(), password: form.password.value }),
    });

    if (!ok) throw new Error(data.error || 'Login failed');

    saveAuthState(data.token, data.user);
    successEl.textContent    = `✅ Welcome back, ${data.user.name}!`;
    successEl.style.display  = 'block';
    form.reset();
    updateAuthUI();
  } catch (err) {
    errorEl.textContent = `⚠ ${err.message}`;
    errorEl.style.display = 'block';
  } finally {
    btn.disabled    = false;
    btn.textContent = 'LOGIN →';
  }
}

async function submitExtraEvents(e) {
  e.preventDefault();
  const form       = e.target;
  const btn        = document.getElementById('extraEventsBtn');
  const successEl  = document.getElementById('extraEventsSuccess');
  const errorEl    = document.getElementById('extraEventsError');
  successEl.style.display = 'none';
  errorEl.style.display   = 'none';

  const selectedIds = [...form.querySelectorAll('input[name="extra_event_ids"]:checked')]
    .map(cb => parseInt(cb.value));

  if (!selectedIds.length) {
    errorEl.textContent = '⚠ Please select at least one event.';
    errorEl.style.display = 'block';
    return;
  }

  btn.disabled  = true;
  btn.innerHTML = '<span class="spinner"></span> REGISTERING...';

  try {
    const { ok, data } = await apiFetch('/api/registrations', {
      method: 'POST',
      body: JSON.stringify({ event_ids: selectedIds }),
    });

    if (!ok) throw new Error(data.error || 'Could not register for events');

    successEl.textContent   = `✅ Registered for ${data.registrations?.length || selectedIds.length} event(s)!`;
    successEl.style.display = 'block';
    form.reset();
    loadMyRegistrations();
  } catch (err) {
    errorEl.textContent = `⚠ ${err.message}`;
    errorEl.style.display = 'block';
  } finally {
    btn.disabled    = false;
    btn.textContent = 'ADD EVENT REGISTRATIONS →';
  }
}

async function loadMyRegistrations() {
  if (!isLoggedIn()) return;
  const section  = document.getElementById('myRegsSection');
  const list     = document.getElementById('myRegsList');
  const countEl  = document.getElementById('myRegsCount');

  try {
    const { ok, data } = await apiFetch('/api/registrations/me');
    if (!ok) throw new Error('Could not load');

    section.style.display = 'block';
    countEl.textContent   = data.length || 0;

    if (!data.length) {
      list.innerHTML = '<p style="color:var(--muted);font-size:0.85rem;">No events registered yet.</p>';
      return;
    }

    list.innerHTML = data.map(reg => {
      const ev   = reg.events || {};
      const date = ev.schedule ? new Date(ev.schedule) : null;
      const timeStr = date
        ? date.toLocaleDateString('en-IN', { month:'short', day:'numeric' }) + ', ' +
          date.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })
        : '—';
      return `
        <div style="background:var(--card);border:1px solid var(--border);padding:0.8rem 1rem;margin-bottom:0.5rem;display:flex;justify-content:space-between;align-items:center;gap:1rem;">
          <div>
            <div style="font-family:'Orbitron',sans-serif;font-size:0.8rem;color:var(--accent);">${ev.name || 'Event'}</div>
            <div style="font-size:0.75rem;color:var(--muted);font-family:'Share Tech Mono',monospace;">${ev.category || ''} · ${timeStr} · ${ev.venue || ''}</div>
          </div>
          <button onclick="cancelRegistration(${reg.registration_id}, this)" style="background:transparent;border:1px solid rgba(255,107,0,0.3);color:var(--accent2);padding:4px 10px;font-size:0.7rem;font-family:'Orbitron',sans-serif;cursor:pointer;white-space:nowrap;">Cancel</button>
        </div>
      `;
    }).join('');
  } catch {
    section.style.display = 'block';
    list.innerHTML = '<p style="color:var(--muted);font-size:0.85rem;">Could not load registrations.</p>';
  }
}

async function cancelRegistration(regId, btn) {
  if (!confirm('Cancel this registration?')) return;
  btn.disabled    = true;
  btn.textContent = '…';
  try {
    const { ok, data } = await apiFetch(`/api/registrations/${regId}`, { method: 'DELETE' });
    if (!ok) throw new Error(data.error || 'Could not cancel');
    loadMyRegistrations();
  } catch (err) {
    alert('Error: ' + err.message);
    btn.disabled    = false;
    btn.textContent = 'Cancel';
  }
}

async function submitQuery(e) {
  e.preventDefault();
  const form      = e.target;
  const btn       = document.getElementById('querySubmitBtn');
  const successEl = document.getElementById('querySuccess');
  const errorEl   = document.getElementById('queryErrorMsg');
  successEl.style.display = 'none';
  errorEl.style.display   = 'none';

  btn.disabled  = true;
  btn.innerHTML = '<span class="spinner"></span> SENDING...';

  try {
    const { ok, data } = await apiFetch('/api/queries', {
      method: 'POST',
      body: JSON.stringify({
        name:     form.name.value.trim(),
        email:    form.email.value.trim(),
        subject:  form.subject.value,
        question: form.question.value.trim(),
      }),
    });

    if (!ok) {
      const msg = data.errors
        ? data.errors.map(err => err.msg).join(', ')
        : (data.error || 'Could not submit query');
      throw new Error(msg);
    }

    successEl.textContent   = "✅ Query submitted! We'll respond within 24–48 hours.";
    successEl.style.display = 'block';
    form.reset();
  } catch (err) {
    errorEl.textContent = `⚠ ${err.message}`;
    errorEl.style.display = 'block';
  } finally {
    btn.disabled    = false;
    btn.textContent = 'SEND MESSAGE →';
  }
}

function logout() {
  clearAuthState();
  updateAuthUI();
}

function switchAuthTab(tab) {
  document.getElementById('tabRegister').classList.toggle('active', tab === 'register');
  document.getElementById('tabLogin').classList.toggle('active', tab === 'login');
  document.getElementById('panelRegister').classList.toggle('active', tab === 'register');
  document.getElementById('panelLogin').classList.toggle('active', tab === 'login');
}

function switchRole(role, btn) {
  document.querySelectorAll('.role-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('roleInput').value = role;
  document.getElementById('eventsField').style.display = role === 'participant' ? 'block' : 'none';
}

const eventDate = new Date('2026-04-17T09:00:00');
function updateCountdown() {
  const diff = eventDate - new Date();
  if (diff <= 0) {
    document.querySelector('.countdown-wrap').innerHTML =
      '<div style="color:var(--accent);font-family:Orbitron,sans-serif;font-size:1.5rem;">🎉 The fest is LIVE!</div>';
    return;
  }
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  document.getElementById('cd-days').textContent = String(d).padStart(2,'0');
  document.getElementById('cd-hrs').textContent  = String(h).padStart(2,'0');
  document.getElementById('cd-min').textContent  = String(m).padStart(2,'0');
  document.getElementById('cd-sec').textContent  = String(s).padStart(2,'0');
}
setInterval(updateCountdown, 1000);
updateCountdown();

function toggleFaq(el) { el.classList.toggle('open'); }

function toggleMenu() {
  document.getElementById('navLinks').classList.toggle('mobile-open');
}

function observeReveal() {
  const els = document.querySelectorAll('.reveal:not(.visible)');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) en.target.classList.add('visible'); });
  }, { threshold: 0.1 });
  els.forEach(el => obs.observe(el));
}


const staticFallbackEvents = [
  { event_id:1, category:'Coding',   name:'Cook Your Code', description:'Solve algorithmic challenges in 3 hours. Individual or duo.', schedule:'2026-04-17T09:30:00+05:30', venue:'R-213', prize:'₹15,000', rules:'Individual or 2-member teams. Languages: C, C++, Java, Python. No internet during contest. Plagiarism = disqualification.' },
  { event_id:2, category:'Web Dev',  name:'Dev Your Web',   description:'Build a fully functional responsive website in under 3 hours from a given brief.', schedule:'2026-04-17T10:00:00+05:30', venue:'R-211', prize:'₹15,000', rules:'Individual or 2-member teams. HTML, CSS, JS and frameworks allowed. Judged on design and functionality.' },
  { event_id:3, category:'Web Dev',  name:'Dev Vibe',       description:'Design and code a responsive website in 2 hours. No templates allowed.', schedule:'2026-04-17T14:30:00+05:30', venue:'R-309', prize:'₹10,000', rules:'Individual only. HTML, CSS, JS allowed. No frameworks or templates.' },
  { event_id:4, category:'Robotics', name:'Robo Challenge',  description:'Build and battle your autonomous or RC-controlled robot in the arena.', schedule:'2026-04-17T13:30:00+05:30', venue:'Arena', prize:'₹20,000', rules:'Teams of 2–4. Robot weight max 5 kg. Battery powered only. Flame weapons not allowed.' },
  { event_id:5, category:'Coding',   name:'Cypher Climb',   description:'A series of cryptographic puzzles and CTF challenges to crack step by step.', schedule:'2026-04-17T14:00:00+05:30', venue:'R-218', prize:'₹8,000', rules:'Individual or 2-member teams. 90-minute time limit. Hints cost points.' },
];

loadAuthState();
updateAuthUI();
loadEvents(null);
observeReveal();