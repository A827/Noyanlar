// app.js
(function(){
  // ===== THEME (2-state toggle: light <-> dark, persisted) =====
  const THEME_KEY = 'theme'; // stores only 'light' or 'dark'
  const root = document.documentElement;
  const themeToggle = document.getElementById('themeToggle');

  const systemPrefersDark = () =>
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  function getStoredTheme(){
    const v = localStorage.getItem(THEME_KEY);
    return (v === 'light' || v === 'dark') ? v : (systemPrefersDark() ? 'dark' : 'light');
  }

  function applyTheme(mode){
    const m = (mode === 'light' || mode === 'dark') ? mode : (systemPrefersDark() ? 'dark' : 'light');
    root.setAttribute('data-theme', m);
    root.classList.toggle('light', m === 'light');
    localStorage.setItem(THEME_KEY, m);
    if (themeToggle){
      themeToggle.textContent = m === 'light' ? '☀️' : '🌙';
      themeToggle.title = `Tema: ${m}`;
    }
  }

  function initTheme(){ applyTheme(getStoredTheme()); }
  function cycleTheme(){ applyTheme(getStoredTheme() === 'light' ? 'dark' : 'light'); }

  themeToggle?.addEventListener('click', cycleTheme);
  initTheme();

  // ===== ELEMENTS =====
  const $ = (id)=>document.getElementById(id);
  const inputsDiv = $('inputs');

  // selectors
  const currencySel = $('currency');
  const compoundSel = $('compound');
  const interestFree = $('interestFree');
  const currencyBadge = $('currencyBadge');

  // meta inputs
  const preparedByInp = $('preparedBy');
  const customerNameInp = $('customerName');
  const customerPhoneInp = $('customerPhone');
  const customerEmailInp = $('customerEmail');
  const propertyNameInp = $('propertyName');
  const propertyBlockInp = $('propertyBlock');
  const propertyUnitInp = $('propertyUnit');
  const propertyTypeInp = $('propertyType');
  const activeUserSel = $('activeUser');

  // meta display
  const metaDate = $('metaDate');
  const metaCustomer = $('metaCustomer');
  const metaProperty = $('metaProperty');
  const metaPrepared = $('metaPrepared');

  // auth gate
  const authGate = $('authGate');
  const loginUserSel = $('loginUserSel');
  const loginPass = $('loginPass');
  const loginBtn = $('loginBtn');
  const openAdminFromGate = $('openAdminFromGate');
  const appHeader = $('appHeader');
  const appMain = $('appMain');
  const appFooter = $('appFooter');
  const logoutBtn = $('logoutBtn');

  // table & export & save
  const scheduleWrap = $('scheduleWrap');
  const scheduleBody = $('schedule');
  const exportBtn = $('exportBtn');
  const printBtn = $('printBtn');
  const calcBtn = $('calcBtn');
  const resetBtn = $('resetBtn');
  const saveQuoteBtn = $('saveQuoteBtn');
  const clearQuotesBtn = $('clearQuotesBtn');
  const savedList = $('savedList');

  // ADMIN UI
  const adminBtn = $('adminBtn');
  const adminModal = $('adminModal');
  const adminClose = $('adminClose');
  const addUserBtn = $('addUserBtn');
  const newUserName = $('newUserName');
  const newUserEmail = $('newUserEmail');
  const newUserPhone = $('newUserPhone');
  const newUserPass = $('newUserPass');
  const usersList = $('usersList');
  const changePinBtn = $('changePinBtn');
  const oldPin = $('oldPin');
  const newPin = $('newPin');

  // ===== HELPERS =====
  const sym = { GBP:'£', EUR:'€', USD:'$' };
  const fmt = (v, cur='GBP') =>
    isFinite(v) ? (sym[cur]||'') + Number(v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}) : '—';
  const todayStr = () => new Date().toLocaleDateString();

  if ($('year')) $('year').textContent = new Date().getFullYear();

  function getSymbol(){ return sym[currencySel.value] || ''; }

  function renderFields(){
    inputsDiv.innerHTML = `
      <div class="field prefix-wrap">
        <label for="salePrice">Satış Fiyatı</label>
        <span class="prefix" id="symSale">${getSymbol()}</span>
        <input id="salePrice" type="number" step="0.01" placeholder="örn. 75,000" />
      </div>
      <div class="field prefix-wrap">
        <label for="down">Peşinat</label>
        <span class="prefix" id="symDown">${getSymbol()}</span>
        <input id="down" type="number" step="0.01" placeholder="örn. 20,000" />
      </div>
      <div class="field">
        <label for="apr">Yıllık Faiz Oranı (%)</label>
        <input id="apr" type="number" step="0.01" placeholder="örn. 3.75" ${interestFree.checked ? 'disabled' : ''}/>
      </div>
      <div class="field">
        <label for="term">Vade (ay)</label>
        <input id="term" type="number" step="1" placeholder="örn. 120" />
      </div>
    `;

    scheduleWrap.style.display='none';
    [metaDate, metaCustomer, metaProperty, metaPrepared].forEach(el=> el && (el.textContent='—'));
    ['primaryValue','loanAmount','totalPaid','payoffDate','sbSale','sbDown','sbBalance','sbBalancePlusInterest','sbTotalBurden']
      .forEach(id=> { const el=$(id); if(el) el.textContent='—'; });
    const summary = $('summary'); if (summary) summary.textContent = 'Değerleri girip “Hesapla”ya basın.';
    if (metaDate) metaDate.textContent = todayStr();

    preparedByInp.value = localStorage.getItem('preparedBy') || preparedByInp.value || '';
    if (metaPrepared) metaPrepared.textContent = preparedByInp.value || '—';
  }

  function updateCurrencyUI(){
    const currencyBadge = $('currencyBadge');
    if (currencyBadge) currencyBadge.textContent = `Para Birimi: ${currencySel.value} (${getSymbol()})`;
    const sale = $('symSale'), down = $('symDown');
    if (sale) sale.textContent = getSymbol();
    if (down) down.textContent = getSymbol();
  }

  function collectValues(){
    const salePrice = Number(($('salePrice')||{}).value || 0);
    const down = Number(($('down')||{}).value || 0);
    const apr = interestFree.checked ? 0 : Number(($('apr')||{}).value || 0);
    const term = Number(($('term')||{}).value || 0);
    return { salePrice, down, apr, term };
  }

  function buildSchedule(P, r, n, pay){
    let bal = P, rows = [];
    for(let k=1;k<=n;k++){
      const interest = r===0 ? 0 : bal*r;
      const principal = Math.min(bal, pay - interest);
      bal = Math.max(0, bal - principal);
      rows.push({k, pay, bal});
      if (bal<=0) break;
    }
    return rows;
  }

  function toCSV(rows, meta){
    const top =
`Date,${meta.date}
Prepared By,${meta.preparedBy}
Customer,${meta.customer}
Phone,${meta.phone}
Email,${meta.email}
Property,${meta.property}
Block,${meta.block}
Unit,${meta.unit}
Type,${meta.type}
Currency,${meta.currency}
Sale Price,${meta.sale}
Down Payment,${meta.down}
Balance After Down,${meta.balance}
Total of Installments,${meta.totalInstallments}
Total Interest,${meta.totalInterest}

`;
    const header = 'Period,Payment,Balance\n';
    const lines = rows.map(r=>[r.k, r.pay.toFixed(2), r.bal.toFixed(2)].join(','));
    return top + header + lines.join('\n');
  }

  // ===== PERSISTENCE (Saved quotes) =====
  function getQuotes(){
    try{ return JSON.parse(localStorage.getItem('quotes')||'[]'); }catch{ return []; }
  }
  function setQuotes(arr){
    localStorage.setItem('quotes', JSON.stringify(arr));
    renderSavedList();
  }
  function renderSavedList(){
    const items = getQuotes();
    savedList.innerHTML = items.length ? '' : '<li class="id">Henüz kayıt yok.</li>';
    items.forEach((q, idx)=>{
      const li = document.createElement('li');
      const left = document.createElement('div');
      left.innerHTML = `<strong>${q.customer||'—'}</strong> · ${q.property||'—'} <span class="id">(${q.date})</span>`;
      const right = document.createElement('div'); right.className='actions';
      const loadBtn = document.createElement('button'); loadBtn.className='btn tiny'; loadBtn.textContent='Yükle';
      const delBtn = document.createElement('button'); delBtn.className='btn tiny secondary'; delBtn.textContent='Sil';
      loadBtn.onclick = ()=> loadQuote(idx);
      delBtn.onclick = ()=> { const arr=getQuotes(); arr.splice(idx,1); setQuotes(arr); };
      right.appendChild(loadBtn); right.appendChild(delBtn);
      li.appendChild(left); li.appendChild(right);
      savedList.appendChild(li);
    });
  }
  function loadQuote(i){
    const q = getQuotes()[i]; if(!q) return;
    preparedByInp.value = q.preparedBy||'';
    customerNameInp.value = q.customer||'';
    customerPhoneInp.value = q.phone||'';
    customerEmailInp.value = q.email||'';
    propertyNameInp.value = q.property||'';
    propertyBlockInp.value = q.block||'';
    propertyUnitInp.value = q.unit||'';
    propertyTypeInp.value = q.type||'';
    localStorage.setItem('preparedBy', preparedByInp.value||'');
    currencySel.value = q.currency||currencySel.value;
    localStorage.setItem('currency', currencySel.value);
    renderFields();
    $('salePrice').value = q.sale||0;
    $('down').value = q.down||0;
    $('apr').value = q.apr||0;
    $('term').value = q.term||0;
    interestFree.checked = (q.apr === 0);
    $('apr').disabled = interestFree.checked;
    updateCurrencyUI();
    syncMeta();
    calcBtn.click();
  }

  // ===== USERS (Admin) =====
  const USERS_KEY = 'users';
  const PIN_KEY = 'admin_pin';
  const AUTH_USER_KEY = 'auth_user'; // sessionStorage key

  function getUsers(){
    try{ return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); }catch{ return []; }
  }
  function setUsers(arr){
    localStorage.setItem(USERS_KEY, JSON.stringify(arr));
    renderUsersUI();
  }
  function ensureDefaults(){
    if (!localStorage.getItem(PIN_KEY)) localStorage.setItem(PIN_KEY, '0000'); // default PIN
    if (!localStorage.getItem(USERS_KEY)) {
      setUsers([{id:crypto.randomUUID?.()||String(Date.now()), name:'Satış Ekibi', email:'', phone:'', pass:''}]);
    } else {
      renderUsersUI();
    }
  }
  function renderUsersUI(){
    const users = getUsers();

    // auth gate dropdown
    if (loginUserSel){
      const current = loginUserSel.value;
      loginUserSel.innerHTML = users.map(u=>`<option value="${u.id}">${u.name}</option>`).join('');
      if (users.some(u=>u.id===current)) loginUserSel.value = current;
    }

    // in-app user dropdown
    if (activeUserSel){
      const current2 = activeUserSel.value;
      activeUserSel.innerHTML = `<option value="">—</option>` + users.map(u=>`<option value="${u.id}">${u.name}</option>`).join('');
      if (users.some(u=>u.id===current2)) activeUserSel.value = current2;
    }

    // list in admin modal
    if (usersList){
      usersList.innerHTML = users.map(u=>`
        <div class="list-item">
          <div>
            <strong>${u.name}</strong>
            <div class="muted" style="font-size:12px">${u.email||'—'} • ${u.phone||'—'}</div>
          </div>
          <div>
            <button class="btn tiny" data-edit="${u.id}">Düzenle</button>
            <button class="btn tiny" data-pass="${u.id}">Şifre</button>
            <button class="btn tiny secondary" data-del="${u.id}">Sil</button>
          </div>
        </div>
      `).join('');
    }
  }

  function requirePin(){
    const pin = prompt('Admin PIN:');
    if (!pin) return false;
    const saved = localStorage.getItem(PIN_KEY) || '0000';
    if (pin !== saved){ alert('Hatalı PIN'); return false; }
    return true;
  }

  function onActiveUserChange(){
    const id = activeUserSel.value;
    if (!id) return;
    const u = getUsers().find(x=>x.id===id);
    if (!u) return;
    preparedByInp.value = u.name || '';
    localStorage.setItem('preparedBy', preparedByInp.value||'');
    if (metaPrepared) metaPrepared.textContent = preparedByInp.value || '—';
  }

  // ===== AUTH FLOW =====
  function showAppUI(show){
    if (show){
      authGate.classList.add('hidden');
      appHeader.classList.remove('hidden');
      appMain.classList.remove('hidden');
      appFooter.classList.remove('hidden');
    } else {
      authGate.classList.remove('hidden');
      appHeader.classList.add('hidden');
      appMain.classList.add('hidden');
      appFooter.classList.add('hidden');
    }
  }

  function login(){
    const users = getUsers();
    const uid = loginUserSel.value;
    const user = users.find(u=>u.id===uid);
    if (!user){ alert('Kullanıcı bulunamadı'); return; }
    const input = (loginPass.value||'');
    const ok = (user.pass||'') === (input||'');
    if (!ok){ alert('Şifre hatalı'); return; }
    sessionStorage.setItem(AUTH_USER_KEY, uid);
    // Set preparedBy + dropdowns
    preparedByInp.value = user.name || '';
    localStorage.setItem('preparedBy', preparedByInp.value||'');
    if (metaPrepared) metaPrepared.textContent = preparedByInp.value || '—';
    if (activeUserSel){ activeUserSel.value = uid; }
    showAppUI(true);
  }

  function tryAutoLogin(){
    const uid = sessionStorage.getItem(AUTH_USER_KEY);
    if (!uid) { showAppUI(false); return; }
    const user = getUsers().find(u=>u.id===uid);
    if (!user) { sessionStorage.removeItem(AUTH_USER_KEY); showAppUI(false); return; }
    // hydrate UI
    preparedByInp.value = user.name || '';
    localStorage.setItem('preparedBy', preparedByInp.value||'');
    if (metaPrepared) metaPrepared.textContent = preparedByInp.value || '—';
    if (activeUserSel){ activeUserSel.value = uid; }
    showAppUI(true);
  }

  function logout(){
    sessionStorage.removeItem(AUTH_USER_KEY);
    loginPass.value = '';
    showAppUI(false);
  }

  // ===== META SYNC =====
  function syncMeta(){
    if (metaDate)      metaDate.textContent = todayStr();
    if (metaCustomer)  metaCustomer.textContent = (customerNameInp.value.trim() || '—');
    const propBits = [propertyNameInp.value, propertyBlockInp.value && `Blok ${propertyBlockInp.value}`, propertyUnitInp.value && `No ${propertyUnitInp.value}`, propertyTypeInp.value]
      .filter(Boolean).join(' • ');
    if (metaProperty)  metaProperty.textContent = propBits || '—';
    if (metaPrepared)  metaPrepared.textContent = (preparedByInp.value.trim() || '—');
  }

  // ===== PREFS =====
  function loadPrefs(){
    const savedCur = localStorage.getItem('currency');
    if (savedCur && sym[savedCur]) currencySel.value = savedCur;
    const savedPrepared = localStorage.getItem('preparedBy') || '';
    preparedByInp.value = preparedByInp.value || savedPrepared;
  }

  // ===== CALC =====
  function calculate(){
    const cur = currencySel.value;
    const { salePrice=0, down=0, apr=0, term=0 } = collectValues();

    const sale = Number(salePrice)||0;
    const downPay = Number(down)||0;
    const P = Math.max(0, sale - downPay);
    const n = Number(term||0);
    const m = Number(compoundSel.value);
    const r = Number(apr||0)/100/m;

    const summary = $('summary');

    if(n<=0){ if(summary) summary.textContent = 'Lütfen geçerli vade (ay) girin.'; return; }

    const payment = (r===0) ? P/n : P * r / (1 - Math.pow(1+r,-n));
    const rows = buildSchedule(P, r, n, payment);

    const totalInstallments = rows.reduce((s,row)=> s + row.pay, 0);
    const totalInterestBurden = (downPay + totalInstallments) - sale;

    const sbSale = $('sbSale'), sbDown=$('sbDown'), sbBalance=$('sbBalance'),
          sbBalancePlusInterest=$('sbBalancePlusInterest'), sbTotalBurden=$('sbTotalBurden');
    if (sbSale) sbSale.textContent = fmt(sale, cur);
    if (sbDown) sbDown.textContent = fmt(downPay, cur);
    if (sbBalance) sbBalance.textContent = fmt(P, cur);
    if (sbBalancePlusInterest) sbBalancePlusInterest.textContent = fmt(totalInstallments, cur);
    if (sbTotalBurden) sbTotalBurden.textContent = fmt(totalInterestBurden, cur);

    const primaryValue = $('primaryValue'), loanAmountEl = $('loanAmount'),
          totalPaid = $('totalPaid'), payoffDate = $('payoffDate');
    if (primaryValue) primaryValue.textContent = fmt(payment,cur);
    if (loanAmountEl) loanAmountEl.textContent = fmt(P,cur);
    if (totalPaid) totalPaid.textContent = fmt(totalInstallments,cur);

    const end = new Date(); end.setMonth(end.getMonth() + rows.length);
    if (payoffDate) payoffDate.textContent = end.toLocaleDateString();

    if (summary) summary.textContent = `Satış ${fmt(sale,cur)}, Peşinat ${fmt(downPay,cur)} → Kredi ${fmt(P,cur)}, ${rows.length} ay, APR ~ ${(r*m*100).toFixed(3)}%.`;

    scheduleBody.innerHTML = rows.map(rw=>`<tr>
      <td>${rw.k}</td>
      <td>${fmt(rw.pay,cur)}</td>
      <td>${fmt(rw.bal,cur)}</td>
    </tr>`).join('');
    scheduleWrap.style.display = 'block';

    exportBtn.dataset.csv = toCSV(rows, {
      date: metaDate?.textContent || todayStr(),
      preparedBy: preparedByInp.value || '',
      customer: customerNameInp.value || '',
      phone: customerPhoneInp.value || '',
      email: customerEmailInp.value || '',
      property: propertyNameInp.value || '',
      block: propertyBlockInp.value || '',
      unit: propertyUnitInp.value || '',
      type: propertyTypeInp.value || '',
      currency: cur,
      sale: (sale||0).toFixed(2),
      down: (downPay||0).toFixed(2),
      balance: (P||0).toFixed(2),
      totalInstallments: (totalInstallments||0).toFixed(2),
      totalInterest: (totalInterestBurden||0).toFixed(2)
    });
  }

  // ===== EVENTS =====
  printBtn?.addEventListener('click', ()=>{
    const customer = (customerNameInp.value || 'Musteri').trim().replace(/\s+/g,'_');
    const property = (propertyNameInp.value || 'Proje').trim().replace(/\s+/g,'_');
    const date = new Date().toISOString().slice(0,10);
    const prevTitle = document.title;
    document.title = `Noyanlar_${customer}_${property}_${date}`;
    window.print();
    setTimeout(()=>{ document.title = prevTitle; }, 300);
  });

  currencySel.addEventListener('change', ()=>{
    localStorage.setItem('currency', currencySel.value);
    updateCurrencyUI();
  });
  compoundSel.addEventListener('change', ()=>{ /* no-op */ });

  interestFree.addEventListener('change', ()=>{
    const aprInput = $('apr');
    if (interestFree.checked){ aprInput.value = 0; aprInput.disabled = true; }
    else { aprInput.disabled = false; }
  });

  preparedByInp.addEventListener('input', ()=>{
    localStorage.setItem('preparedBy', preparedByInp.value||'');
    if (metaPrepared) metaPrepared.textContent = preparedByInp.value.trim() || '—';
  });
  activeUserSel.addEventListener('change', onActiveUserChange);

  [customerNameInp, customerPhoneInp, customerEmailInp,
   propertyNameInp, propertyBlockInp, propertyUnitInp, propertyTypeInp]
   .forEach(inp=> inp && inp.addEventListener('input', syncMeta));

  $('presets')?.addEventListener('click', (e)=>{
    const b = e.target.closest('.chip');
    if(!b) return;
    renderFields();
    $('salePrice').value = Number(b.dataset.sale||0);
    $('down').value = Number(b.dataset.down||0);
    $('apr').value = Number(b.dataset.apr||0);
    $('term').value = Number(b.dataset.term||0);
    calculate();
  });

  calcBtn.addEventListener('click', ()=>{ syncMeta(); calculate(); });

  resetBtn.addEventListener('click', ()=>{
    [customerNameInp, customerPhoneInp, customerEmailInp,
     propertyNameInp, propertyBlockInp, propertyUnitInp, propertyTypeInp].forEach(i=> i && (i.value=''));
    syncMeta();
    renderFields();
  });

  exportBtn.addEventListener('click', ()=>{
    const csv = exportBtn.dataset.csv || '';
    if(!csv){ alert('Bu ekran için dışa aktarılacak amortisman yok.'); return; }
    const blob = new Blob([csv], {type:'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'odeme_plani.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  saveQuoteBtn.addEventListener('click', ()=>{
    const cur = currencySel.value;
    const { salePrice, down, apr, term } = collectValues();
    if (!salePrice || !term){ alert('Kaydetmek için Satış Fiyatı ve Vade gerekli.'); return; }
    const q = {
      date: todayStr(),
      preparedBy: preparedByInp.value||'',
      customer: customerNameInp.value||'',
      phone: customerPhoneInp.value||'',
      email: customerEmailInp.value||'',
      property: propertyNameInp.value||'',
      block: propertyBlockInp.value||'',
      unit: propertyUnitInp.value||'',
      type: propertyTypeInp.value||'',
      currency: cur,
      sale: Number(salePrice)||0,
      down: Number(down)||0,
      apr: Number(apr)||0,
      term: Number(term)||0
    };
    const arr = getQuotes(); arr.unshift(q); setQuotes(arr);
  });

  clearQuotesBtn.addEventListener('click', ()=>{
    if (confirm('Tüm kayıtlı planlar silinsin mi?')) setQuotes([]);
  });

  // Admin modal events
  adminBtn?.addEventListener('click', ()=>{
    if (!requirePin()) return;
    adminModal.style.display = 'flex';
  });
  openAdminFromGate?.addEventListener('click', ()=>{
    if (!requirePin()) return;
    adminModal.style.display = 'flex';
  });

  adminClose?.addEventListener('click', ()=> adminModal.style.display = 'none');
  adminModal?.addEventListener('click', (e)=>{ if (e.target === adminModal) adminModal.style.display = 'none'; });

  addUserBtn?.addEventListener('click', ()=>{
    const name = (newUserName.value||'').trim();
    if (!name){ alert('Ad Soyad gerekli'); return; }
    const users = getUsers();
    users.push({
      id: crypto.randomUUID?.() || String(Date.now()),
      name,
      email: (newUserEmail.value||'').trim(),
      phone: (newUserPhone.value||'').trim(),
      pass: (newUserPass.value||'')
    });
    setUsers(users);
    newUserName.value = ''; newUserEmail.value=''; newUserPhone.value=''; newUserPass.value='';
  });

  usersList?.addEventListener('click', (e)=>{
    const delId = e.target?.dataset?.del;
    const editId = e.target?.dataset?.edit;
    const passId = e.target?.dataset?.pass;
    if (delId){
      const users = getUsers().filter(u=>u.id!==delId);
      setUsers(users);
      if (activeUserSel.value === delId){ activeUserSel.value=''; onActiveUserChange(); }
      if (loginUserSel.value === delId){ renderUsersUI(); }
    }
    if (editId){
      const users = getUsers();
      const u = users.find(x=>x.id===editId);
      if (!u) return;
      const newName = prompt('Yeni isim:', u.name) || u.name;
      const newEmail = prompt('Yeni e-posta:', u.email||'') || u.email;
      const newPhone = prompt('Yeni telefon:', u.phone||'') || u.phone;
      u.name = newName.trim(); u.email = newEmail.trim(); u.phone = newPhone.trim();
      setUsers(users);
    }
    if (passId){
      const users = getUsers();
      const u = users.find(x=>x.id===passId);
      if (!u) return;
      const p = prompt('Yeni şifre (boş bırak = şifresiz):', u.pass||'');
      if (p !== null){ u.pass = p; setUsers(users); }
    }
  });

  changePinBtn?.addEventListener('click', ()=>{
    const cur = localStorage.getItem(PIN_KEY) || '0000';
    if ((oldPin.value||'') !== cur){ alert('Mevcut PIN hatalı'); return; }
    const np = (newPin.value||'').trim();
    if (!/^\d{4,6}$/.test(np)){ alert('Yeni PIN 4-6 haneli olmalı (sadece rakam)'); return; }
    localStorage.setItem(PIN_KEY, np);
    oldPin.value=''; newPin.value='';
    alert('PIN güncellendi');
  });

  loginBtn?.addEventListener('click', login);
  loginPass?.addEventListener('keydown', (e)=>{ if(e.key==='Enter') login(); });
  logoutBtn?.addEventListener('click', logout);

  // ===== INIT =====
  (function init(){
    ensureDefaults();
    const savedCur = localStorage.getItem('currency');
    if (savedCur && sym[savedCur]) currencySel.value = savedCur;
    renderFields();
    updateCurrencyUI();
    renderUsersUI();
    tryAutoLogin(); // decide which UI to show
    syncMeta();
    renderSavedList();
  })();

})();