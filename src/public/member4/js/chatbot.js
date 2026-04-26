const chat = {
  studentId: document.getElementById('chatStudentId'),
  loadProfileBtn: document.getElementById('loadProfileBtn'),
  profile: document.getElementById('chatProfile'),
  window: document.getElementById('chatWindow'),
  cards: document.getElementById('chatCards'),
  form: document.getElementById('chatForm'),
  input: document.getElementById('chatInput'),
  clearBtn: document.getElementById('clearChatBtn'),
  quickActions: document.getElementById('quickActions'),
};

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[ch]));
}

function addMessage(sender, message) {
  const div = document.createElement('div');
  div.className = `chat-message ${sender === 'user' ? 'chat-user' : 'chat-bot'}`;
  div.textContent = message;
  chat.window.appendChild(div);
  chat.window.scrollTop = chat.window.scrollHeight;
}

function renderProfile(data) {
  const skills = data.existingSkills?.slice(0, 6).map((s) => `<span class="skill-chip">${esc(s.name)} ${s.score}/100</span>`).join('') || '';
  chat.profile.innerHTML = `
    <div class="d-flex align-items-start gap-3 mb-3">
      <div class="feature-icon"><i class="bi bi-person"></i></div>
      <div><h2 class="h6 fw-bold mb-1">${esc(data.name)}</h2><div class="text-soft small">${esc(data.targetRole || 'No target role set')}</div></div>
    </div>
    <div class="text-soft small mb-2">${esc(data.department || '')} / ${esc(data.semester || '')}</div>
    <div>${skills || '<span class="text-soft">No skills found.</span>'}</div>`;
}

async function loadProfile() {
  const sid = parseInt(chat.studentId.value, 10);
  if (!sid) return;
  chat.profile.innerHTML = '<div class="text-soft">Loading profile...</div>';
  try {
    const res = await fetch(`/member4/api/chatbot/profile/${sid}`);
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Could not load profile.');
    renderProfile(json.data);
  } catch (error) {
    chat.profile.innerHTML = `<div class="text-soft">${esc(error.message)}</div>`;
  }
}

function renderCards(response) {
  const courses = response.relatedCourses || [];
  const internships = response.relatedInternships || [];
  const courseHtml = courses.length ? `
    <div class="app-card p-3 mb-3">
      <h3 class="h6 fw-bold mb-2">Related Courses</h3>
      <div class="row g-2">${courses.slice(0, 4).map((c) => `<div class="col-md-6"><div class="stat-card h-100"><div class="fw-semibold small">${esc(c.title)}</div><div class="text-soft small">${esc(c.skill)} / ${esc(c.platform)}</div><a class="small" href="${c.url}" target="_blank" rel="noopener">Open course</a></div></div>`).join('')}</div>
    </div>` : '';
  const internshipHtml = internships.length ? `
    <div class="app-card p-3 mb-3">
      <h3 class="h6 fw-bold mb-2">Related Internships</h3>
      <div class="row g-2">${internships.slice(0, 4).map((i) => `<div class="col-md-6"><div class="stat-card h-100"><div class="fw-semibold small">${esc(i.title)}</div><div class="text-soft small">${esc(i.company)} / ${esc(i.location)}</div><div class="small mt-1">${(i.skills || []).slice(0, 4).map((s) => `<span class="skill-chip">${esc(s)}</span>`).join('')}</div></div></div>`).join('')}</div>
    </div>` : '';
  chat.cards.innerHTML = courseHtml + internshipHtml;
}

async function sendMessage(message) {
  const sid = parseInt(chat.studentId.value, 10);
  if (!sid || !message.trim()) return;
  addMessage('user', message);
  chat.input.value = '';
  addMessage('bot', 'Thinking...');
  const placeholder = chat.window.lastChild;

  try {
    const res = await fetch('/member4/api/chatbot/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: sid, message }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Chatbot request failed.');
    placeholder.textContent = `${json.aiUsed ? 'AI: ' : ''}${json.reply}`;
    renderCards(json);
    if (Array.isArray(json.suggestions)) {
      chat.quickActions.innerHTML = json.suggestions.slice(0, 6).map((s) => `<button class="btn btn-sm btn-outline-light text-start quick-action">${esc(s)}</button>`).join('');
    }
  } catch (error) {
    placeholder.textContent = error.message;
  }
}

async function clearHistory() {
  const sid = parseInt(chat.studentId.value, 10);
  if (!sid) return;
  await fetch(`/member4/api/chatbot/history/${sid}`, { method: 'DELETE' });
  chat.window.innerHTML = '<div class="chat-message chat-bot">History cleared. How can I help now?</div>';
  chat.cards.innerHTML = '';
}

chat.form.addEventListener('submit', (event) => {
  event.preventDefault();
  sendMessage(chat.input.value);
});
chat.quickActions.addEventListener('click', (event) => {
  if (event.target.classList.contains('quick-action')) sendMessage(event.target.textContent);
});
chat.loadProfileBtn.addEventListener('click', loadProfile);
chat.clearBtn.addEventListener('click', clearHistory);
loadProfile();
