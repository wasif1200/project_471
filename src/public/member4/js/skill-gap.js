let sgBarChart;
let sgDoughnutChart;

const sg = {
  state: document.getElementById('sgState'),
  results: document.getElementById('sgResults'),
  internship: document.getElementById('sgInternship'),
  studentId: document.getElementById('sgStudentId'),
  analyzeBtn: document.getElementById('sgAnalyzeBtn'),
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[ch]));
}

async function loadSkillGapInternships() {
  try {
    const res = await fetch('/member4/api/skill-gap/internships');
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || 'Could not load internships.');
    sg.internship.innerHTML = json.data.map((item) => `<option value="${item.id}">${escapeHtml(item.title)} - ${escapeHtml(item.company)}</option>`).join('');
    sg.state.textContent = 'Choose a student and internship, then click Analyze Gap.';
  } catch (error) {
    sg.state.textContent = error.message;
  }
}

function statusChip(status) {
  const cls = status === 'Matched' ? 'chip-success' : status === 'Weak' ? 'chip-warning' : 'chip-danger';
  return `<span class="skill-chip ${cls}">${status}</span>`;
}

function renderStats(summary) {
  const stats = [
    ['Required Skills', summary.totalRequired],
    ['Matched', summary.matchedCount],
    ['Weak', summary.weakCount],
    ['Missing', summary.missingCount],
  ];
  document.getElementById('sgStats').innerHTML = stats.map(([label, value]) => `
    <div class="col-6 col-lg-3"><div class="stat-card"><div class="stat-value">${value}</div><div class="stat-label">${label}</div></div></div>
  `).join('');
}

function renderCharts(charts) {
  if (sgBarChart) sgBarChart.destroy();
  if (sgDoughnutChart) sgDoughnutChart.destroy();

  sgBarChart = new Chart(document.getElementById('sgBarChart'), {
    type: 'bar',
    data: { labels: charts.labels, datasets: [
      { label: 'Your Level', data: charts.yourLevels, backgroundColor: 'rgba(53, 208, 255, 0.75)' },
      { label: 'Required Level', data: charts.requiredLevels, backgroundColor: 'rgba(155, 92, 255, 0.75)' },
    ] },
    options: { responsive: true, scales: { y: { beginAtZero: true, max: 5, ticks: { color: '#cfc3ec' }, grid: { color: 'rgba(255,255,255,.08)' } }, x: { ticks: { color: '#cfc3ec' }, grid: { display: false } } }, plugins: { legend: { labels: { color: '#f8f4ff' } } } }
  });

  sgDoughnutChart = new Chart(document.getElementById('sgDoughnutChart'), {
    type: 'doughnut',
    data: { labels: charts.doughnut.labels, datasets: [{ data: charts.doughnut.data, backgroundColor: charts.doughnut.colors }] },
    options: { plugins: { legend: { labels: { color: '#f8f4ff' } } } }
  });
}

function renderSkillRows(skills) {
  const rows = [...skills.matched, ...skills.weak, ...skills.missing];
  document.getElementById('sgSkillRows').innerHTML = rows.map((row) => `
    <tr><td class="fw-semibold">${escapeHtml(row.skillName)}</td><td>${escapeHtml(row.skillCategory)}</td><td>${row.yourLevel}/5</td><td>${row.requiredLevel}/5</td><td>${statusChip(row.status)}</td></tr>
  `).join('');
}

function renderRecommendations() {}

async function analyzeSkillGap() {
  const studentId = sg.studentId.value;
  const internshipId = sg.internship.value;
  if (!studentId || !internshipId) return;
  sg.state.classList.remove('d-none');
  sg.results.classList.add('d-none');
  sg.state.textContent = 'Analyzing skill gap...';

  try {
    const res = await fetch(`/member4/api/skill-gap/students/${studentId}/skill-gap/${internshipId}`);
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.message || 'Skill gap analysis failed.');
    const data = json.data;
    document.getElementById('sgStudentName').textContent = data.student.name;
    document.getElementById('sgInternshipTitle').textContent = `${data.internship.title} at ${data.internship.company}`;
    document.getElementById('sgReadiness').textContent = `${data.summary.readiness}%`;
    renderStats(data.summary);
    renderCharts(data.charts);
    renderSkillRows(data.skills);
    sg.state.classList.add('d-none');
    sg.results.classList.remove('d-none');
  } catch (error) {
    sg.state.textContent = error.message;
  }
}

sg.analyzeBtn.addEventListener('click', analyzeSkillGap);
loadSkillGapInternships();
