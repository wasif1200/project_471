const ss = {
  studentId: document.getElementById('ssStudentId'),
  internshipId: document.getElementById('ssInternshipId'),
  analyzeBtn: document.getElementById('ssAnalyzeBtn'),
  historyBtn: document.getElementById('ssHistoryBtn'),
  summary: document.getElementById('ssSummary'),
  content: document.getElementById('ssContent'),
};
let pendingCompleteCourseId = null;
let completeModal;

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[ch]));
}

function setState(html, asCard = true) {
  ss.content.className = asCard ? 'app-card p-5 text-center text-soft' : '';
  ss.content.innerHTML = html;
}

function summaryCards(gaps) {
  const totalGap = gaps.reduce((sum, item) => sum + item.gap, 0).toFixed(1);
  const courses = gaps.reduce((sum, item) => sum + item.courses.length, 0);
  const completed = gaps.reduce((sum, item) => sum + item.courses.filter((c) => c.status === 'COMPLETED').length, 0);
  ss.summary.innerHTML = [
    ['Skills to Improve', gaps.length],
    ['Total Score Gap', totalGap],
    ['Available Courses', courses],
    ['Completed Courses', completed],
    ['Remaining Courses', courses-completed]
  ].map(([label, value]) => `<div class="col-6 col-lg-3"><div class="stat-card"><div class="stat-value">${value}</div><div class="stat-label">${label}</div></div></div>`).join('');
  ss.summary.classList.remove('d-none');
}

async function loadSuggestions() {
  const sid = parseInt(ss.studentId.value, 10);
  const iid = ss.internshipId.value.trim();
  if (!sid) return setState('Please enter a valid student ID.');
  ss.summary.classList.add('d-none');
  setState('<div class="spinner-border text-light" role="status"></div><div class="mt-3">Loading suggestions...</div>');

  try {
    const res = await fetch(`/member4/api/skill-suggestions/${sid}${iid ? `?internshipId=${iid}` : ''}`);
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || 'Could not load suggestions.');
    if (!json.data.length) {
      return setState('<h2 class="h4 fw-bold">No skill gaps found</h2><p class="mb-0">You meet the selected internship requirements.</p>');
    }
    summaryCards(json.data);
    renderGaps(json.data);
  } catch (error) {
    setState(`<h2 class="h5 fw-bold">Something went wrong</h2><p class="mb-0">${esc(error.message)}</p>`);
  }
}

function renderGaps(gaps) {
  ss.content.className = '';
  ss.content.innerHTML = gaps.map((gap, index) => {
    const courses = gap.courses.length ? gap.courses.map(renderCourse).join('') : '<div class="text-soft">No courses are available for this skill yet.</div>';
    return `
      <div class="app-card p-4 mb-3">
        <div class="d-flex flex-wrap justify-content-between gap-3 align-items-start">
          <div>
            <h2 class="h5 fw-bold mb-1">${esc(gap.skillName)}</h2>
            <div class="text-soft small">Required for: ${gap.internships.map(esc).join(', ')}</div>
          </div>
          <div class="d-flex flex-wrap gap-2">
            <span class="skill-chip">Current ${gap.currentScore}/5</span>
            <span class="skill-chip">Required ${gap.requiredScore}/5</span>
            <span class="skill-chip chip-danger">Gap ${gap.gap}</span>
          </div>
        </div>
        <div class="progress my-3"><div class="progress-bar" style="width:${Math.min(100, gap.currentScore * 20)}%"></div></div>
        <button class="btn btn-sm btn-outline-light mb-3" type="button" data-bs-toggle="collapse" data-bs-target="#courses-${gap.skillId}" aria-expanded="${index === 0 ? 'true' : 'false'}">Show recommended courses</button>
        <div class="collapse ${index === 0 ? 'show' : ''}" id="courses-${gap.skillId}">
          <div class="row g-3">${courses}</div>
        </div>
      </div>`;
  }).join('');
}

