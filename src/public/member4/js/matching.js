(function () {
  const buttons = Array.from(document.querySelectorAll('.match-filter'));
  const search = document.getElementById('matchSearch');
  const rows = Array.from(document.querySelectorAll('.match-row'));
  const empty = document.getElementById('matchEmpty');
  if (!buttons.length) return;

  function activeRange() {
    const active = buttons.find((btn) => btn.classList.contains('btn-primary')) || buttons[0];
    return { min: parseFloat(active.dataset.min), max: parseFloat(active.dataset.max) };
  }

  function applyFilters() {
    const { min, max } = activeRange();
    const q = (search?.value || '').toLowerCase().trim();
    let visible = 0;
    rows.forEach((row) => {
      const pct = parseFloat(row.dataset.pct);
      const name = row.dataset.name.toLowerCase();
      const show = pct >= min && pct <= max && name.includes(q);
      row.style.display = show ? '' : 'none';
      if (show) visible += 1;
    });
    empty?.classList.toggle('d-none', visible > 0);
  }

  buttons.forEach((btn) => btn.addEventListener('click', () => {
    buttons.forEach((b) => { b.classList.remove('btn-primary'); b.classList.add('btn-outline-light'); });
    btn.classList.remove('btn-outline-light');
    btn.classList.add('btn-primary');
    applyFilters();
  }));
  search?.addEventListener('input', applyFilters);
})();
