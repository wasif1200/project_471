document.addEventListener('DOMContentLoaded', function () {
  const steps = document.querySelectorAll('.form-step');
  const nextBtns = document.querySelectorAll('.next-btn');
  const prevBtns = document.querySelectorAll('.prev-btn');

  let currentStep = 0;

  function showStep(index) {
    steps.forEach((step, i) => {
      step.classList.toggle('active', i === index);
    });

    const pills = document.querySelectorAll('.step-pill');
    pills.forEach((pill, i) => {
      pill.classList.toggle('active', i === index);
    });
  }

  nextBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (currentStep < steps.length - 1) {
        currentStep++;
        showStep(currentStep);
      }
    });
  });

  prevBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (currentStep > 0) {
        currentStep--;
        showStep(currentStep);
      }
    });
  });

  showStep(currentStep);

  const skillInput = document.getElementById('skillInput');
  const addSkillBtn = document.getElementById('addSkillBtn');
  const skillsList = document.getElementById('skillsList');
  const skillsHidden = document.getElementById('skillsHidden');

  if (addSkillBtn) {
    let skills = [];

    function renderSkills() {
      skillsList.innerHTML = '';
      skills.forEach((skill, index) => {
        const badge = document.createElement('span');
        badge.className = 'badge p-2';
        badge.innerHTML = `${skill} <button type="button" class="btn-close btn-close-white ms-2 remove-skill" data-index="${index}" style="font-size:10px;"></button>`;
        skillsList.appendChild(badge);
      });

      skillsHidden.value = skills.join(',');
    }

    addSkillBtn.addEventListener('click', () => {
      const value = skillInput.value.trim();
      if (value) {
        skills.push(value);
        skillInput.value = '';
        renderSkills();
      }
    });

    skillsList.addEventListener('click', (e) => {
      if (e.target.classList.contains('remove-skill')) {
        const index = e.target.getAttribute('data-index');
        skills.splice(index, 1);
        renderSkills();
      }
    });
  }
});