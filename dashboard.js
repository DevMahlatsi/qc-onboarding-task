const qcToken = sessionStorage.getItem('qc_token');

if (!qcToken) {
  window.location.href = 'index.html';
} else {
  initDashboard();
}

async function initDashboard() {
  const { supabase } = await import('./supabaseClient.js');

  const applicationsList = document.getElementById('applicationsList');
  const addForm = document.getElementById('addApplicationForm');
  const institutionSelect = document.getElementById('institutionSelect');
  const addError = document.getElementById('addError');

  const invoke = async (payload) => {
    const { data, error } = await supabase.functions.invoke('applications-handler', {
      body: payload,
      headers: { Authorization: `Bearer ${qcToken}` }
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const renderApplication = (app) => {
    const item = document.createElement('div');
    item.className = 'application-card';
    item.innerHTML = `
      <div class="application-header">
        <strong>${app.institution}</strong>
        <span class="status-badge status-${app.status}">${app.status === 'draft' ? 'Draft' : 'Submitted'}</span>
      </div>
      <p>${app.course} — ${app.academic_year}</p>
      ${app.notes ? `<p class="application-notes">${app.notes}</p>` : ''}
    `;
    return item;
  };

  const populateInstitutions = (institutions) => {
    institutionSelect.innerHTML = '<option value="" disabled selected>Select institution</option>';
    institutions.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      institutionSelect.appendChild(opt);
    });
  };

  document.getElementById('logoutButton').addEventListener('click', () => {
  sessionStorage.removeItem('qc_token');
  window.location.href = 'index.html';
});

  // Initial load
  try {
    const { data: applications, institutions } = await invoke({ action: 'load' });
    populateInstitutions(institutions);
    applications.forEach(app => applicationsList.appendChild(renderApplication(app)));
  } catch (error) {
    console.error('Load error:', error);
    applicationsList.textContent = 'Could not load your applications. Please refresh.';
  }

  addForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    addError.textContent = '';

    const institution = institutionSelect.value;
    const course = document.getElementById('courseInput').value;
    const academic_year = document.getElementById('academicYearSelect').value;
    const status = document.querySelector('input[name="applicationStatus"]:checked')?.value;
    const notes = document.getElementById('notesInput').value;

    if (!institution || !course.trim() || !academic_year || !status) {
      addError.textContent = 'Please fill in all required fields.';
      return;
    }

    try {
      const { data: newApp } = await invoke({ action: 'add', institution, course, academic_year, status, notes });
      applicationsList.prepend(renderApplication(newApp));
      addForm.reset();
    } catch (error) {
      console.error('Add error:', error);
      addError.textContent = error.message || 'Could not save application. Please try again.';
    }
  });
}