(function () {
  /* =========================
     THEME TOGGLE (auto/light/dark)
     ========================= */
  const THEME_KEY = 'theme'; // 'light' | 'dark' | 'auto'
  const root = document.documentElement;
  const themeToggle = document.getElementById('themeToggle');

  function applyTheme(mode) {
    root.classList.remove('light');
    root.setAttribute('data-theme', mode);
    if (mode === 'light') root.classList.add('light');
    localStorage.setItem(THEME_KEY, mode);
    if (themeToggle) {
      themeToggle.textContent = mode === 'light' ? '☀️' : (mode === 'dark' ? '🌙' : '🌗');
      themeToggle.title = `Tema: ${mode}`;
    }
  }
  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    applyTheme(saved || 'auto');
  }
  function cycleTheme() {
    const cur = localStorage.getItem(THEME_KEY) || 'auto';
    const next = cur === 'auto' ? 'light' : (cur === 'light' ? 'dark' : 'auto');
    applyTheme(next);
  }
  if (themeToggle) themeToggle.addEventListener('click', cycleTheme);
  initTheme();

  /* =========================
     DOM SHORTCUTS & ELEMENTS
     ========================= */
  const $ = (id) => document.getElementById(id);

  // Auth gate
  const authGate = $('authGate');
  const loginUser = $('loginUser'); // username
  const loginPass = $('loginPass'); // password
  const loginBtn = $('loginBtn');
  const logoutBtn = $('logoutBtn');

  // App shell
  const appHeader = $('appHeader');
  const appMain = $('appMain');
  const appFooter = $('appFooter');
  const adminBtn = $('adminBtn');

  // Admin modal
  const adminModal = $('adminModal');
  const adminClose = $('adminClose');
  const usersListBox = $('usersList'); // dynamic content (table + editor)

  // Quick add (left card)
  const addUserBtn = $('addUserBtn');
  const newUserName = $('newUserName');
  const newUserEmail = $('newUserEmail');
  const newUserPhone = $('newUserPhone');
  const newUserPass = $('newUserPass');

  // PIN block
  const oldPin = $('oldPin');
  const newPin = $('newPin');
  const changePinBtn = $('changePinBtn');

  // Calculator UI
  const inputsDiv = $('inputs');
  const currencySel = $('currency');
  const compoundSel = $('compound');
  const interestFree = $('interestFree');
  const currencyBadge = $('currencyBadge');

  const preparedByInp = $('preparedBy');
  const customerNameInp = $('customerName');
  const customerPhoneInp = $('customerPhone');
  const customerEmailInp = $('customerEmail');
  const propertyNameInp = $('propertyName');
  const propertyBlockInp = $('propertyBlock');
  const propertyUnitInp = $('propertyUnit');
  const propertyTypeInp = $('propertyType');

  const metaDate = $('metaDate');
  const metaCustomer = $('metaCustomer');
  const metaProperty = $('metaProperty');
  const metaPrepared = $('metaPrepared');

  const sbSale = $('sbSale');
  const sbDown = $('sbDown');
  const sbBalance = $('sbBalance');
  const sbBalancePlusInterest = $('sbBalancePlusInterest');
  const sbTotalBurden = $('sbTotalBurden');

  const primaryValue = $('primaryValue');
  const loanAmountEl = $('loanAmount');
  const totalPaid = $('totalPaid');
  const payoffDate = $('payoffDate');
  const summary = $('summary');

  const scheduleWrap = $('scheduleWrap');
  const scheduleBody = $('schedule');
  const exportBtn = $('exportBtn');
  const printBtn = $('printBtn');
  const calcBtn = $('calcBtn');
  const resetBtn = $('resetBtn');
  const saveQuoteBtn = $('saveQuoteBtn');
  const clearQuotesBtn = $('clearQuotesBtn');
  const savedList = $('savedList');

  if ($('year')) $('year').textContent = new Date().getFullYear();

  /* =========================
     HELPERS
     ========================= */
  const sym = { GBP: '£', EUR: '€', USD: '$' };
  const fmt = (v, cur = 'GBP') =>
    isFinite(v)
      ? (sym[cur] || '') +
        Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '—';
  const todayStr = () => new Date().toLocaleDateString();
  const getSymbol = () => sym[currencySel.value] || '';

  /* =========================
     API (Cloudflare Pages Functions)
     ========================= */
  const API_BASE = ''; // same-origin
  async function api(path, opts = {}) {
    const res = await fetch(API_BASE + path, {
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      ...opts
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || res.statusText || 'Request failed');
      err.data = data; err.status = res.status;
      throw err;
    }
    return data;
  }
  // Auth
  const loginAPI  = (name, pass) => api('/api/auth/login', { method: 'POST', body: JSON.stringify({ name, pass }) });
  const meAPI     = () => api('/api/auth/me', { method: 'GET' });
  const logoutAPI = () => api('/api/auth/logout', { method: 'POST' });
  // Users
  const listUsers = () => api('/api/users', { method: 'GET' });
  const createUser= (body) => api('/api/users', { method: 'POST', body: JSON.stringify(body) });
  const updateUser= (body) => api('/api/users', { method: 'PUT',  body: JSON.stringify(body) });
  const deleteUserAPI = (id, pin) =>
    api(`/api/users?id=${encodeURIComponent(id)}&pin=${encodeURIComponent(pin)}`, { method: 'DELETE' });
  // Admin PIN change
  const changePinAPI = (oldPin, newPin) =>
    api('/api/admin/pin', { method: 'POST', body: JSON.stringify({ oldPin, newPin }) });

  const normalizeUsers = (res) => (Array.isArray(res) ? res : (res && res.users) || []);

  /* =========================
     Client-side session (tiny UI cache)
     ========================= */
  const SESSION_OBJ_KEY = 'noy_session_user_obj';
  function setSessionUser(user) { try { localStorage.setItem(SESSION_OBJ_KEY, JSON.stringify(user || null)); } catch {} }
  function clearSessionStorage() { try { localStorage.removeItem(SESSION_OBJ_KEY); } catch {} }
  function currentUserObj() { try { return JSON.parse(localStorage.getItem(SESSION_OBJ_KEY) || 'null'); } catch { return null; } }
  function isAdmin() { return currentUserObj()?.role === 'admin'; }

  /* =========================
     ADMIN UI: TABLE + EDITOR
     ========================= */
  let selectedUserId = null;
  let showEditor = false;

  function userTableHTML(users) {
    const rows = users.map((u) => {
      const badge = u.role === 'admin'
        ? '<span class="role-badge admin">admin</span>'
        : '<span class="role-badge">user</span>';
      return `
        <tr data-id="${u.id}">
          <td><strong>${escapeHTML(u.name || '')}</strong><br>
              <span class="muted" style="font-size:12px">${escapeHTML(u.email || '')}${u.phone ? ' • ' + escapeHTML(u.phone) : ''}</span>
          </td>
          <td>${badge}</td>
          <td class="row-actions">
            <button class="btn tiny" data-act="edit">Düzenle</button>
            <button class="btn tiny secondary danger" data-act="delete">Sil</button>
          </td>
        </tr>`;
    }).join('');
    return `
      <table class="user-table">
        <thead>
          <tr><th>Kullanıcı</th><th>Rol</th><th>İşlemler</th></tr>
        </thead>
        <tbody>${rows || ''}</tbody>
      </table>`;
  }

  function editorHTML(u) {
    const user = u || { id: '', name: '', email: '', phone: '', role: 'user', pass: '' };
    return `
      <div class="user-editor" id="userEditor" data-id="${user.id || ''}">
        <h4 class="modal-section-title">${user.id ? 'Kullanıcıyı Düzenle' : 'Yeni Kullanıcı'}</h4>
        <div class="form-row">
          <div class="field">
            <label>Ad Soyad</label>
            <input class="input-sm" id="editName" type="text" value="${escapeAttr(user.name || '')}" placeholder="Ad Soyad">
          </div>
          <div class="field">
            <label>Rol</label>
            <select class="input-sm" id="editRole">
              <option value="user" ${user.role !== 'admin' ? 'selected' : ''}>user</option>
              <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>admin</option>
            </select>
          </div>
          <div class="field">
            <label>E-posta</label>
            <input class="input-sm" id="editEmail" type="email" value="${escapeAttr(user.email || '')}" placeholder="eposta@ornek.com">
          </div>
          <div class="field">
            <label>Telefon</label>
            <input class="input-sm" id="editPhone" type="tel" value="${escapeAttr(user.phone || '')}" placeholder="+90 ...">
          </div>
          <div class="field">
            <label>${user.id ? 'Yeni Şifre (opsiyonel)' : 'Şifre'}</label>
            <input class="input-sm" id="editPass" type="password" placeholder="••••">
          </div>
          <div class="field">
            <label>Doğrulama (admin PIN)</label>
            <input class="input-sm" id="editPin" type="password" placeholder="****">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn secondary" id="cancelEditBtn">Vazgeç</button>
          <button class="btn" id="saveEditBtn">${user.id ? 'Kaydet' : 'Ekle'}</button>
        </div>
      </div>
    `;
  }

  async function renderUsersPanel() {
    if (!usersListBox) return;
    try {
      const resp = await listUsers();
      const users = normalizeUsers(resp);
      const editorUser = selectedUserId ? users.find((u) => u.id === selectedUserId) : null;

      usersListBox.innerHTML = `
        <div class="modal-card">
          <h4 class="modal-section-title">Kullanıcılar</h4>
          ${userTableHTML(users)}
        </div>
        ${showEditor ? `<div class="modal-card">${editorHTML(editorUser)}</div>` : ''}
      `;

      if (showEditor) {
        const editorEl = $('userEditor');
        if (editorEl) {
          editorEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          const nameEl = $('editName');
          if (nameEl) { nameEl.focus(); nameEl.select?.(); }
        }
      }
    } catch (e) {
      usersListBox.innerHTML = `<div class="modal-card"><p class="muted">Kullanıcılar yüklenemedi: ${e.data?.error || e.message}</p></div>`;
    }
  }

  if (usersListBox) {
    usersListBox.addEventListener('click', async (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;

      if (btn.dataset.act === 'edit') {
        const tr = btn.closest('tr[data-id]'); if (!tr) return;
        selectedUserId = tr.getAttribute('data-id');
        showEditor = true;
        renderUsersPanel();
        return;
      }
      if (btn.dataset.act === 'delete') {
        const tr = btn.closest('tr[data-id]'); if (!tr) return;
        const uid = tr.getAttribute('data-id');
        const pin = prompt('Admin PIN?') || '';
        if (!pin) return;
        if (!confirm('Bu kullanıcı silinsin mi?')) return;
        try {
          await deleteUserAPI(uid, pin);
          const me = currentUserObj();
          if (me && me.id === uid) { await handleLogout(); return; }
          await renderUsersPanel();
          alert('Kullanıcı silindi.');
        } catch (err) {
          alert(err.data?.error || 'Silinemedi.');
        }
        return;
      }

      if (btn.id === 'saveEditBtn') { handleSaveEditor(); return; }
      if (btn.id === 'cancelEditBtn') {
        selectedUserId = null;
        showEditor = false;
        renderUsersPanel();
        return;
      }
    });

    usersListBox.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.closest('#userEditor')) {
        e.preventDefault();
        handleSaveEditor();
      }
    });
  }

  async function handleSaveEditor() {
    const id = ($('#userEditor') || {}).getAttribute?.('data-id') || '';
    const nameI = ($('#editName') || {}).value?.trim() || '';
    const roleI = ($('#editRole') || {}).value === 'admin' ? 'admin' : 'user';
    const emailI = ($('#editEmail') || {}).value?.trim() || '';
    const phoneI = ($('#editPhone') || {}).value?.trim() || '';
    const passI = ($('#editPass') || {}).value || '';
    const pin = ($('#editPin') || {}).value || '';

    try {
      if (!id) {
        if (!nameI) { alert('Ad Soyad zorunlu.'); return; }
        if (!passI) { alert('Yeni kullanıcı için şifre zorunlu.'); return; }
        await createUser({ name: nameI, email: emailI, phone: phoneI, role: roleI, pass: passI, pin });
        alert('Kullanıcı eklendi.');
      } else {
        await updateUser({
          id,
          name: nameI || undefined,
          email: emailI || undefined,
          phone: phoneI || undefined,
          role: roleI,
          pass: passI || undefined,
          pin
        });

        const me = await meAPI().catch(() => ({ ok:false }));
        if (me && me.ok && me.user) {
          setSessionUser(me.user);
          preparedByInp.value = me.user.name || '';
          metaPrepared.textContent = preparedByInp.value || '—';
          if (adminBtn) adminBtn.style.display = me.user.role === 'admin' ? '' : 'none';
        }
        alert('Kullanıcı güncellendi.');
      }
      selectedUserId = null;
      showEditor = false;
      await renderUsersPanel();
    } catch (e) {
      alert(e.data?.error || 'Kaydedilemedi.');
    }
  }

  function showAdminModal() {
    if (adminModal) adminModal.classList.add('show');
    selectedUserId = null;
    showEditor = false;
    renderUsersPanel();
    const modalBox = adminModal?.querySelector('.modal');
    if (modalBox) modalBox.scrollTop = 0;
  }
  function hideAdminModal() { if (adminModal) adminModal.classList.remove('show'); }

  if (adminBtn) adminBtn.addEventListener('click', showAdminModal);
  if (adminClose) adminClose.addEventListener('click', hideAdminModal);
  if (adminModal) {
    adminModal.addEventListener('click', (e) => { if (e.target === adminModal) hideAdminModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && adminModal.classList.contains('show')) hideAdminModal(); });
  }

  /* =========================
     GATE SHOW/HIDE
     ========================= */
  function showApp() {
    authGate?.classList.add('hidden');
    appHeader?.classList.remove('hidden');
    appMain?.classList.remove('hidden');
    appFooter?.classList.remove('hidden');

    const cu = currentUserObj();
    if (cu) {
      preparedByInp.value = cu.name || '';
      localStorage.setItem('preparedBy', preparedByInp.value || '');
      metaPrepared.textContent = preparedByInp.value || '—';
    }
    if (adminBtn) adminBtn.style.display = isAdmin() ? '' : 'none';
  }
  function showGate() {
    authGate?.classList.remove('hidden');
    appHeader?.classList.add('hidden');
    appMain?.classList.add('hidden');
    appFooter?.classList.add('hidden');
  }

  /* =========================
     LOGIN / LOGOUT (server)
     ========================= */
  async function handleLogin() {
    const nameInput = loginUser ? loginUser.value.trim() : '';
    const pass = loginPass ? loginPass.value || '' : '';
    if (!nameInput || !pass) { alert('Kullanıcı adı ve şifre gerekli.'); return; }
    try {
      await loginAPI(nameInput, pass);
      const me = await meAPI();
      if (!me.ok || !me.user) { alert('Kullanıcı veya şifre hatalı.'); return; }
      setSessionUser(me.user);
      preparedByInp.value = me.user.name || '';
      metaPrepared.textContent = preparedByInp.value || '—';
      if (adminBtn) adminBtn.style.display = me.user.role === 'admin' ? '' : 'none';
      showApp();
    } catch (e) {
      alert(e.data?.error || 'Giriş yapılamadı.');
    }
  }

  async function handleLogout() {
    try { await logoutAPI(); } catch {}
    clearSessionStorage();
    if (loginUser) loginUser.value = '';
    if (loginPass) loginPass.value = '';
    showGate();
  }

  if (loginBtn)  loginBtn.addEventListener('click', handleLogin);
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
  if (loginPass) loginPass.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleLogin(); });
  if (loginUser) loginUser.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleLogin(); });

  /* =========================
     Admin PIN change (server)
     ========================= */
  if (changePinBtn) changePinBtn.addEventListener('click', async () => {
    const oldp = (oldPin?.value || '').trim();
    const newp = (newPin?.value || '').trim();
    if (!oldp || !newp) { alert('Mevcut ve yeni PIN gerekli.'); return; }
    try {
      await changePinAPI(oldp, newp);
      oldPin.value = ''; newPin.value = '';
      alert('Admin PIN güncellendi.');
    } catch (e) {
      alert(e.data?.error || 'PIN değiştirilemedi.');
    }
  });

  /* =========================
     CALCULATOR UI RENDER
     ========================= */
  function renderFields() {
    inputsDiv.innerHTML =
      '<div class="field prefix-wrap">' +
      '<label for="salePrice">Satış Fiyatı</label>' +
      '<span class="prefix" id="symSale">' + getSymbol() + '</span>' +
      '<input id="salePrice" type="number" step="0.01" placeholder="örn. 75,000" />' +
      '</div>' +
      '<div class="field prefix-wrap">' +
      '<label for="down">Peşinat</label>' +
      '<span class="prefix" id="symDown">' + getSymbol() + '</span>' +
      '<input id="down" type="number" step="0.01" placeholder="örn. 20,000" />' +
      '</div>' +
      '<div class="field">' +
      '<label for="apr">Yıllık Faiz Oranı (%)</label>' +
      '<input id="apr" type="number" step="0.01" placeholder="örn. 3.75" ' + (interestFree.checked ? 'disabled' : '') + '/>' +
      '</div>' +
      '<div class="field">' +
      '<label for="term">Vade (ay)</label>' +
      '<input id="term" type="number" step="1" placeholder="örn. 120" />' +
      '</div>';

    scheduleWrap.style.display = 'none';
    [primaryValue, loanAmountEl, totalPaid, payoffDate, sbSale, sbDown, sbBalance, sbBalancePlusInterest, sbTotalBurden]
      .forEach((el) => (el.textContent = '—'));
    summary.textContent = 'Değerleri girip “Hesapla”ya basın.';
    metaDate.textContent = todayStr();

    const cu = currentUserObj();
    preparedByInp.value = cu?.name || localStorage.getItem('preparedBy') || preparedByInp.value || '';
    metaPrepared.textContent = preparedByInp.value || '—';
  }

  function updateCurrencyUI() {
    currencyBadge.textContent = 'Para Birimi: ' + currencySel.value + ' (' + getSymbol() + ')';
    const sale = $('symSale'), down = $('symDown');
    if (sale) sale.textContent = getSymbol();
    if (down) down.textContent = getSymbol();
  }

  function collectValues() {
    const salePrice = Number((($('salePrice') || {}).value) || 0);
    const down = Number((($('down') || {}).value) || 0);
    const apr = interestFree.checked ? 0 : Number((($('apr') || {}).value) || 0);
    const term = Number((($('term') || {}).value) || 0);
    return { salePrice, down, apr, term };
  }

  function buildSchedule(P, r, n, pay) {
    let bal = P;
    const rows = [];
    for (let k = 1; k <= n; k++) {
      const interest = r === 0 ? 0 : bal * r;
      const principal = Math.min(bal, pay - interest);
      bal = Math.max(0, bal - principal);
      rows.push({ k, pay, bal });
      if (bal <= 0) break;
    }
    return rows;
  }

  function toCSV(rows, meta) {
    const top =
      'Date,' + meta.date + '\n' +
      'Prepared By,' + meta.preparedBy + '\n' +
      'Customer,' + meta.customer + '\n' +
      'Phone,' + meta.phone + '\n' +
      'Email,' + meta.email + '\n' +
      'Property,' + meta.property + '\n' +
      'Block,' + meta.block + '\n' +
      'Unit,' + meta.unit + '\n' +
      'Type,' + meta.type + '\n' +
      'Currency,' + meta.currency + '\n' +
      'Sale Price,' + meta.sale + '\n' +
      'Down Payment,' + meta.down + '\n' +
      'Balance After Down,' + meta.balance + '\n' +
      'Total of Installments,' + meta.totalInstallments + '\n' +
      'Total Interest,' + meta.totalInterest + '\n\n';

    const header = 'Period,Payment,Balance\n';
    const lines = rows.map((r) => [r.k, r.pay.toFixed(2), r.bal.toFixed(2)].join(','));
    return top + header + lines.join('\n');
  }

  /* =========================
     CALC / SUMMARY / TABLE
     ========================= */
  function syncMeta() {
    metaDate.textContent = todayStr();
    metaCustomer.textContent = (customerNameInp.value || '').trim() || '—';
    const propBits = [
      propertyNameInp.value,
      propertyBlockInp.value && 'Blok ' + propertyBlockInp.value,
      propertyUnitInp.value && 'No ' + propertyUnitInp.value,
      propertyTypeInp.value
    ].filter(Boolean).join(' • ');
    metaProperty.textContent = propBits || '—';
    metaPrepared.textContent = (preparedByInp.value || '').trim() || '—';
  }

  function calculate() {
    const cur = currencySel.value;
    const vals = collectValues();
    const sale = Number(vals.salePrice) || 0;
    const downPay = Number(vals.down) || 0;
    const P = Math.max(0, sale - downPay);
    const n = Number(vals.term || 0);
    const m = Number(compoundSel.value);
    const r = Number(vals.apr || 0) / 100 / m;

    if (n <= 0) { summary.textContent = 'Lütfen geçerli vade (ay) girin.'; return; }

    const payment = r === 0 ? P / n : (P * r) / (1 - Math.pow(1 + r, -n));
    const rows = buildSchedule(P, r, n, payment);

    const totalInstallments = rows.reduce((s, row) => s + row.pay, 0);
    const totalInterestBurden = (downPay + totalInstallments) - sale;

    sbSale.textContent = fmt(sale, cur);
    sbDown.textContent = fmt(downPay, cur);
    sbBalance.textContent = fmt(P, cur);
    sbBalancePlusInterest.textContent = fmt(totalInstallments, cur);
    sbTotalBurden.textContent = fmt(totalInterestBurden, cur);

    primaryValue.textContent = fmt(payment, cur);
    loanAmountEl.textContent = fmt(P, cur);
    totalPaid.textContent = fmt(totalInstallments, cur);

    const end = new Date(); end.setMonth(end.getMonth() + rows.length);
    payoffDate.textContent = end.toLocaleDateString();

    summary.textContent =
      'Satış ' + fmt(sale, cur) + ', Peşinat ' + fmt(downPay, cur) + ' → Kredi ' + fmt(P, cur) +
      ', ' + rows.length + ' ay, APR ~ ' + (r * m * 100).toFixed(3) + '%.';

    scheduleBody.innerHTML = rows
      .map((rw) => '<tr><td>' + rw.k + '</td><td>' + fmt(rw.pay, cur) + '</td><td>' + fmt(rw.bal, cur) + '</td></tr>')
      .join('');
    scheduleWrap.style.display = 'block';

    if (exportBtn) {
      exportBtn.dataset.csv = toCSV(rows, {
        date: metaDate.textContent || todayStr(),
        preparedBy: preparedByInp.value || '',
        customer: customerNameInp.value || '',
        phone: customerPhoneInp.value || '',
        email: customerEmailInp.value || '',
        property: propertyNameInp.value || '',
        block: propertyBlockInp.value || '',
        unit: propertyUnitInp.value || '',
        type: propertyTypeInp.value || '',
        currency: cur,
        sale: (sale || 0).toFixed(2),
        down: (downPay || 0).toFixed(2),
        balance: (P || 0).toFixed(2),
        totalInstallments: (totalInstallments || 0).toFixed(2),
        totalInterest: (totalInterestBurden || 0).toFixed(2)
      });
    }
  }

  /* =========================
     SAVED QUOTES (local for now)
     ========================= */
  function getQuotes() { try { return JSON.parse(localStorage.getItem('quotes') || '[]'); } catch { return []; } }
  function setQuotes(arr) { localStorage.setItem('quotes', JSON.stringify(arr)); renderSavedList(); }
  function renderSavedList() {
    const items = getQuotes();
    savedList.innerHTML = items.length ? '' : '<li class="id">Henüz kayıt yok.</li>';
    items.forEach((q, idx) => {
      const li = document.createElement('li');
      const left = document.createElement('div');
      left.innerHTML = '<strong>' + (q.customer || '—') + '</strong> · ' + (q.property || '—') + ' <span class="id">(' + (q.date) + ')</span>';
      const right = document.createElement('div'); right.className = 'actions';
      const loadBtn = document.createElement('button'); loadBtn.className = 'btn tiny'; loadBtn.textContent = 'Yükle';
      const delBtn = document.createElement('button'); delBtn.className = 'btn tiny secondary'; delBtn.textContent = 'Sil';
      loadBtn.onclick = () => { loadQuote(idx); };
      delBtn.onclick = () => { const arr = getQuotes(); arr.splice(idx, 1); setQuotes(arr); };
      right.appendChild(loadBtn); right.appendChild(delBtn);
      li.appendChild(left); li.appendChild(right);
      savedList.appendChild(li);
    });
  }
  function loadQuote(i) {
    const q = getQuotes()[i]; if (!q) return;
    preparedByInp.value = q.preparedBy || '';
    customerNameInp.value = q.customer || '';
    customerPhoneInp.value = q.phone || '';
    customerEmailInp.value = q.email || '';
    propertyNameInp.value = q.property || '';
    propertyBlockInp.value = q.block || '';
    propertyUnitInp.value = q.unit || '';
    propertyTypeInp.value = q.type || '';
    localStorage.setItem('preparedBy', preparedByInp.value || '');
    currencySel.value = q.currency || currencySel.value;
    localStorage.setItem('currency', currencySel.value);
    renderFields();
    $('salePrice').value = q.sale || 0;
    $('down').value = q.down || 0;
    $('apr').value = q.apr || 0;
    $('term').value = q.term || 0;
    interestFree.checked = (q.apr === 0);
    $('apr').disabled = interestFree.checked;
    updateCurrencyUI();
    syncMeta();
    calcBtn.click();
  }

  /* =========================
     EVENTS
     ========================= */
  if (printBtn) printBtn.addEventListener('click', () => {
    const customer = (customerNameInp.value || 'Musteri').trim().replace(/\s+/g, '_');
    const property = (propertyNameInp.value || 'Proje').trim().replace(/\s+/g, '_');
    const date = new Date().toISOString().slice(0, 10);
    const prevTitle = document.title;
    document.title = 'Noyanlar_' + customer + '_' + property + '_' + date;
    window.print();
    setTimeout(() => { document.title = prevTitle; }, 300);
  });

  if (currencySel) currencySel.addEventListener('change', () => {
    localStorage.setItem('currency', currencySel.value);
    updateCurrencyUI();
  });
  if (compoundSel) compoundSel.addEventListener('change', () => { /* no-op */ });

  if (interestFree) interestFree.addEventListener('change', () => {
    const aprInput = $('apr');
    if (interestFree.checked) { if (aprInput) { aprInput.value = 0; aprInput.disabled = true; } }
    else { if (aprInput) aprInput.disabled = false; }
  });

  if (preparedByInp) preparedByInp.addEventListener('input', () => {
    localStorage.setItem('preparedBy', preparedByInp.value || '');
    metaPrepared.textContent = (preparedByInp.value || '').trim() || '—';
  });

  [customerNameInp, customerPhoneInp, customerEmailInp,
   propertyNameInp, propertyBlockInp, propertyUnitInp, propertyTypeInp]
    .forEach((inp) => { inp?.addEventListener('input', syncMeta); });

  const presets = $('presets');
  if (presets) presets.addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (!b) return;
    renderFields();
    $('salePrice').value = Number(b.getAttribute('data-sale') || 0);
    $('down').value = Number(b.getAttribute('data-down') || 0);
    $('apr').value = Number(b.getAttribute('data-apr') || 0);
    $('term').value = Number(b.getAttribute('data-term') || 0);
    calculate();
  });

  if (calcBtn) calcBtn.addEventListener('click', () => { syncMeta(); calculate(); });

  if (resetBtn) resetBtn.addEventListener('click', () => {
    [customerNameInp, customerPhoneInp, customerEmailInp,
      propertyNameInp, propertyBlockInp, propertyUnitInp, propertyTypeInp].forEach((i) => { if (i) i.value = ''; });
    syncMeta();
    renderFields();
  });

  if (exportBtn) exportBtn.addEventListener('click', () => {
    const csv = exportBtn.dataset.csv || '';
    if (!csv) { alert('Bu ekran için dışa aktarılacak amortisman yok.'); return; }
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'odeme_plani.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  if (saveQuoteBtn) saveQuoteBtn.addEventListener('click', () => {
    const cur = currencySel.value;
    const vals = collectValues();
    if (!vals.salePrice || !vals.term) { alert('Kaydetmek için Satış Fiyatı ve Vade gerekli.'); return; }
    const q = {
      date: todayStr(),
      preparedBy: preparedByInp.value || '',
      customer: customerNameInp.value || '',
      phone: customerPhoneInp.value || '',
      email: customerEmailInp.value || '',
      property: propertyNameInp.value || '',
      block: propertyBlockInp.value || '',
      unit: propertyUnitInp.value || '',
      type: propertyTypeInp.value || '',
      currency: cur,
      sale: Number(vals.salePrice) || 0,
      down: Number(vals.down) || 0,
      apr: Number(vals.apr) || 0,
      term: Number(vals.term) || 0
    };
    const arr = getQuotes(); arr.unshift(q); setQuotes(arr);
  });

  /* =========================
     INIT (ask server who I am)
     ========================= */
  (async function init() {
    try {
      const me = await meAPI();
      if (me.ok && me.user) { setSessionUser(me.user); showApp(); }
      else { clearSessionStorage(); showGate(); }
    } catch { clearSessionStorage(); showGate(); }

    const savedCur = localStorage.getItem('currency');
    if (savedCur && sym[savedCur]) currencySel.value = savedCur;

    renderFields();
    updateCurrencyUI();
    syncMeta();
    renderSavedList();
  })();

  /* =========================
     UTIL
     ========================= */
  function escapeHTML(s) {
    return String(s || '').replace(/[&<>"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }
  function escapeAttr(s) { return escapeHTML(s); }
})();