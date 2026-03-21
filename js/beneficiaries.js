/* ============================================================
   RationNet — beneficiaries.js
   Beneficiary CRUD: Add, Edit, Delete, Search
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const session = requireAuth();
  if (!session) return;
  populateNavbar(session);
  initSidebar();

  renderBeneficiaries();
  attachBeneficiaryForm();
  attachBeneficiarySearch();
});

// ── Render Table ──
function renderBeneficiaries(filter = '') {
  const list = RN.getBeneficiaries();
  const tbody = document.getElementById('ben-tbody');
  const countEl = document.getElementById('ben-count');
  if (!tbody) return;

  const lf = filter.toLowerCase();
  const filtered = filter
    ? list.filter(b => b.name.toLowerCase().includes(lf) || b.cardNo.toLowerCase().includes(lf))
    : list;

  if (countEl) countEl.textContent = `Showing ${filtered.length} of ${list.length} beneficiaries`;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state"><span class="empty-icon">👤</span>No beneficiaries found.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((b, i) => {
    const catClass = b.category === 'APL' ? 'badge-blue' : b.category === 'BPL' ? 'badge-amber' : 'badge-red';
    return `<tr data-id="${b.id}">
      <td style="font-family:var(--font-body);color:var(--text-muted)">${i + 1}</td>
      <td style="font-weight:500">${b.name}</td>
      <td style="font-family:var(--font-body);color:var(--accent)">${b.cardNo}</td>
      <td><span class="badge ${catClass}">${b.category}</span></td>
      <td style="font-family:var(--font-body)">${b.members}</td>
      <td style="font-family:var(--font-body)">${b.phone}</td>
      <td>
        <div class="action-btns">
          <button class="btn btn-secondary btn-sm" onclick="openEditBen('${b.id}')">✏️ Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteBen('${b.id}', '${b.name}')">🗑️ Delete</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ── Attach Search ──
function attachBeneficiarySearch() {
  const input = document.getElementById('ben-search');
  input?.addEventListener('input', () => renderBeneficiaries(input.value.trim()));
}

// ── Validation Rules ──
function validateBeneficiaryField(id) {
  const el = document.getElementById(id);
  if (!el) return '';
  const val = el.value.trim();
  let err = '';

  switch (id) {
    case 'ben-name':
      if (!val) err = 'Name is required.';
      else if (!/^[a-zA-Z\s]{2,60}$/.test(val)) err = 'Name must contain only letters and spaces.';
      break;
    case 'ben-card':
      if (!val) err = 'Ration card number is required.';
      else if (!/^MH-\d{6}$/.test(val.toUpperCase())) err = 'Format: MH-XXXXXX (e.g. MH-100001)';
      else {
        // Check duplicate (skip for edit mode)
        const editId = document.getElementById('ben-edit-id')?.value;
        const existing = RN.findBeneficiary(val);
        if (existing && existing.id !== editId) err = 'This card number already exists.';
      }
      break;
    case 'ben-category':
      if (!val) err = 'Please select a category.';
      break;
    case 'ben-phone':
      if (!val) err = 'Phone number is required.';
      else if (!/^\d{10}$/.test(val)) err = 'Phone must be exactly 10 digits.';
      break;
    case 'ben-address':
      if (!val) err = 'Address is required.';
      break;
    case 'ben-members': {
      const n = parseInt(val);
      if (!val) err = 'Number of members is required.';
      else if (isNaN(n) || n < 1 || n > 10) err = 'Members must be between 1 and 10.';
      break;
    }
  }

  const errEl = document.getElementById(`err-${id}`);
  if (errEl) errEl.textContent = err;
  if (err) { el.classList.add('is-invalid'); el.classList.remove('is-valid'); }
  else if (val) { el.classList.remove('is-invalid'); el.classList.add('is-valid'); }
  return err;
}

// ── Attach Form ──
function attachBeneficiaryForm() {
  const form = document.getElementById('ben-form');
  if (!form) return;

  const fields = ['ben-name', 'ben-card', 'ben-category', 'ben-phone', 'ben-address', 'ben-members'];
  fields.forEach(id => {
    const el = document.getElementById(id);
    el?.addEventListener('input', () => validateBeneficiaryField(id));
    el?.addEventListener('change', () => validateBeneficiaryField(id));
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const errors = fields.map(id => validateBeneficiaryField(id)).filter(Boolean);
    if (errors.length > 0) return;

    const editId = document.getElementById('ben-edit-id')?.value;
    const data = {
      name: document.getElementById('ben-name').value.trim(),
      cardNo: document.getElementById('ben-card').value.trim().toUpperCase(),
      category: document.getElementById('ben-category').value,
      phone: document.getElementById('ben-phone').value.trim(),
      address: document.getElementById('ben-address').value.trim(),
      members: parseInt(document.getElementById('ben-members').value),
    };

    if (editId) {
      // Update mode
      RN.updateBeneficiary(editId, data);
      showToast(`Beneficiary ${data.name} updated.`, 'success');
      document.getElementById('ben-edit-id').value = '';
      document.getElementById('form-submit-label').textContent = '+ Add Beneficiary';
      document.getElementById('form-cancel-edit').style.display = 'none';
    } else {
      RN.addBeneficiary(data);
      showToast(`${data.name} added to registry.`, 'success');
    }

    form.reset();
    fields.forEach(id => {
      const el = document.getElementById(id);
      el?.classList.remove('is-valid', 'is-invalid');
    });
    renderBeneficiaries();
  });

  document.getElementById('form-cancel-edit')?.addEventListener('click', () => {
    document.getElementById('ben-edit-id').value = '';
    document.getElementById('form-submit-label').textContent = '+ Add Beneficiary';
    document.getElementById('form-cancel-edit').style.display = 'none';
    form.reset();
    const fields2 = ['ben-name', 'ben-card', 'ben-category', 'ben-phone', 'ben-address', 'ben-members'];
    fields2.forEach(id => document.getElementById(id)?.classList.remove('is-valid', 'is-invalid'));
  });
}

// ── Edit ──
function openEditBen(id) {
  const b = RN.getBeneficiaries().find(b => b.id === id);
  if (!b) return;

  document.getElementById('ben-edit-id').value = id;
  document.getElementById('ben-name').value = b.name;
  document.getElementById('ben-card').value = b.cardNo;
  document.getElementById('ben-category').value = b.category;
  document.getElementById('ben-phone').value = b.phone;
  document.getElementById('ben-address').value = b.address;
  document.getElementById('ben-members').value = b.members;
  document.getElementById('form-submit-label').textContent = '💾 Update Beneficiary';
  const cancelBtn = document.getElementById('form-cancel-edit');
  if (cancelBtn) cancelBtn.style.display = 'inline-flex';

  // Scroll to form
  document.getElementById('ben-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Delete ──
async function deleteBen(id, name) {
  const confirmed = await showModal({
    icon: '⚠️',
    title: 'Remove Beneficiary',
    message: `Remove <span class="modal-highlight">${name}</span> from the registry? All their distribution records will remain.`,
    confirmText: 'Remove',
    cancelText: 'Cancel',
    danger: true,
  });
  if (!confirmed) return;
  RN.deleteBeneficiary(id);
  showToast(`${name} removed from registry.`, 'warning');
  renderBeneficiaries();
}