function renderCourse(course) {
  const statusClass = course.status === 'COMPLETED' ? 'chip-success' : course.status === 'IN_PROGRESS' ? 'chip-warning' : '';
  const actions = course.status === 'COMPLETED'
    ? `<span class="skill-chip chip-success">Completed${course.scoreAwarded ? ' / score awarded' : ''}</span>`
    : `<button class="btn btn-sm btn-outline-light" onclick="startCourse(${course.id})">Start</button>
       <button class="btn btn-sm btn-primary" onclick="openCompleteCourse(${course.id}, '${esc(course.title)}')">Complete</button>`;

  return `
    <div class="col-lg-6">
      <div class="stat-card h-100">
        <div class="d-flex flex-wrap justify-content-between gap-2 mb-2">
          <span class="skill-chip ${statusClass}">${course.status.replace('_', ' ')}</span>
          <span class="text-soft small">+${course.scoreBoost} score</span>
        </div>
        <h3 class="h6 fw-bold">${esc(course.title)}</h3>
        <div class="text-soft small mb-2">${course.platform} / ${course.difficulty} / ${course.estimatedHours}h</div>
        <p class="small text-soft">${esc(course.description || '')}</p>
        <div class="d-flex flex-wrap gap-2 align-items-center">
          <a class="btn btn-sm btn-outline-light" href="${course.courseUrl}" target="_blank" rel="noopener">Open Course</a>
          ${actions}
        </div>
      </div>
    </div>`;
}

async function startCourse(courseId) {
  const sid = parseInt(ss.studentId.value, 10);
  try {
    const res = await fetch(`/member4/api/skill-suggestions/${courseId}/start`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId: sid }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || 'Could not start course.');
    await loadSuggestions();
  } catch (error) { alert(error.message); }
}

function openCompleteCourse(courseId, title) {
  pendingCompleteCourseId = courseId;
  document.getElementById('ssModalCourseName').textContent = title;
  completeModal = completeModal || new bootstrap.Modal(document.getElementById('completeCourseModal'));
  completeModal.show();
}

async function completeCourse() {
  const sid = parseInt(ss.studentId.value, 10);
  if (!pendingCompleteCourseId || !sid) return;
  try {
    const res = await fetch(`/member4/api/skill-suggestions/${pendingCompleteCourseId}/complete`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId: sid, confirmed: true }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || 'Could not complete course.');
    completeModal.hide();
    pendingCompleteCourseId = null;
    await loadSuggestions();
  } catch (error) { alert(error.message); }
}

async function loadHistory() {
  const sid = parseInt(ss.studentId.value, 10);
  if (!sid) return setState('Please enter a valid student ID.');
  ss.summary.classList.add('d-none');
  setState('<div class="spinner-border text-light" role="status"></div><div class="mt-3">Loading history...</div>');
  try {
    const res = await fetch(`/member4/api/skill-suggestions/history/${sid}`);
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || 'Could not load history.');
    if (!json.data.length) return setState('<h2 class="h4 fw-bold">No history yet</h2><p class="mb-0">Start or complete a course to see progress here.</p>');
    ss.content.className = 'app-card p-4';
    ss.content.innerHTML = `<h2 class="h5 fw-bold mb-3">Course History</h2><div class="table-responsive"><table class="table table-hover align-middle"><thead><tr><th>Course</th><th>Skill</th><th>Platform</th><th>Status</th><th>Score</th><th>Completed</th></tr></thead><tbody>${json.data.map((h) => `<tr><td>${esc(h.courseTitle)}</td><td>${esc(h.skillName)}</td><td>${h.platform}</td><td><span class="skill-chip">${h.status.replace('_', ' ')}</span></td><td>${h.scoreAwarded ? 'Awarded' : '-'}</td><td>${h.completedAt ? new Date(h.completedAt).toLocaleDateString() : '-'}</td></tr>`).join('')}</tbody></table></div>`;
  } catch (error) { setState(`<h2 class="h5 fw-bold">Something went wrong</h2><p>${esc(error.message)}</p>`); }
}

ss.analyzeBtn.addEventListener('click', loadSuggestions);
ss.historyBtn.addEventListener('click', loadHistory);
document.getElementById('ssConfirmComplete').addEventListener('click', completeCourse);
