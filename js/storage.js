/* ============================================================
   RationNet — storage.js
   localStorage helpers + seed data
   ============================================================ */

const RN = {
  // ── Keys ──
  KEYS: {
    SESSION: 'rn_session',
    STOCK: 'rn_stock',
    BENEFICIARIES: 'rn_beneficiaries',
    DISTRIBUTIONS: 'rn_distributions',
  },

  // ── Generic helpers ──
  get(key) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : null;
    } catch { return null; }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch { return false; }
  },

  remove(key) {
    localStorage.removeItem(key);
  },

  // ── Session ──
  getSession() { return this.get(this.KEYS.SESSION); },
  setSession(data) { this.set(this.KEYS.SESSION, data); },
  clearSession() { this.remove(this.KEYS.SESSION); },

  // ── Stock ──
  getStock() { return this.get(this.KEYS.STOCK) || []; },
  setStock(arr) { this.set(this.KEYS.STOCK, arr); },

  addStockItem(item) {
    const stock = this.getStock();
    // If item already exists, update total
    const idx = stock.findIndex(s => s.item.toLowerCase() === item.item.toLowerCase() && s.unit === item.unit);
    if (idx > -1) {
      stock[idx].total += item.quantity;
      stock[idx].lastArrival = item.date;
    } else {
      const newItem = {
        id: 'STK-' + Date.now(),
        item: item.item,
        unit: item.unit,
        total: item.quantity,
        distributed: 0,
        lastArrival: item.date,
        createdAt: new Date().toISOString(),
      };
      stock.push(newItem);
    }
    this.setStock(stock);
  },

  updateStockItem(id, updates) {
    const stock = this.getStock();
    const idx = stock.findIndex(s => s.id === id);
    if (idx > -1) {
      stock[idx] = { ...stock[idx], ...updates };
      this.setStock(stock);
      return true;
    }
    return false;
  },

  deleteStockItem(id) {
    const stock = this.getStock().filter(s => s.id !== id);
    this.setStock(stock);
  },

  getStockAvailable(itemName, unit) {
    const s = this.getStock().find(
      s => s.item.toLowerCase() === itemName.toLowerCase() && s.unit === unit
    );
    if (!s) return 0;
    return Math.max(0, s.total - s.distributed);
  },

  deductStock(itemName, unit, qty) {
    const stock = this.getStock();
    const idx = stock.findIndex(
      s => s.item.toLowerCase() === itemName.toLowerCase() && s.unit === unit
    );
    if (idx > -1) {
      stock[idx].distributed = (stock[idx].distributed || 0) + qty;
      this.setStock(stock);
    }
  },

  // ── Beneficiaries ──
  getBeneficiaries() { return this.get(this.KEYS.BENEFICIARIES) || []; },
  setBeneficiaries(arr) { this.set(this.KEYS.BENEFICIARIES, arr); },

  addBeneficiary(b) {
    const list = this.getBeneficiaries();
    const newB = {
      id: 'BEN-' + Date.now(),
      name: b.name,
      cardNo: b.cardNo.toUpperCase(),
      category: b.category,
      phone: b.phone,
      address: b.address,
      members: parseInt(b.members),
      createdAt: new Date().toISOString(),
    };
    list.push(newB);
    this.setBeneficiaries(list);
    return newB;
  },

  updateBeneficiary(id, updates) {
    const list = this.getBeneficiaries();
    const idx = list.findIndex(b => b.id === id);
    if (idx > -1) {
      list[idx] = { ...list[idx], ...updates };
      this.setBeneficiaries(list);
      return true;
    }
    return false;
  },

  deleteBeneficiary(id) {
    const list = this.getBeneficiaries().filter(b => b.id !== id);
    this.setBeneficiaries(list);
  },

  findBeneficiary(cardNo) {
    return this.getBeneficiaries().find(
      b => b.cardNo.toUpperCase() === cardNo.toUpperCase().trim()
    ) || null;
  },

  // ── Distributions ──
  getDistributions() { return this.get(this.KEYS.DISTRIBUTIONS) || []; },
  setDistributions(arr) { this.set(this.KEYS.DISTRIBUTIONS, arr); },

  addDistribution(d) {
    const list = this.getDistributions();
    const newD = {
      id: 'DIS-' + Date.now(),
      beneficiaryId: d.beneficiaryId,
      beneficiaryName: d.beneficiaryName,
      cardNo: d.cardNo,
      category: d.category,
      date: d.date,
      items: d.items, // [{item, qty, unit}]
      remarks: d.remarks || '',
      status: 'Completed',
      createdAt: new Date().toISOString(),
    };
    list.push(newD);
    this.setDistributions(list);
    // Deduct stock
    d.items.forEach(i => {
      this.deductStock(i.item, i.unit, parseFloat(i.qty));
    });
    return newD;
  },

  // ── Seed Data (always overwrites beneficiaries + distributions) ──
  seedIfEmpty() {
    if (this.getStock().length === 0) {
      const seedStock = [
        { id: 'STK-001', item: 'Rice', unit: 'kg', total: 500, distributed: 120, lastArrival: '2025-03-01', createdAt: new Date().toISOString() },
        { id: 'STK-002', item: 'Wheat', unit: 'kg', total: 300, distributed: 80, lastArrival: '2025-03-01', createdAt: new Date().toISOString() },
        { id: 'STK-003', item: 'Sugar', unit: 'kg', total: 100, distributed: 72, lastArrival: '2025-02-20', createdAt: new Date().toISOString() },
        { id: 'STK-004', item: 'Kerosene', unit: 'litres', total: 200, distributed: 185, lastArrival: '2025-02-15', createdAt: new Date().toISOString() },
        { id: 'STK-005', item: 'Dal', unit: 'kg', total: 150, distributed: 30, lastArrival: '2025-03-05', createdAt: new Date().toISOString() },
        { id: 'STK-006', item: 'Oil', unit: 'litres', total: 80, distributed: 5, lastArrival: '2025-03-10', createdAt: new Date().toISOString() },
      ];
      this.setStock(seedStock);
    }

    // Always overwrite so name changes apply immediately
    const seedBeneficiaries = [
      { id: 'BEN-001', name: 'Salman Khan', cardNo: 'MH-100001', category: 'BPL', phone: '9876543210', address: '12, Galaxy Apartments, Bandra, Mumbai', members: 4, createdAt: new Date().toISOString() },
      { id: 'BEN-002', name: 'Shah Rukh Khan', cardNo: 'MH-100002', category: 'AAY', phone: '9898989898', address: 'Mannat, Bandstand, Bandra, Mumbai', members: 6, createdAt: new Date().toISOString() },
      { id: 'BEN-003', name: 'Hrithik Roshan', cardNo: 'MH-100003', category: 'APL', phone: '9012345678', address: '7, Juhu Beach Road, Mumbai', members: 3, createdAt: new Date().toISOString() },
      { id: 'BEN-004', name: 'Ranveer Singh', cardNo: 'MH-100004', category: 'BPL', phone: '7654321098', address: '33, Khar West, Mumbai', members: 5, createdAt: new Date().toISOString() },
      { id: 'BEN-005', name: 'Ranbir Kapoor', cardNo: 'MH-100005', category: 'APL', phone: '8765432109', address: '21, Vastu, Bandra West, Mumbai', members: 2, createdAt: new Date().toISOString() },
    ];
    this.setBeneficiaries(seedBeneficiaries);

    const today = new Date().toISOString().split('T')[0];
    const seedDist = [
      { id: 'DIS-001', beneficiaryId: 'BEN-001', beneficiaryName: 'Salman Khan', cardNo: 'MH-100001', category: 'BPL', date: today, items: [{ item: 'Rice', qty: 10, unit: 'kg' }, { item: 'Wheat', qty: 5, unit: 'kg' }], remarks: '', status: 'Completed', createdAt: new Date().toISOString() },
      { id: 'DIS-002', beneficiaryId: 'BEN-002', beneficiaryName: 'Shah Rukh Khan', cardNo: 'MH-100002', category: 'AAY', date: today, items: [{ item: 'Rice', qty: 15, unit: 'kg' }, { item: 'Sugar', qty: 3, unit: 'kg' }], remarks: 'Priority', status: 'Completed', createdAt: new Date().toISOString() },
      { id: 'DIS-003', beneficiaryId: 'BEN-003', beneficiaryName: 'Hrithik Roshan', cardNo: 'MH-100003', category: 'APL', date: today, items: [{ item: 'Wheat', qty: 8, unit: 'kg' }], remarks: '', status: 'Pending', createdAt: new Date().toISOString() },
      { id: 'DIS-004', beneficiaryId: 'BEN-004', beneficiaryName: 'Ranveer Singh', cardNo: 'MH-100004', category: 'BPL', date: today, items: [{ item: 'Dal', qty: 5, unit: 'kg' }, { item: 'Oil', qty: 2, unit: 'litres' }], remarks: '', status: 'Completed', createdAt: new Date().toISOString() },
      { id: 'DIS-005', beneficiaryId: 'BEN-005', beneficiaryName: 'Ranbir Kapoor', cardNo: 'MH-100005', category: 'APL', date: today, items: [{ item: 'Kerosene', qty: 5, unit: 'litres' }], remarks: '', status: 'Completed', createdAt: new Date().toISOString() },
    ];
    this.setDistributions(seedDist);
  },
};

// Seed data on first load
RN.seedIfEmpty();
