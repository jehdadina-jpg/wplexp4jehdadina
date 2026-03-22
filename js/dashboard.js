/* ============================================================
   RationNet — dashboard.js
   KPI counters, stock alerts, recent activity
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const navbarShopName = document.getElementById('navbar-shop-name');
  if (navbarShopName) navbarShopName.textContent = 'Dadina Enterprises';
  const navbarShopId = document.getElementById('navbar-shop-id');
  if (navbarShopId) navbarShopId.textContent = 'SHOP01';
  
  initSidebar();

  const stock = RN.getStock();
  const beneficiaries = RN.getBeneficiaries();
  const distributions = RN.getDistributions();

  // ── KPI values ──
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = new Date().toISOString().slice(0, 7);

  const totalBeneficiaries = beneficiaries.length;
  const totalStockKg = stock.reduce((sum, s) => {
    const avail = Math.max(0, s.total - s.distributed);
    return sum + (s.unit === 'kg' ? avail : 0);
  }, 0);
  const distThisMonth = distributions.filter(d => d.date.startsWith(thisMonth)).length;
  const pending = distributions.filter(d => d.status === 'Pending').length;

  // ── Animated counter ──
  function animateCounter(id, target, duration = 1200) {
    const el = document.getElementById(id);
    if (!el) return;
    const start = performance.now();
    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      el.textContent = Math.floor(ease * target).toLocaleString('en-IN');
      if (progress < 1) requestAnimationFrame(update);
      else el.textContent = target.toLocaleString('en-IN');
    }
    requestAnimationFrame(update);
  }

  animateCounter('kpi-beneficiaries', totalBeneficiaries);
  animateCounter('kpi-stock', Math.round(totalStockKg));
  animateCounter('kpi-dist-month', distThisMonth);
  animateCounter('kpi-pending', pending);

  // ── Stock Alert Banner ──
  const alertContainer = document.getElementById('stock-alerts');
  if (alertContainer) {
    const alerts = [];
    stock.forEach(s => {
      const avail = Math.max(0, s.total - s.distributed);
      const pct = s.total > 0 ? avail / s.total : 0;
      if (pct < 0.1) {
        alerts.push({ item: s.item, unit: s.unit, avail, pct, level: 'red' });
      } else if (pct < 0.2) {
        alerts.push({ item: s.item, unit: s.unit, avail, pct, level: 'amber' });
      }
    });

    if (alerts.length > 0) {
      const banner = document.createElement('div');
      banner.className = `alert-banner ${alerts[0].level}`;
      const items = alerts.map(a =>
        `<strong>${a.item}</strong> (${a.avail.toFixed(1)} ${a.unit} remaining)`
      ).join(', ');
      banner.innerHTML = `⚠️ &nbsp;Stock Alert: ${items}`;
      alertContainer.appendChild(banner);
      alertContainer.style.display = 'block';
    }
  }

  // ── Recent Activity Table ──
  const tbody = document.getElementById('recent-activity-body');
  if (tbody) {
    const recent = [...distributions]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    if (recent.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-state"><span class="empty-icon">📋</span>No distributions recorded yet.</td></tr>`;
    } else {
      tbody.innerHTML = recent.map(d => {
        const itemsSummary = d.items.map(i => `${i.item} (${i.qty} ${i.unit})`).join(', ');
        const totalQty = d.items.reduce((sum, i) => sum + parseFloat(i.qty), 0);
        const badgeClass = d.status === 'Completed' ? 'badge-green' : d.status === 'Pending' ? 'badge-amber' : 'badge-red';
        const dateStr = new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        return `<tr>
          <td>${dateStr}</td>
          <td><span class="text-accent" style="color:var(--accent);font-family:var(--font-body)">${d.cardNo}</span><br><small style="color:var(--text-secondary);font-size:0.72rem">${d.beneficiaryName}</small></td>
          <td style="max-width:180px;font-size:0.78rem">${itemsSummary}</td>
          <td style="font-family:var(--font-body)">${totalQty.toFixed(1)}</td>
          <td><span class="badge ${badgeClass}">${d.status}</span></td>
        </tr>`;
      }).join('');
    }
  }

  // ── Stock Overview mini bars ──
  const stockOverview = document.getElementById('stock-overview-body');
  if (stockOverview) {
    stockOverview.innerHTML = stock.map(s => {
      const avail = Math.max(0, s.total - s.distributed);
      const pct = s.total > 0 ? (avail / s.total) * 100 : 0;
      let statusClass = 'badge-green', statusText = 'Sufficient', barClass = '';
      if (pct < 10) { statusClass = 'badge-red'; statusText = 'Critical'; barClass = 'red'; }
      else if (pct < 30) { statusClass = 'badge-amber'; statusText = 'Low'; barClass = 'amber'; }

      return `<tr>
        <td style="font-family:var(--font-body)">${s.item}</td>
        <td style="font-family:var(--font-body)">${avail.toFixed(1)} ${s.unit}</td>
        <td style="min-width:100px">
          <div class="progress-bar-wrap">
            <div class="progress-bar-fill ${barClass}" style="width:${pct.toFixed(1)}%"></div>
          </div>
        </td>
        <td><span class="badge ${statusClass}">${statusText}</span></td>
      </tr>`;
    }).join('');
  }
});
