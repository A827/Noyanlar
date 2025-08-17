// app.js
(function(){
  // ===== THEME TOGGLE (light/dark/auto with persistence) =====
  const THEME_KEY = 'theme'; // 'light' | 'dark' | 'auto'
  const root = document.documentElement;
  const themeToggle = document.getElementById('themeToggle');

  function applyTheme(mode){
    root.classList.remove('light');
    root.setAttribute('data-theme', mode);
    if (mode === 'light') { root.classList.add('light'); }
    localStorage.setItem(THEME_KEY, mode);
    if (themeToggle){
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

  // meta display
  const metaDate = $('metaDate');
  const metaCustomer = $('metaCustomer');
  const metaProperty = $('metaProperty');
  const metaPrepared = $('metaPrepared');

  // business summary
  const sbSale = $('sbSale');
  const sbDown = $('sbDown');
  const sbBalance = $('sbBalance');
  const sbBalancePlusInterest = $('sbBalancePlusInterest');
  const sbTotalBurden = $('sbTotalBurden');

  // technical summary
  const primaryValue = $('primaryValue');
  const loanAmountEl = $('loanAmount');
  const totalPaid = $('totalPaid');
  const payoffDate = $('payoffDate');
  const summary = $('summary');

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

  // chart
  const chartCanvas = $('chart');
  const ctx = chartCanvas.getContext('2d');

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
    [primaryValue, loanAmountEl, totalPaid, payoffDate, sbSale, sbDown, sbBalance, sbBalancePlusInterest, sbTotalBurden]
      .forEach(el=> el.textContent='—');
    summary.textContent = 'Değerleri girip “Hesapla”ya basın.';
    metaDate.textContent = todayStr();

    // restore remembered preferences
    preparedByInp.value = localStorage.getItem('preparedBy') || preparedByInp.value || '';
    metaPrepared.textContent = preparedByInp.value || '—';
  }

  function updateCurrencyUI(){
    currencyBadge.textContent = `Para Birimi: ${currencySel.value} (${getSymbol()})`;
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
    for (let k=1; k<=n; k++){
      const interest = r===0 ? 0 : bal*r;
      const principal = Math.min(bal, pay - interest);
      bal = Math.max(0, bal - principal);
      rows.push({ k, pay, bal });
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

  function drawChart(rows, payment){
    const W = chartCanvas.width, H = chartCanvas.height;
    ctx.clearRect(0,0,W,H);
    if (!rows.length) return;

    const maxBal = Math.max(...rows.map(r=>r.bal).concat(rows[0].bal));
    const pad = 24;
    const toX = i => pad + (i/rows.length) * (W - 2*pad);
    const toY = v => H - pad - (v/maxBal) * (H - 2*pad);

    // axes
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--line').trim() || '#293650';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad, H-pad); ctx.lineTo(W-pad, H-pad); ctx.stroke();

    // balance line
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--brand-2').trim() || '#caa46a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(rows[0].bal || 0));
    rows.forEach((r,i)=>{ ctx.lineTo(toX(i+1), toY(r.bal)); });
    ctx.stroke();

    // payment flat line
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--brand').trim() || '#8b1c23';
    ctx.setLineDash([6,4]);
    const yPay = H - pad - (payment/maxBal) * (H - 2*pad);
    ctx.beginPath(); ctx.moveTo(pad, yPay); ctx.lineTo(W-pad, yPay); ctx.stroke();
    ctx.setLineDash([]);

    // labels
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--muted').trim() || '#9aa3b2';
    ctx.font = '12px system-ui';
    ctx.fillText('Bakiye', pad+6, toY(rows[0].bal||0)-8);
    ctx.fillText('Taksit', W-pad-50, yPay-6);
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

  // ===== META SYNC =====
  function syncMeta(){
    metaDate.textContent = todayStr();
    metaCustomer.textContent = customerNameInp.value.trim() || '—';
    const propBits = [
      propertyNameInp.value,
      propertyBlockInp.value && `Blok ${propertyBlockInp.value}`,
      propertyUnitInp.value && `No ${propertyUnitInp.value}`,
      propertyTypeInp.value
    ].filter(Boolean).join(' • ');
    metaProperty.textContent = propBits || '—';
    metaPrepared.textContent = preparedByInp.value.trim() || '—';
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

    if (n<=0){ summary.textContent = 'Lütfen geçerli vade (ay) girin.'; return; }

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

    summary.textContent = `Satış ${fmt(sale,cur)}, Peşinat ${fmt(downPay,cur)} → Kredi ${fmt(P,cur)}, ${rows.length} ay, APR ~ ${(r*m*100).toFixed(3)}%.`;

    // Table
    scheduleBody.innerHTML = rows.map(rw=>`<tr>
      <td>${rw.k}</td>
      <td>${fmt(rw.pay,cur)}</td>
      <td>${fmt(rw.bal,cur)}</td>
    </tr>`).join('');
    scheduleWrap.style.display = 'block';

    // Chart
    drawChart([{bal:P}, ...rows], payment);

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

  // ===== EVENTS =====
  // Smart PDF filename based on customer + property + date, then restore title
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
    metaPrepared.textContent = preparedByInp.value.trim() || '—';
  });
  [customerNameInp, customerPhoneInp, customerEmailInp,
   propertyNameInp, propertyBlockInp, propertyUnitInp, propertyTypeInp]
   .forEach(inp=> { if (inp) inp.addEventListener('input', syncMeta); });

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
     propertyNameInp, propertyBlockInp, propertyUnitInp, propertyTypeInp]
      .forEach(i=> { if (i) i.value=''; });
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

  // ===== INIT =====
  (function init(){
    const savedCur = localStorage.getItem('currency');
    if (savedCur && sym[savedCur]) currencySel.value = savedCur;
    renderFields();
    updateCurrencyUI();
    syncMeta();
    renderSavedList();
  })();

})();