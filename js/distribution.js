/* ============================================================
   RationNet — distribution.js
   Distribution Entry + Today's Log
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const session = requireAuth();
  if (!session) return;
  populateNavbar(session);
  initSidebar();

  // Set default date to today
  const dateEl = document.getElementById('dist-date');
  if (dateEl) {
    const today = new Date().toISOString().split('T')[0];
    dateEl.value = today;
    dateEl.max = today;
  }

  // Add first item row
  addItemRow();

  attachDistForm();
  renderTodayLog();
});

let _itemRowCount = 0;

// ── Add Item Row ──
function addItemRow() {
  _itemRowCount++;
  const tbody = document.getElementById('dist-items-body');
  if (!tbody) return;

  const stock = RN.getStock();
  const itemOptions = stock.map(s => `<option value="${s.item}|${s.unit}">${s.item} (${s.unit})</option>`).join('');

  const rowId = `row-${_itemRowCount}`;
  const tr = document.createElement('tr');
  tr.id = rowId;
  tr.innerHTML = `
    <td>
      <select class="form-control item-select" onchange="updateStockHint(this)">
        <option value="">Select item…</option>
        ${itemOptions}
      </select>
    </td>
    <td>
      <input type="number" class="form-control item-qty" min="0.1" step="0.1" placeholder="0.0" oninput="updateStockHint(this.closest('tr').querySelector('.item-select'))">
      <div class="stock-avail-hint" id="hint-${rowId}">Select item first</div>
    </td>
    <td>
      <input type="text" class="form-control item-unit" readonly placeholder="Auto">
    </td>
    <td>
      <button type="button" class="btn btn-danger btn-sm" onclick="removeItemRow('${rowId}')">🗑️</button>
    </td>
  `;
  tbody.appendChild(tr);
}

// ── Remove Item Row ──
function removeItemRow(rowId) {
  const tr = document.getElementById(rowId);
  if (tr) tr.remove();
}

// ── Update Stock Hint ──
function updateStockHint(selectEl) {
  const row = selectEl.closest('tr');
  if (!row) return;
  const val = selectEl.value; // "ItemName|unit"
  const hintEl = row.querySelector('.stock-avail-hint');
  const unitEl = row.querySelector('.item-unit');
  const qtyEl = row.querySelector('.item-qty');

  if (!val) {
    if (hintEl) hintEl.textContent = 'Select item first';
    if (unitEl) unitEl.value = '';
    return;
  }

  const [itemName, unit] = val.split('|');
  if (unitEl) unitEl.value = unit;

  const avail = RN.getStockAvailable(itemName, unit);
  if (hintEl) {
    hintEl.textContent = `Available: ${avail.toFixed(1)} ${unit}`;
    hintEl.className = 'stock-avail-hint' + (avail < 5 ? ' critical' : avail < 20 ? ' low' : '');
  }

  if (qtyEl) qtyEl.max = avail;
}

// ── Beneficiary Lookup ──
function lookupBeneficiary() {
  const cardEl = document.getElementById('dist-card');
  const nameEl = document.getElementById('dist-name');
  const catEl = document.getElementById('dist-category');
  const errEl = document.getElementById('err-dist-card');

  if (!cardEl) return;
  const val = cardEl.value.trim().toUpperCase();
  if (!val) {
    if (errEl) errEl.textContent = 'Enter a card number first.';
    return;
  }

  const ben = RN.findBeneficiary(val);
  if (!ben) {
    if (errEl) errEl.textContent = 'No beneficiary found with this card number.';
    if (nameEl) nameEl.value = '';
    if (catEl) catEl.value = '';
    cardEl.classList.add('is-invalid');
    cardEl.classList.remove('is-valid');
    return;
  }

  if (nameEl) nameEl.value = ben.name;
  if (catEl) catEl.value = ben.category;
  if (errEl) errEl.textContent = '';
  cardEl.classList.remove('is-invalid');
  cardEl.classList.add('is-valid');

  // Show beneficiary chip
  const chip = document.getElementById('ben-info-chip');
  if (chip) {
    const catClass = ben.category === 'APL' ? 'badge-blue' : ben.category === 'BPL' ? 'badge-amber' : 'badge-red';
    chip.innerHTML = `<span class="badge ${catClass}">${ben.category}</span> &nbsp;${ben.name} — ${ben.members} members`;
    chip.style.display = 'flex';
  }
}

// ── Attach Distribution Form ──
function attachDistForm() {
  const form = document.getElementById('dist-form');
  if (!form) return;

  document.getElementById('btn-lookup')?.addEventListener('click', lookupBeneficiary);
  document.getElementById('btn-add-row')?.addEventListener('click', addItemRow);

  // Live date validation
  document.getElementById('dist-date')?.addEventListener('input', (e) => {
    const today = new Date().toISOString().split('T')[0];
    const errEl = document.getElementById('err-dist-date');
    if (e.target.value > today) {
      if (errEl) errEl.textContent = 'Distribution date cannot be in the future.';
      e.target.classList.add('is-invalid');
    } else {
      if (errEl) errEl.textContent = '';
      e.target.classList.remove('is-invalid');
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const cardEl = document.getElementById('dist-card');
    const nameEl = document.getElementById('dist-name');
    const dateEl = document.getElementById('dist-date');
    const today = new Date().toISOString().split('T')[0];

    // Validate beneficiary
    const cardVal = cardEl?.value.trim().toUpperCase();
    const ben = cardVal ? RN.findBeneficiary(cardVal) : null;
    if (!ben) {
      showToast('Please look up a valid beneficiary first.', 'error');
      return;
    }

    // Validate date
    const dateVal = dateEl?.value;
    if (!dateVal || dateVal > today) {
      showToast('Invalid distribution date.', 'error');
      return;
    }

    // Collect item rows
    const rows = document.querySelectorAll('#dist-items-body tr');
    const items = [];
    let hasError = false;

    rows.forEach(row => {
      const sel = row.querySelector('.item-select');
      const qty = row.querySelector('.item-qty');
      const unit = row.querySelector('.item-unit');
      if (!sel || !qty) return;

      const selVal = sel.value;
      const qtyVal = parseFloat(qty.value);

      if (!selVal || isNaN(qtyVal) || qtyVal <= 0) {
        hasError = true;
        return;
      }

      const [itemName, itemUnit] = selVal.split('|');
      const avail = RN.getStockAvailable(itemName, itemUnit);

      if (qtyVal > avail) {
        showToast(`Insufficient stock for ${itemName}. Available: ${avail.toFixed(1)} ${itemUnit}`, 'error');
        hasError = true;
        return;
      }

      items.push({ item: itemName, qty: qtyVal, unit: itemUnit });
    });

    if (hasError) return;
    if (items.length === 0) {
      showToast('Please add at least one item to distribute.', 'error');
      return;
    }

    const remarks = document.getElementById('dist-remarks')?.value.trim() || '';

    RN.addDistribution({
      beneficiaryId: ben.id,
      beneficiaryName: ben.name,
      cardNo: ben.cardNo,
      category: ben.category,
      date: dateVal,
      items,
      remarks,
    });

    showToast(`Distribution recorded for ${ben.name}`, 'success', 4000);

    // Reset form
    form.reset();
    dateEl.value = today;
    dateEl.max = today;
    document.getElementById('dist-items-body').innerHTML = '';
    _itemRowCount = 0;
    addItemRow();
    if (nameEl) nameEl.value = '';
    const catEl = document.getElementById('dist-category');
    if (catEl) catEl.value = '';
    const chip = document.getElementById('ben-info-chip');
    if (chip) chip.style.display = 'none';
    cardEl?.classList.remove('is-valid', 'is-invalid');

    renderTodayLog();
  });
}

// ── Today's Distribution Log ──
function renderTodayLog() {
  const tbody = document.getElementById('today-log-tbody');
  const countEl = document.getElementById('today-log-count');
  if (!tbody) return;

  const today = new Date().toISOString().split('T')[0];
  const todayDist = RN.getDistributions()
    .filter(d => d.date === today)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (countEl) countEl.textContent = `${todayDist.length} distribution${todayDist.length !== 1 ? 's' : ''} today`;

  if (todayDist.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-state"><span class="empty-icon">📋</span>No distributions recorded today.</td></tr>`;
    return;
  }

  tbody.innerHTML = todayDist.map(d => {
    const itemStr = d.items.map(i => `${i.item} ${i.qty} ${i.unit}`).join(', ');
    const totalQty = d.items.reduce((s, i) => s + parseFloat(i.qty), 0);
    const catClass = d.category === 'APL' ? 'badge-blue' : d.category === 'BPL' ? 'badge-amber' : 'badge-red';
    const statusClass = d.status === 'Completed' ? 'badge-green' : 'badge-amber';

    return `<tr>
      <td style="font-family:var(--font-body);color:var(--accent)">${d.cardNo}</td>
      <td>${d.beneficiaryName} <span class="badge ${catClass}" style="margin-left:4px">${d.category}</span></td>
      <td style="font-size:0.78rem;font-family:var(--font-body)">${itemStr}</td>
      <td style="font-family:var(--font-body)">${totalQty.toFixed(1)}</td>
      <td><span class="badge ${statusClass}">${d.status}</span></td>
    </tr>`;
  }).join('');
}
