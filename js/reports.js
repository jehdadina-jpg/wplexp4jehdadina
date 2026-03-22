/* ============================================================
   RationNet — reports.js
   Filter, Summary Cards, CSV Export, Print
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const navbarShopName = document.getElementById('navbar-shop-name');
  if (navbarShopName) navbarShopName.textContent = 'Dadina Enterprises';
  const navbarShopId = document.getElementById('navbar-shop-id');
  if (navbarShopId) navbarShopId.textContent = 'SHOP01';
  
  initSidebar();

  // Set default date range: last 30 days
  const today = new Date().toISOString().split('T')[0];
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const fromEl = document.getElementById('filter-from');
  const toEl = document.getElementById('filter-to');
  if (fromEl) fromEl.value = monthAgo;
  if (toEl) { toEl.value = today; toEl.max = today; }

  // Initial render
  generateReport();

  document.getElementById('btn-generate')?.addEventListener('click', generateReport);
  document.getElementById('btn-export-csv')?.addEventListener('click', exportCSV);
  document.getElementById('btn-print')?.addEventListener('click', () => window.print());
});

let _currentData = [];

// ── Generate Report ──
function generateReport() {
  const from = document.getElementById('filter-from')?.value;
  const to = document.getElementById('filter-to')?.value;
  const itemFilter = document.getElementById('filter-item')?.value || 'All';
  const catFilter = document.getElementById('filter-cat')?.value || 'All';

  const all = RN.getDistributions();

  _currentData = all.filter(d => {
    if (from && d.date < from) return false;
    if (to && d.date > to) return false;
    if (catFilter !== 'All' && d.category !== catFilter) return false;
    if (itemFilter !== 'All') {
      const hasItem = d.items.some(i => i.item === itemFilter);
      if (!hasItem) return false;
    }
    return true;
  });

  renderReportTable(_currentData);
  renderSummaryCards(_currentData);
}

// ── Render Table ──
function renderReportTable(data) {
  const tbody = document.getElementById('report-tbody');
  const countEl = document.getElementById('report-count');
  if (!tbody) return;

  if (countEl) countEl.textContent = `${data.length} record${data.length !== 1 ? 's' : ''} found`;

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state"><span class="empty-icon">📊</span>No records match the selected filters.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(d => {
    const dateStr = new Date(d.date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const itemStr = d.items.map(i => `${i.item} (${i.qty} ${i.unit})`).join(', ');
    const totalQty = d.items.reduce((s, i) => s + parseFloat(i.qty), 0);
    const catClass = d.category === 'APL' ? 'badge-blue' : d.category === 'BPL' ? 'badge-amber' : 'badge-red';
    const statusClass = d.status === 'Completed' ? 'badge-green' : d.status === 'Pending' ? 'badge-amber' : 'badge-red';
    return `<tr>
      <td style="font-family:var(--font-body)">${dateStr}</td>
      <td>${d.beneficiaryName}</td>
      <td style="font-family:var(--font-body);color:var(--accent)">${d.cardNo}</td>
      <td><span class="badge ${catClass}">${d.category}</span></td>
      <td style="font-size:0.78rem;font-family:var(--font-body)">${itemStr}</td>
      <td style="font-family:var(--font-body)">${totalQty.toFixed(1)}</td>
      <td><span class="badge ${statusClass}">${d.status}</span></td>
    </tr>`;
  }).join('');
}

// ── Summary Cards ──
function renderSummaryCards(data) {
  const totalDist = data.length;
  const totalQty = data.reduce((sum, d) => sum + d.items.reduce((s, i) => s + parseFloat(i.qty), 0), 0);

  // Most distributed item
  const itemCount = {};
  data.forEach(d => d.items.forEach(i => {
    itemCount[i.item] = (itemCount[i.item] || 0) + parseFloat(i.qty);
  }));
  const topItem = Object.entries(itemCount).sort((a, b) => b[1] - a[1])[0];

  // Active beneficiaries (unique)
  const uniqueBen = new Set(data.map(d => d.beneficiaryId)).size;

  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setEl('sum-total-dist', totalDist.toLocaleString('en-IN'));
  setEl('sum-total-qty', totalQty.toFixed(1) + ' units');
  setEl('sum-top-item', topItem ? `${topItem[0]} (${topItem[1].toFixed(1)})` : '—');
  setEl('sum-active-ben', uniqueBen.toLocaleString('en-IN'));
}

// ── CSV Export ──
function exportCSV() {
  if (_currentData.length === 0) {
    showToast('No data to export. Generate a report first.', 'warning');
    return;
  }

  const header = ['Date', 'Beneficiary Name', 'Card No', 'Category', 'Items', 'Total Qty', 'Status'];

  const rows = _currentData.map(d => {
    const dateStr = d.date;
    const itemStr = d.items.map(i => `${i.item}:${i.qty}${i.unit}`).join('; ');
    const totalQty = d.items.reduce((s, i) => s + parseFloat(i.qty), 0).toFixed(1);
    return [
      dateStr,
      `"${d.beneficiaryName}"`,
      d.cardNo,
      d.category,
      `"${itemStr}"`,
      totalQty,
      d.status,
    ].join(',');
  });

  const csvContent = [header.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `RationNet_Report_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast(`Exported ${_currentData.length} records to CSV.`, 'success');
}
