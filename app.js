// app.js  (matches your latest index.html + styles.css)
// Local demo auth (users + admin PIN) + calculator

(function(){
  /* =========================
     THEME (light/dark toggle)
  ==========================*/
  const root = document.documentElement;
  const themeToggle = document.getElementById('themeToggle');
  const THEME_KEY = 'theme_pref'; // 'light' | 'dark'

  function applyTheme(mode){
    // normalize: only light/dark
    const m = (mode === 'dark') ? 'dark' : 'light';
    root.classList.toggle('light', m === 'light');
    root.setAttribute('data-theme', m);
    localStorage.setItem(THEME_KEY, m);
    if (themeToggle){
      themeToggle.textContent = m === 'light' ? '☀️' : '🌙';
      themeToggle.title = `Tema: ${m}`;
    }
  }
  function initTheme(){
    const saved = localStorage.getItem(THEME_KEY) || 'light';
    applyTheme(saved);
  }
  function flipTheme(){
    const cur = localStorage.getItem(THEME_KEY) || 'light';
    applyTheme(cur === 'light' ? 'dark' : 'light');
  }
  themeToggle?.addEventListener('click', flipTheme);
  initTheme();

  /* =========================
     DOM SHORTCUTS
  ==========================*/
  const $ = (id)=>document.getElementById(id);

  // Gate + App containers
  const authGate   = $('authGate');
  const appHeader  = $('appHeader');
  const appMain    = $('appMain');
  const appFooter  = $('appFooter');

  // Gate controls
  const loginUserSel = $('loginUserSel');
  const loginPass    = $('loginPass');
  const loginBtn     = $('loginBtn');
  const openAdminFromGate = $('openAdminFromGate');

  // Header controls
  const adminBtn  = $('adminBtn');
  const logoutBtn = $('logoutBtn');

  // Admin modal
  const adminModal    = $('adminModal');
  const adminClose    = $('adminClose');
  const addUserBtn    = $('addUserBtn');
  const changePinBtn  = $('changePinBtn');
  const usersList     = $('usersList');
  const newUserName   = $('newUserName');
  const newUserEmail  = $('newUserEmail');
  const newUserPhone  = $('newUserPhone');
  const newUserPass   = $('newUserPass');
  const oldPin        = $('oldPin');
  const newPin        = $('newPin');

  // Calculator form
  const inputsDiv     = $('inputs');
  const currencySel   = $('currency');
  const compoundSel   = $('compound');
  const interestFree  = $('interestFree');
  const currencyBadge = $('currencyBadge');

  // Sales meta inputs
  const activeUserSel = $('activeUser');
  const preparedByInp = $('preparedBy');
  const customerName  = $('customerName');
  const customerPhone = $('customerPhone');
  const customerEmail = $('customerEmail');
  const propertyName  = $('propertyName');
  const propertyBlock = $('propertyBlock');
  const propertyUnit  = $('propertyUnit');
  const propertyType  = $('propertyType');

  // Summary (right)
  const metaDate    = $('metaDate');
  const metaCustomer= $('metaCustomer');
  const metaProperty= $('metaProperty');
  const metaPrepared= $('metaPrepared');

  const sbSale  = $('sbSale');
  const sbDown  = $('sbDown');
  const sbBalance = $('sbBalance');
  const sbBalancePlusInterest = $('sbBalancePlusInterest');
  const sbTotalBurden = $('sbTotalBurden');

  const primaryValue = $('primaryValue');
  const loanAmountEl = $('loanAmount');
  const totalPaid    = $('totalPaid');
  const payoffDate   = $('payoffDate');
  const summary      = $('summary');

  // Schedule table
  const scheduleWrap = $('scheduleWrap');
  const scheduleBody = $('schedule');

  // Actions
  const calcBtn      = $('calcBtn');
  const resetBtn     = $('resetBtn');
  const exportBtn    = $('exportBtn');
  const printBtn     = $('printBtn');
  const saveQuoteBtn = $('saveQuoteBtn');
  const clearQuotesBtn = $('clearQuotesBtn');
  const savedList    = $('savedList');

  // Footer year
  if ($('year')) $('year').textContent = new Date().getFullYear();

  /* =========================
     HELPERS
  ==========================*/
  const sym = { GBP:'£', EUR:'€', USD:'$' };
  const todayStr = () => new Date().toLocaleDateString();
  const fmt = (v, cur='GBP') =>
    isFinite(v) ? (sym[cur]||'') + Number(v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}) : '—';
  function getSymbol(){ return sym[currencySel?.value] || ''; }

  function show(el){ el && (el.classList.remove('hidden'), el.style.display=''); }
  function hide(el){ el && (el.classList.add('hidden')); }

  function openModal(){ if (adminModal){ adminModal.style.display='flex'; adminModal.style.alignItems='center'; adminModal.style.justifyContent='center'; } }
  function closeModal(){ if (adminModal){ adminModal.style.display='none'; } }

  function setSessionUser(username){
    localStorage.setItem('sessionUser', username || '');
  }
  function getSessionUser(){ return localStorage.getItem('sessionUser') || ''; }

  /* =========================
     LOCAL STORAGE: USERS & PIN
  ==========================*/
  function getUsers(){
    try{ return JSON.parse(localStorage.getItem('users') || '[]'); }catch{ return []; }
  }
  function setUsers(arr){
    localStorage.setItem('users', JSON.stringify(arr));
  }
  function ensureSeed(){
    // Seed once
    if (!localStorage.getItem('adminPin')) localStorage.setItem('adminPin','1234');
    const users = getUsers();
    if (users.length === 0){
      setUsers([
        { name:'Admin', email:'admin@noyanlar.com', phone:'', pass:'admin' },
        { name:'Sales Team', email:'sales@noyanlar.com', phone:'', pass:'sales' }
      ]);
    }
  }
  ensureSeed();

  /* =========================
     AUTH: POPULATE & FLOW
  ==========================*/
  function populateLoginUsers(){
    if (!loginUserSel) return;
    loginUserSel.innerHTML = '';
    getUsers().forEach((u, idx)=>{
      const opt = document.createElement('option');
      opt.value = String(idx);
      opt.textContent = u.name || (`Kullanıcı ${idx+1}`);
      loginUserSel.appendChild(opt);
    });
  }
  function populateActiveUser(){
    if (!activeUserSel) return;
    activeUserSel.innerHTML = '<option value="">—</option>';
    getUsers().forEach((u, idx)=>{
      const opt = document.createElement('option');
      opt.value = String(idx);
      opt.textContent = u.name || (`Kullanıcı ${idx+1}`);
      activeUserSel.appendChild(opt);
    });
  }

  function enterAppAs(userName){
    hide(authGate);
    show(appHeader); show(appMain); show(appFooter);
    preparedByInp.value = userName || preparedByInp.value || '';
    metaPrepared.textContent = preparedByInp.value || '—';
    setSessionUser(userName || '');
    populateActiveUser();
    // preselect active user to this session user
    const idx = getUsers().findIndex(u=>u.name===userName);
    if (idx >= 0) activeUserSel.value = String(idx);
  }

  function leaveApp(){
    show(authGate);
    hide(appHeader); hide(appMain); hide(appFooter);
    setSessionUser('');
  }

  // Gate -> Login
  loginBtn?.addEventListener('click', ()=>{
    const users = getUsers();
    const i = Number(loginUserSel?.value ?? -1);
    if (!users[i]){ alert('Kullanıcı seçin.'); return; }
    const ok = (loginPass?.value || '') === (users[i].pass || '');
    if (!ok){ alert('Şifre hatalı.'); return; }
    enterAppAs(users[i].name || 'Kullanıcı');
    loginPass.value = '';
  });

  // Admin access from gate (PIN)
  openAdminFromGate?.addEventListener('click', ()=>{
    const pin = localStorage.getItem('adminPin') || '1234';
    const input = prompt('Admin PIN');
    if (input === pin){
      openModal();
      renderUsersList();
    } else {
      alert('PIN hatalı.');
    }
  });

  // Header: Admin button (ask PIN again)
  adminBtn?.addEventListener('click', ()=>{
    const pin = localStorage.getItem('adminPin') || '1234';
    const input = prompt('Admin PIN');
    if (input === pin){
      openModal();
      renderUsersList();
    } else {
      alert('PIN hatalı.');
    }
  });

  // Logout
  logoutBtn?.addEventListener('click', ()=>{
    leaveApp();
  });

  // If session exists, skip gate
  (function restoreSession(){
    const s = getSessionUser();
    if (s){
      hide(authGate);
      show(appHeader); show(appMain); show(appFooter);
      preparedByInp.value = s;
      metaPrepared.textContent = s;
      populateActiveUser();
      const idx = getUsers().findIndex(u=>u.name===s);
      if (idx >= 0) activeUserSel.value = String(idx);
    } else {
      populateLoginUsers();
      populateActiveUser();
    }
  })();

  /* =========================
     ADMIN MODAL LOGIC
  ==========================*/
  function renderUsersList(){
    if (!usersList) return;
    const users = getUsers();
    if (!users.length){ usersList.innerHTML = '<p class="muted">Henüz kullanıcı yok.</p>'; return; }
    usersList.innerHTML = '';
    users.forEach((u, idx)=>{
      const row = document.createElement('div');
      row.className = 'saved-list-item';
      row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px; padding:8px 10px; border:1px solid var(--line); border-radius:10px; margin:6px 0; background:var(--chip)';
      row.innerHTML = `
        <div>
          <strong>${u.name||'—'}</strong>
          <div class="muted" style="font-size:12px">${u.email||''} ${u.phone?(' • '+u.phone):''}</div>
        </div>
        <div class="actions" style="display:flex;gap:8px">
          <button class="btn tiny" data-edit="${idx}">Düzenle</button>
          <button class="btn tiny secondary" data-del="${idx}">Sil</button>
        </div>
      `;
      usersList.appendChild(row);
    });

    // Delegated actions
    usersList.onclick = (e)=>{
      const btn = e.target.closest('button');
      if (!btn) return;
      const del = btn.getAttribute('data-del');
      const edit = btn.getAttribute('data-edit');
      if (del!==null){
        const arr = getUsers();
        arr.splice(Number(del),1);
        setUsers(arr);
        renderUsersList();
        populateLoginUsers();
        populateActiveUser();
      } else if (edit!==null){
        const arr = getUsers();
        const i = Number(edit);
        const name = prompt('Ad Soyad', arr[i].name || '');
        if (name===null) return;
        const email = prompt('E-posta', arr[i].email || '');
        if (email===null) return;
        const phone = prompt('Telefon', arr[i].phone || '');
        if (phone===null) return;
        const pass = prompt('Şifre', arr[i].pass || '');
        if (pass===null) return;
        arr[i] = { name, email, phone, pass };
        setUsers(arr);
        renderUsersList();
        populateLoginUsers();
        populateActiveUser();
      }
    };
  }

  addUserBtn?.addEventListener('click', ()=>{
    const name = (newUserName?.value || '').trim();
    const pass = (newUserPass?.value || '').trim();
    if (!name || !pass){ alert('Ad Soyad ve Şifre zorunlu.'); return; }
    const email = (newUserEmail?.value || '').trim();
    const phone = (newUserPhone?.value || '').trim();
    const arr = getUsers();
    arr.push({ name, email, phone, pass });
    setUsers(arr);
    newUserName.value = ''; newUserPass.value=''; newUserEmail.value=''; newUserPhone.value='';
    renderUsersList();
    populateLoginUsers();
    populateActiveUser();
  });

  changePinBtn?.addEventListener('click', ()=>{
    const cur = localStorage.getItem('adminPin') || '1234';
    const old = (oldPin?.value || '').trim();
    const neu = (newPin?.value || '').trim();
    if (old !== cur){ alert('Mevcut PIN yanlış.'); return; }
    if (!/^\d{4,6}$/.test(neu)){ alert('Yeni PIN 4-6 haneli olmalı.'); return; }
    localStorage.setItem('adminPin', neu);
    oldPin.value=''; newPin.value='';
    alert('PIN güncellendi.');
  });

  adminClose?.addEventListener('click', closeModal);
  // Close on backdrop click (optional)
  adminModal?.addEventListener('click', (e)=>{ if (e.target === adminModal) closeModal(); });

  /* =========================
     CALCULATOR UI
  ==========================*/
  function renderFields(){
    if (!inputsDiv) return;
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
        <input id="apr" type="number" step="0.01" placeholder="örn. 3.75" ${interestFree?.checked ? 'disabled' : ''}/>
      </div>
      <div class="field">
        <label for="term">Vade (ay)</label>
        <input id="term" type="number" step="1" placeholder="örn. 120" />
      </div>
    `;

    scheduleWrap && (scheduleWrap.style.display='none');
    [primaryValue, loanAmountEl, totalPaid, payoffDate, sbSale, sbDown, sbBalance, sbBalancePlusInterest, sbTotalBurden]
      .forEach(el=> el && (el.textContent='—'));
    summary && (summary.textContent = 'Değerleri girip “Hesapla”ya basın.');
    metaDate && (metaDate.textContent = todayStr());

    // restore preparedBy
    if (preparedByInp){
      preparedByInp.value = localStorage.getItem('preparedBy') || preparedByInp.value || '';
      metaPrepared && (metaPrepared.textContent = preparedByInp.value || '—');
    }
  }

  function updateCurrencyUI(){
    if (!currencySel || !currencyBadge) return;
    currencyBadge.textContent = `Para Birimi: ${currencySel.value} (${getSymbol()})`;
    const sale = $('symSale'), down = $('symDown');
    if (sale) sale.textContent = getSymbol();
    if (down) down.textContent = getSymbol();
  }

  function collectValues(){
    const salePrice = Number(($('salePrice')||{}).value || 0);
    const down = Number(($('down')||{}).value || 0);
    const apr = interestFree?.checked ? 0 : Number(($('apr')||{}).value || 0);
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

  function syncMeta(){
    if (metaDate) metaDate.textContent = todayStr();
    if (metaCustomer) metaCustomer.textContent = (customerName?.value || '').trim() || '—';
    const propBits = [
      propertyName?.value,
      propertyBlock?.value && `Blok ${propertyBlock.value}`,
      propertyUnit?.value && `No ${propertyUnit.value}`,
      propertyType?.value
    ].filter(Boolean).join(' • ');
    if (metaProperty) metaProperty.textContent = propBits || '—';
    if (metaPrepared) metaPrepared.textContent = (preparedByInp?.value || '').trim() || '—';
  }

  function calculate(){
    const cur = currencySel?.value || 'GBP';
    const { salePrice=0, down=0, apr=0, term=0 } = collectValues();

    const sale = Number(salePrice)||0;
    const downPay = Number(down)||0;
    const P = Math.max(0, sale - downPay);
    const n = Number(term||0);
    const m = Number(compoundSel?.value || 12);
    const r = Number(apr||0)/100/m;

    if(n<=0){ summary && (summary.textContent = 'Lütfen geçerli vade (ay) girin.'); return; }

    const payment = (r===0) ? P/n : P * r / (1 - Math.pow(1+r,-n));
    const rows = buildSchedule(P, r, n, payment);
    const totalInstallments = rows.reduce((s,row)=> s + row.pay, 0);
    const totalInterestBurden = (downPay + totalInstallments) - sale;

    if (sbSale) sbSale.textContent = fmt(sale, cur);
    if (sbDown) sbDown.textContent = fmt(downPay, cur);
    if (sbBalance) sbBalance.textContent = fmt(P, cur);
    if (sbBalancePlusInterest) sbBalancePlusInterest.textContent = fmt(totalInstallments, cur);
    if (sbTotalBurden) sbTotalBurden.textContent = fmt(totalInterestBurden, cur);

    if (primaryValue) primaryValue.textContent = fmt(payment,cur);
    if (loanAmountEl) loanAmountEl.textContent = fmt(P,cur);
    if (totalPaid) totalPaid.textContent = fmt(totalInstallments,cur);

    const end = new Date(); end.setMonth(end.getMonth() + rows.length);
    if (payoffDate) payoffDate.textContent = end.toLocaleDateString();

    if (summary) summary.textContent = `Satış ${fmt(sale,cur)}, Peşinat ${fmt(downPay,cur)} → Kredi ${fmt(P,cur)}, ${rows.length} ay, APR ~ ${(r*m*100).toFixed(3)}%.`;

    if (scheduleBody) scheduleBody.innerHTML = rows.map(rw=>`<tr>
      <td>${rw.k}</td>
      <td>${fmt(rw.pay,cur)}</td>
      <td>${fmt(rw.bal,cur)}</td>
    </tr>`).join('');
    if (scheduleWrap) scheduleWrap.style.display = 'block';

    if (exportBtn) exportBtn.dataset.csv = toCSV(rows, {
      date: metaDate?.textContent || todayStr(),
      preparedBy: preparedByInp?.value || '',
      customer: customerName?.value || '',
      phone: customerPhone?.value || '',
      email: customerEmail?.value || '',
      property: propertyName?.value || '',
      block: propertyBlock?.value || '',
      unit: propertyUnit?.value || '',
      type: propertyType?.value || '',
      currency: cur,
      sale: (sale||0).toFixed(2),
      down: (downPay||0).toFixed(2),
      balance: (P||0).toFixed(2),
      totalInstallments: (totalInstallments||0).toFixed(2),
      totalInterest: (totalInterestBurden||0).toFixed(2)
    });
  }

  /* =========================
     EVENTS (Calc & UI)
  ==========================*/
  preparedByInp?.addEventListener('input', ()=>{
    localStorage.setItem('preparedBy', preparedByInp.value||'');
    if (metaPrepared) metaPrepared.textContent = preparedByInp.value.trim() || '—';
  });

  [customerName, customerPhone, customerEmail, propertyName, propertyBlock, propertyUnit, propertyType]
    .forEach(inp=> inp && inp.addEventListener('input', syncMeta));

  activeUserSel?.addEventListener('change', ()=>{
    const users = getUsers();
    const i = Number(activeUserSel.value || -1);
    if (users[i]){
      preparedByInp.value = users[i].name || '';
      metaPrepared.textContent = preparedByInp.value || '—';
      localStorage.setItem('preparedBy', preparedByInp.value||'');
    }
  });

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

  calcBtn?.addEventListener('click', ()=>{ syncMeta(); calculate(); });

  resetBtn?.addEventListener('click', ()=>{
    [customerName, customerPhone, customerEmail, propertyName, propertyBlock, propertyUnit, propertyType]
      .forEach(i=> i && (i.value=''));
    syncMeta();
    renderFields();
  });

  exportBtn?.addEventListener('click', ()=>{
    const csv = exportBtn.dataset.csv || '';
    if(!csv){ alert('Bu ekran için dışa aktarılacak amortisman yok.'); return; }
    const blob = new Blob([csv], {type:'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'odeme_plani.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  printBtn?.addEventListener('click', ()=>{
    const customer = (customerName?.value || 'Musteri').trim().replace(/\s+/g,'_');
    const property = (propertyName?.value || 'Proje').trim().replace(/\s+/g,'_');
    const date = new Date().toISOString().slice(0,10);
    const prevTitle = document.title;
    document.title = `Noyanlar_${customer}_${property}_${date}`;
    window.print();
    setTimeout(()=>{ document.title = prevTitle; }, 300);
  });

  currencySel?.addEventListener('change', ()=>{
    localStorage.setItem('currency', currencySel.value);
    updateCurrencyUI();
  });

  compoundSel?.addEventListener('change', ()=>{ /* keep for future use */ });

  interestFree?.addEventListener('change', ()=>{
    const aprInput = $('apr');
    if (interestFree.checked){ if (aprInput){ aprInput.value = 0; aprInput.disabled = true; } }
    else { if (aprInput){ aprInput.disabled = false; } }
  });

  clearQuotesBtn?.addEventListener('click', ()=>{
    if (confirm('Tüm kayıtlı planlar silinsin mi?')) localStorage.setItem('quotes','[]');
    renderSavedList();
  });

  saveQuoteBtn?.addEventListener('click', ()=>{
    const cur = currencySel?.value || 'GBP';
    const { salePrice, down, apr, term } = collectValues();
    if (!salePrice || !term){ alert('Kaydetmek için Satış Fiyatı ve Vade gerekli.'); return; }
    const q = {
      date: todayStr(),
      preparedBy: preparedByInp?.value||'',
      customer: customerName?.value||'',
      phone: customerPhone?.value||'',
      email: customerEmail?.value||'',
      property: propertyName?.value||'',
      block: propertyBlock?.value||'',
      unit: propertyUnit?.value||'',
      type: propertyType?.value||'',
      currency: cur,
      sale: Number(salePrice)||0,
      down: Number(down)||0,
      apr: Number(apr)||0,
      term: Number(term)||0
    };
    const arr = getQuotes(); arr.unshift(q); setQuotes(arr);
  });

  /* =========================
     SAVED QUOTES LIST
  ==========================*/
  function getQuotes(){
    try{ return JSON.parse(localStorage.getItem('quotes')||'[]'); }catch{ return []; }
  }
  function setQuotes(arr){
    localStorage.setItem('quotes', JSON.stringify(arr));
    renderSavedList();
  }
  function renderSavedList(){
    if (!savedList) return;
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
    if (preparedByInp) preparedByInp.value = q.preparedBy||'';
    if (customerName) customerName.value = q.customer||'';
    if (customerPhone) customerPhone.value = q.phone||'';
    if (customerEmail) customerEmail.value = q.email||'';
    if (propertyName) propertyName.value = q.property||'';
    if (propertyBlock) propertyBlock.value = q.block||'';
    if (propertyUnit) propertyUnit.value = q.unit||'';
    if (propertyType) propertyType.value = q.type||'';
    localStorage.setItem('preparedBy', preparedByInp?.value||'');
    if (currencySel) currencySel.value = q.currency||currencySel.value;
    localStorage.setItem('currency', currencySel?.value||'');
    renderFields();
    $('salePrice').value = q.sale||0;
    $('down').value = q.down||0;
    $('apr').value = q.apr||0;
    $('term').value = q.term||0;
    if (interestFree){ interestFree.checked = (q.apr === 0); }
    $('apr').disabled = interestFree?.checked || false;
    updateCurrencyUI();
    syncMeta();
    calcBtn?.click();
  }

  /* =========================
     INIT
  ==========================*/
  (function init(){
    // currency preference
    const savedCur = localStorage.getItem('currency');
    if (savedCur && sym[savedCur] && currencySel) currencySel.value = savedCur;

    renderFields();
    updateCurrencyUI();
    syncMeta();
    renderSavedList();
    populateLoginUsers();
    populateActiveUser();
  })();

})();