// app.js
(function(){
  /* =========================
     THEME TOGGLE (auto/light/dark)
     ========================= */
  const THEME_KEY = 'theme'; // 'light' | 'dark' | 'auto'
  const root = document.documentElement;
  const themeToggle = document.getElementById('themeToggle');

  function applyTheme(mode){
    root.classList.remove('light');
    root.setAttribute('data-theme', mode);
    if(mode === 'light'){ root.classList.add('light'); }
    localStorage.setItem(THEME_KEY, mode);
    if(themeToggle){
      themeToggle.textContent = mode === 'light' ? '☀️' : (mode === 'dark' ? '🌙' : '🌗');
      themeToggle.title = `Tema: ${mode}`;
    }
  }
  function initTheme(){
    const saved = localStorage.getItem(THEME_KEY);
    applyTheme(saved || 'auto');
  }
  function cycleTheme(){
    const cur = localStorage.getItem(THEME_KEY) || 'auto';
    const next = cur === 'auto' ? 'light' : (cur === 'light' ? 'dark' : 'auto');
    applyTheme(next);
  }
  if (themeToggle) themeToggle.addEventListener('click', cycleTheme);
  initTheme();

  /* =========================
     DOM SHORTCUTS & ELEMENTS
     ========================= */
  const $ = (id)=>document.getElementById(id);

  // Auth gate
  const authGate = $('authGate');
  const loginUser = $('loginUser');     // text input
  const loginPass = $('loginPass');     // password input
  const loginBtn  = $('loginBtn');
  const logoutBtn = $('logoutBtn');

  // App shell
  const appHeader = $('appHeader');
  const appMain = $('appMain');
  const appFooter = $('appFooter');
  const adminBtn = $('adminBtn');

  // Admin modal
  const adminModal = $('adminModal');
  const adminClose = $('adminClose');
  const usersList = $('usersList');
  const addUserBtn = $('addUserBtn');
  const newUserName = $('newUserName');
  const newUserEmail = $('newUserEmail');
  const newUserPhone = $('newUserPhone');
  const newUserPass = $('newUserPass');
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
  const sym = { GBP:'£', EUR:'€', USD:'$' };
  const fmt = (v, cur='GBP') =>
    isFinite(v) ? (sym[cur]||'') + Number(v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}) : '—';
  const todayStr = () => new Date().toLocaleDateString();
  function getSymbol(){ return sym[currencySel.value] || ''; }

  /* =========================
     AUTH / USERS (localStorage)
     ========================= */
  const USERS_KEY = 'noy_users';
  const ADMIN_PIN_KEY = 'adminPIN';
  const SESSION_KEY = 'noy_session_user';

  function cryptoRandomId(){
    try{
      return ([1e7]+-1e3+-4e3+-8e3+-1e11)
        .replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
    }catch{
      return 'u_' + Math.random().toString(36).slice(2,10);
    }
  }

  function validUserShape(u){
    return u && typeof u === 'object' &&
           'id' in u && 'name' in u && 'role' in u && 'pass' in u;
  }

  function loadUsers(){
    try {
      const raw = localStorage.getItem(USERS_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr.filter(validUserShape);
    } catch { return []; }
  }
  function saveUsers(arr){
    localStorage.setItem(USERS_KEY, JSON.stringify(arr));
  }

  // Ensure an admin user + PIN always exist if store is empty or corrupted
  function seedUsersIfEmpty(){
    let users = loadUsers();
    if(users.length === 0){
      users = [{
        id: cryptoRandomId(),
        name: 'Admin',            // default username
        email: 'admin@noyanlar.com',
        phone: '',
        role: 'admin',
        pass: '1234'              // default password
      }];
      saveUsers(users);
    }
    if(!localStorage.getItem(ADMIN_PIN_KEY)){
      localStorage.setItem(ADMIN_PIN_KEY, '1234');
    }
  }

  function getSessionId(){ return localStorage.getItem(SESSION_KEY) || ''; }
  function setSessionId(id){ localStorage.setItem(SESSION_KEY, id); }
  function clearSession(){ localStorage.removeItem(SESSION_KEY); }

  function getUserById(id){ return loadUsers().find(u => u.id===id); }
  function getUserByName(name){
    const n = (name||'').trim().toLowerCase();
    if(!n) return null;
    return loadUsers().find(u => (u.name||'').trim().toLowerCase() === n) || null;
  }
  function currentUser(){ return getUserById(getSessionId()); }
  function isAdmin(){ return (currentUser() && currentUser().role === 'admin'); }

  function renderUsersList(){
    if (!usersList) return;
    const users = loadUsers();
    const cur = currentUser();
    usersList.innerHTML = '';
    if(users.length === 0){
      usersList.innerHTML = '<p class="muted">Kayıtlı kullanıcı yok.</p>';
      return;
    }
    const adminCount = users.filter(u => u.role==='admin').length;

    users.forEach(u=>{
      const row = document.createElement('div');
      row.className = 'saved-list-item';
      row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border:1px solid var(--line);border-radius:12px;margin:6px 0;background:var(--chip)';
      row.innerHTML =
        '<div>' +
          '<strong>'+u.name+'</strong> ' + (u.role==='admin' ? '<span class="muted">• Admin</span>' : '') +
          '<div class="muted" style="font-size:12px">'+(u.email||'')+(u.phone ? ' • '+u.phone : '')+'</div>' +
        '</div>' +
        '<div class="actions" style="display:flex;gap:8px">' +
          '<button class="btn tiny" data-act="edit" data-id="'+u.id+'">Düzenle</button>' +
          '<button class="btn tiny secondary" data-act="del" data-id="'+u.id+'">Sil</button>' +
        '</div>';

      // Delete
      row.querySelector('[data-act="del"]').addEventListener('click', ()=>{
        if(u.role==='admin' && adminCount<=1){
          alert('En az bir admin kalmalı.');
          return;
        }
        if(cur && cur.id === u.id){
          if(!confirm('Kendinizi siliyorsunuz. Devam ederseniz oturum kapanacak. Onaylıyor musunuz?')) return;
        }else{
          if(!confirm('"'+u.name+'" kullanıcısı silinsin mi?')) return;
        }
        const arr = loadUsers().filter(x => x.id!==u.id);
        saveUsers(arr);
        renderUsersList();
        if(cur && cur.id === u.id){
          handleLogout();
        }
      });

      // Edit (name/email/phone/pass/role)
      row.querySelector('[data-act="edit"]').addEventListener('click', ()=>{
        requireAdminThen(()=>{
          const name = prompt('Ad Soyad', u.name) || u.name;
          const email = prompt('E-posta', u.email || '') || u.email || '';
          const phone = prompt('Telefon', u.phone || '') || u.phone || '';
          const pass = prompt('Şifre (boş bırak: değişme)', '');
          const role = prompt('Rol: admin / user', u.role) || u.role;
          const arr = loadUsers().map(x=>{
            if (x.id !== u.id) return x;
            return {
              id: x.id,
              name,
              email,
              phone,
              role: (role === 'admin' ? 'admin' : 'user'),
              pass: pass ? pass : x.pass
            };
          });
          saveUsers(arr);
          renderUsersList();
          alert('Kullanıcı güncellendi.');
        });
      });

      usersList.appendChild(row);
    });
  }

  function showAdminModal(){
    if (adminModal) adminModal.classList.add('show');
    renderUsersList();
  }
  function hideAdminModal(){
    if (adminModal) adminModal.classList.remove('show');
  }

  function requireAdminThen(fn){
    if(isAdmin()){ fn(); return; }
    const pin = prompt('Admin PIN?');
    const curPin = localStorage.getItem(ADMIN_PIN_KEY) || '1234';
    if(pin && pin === curPin){ fn(); }
    else if(pin !== null){ alert('Hatalı PIN.'); }
  }

  // Gate show/hide
  function showApp(){
    if (authGate) authGate.classList.add('hidden');
    if (appHeader) appHeader.classList.remove('hidden');
    if (appMain) appMain.classList.remove('hidden');
    if (appFooter) appFooter.classList.remove('hidden');

    // Set "Hazırlayan" to current user name
    const cu = currentUser();
    if (cu) {
      preparedByInp.value = cu.name || '';
      localStorage.setItem('preparedBy', preparedByInp.value || '');
      metaPrepared.textContent = preparedByInp.value || '—';
    }

    // Hide Admin button for non-admin session
    if (adminBtn){
      adminBtn.style.display = isAdmin() ? '' : 'none';
    }
  }
  function showGate(){
    if (authGate) authGate.classList.remove('hidden');
    if (appHeader) appHeader.classList.add('hidden');
    if (appMain) appMain.classList.add('hidden');
    if (appFooter) appFooter.classList.add('hidden');
  }

  // Login / Logout
  function handleLogin(){
    const nameInput = loginUser ? loginUser.value : '';
    const pass = loginPass ? (loginPass.value || '') : '';
    const u = getUserByName(nameInput);
    if(!u){ alert('Kullanıcı bulunamadı.'); return; }
    if((u.pass||'') !== pass){ alert('Şifre hatalı.'); return; }
    setSessionId(u.id);
    showApp();
  }

  function handleLogout(){
    clearSession();
    if (loginUser) loginUser.value = '';
    if (loginPass) loginPass.value = '';
    showGate();
  }

  // Admin actions
  if (addUserBtn) addUserBtn.addEventListener('click', ()=>{
    requireAdminThen(()=>{
      const name = (newUserName.value||'').trim();
      const email = (newUserEmail.value||'').trim();
      const phone = (newUserPhone.value||'').trim();
      const pass = (newUserPass.value||'').trim();
      if(!name || !pass){ alert('Ad ve şifre zorunlu.'); return; }
      // prevent duplicate usernames (case-insensitive)
      const exists = !!getUserByName(name);
      if (exists){ alert('Bu kullanıcı adı zaten var.'); return; }
      const users = loadUsers();
      users.push({ id: cryptoRandomId(), name, email, phone, role:'user', pass });
      saveUsers(users);
      newUserName.value = '';
      newUserEmail.value = '';
      newUserPhone.value = '';
      newUserPass.value = '';
      renderUsersList();
      alert('Kullanıcı eklendi.');
    });
  });

  if (changePinBtn) changePinBtn.addEventListener('click', ()=>{
    requireAdminThen(()=>{
      const cur = localStorage.getItem(ADMIN_PIN_KEY) || '1234';
      if((oldPin.value||'') !== cur){ alert('Mevcut PIN yanlış.'); return; }
      if(!(newPin.value||'').trim()){ alert('Yeni PIN boş olamaz.'); return; }
      localStorage.setItem(ADMIN_PIN_KEY, newPin.value.trim());
      oldPin.value = '';
      newPin.value = '';
      alert('Admin PIN güncellendi.');
    });
  });

  if (adminBtn) adminBtn.addEventListener('click', ()=>{ requireAdminThen(showAdminModal); });
  if (adminClose) adminClose.addEventListener('click', hideAdminModal);
  if (adminModal) adminModal.addEventListener('click', (e)=>{ if(e.target === adminModal){ hideAdminModal(); } });

  // Auth gate buttons
  if (loginBtn) loginBtn.addEventListener('click', handleLogin);
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

  /* =========================
     CALCULATOR UI RENDER
     ========================= */
  function renderFields(){
    inputsDiv.innerHTML =
      '<div class="field prefix-wrap">' +
        '<label for="salePrice">Satış Fiyatı</label>' +
        '<span class="prefix" id="symSale">'+getSymbol()+'</span>' +
        '<input id="salePrice" type="number" step="0.01" placeholder="örn. 75,000" />' +
      '</div>' +
      '<div class="field prefix-wrap">' +
        '<label for="down">Peşinat</label>' +
        '<span class="prefix" id="symDown">'+getSymbol()+'</span>' +
        '<input id="down" type="number" step="0.01" placeholder="örn. 20,000" />' +
      '</div>' +
      '<div class="field">' +
        '<label for="apr">Yıllık Faiz Oranı (%)</label>' +
        '<input id="apr" type="number" step="0.01" placeholder="örn. 3.75" '+(interestFree.checked ? 'disabled' : '')+'/>' +
      '</div>' +
      '<div class="field">' +
        '<label for="term">Vade (ay)</label>' +
        '<input id="term" type="number" step="1" placeholder="örn. 120" />' +
      '</div>';

    scheduleWrap.style.display='none';
    [primaryValue, loanAmountEl, totalPaid, payoffDate, sbSale, sbDown, sbBalance, sbBalancePlusInterest, sbTotalBurden]
      .forEach(el => el.textContent='—');
    summary.textContent = 'Değerleri girip “Hesapla”ya basın.';
    metaDate.textContent = todayStr();

    preparedByInp.value = localStorage.getItem('preparedBy') || preparedByInp.value || '';
    metaPrepared.textContent = preparedByInp.value || '—';
  }

  function updateCurrencyUI(){
    currencyBadge.textContent = 'Para Birimi: ' + currencySel.value + ' ('+getSymbol()+')';
    const sale = $('symSale'), down = $('symDown');
    if (sale) sale.textContent = getSymbol();
    if (down) down.textContent = getSymbol();
  }

  function collectValues(){
    const salePrice = Number((($('salePrice')||{}).value) || 0);
    const down = Number((($('down')||{}).value) || 0);
    const apr = interestFree.checked ? 0 : Number((($('apr')||{}).value) || 0);
    const term = Number((($('term')||{}).value) || 0);
    return { salePrice, down, apr, term };
  }

  function buildSchedule(P, r, n, pay){
    let bal = P;
    const rows = [];
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
'Date,'+meta.date+'\n'+
'Prepared By,'+meta.preparedBy+'\n'+
'Customer,'+meta.customer+'\n'+
'Phone,'+meta.phone+'\n'+
'Email,'+meta.email+'\n'+
'Property,'+meta.property+'\n'+
'Block,'+meta.block+'\n'+
'Unit,'+meta.unit+'\n'+
'Type,'+meta.type+'\n'+
'Currency,'+meta.currency+'\n'+
'Sale Price,'+meta.sale+'\n'+
'Down Payment,'+meta.down+'\n'+
'Balance After Down,'+meta.balance+'\n'+
'Total of Installments,'+meta.totalInstallments+'\n'+
'Total Interest,'+meta.totalInterest+'\n\n';

    const header = 'Period,Payment,Balance\n';
    const lines = rows.map(r => [r.k, r.pay.toFixed(2), r.bal.toFixed(2)].join(','));
    return top + header + lines.join('\n');
  }

  /* =========================
     CALC / SUMMARY / TABLE
     ========================= */
  function syncMeta(){
    metaDate.textContent = todayStr();
    metaCustomer.textContent = (customerNameInp.value || '').trim() || '—';
    const propBits = [propertyNameInp.value, propertyBlockInp.value && ('Blok '+propertyBlockInp.value), propertyUnitInp.value && ('No '+propertyUnitInp.value), propertyTypeInp.value]
      .filter(Boolean).join(' • ');
    metaProperty.textContent = propBits || '—';
    metaPrepared.textContent = (preparedByInp.value || '').trim() || '—';
  }

  function calculate(){
    const cur = currencySel.value;
    const vals = collectValues();
    const sale = Number(vals.salePrice) || 0;
    const downPay = Number(vals.down) || 0;
    const P = Math.max(0, sale - downPay);
    const n = Number(vals.term || 0);
    const m = Number(compoundSel.value);
    const r = Number(vals.apr || 0) / 100 / m;

    if(n<=0){
      summary.textContent = 'Lütfen geçerli vade (ay) girin.';
      return;
    }

    const payment = (r===0) ? P/n : P * r / (1 - Math.pow(1+r,-n));
    const rows = buildSchedule(P, r, n, payment);

    const totalInstallments = rows.reduce((s,row)=> s + row.pay, 0);
    const totalInterestBurden = (downPay + totalInstallments) - sale;

    // Business summary
    sbSale.textContent = fmt(sale, cur);
    sbDown.textContent = fmt(downPay, cur);
    sbBalance.textContent = fmt(P, cur);
    sbBalancePlusInterest.textContent = fmt(totalInstallments, cur);
    sbTotalBurden.textContent = fmt(totalInterestBurden, cur);

    // Technical summary
    primaryValue.textContent = fmt(payment,cur);
    loanAmountEl.textContent = fmt(P,cur);
    totalPaid.textContent = fmt(totalInstallments,cur);

    const end = new Date(); end.setMonth(end.getMonth() + rows.length);
    payoffDate.textContent = end.toLocaleDateString();

    summary.textContent = 'Satış '+fmt(sale,cur)+', Peşinat '+fmt(downPay,cur)+' → Kredi '+fmt(P,cur)+', '+rows.length+' ay, APR ~ '+(r*m*100).toFixed(3)+'%.';

    // Table
    scheduleBody.innerHTML = rows.map(rw =>
      '<tr><td>'+rw.k+'</td><td>'+fmt(rw.pay,cur)+'</td><td>'+fmt(rw.bal,cur)+'</td></tr>'
    ).join('');
    scheduleWrap.style.display = 'block';

    // CSV meta
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
      sale: (sale||0).toFixed(2),
      down: (downPay||0).toFixed(2),
      balance: (P||0).toFixed(2),
      totalInstallments: (totalInstallments||0).toFixed(2),
      totalInterest: (totalInterestBurden||0).toFixed(2)
    });
  }

  /* =========================
     SAVED QUOTES
     ========================= */
  function getQuotes(){
    try{ return JSON.parse(localStorage.getItem('quotes')||'[]'); }catch(e){ return []; }
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
      left.innerHTML = '<strong>'+(q.customer||'—')+'</strong> · '+(q.property||'—')+' <span class="id">('+(q.date)+')</span>';
      const right = document.createElement('div'); right.className='actions';
      const loadBtn = document.createElement('button'); loadBtn.className='btn tiny'; loadBtn.textContent='Yükle';
      const delBtn = document.createElement('button'); delBtn.className='btn tiny secondary'; delBtn.textContent='Sil';
      loadBtn.onclick = ()=>{ loadQuote(idx); };
      delBtn.onclick = ()=>{
        const arr=getQuotes(); arr.splice(idx,1); setQuotes(arr);
      };
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

  /* =========================
     EVENTS
     ========================= */
  if (printBtn) printBtn.addEventListener('click', ()=>{
    const customer = (customerNameInp.value || 'Musteri').trim().replace(/\s+/g,'_');
    const property = (propertyNameInp.value || 'Proje').trim().replace(/\s+/g,'_');
    const date = new Date().toISOString().slice(0,10);
    const prevTitle = document.title;
    document.title = 'Noyanlar_'+customer+'_'+property+'_'+date;
    window.print();
    setTimeout(()=>{ document.title = prevTitle; }, 300);
  });

  if (currencySel) currencySel.addEventListener('change', ()=>{
    localStorage.setItem('currency', currencySel.value);
    updateCurrencyUI();
  });
  if (compoundSel) compoundSel.addEventListener('change', ()=>{ /* no-op */ });

  if (interestFree) interestFree.addEventListener('change', ()=>{
    const aprInput = $('apr');
    if (interestFree.checked){ if (aprInput) { aprInput.value = 0; aprInput.disabled = true; } }
    else { if (aprInput) aprInput.disabled = false; }
  });

  if (preparedByInp) preparedByInp.addEventListener('input', ()=>{
    localStorage.setItem('preparedBy', preparedByInp.value||'');
    metaPrepared.textContent = (preparedByInp.value || '').trim() || '—';
  });

  [customerNameInp, customerPhoneInp, customerEmailInp,
   propertyNameInp, propertyBlockInp, propertyUnitInp, propertyTypeInp]
   .forEach(inp=>{
     if (!inp) return;
     inp.addEventListener('input', syncMeta);
   });

  const presets = $('presets');
  if (presets) presets.addEventListener('click', (e)=>{
    const b = e.target.closest('.chip');
    if(!b) return;
    renderFields();
    $('salePrice').value = Number(b.getAttribute('data-sale')||0);
    $('down').value = Number(b.getAttribute('data-down')||0);
    $('apr').value = Number(b.getAttribute('data-apr')||0);
    $('term').value = Number(b.getAttribute('data-term')||0);
    calculate();
  });

  if (calcBtn) calcBtn.addEventListener('click', ()=>{ syncMeta(); calculate(); });

  if (resetBtn) resetBtn.addEventListener('click', ()=>{
    [customerNameInp, customerPhoneInp, customerEmailInp,
     propertyNameInp, propertyBlockInp, propertyUnitInp, propertyTypeInp].forEach(i=>{
       if (i) i.value='';
     });
    syncMeta();
    renderFields();
  });

  if (exportBtn) exportBtn.addEventListener('click', ()=>{
    const csv = exportBtn.dataset.csv || '';
    if(!csv){ alert('Bu ekran için dışa aktarılacak amortisman yok.'); return; }
    const blob = new Blob([csv], {type:'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'odeme_plani.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  if (saveQuoteBtn) saveQuoteBtn.addEventListener('click', ()=>{
    const cur = currencySel.value;
    const vals = collectValues();
    if (!vals.salePrice || !vals.term){ alert('Kaydetmek için Satış Fiyatı ve Vade gerekli.'); return; }
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
      sale: Number(vals.salePrice)||0,
      down: Number(vals.down)||0,
      apr: Number(vals.apr)||0,
      term: Number(vals.term)||0
    };
    const arr = getQuotes(); arr.unshift(q); setQuotes(arr);
  });

  /* Re-render if users change in other tab */
  window.addEventListener('storage', (ev)=>{
    if (ev.key === USERS_KEY){
      if (adminModal && adminModal.classList.contains('show')) renderUsersList();
    }
  });

  /* =========================
     INIT
     ========================= */
  (function init(){
    // Seed default Admin if empty (fixes first load on Vercel)
    seedUsersIfEmpty();

    // If session exists show app, else gate
    if(currentUser()){
      showApp();
    }else{
      showGate();
    }

    const savedCur = localStorage.getItem('currency');
    if (savedCur && sym[savedCur]) currencySel.value = savedCur;

    renderFields();
    updateCurrencyUI();
    syncMeta();
    renderSavedList();
  })();
})();