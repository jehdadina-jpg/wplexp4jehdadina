/* ============================================================
   RationNet — stock.js
   Stock CRUD: Add, Edit, Delete, Filter
   ============================================================ */

const ITEMS = ['Rice', 'Wheat', 'Sugar', 'Kerosene', 'Dal', 'Oil'];

document.addEventListener('DOMContentLoaded', () => {
  const session = requireAuth();
  if (!session) return;
  populateNavbar(session);
  initSidebar();

  renderStock();
  attachStockForm();
  attachSearch();
});

// ── Render Stock Table ──
function renderStock(filter = '') {
  const stock = RN.getStock();
  const tbody = document.getElementById('stock-tbody');
  const countEl = document.getElementById('stock-count');
  if (!tbody) return;

  let filtered = stock;
  if (filter) {
    filtered = stock.filter(s => s.item.toLowerCase().includes(filter.toLowerCase()));
  }

  if (countEl) countEl.textContent = `Showing ${filtered.length} of ${stock.length} items`;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state"><span class="empty-icon">📦</span>No stock items found.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(s => {
    const avail = Math.max(0, s.total - s.distributed);
    const pct = s.total > 0 ? (avail / s.total) * 100 : 0;
    let statusClass = 'badge-green', statusText = 'Sufficient', barClass = '';
    if (pct < 10) { statusClass = 'badge-red'; statusText = 'Critical'; barClass = 'red'; }
    else if (pct < 30) { statusClass = 'badge-amber'; statusText = 'Low'; barClass = 'amber'; }

    const dateStr = s.lastArrival ? new Date(s.lastArrival + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    return `<tr data-id="${s.id}">
      <td style="font-family:var(--font-body);font-weight:500">${s.item}</td>
      <td style="font-family:var(--font-body)">${s.unit}</td>
      <td style="font-family:var(--font-body)">${s.total.toFixed(1)}</td>
      <td style="font-family:var(--font-body)">${s.distributed.toFixed(1)}</td>
      <td>
        <div style="font-family:var(--font-body);font-weight:600;color:var(--accent);margin-bottom:4px">${avail.toFixed(1)}</div>
        <div class="progress-bar-wrap">
          <div class="progress-bar-fill ${barClass}" style="width:${pct.toFixed(1)}%"></div>
        </div>
      </td>
      <td><span class="badge ${statusClass}">${statusText}</span></td>
      <td>
        <div class="action-btns">
          <button class="btn btn-secondary btn-sm" onclick="openEditStock('${s.id}')">✏️ Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteStock('${s.id}', '${s.item}')">🗑️ Delete</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ── Attach Search ──
function attachSearch() {
  const input = document.getElementById('stock-search');
  input?.addEventListener('input', () => renderStock(input.value.trim()));
}

// ── Add Stock Form ──
function attachStockForm() {
  const form = document.getElementById('stock-form');
  if (!form) return;

  // Real-time validation
  form.querySelectorAll('input, select').forEach(el => {
    el.addEventListener('input', () => validateStockField(el.id));
    el.addEventListener('change', () => validateStockField(el.id));
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const valid = ['stock-item', 'stock-qty', 'stock-unit', 'stock-date'].every(id => {
      return validateStockField(id) === '';
    });
    if (!valid) return;

    const item = document.getElementById('stock-item').value;
    const qty = parseFloat(document.getElementById('stock-qty').value);
    const unit = document.getElementById('stock-unit').value;
    const date = document.getElementById('stock-date').value;

    RN.addStockItem({ item, quantity: qty, unit, date });
    showToast(`✅ ${qty} ${unit} of ${item} added to stock.`, 'success');
    form.reset();
    // Clear validation classes
    form.querySelectorAll('.is-valid, .is-invalid').forEach(el => {
      el.classList.remove('is-valid', 'is-invalid');
    });
    renderStock();
  });
}

function validateStockField(id) {
  const el = document.getElementById(id);
  if (!el) return '';
  const val = el.value.trim();
  let err = '';

  switch (id) {
    case 'stock-item':
      if (!val) err = 'Please select an item.';
      break;
    case 'stock-qty': {
      const n = parseFloat(val);
      if (!val) err = 'Quantity is required.';
      else if (isNaN(n) || n < 1) err = 'Minimum quantity is 1.';
      else if (n > 10000) err = 'Quantity cannot exceed 10,000.';
      break;
    }
    case 'stock-unit':
      if (!val) err = 'Please select a unit.';
      break;
    case 'stock-date': {
      if (!val) { err = 'Date of arrival is required.'; break; }
      const today = new Date().toISOString().split('T')[0];
      if (val > today) err = 'Date cannot be in the future.';
      break;
    }
  }

  const errEl = document.getElementById(`err-${id}`);
  if (errEl) errEl.textContent = err;
  if (err) { el.classList.add('is-invalid'); el.classList.remove('is-valid'); }
  else if (val) { el.classList.remove('is-invalid'); el.classList.add('is-valid'); }
  return err;
}

// ── Delete Stock ──
async function deleteStock(id, name) {
  const confirmed = await showModal({
    icon: '🗑️',
    title: 'Delete Stock Item',
    message: `Are you sure you want to delete <span class="modal-highlight">${name}</span> from inventory? This cannot be undone.`,
    confirmText: 'Delete',
    cancelText: 'Cancel',
    danger: true,
  });
  if (!confirmed) return;
  RN.deleteStockItem(id);
  showToast(`${name} removed from stock.`, 'warning');
  renderStock();
}

// ── Edit Stock (inline modal) ──
function openEditStock(id) {
  const stock = RN.getStock();
  const item = stock.find(s => s.id === id);
  if (!item) return;

  const overlay = document.getElementById('edit-stock-modal');
  if (!overlay) return;

  document.getElementById('edit-stock-id').value = id;
  document.getElementById('edit-stock-total').value = item.total;
  document.getElementById('edit-stock-distributed').value = item.distributed;
  document.getElementById('edit-stock-name').textContent = item.item + ' (' + item.unit + ')';

  const saveBtn = overlay.querySelector('#edit-stock-save');
  saveBtn.onclick = () => saveEditStock();

  overlay.classList.add('active');
}

function saveEditStock() {
  const id = document.getElementById('edit-stock-id').value;
  const total = parseFloat(document.getElementById('edit-stock-total').value);
  const distributed = parseFloat(document.getElementById('edit-stock-distributed').value);

  if (isNaN(total) || total < 0) {
    showToast('Total stock must be a valid positive number.', 'error'); return;
  }
  if (isNaN(distributed) || distributed < 0) {
    showToast('Distributed must be a valid positive number.', 'error'); return;
  }
  if (distributed > total) {
    showToast('Distributed cannot exceed total stock.', 'error'); return;
  }

  RN.updateStockItem(id, { total, distributed });
  document.getElementById('edit-stock-modal')?.classList.remove('active');
  showToast('Stock item updated successfully.', 'success');
  renderStock();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('edit-stock-cancel')?.addEventListener('click', () => {
    document.getElementById('edit-stock-modal')?.classList.remove('active');
  });
});
