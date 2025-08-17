(function(){
  // Symbols: GBP / EUR / USD
  const sym = { GBP:'£', EUR:'€', USD:'$' };
  const fmt = (v, cur='GBP') =>
    isFinite(v) ? (sym[cur]||'') + Number(v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}) : '—';
  const $ = id => document.getElementById(id);

  const inputsDiv = $('inputs');
  const currencySel = $('currency');
  const compoundSel = $('compound');
  const currencyBadge = $('currencyBadge');

  // Meta fields
  const metaDate = $('metaDate');
  const metaCustomer = $('metaCustomer');
  const metaProperty = $('metaProperty');

  // Business summary fields
  const sbSale = $('sbSale');
  const sbDown = $('sbDown');
  const sbBalance = $('sbBalance');
  const sbBalancePlusInterest = $('sbBalancePlusInterest');
  const sbTotalBurden = $('sbTotalBurden');

  // Technical summary fields
  const primaryValue = $('primaryValue');
  const loanAmountEl = $('loanAmount');
  const totalPaid = $('totalPaid');
  const payoffDate = $('payoffDate');
  const summary = $('summary');

  // Table & export
  const scheduleWrap = $('scheduleWrap');
  const scheduleBody = $('schedule');
  const exportBtn = $('exportBtn');

  // Footer
  if ($('year')) $('year').textContent = new Date().getFullYear();
  if ($('printBtn')) $('printBtn').addEventListener('click', ()=> window.print());

  const todayStr = () => new Date().toLocaleDateString();

  function renderFields(){
    // Numeric inputs (kept dynamic to avoid duplication)
    inputsDiv.innerHTML = `
      <div class="field prefix-wrap">
        <label for="salePrice">Satış Fiyatı</label>
        <span class="prefix" id="symSale">£</span>
        <input id="salePrice" type="number" step="0.01" placeholder="örn. 75,000" />
      </div>
      <div class="field prefix-wrap">
        <label for="down">Peşinat</label>
        <span class="prefix" id="symDown">£</span>
        <input id="down" type="number" step="0.01" placeholder="örn. 20,000" />
      </div>
      <div class="field">
        <label for="apr">Yıllık Faiz Oranı (%)</label>
        <input id="apr" type="number" step="0.01" placeholder="örn. 3.75" />
      </div>
      <div class="field">
        <label for="term">Vade (ay)</label>
        <input id="term" type="number" step="1" placeholder="örn. 120" />
      </div>
    `;

    // Reset summary & meta
    scheduleWrap.style.display = 'none';
    [primaryValue, loanAmountEl, totalPaid, payoffDate, sbSale, sbDown, sbBalance, sbBalancePlusInterest, sbTotalBurden]
      .forEach(el=>{ if(el) el.textContent='—'; });
    summary.textContent = 'Değerleri girip “Hesapla”ya basın.';
    if (metaDate) metaDate.textContent = todayStr();
    // keep metaCustomer/metaProperty as-is (they mirror the visible inputs)

    updateCurrencySymbols();
  }

  function updateCurrencySymbols(){
    const s = sym[currencySel.value] || '';
    currencyBadge.textContent = `Para Birimi: ${currencySel.value} (${s})`;
    const sale = $('symSale'), down = $('symDown');
    if (sale) sale.textContent = s;
    if (down) down.textContent = s;
  }

  function collectValues(){
    const v = {};
    inputsDiv.querySelectorAll('input').forEach(el => v[el.id] = Number(el.value));
    return v;
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
Customer,${meta.customer}
Property,${meta.property}
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

  // Keep meta labels synced with visible inputs
  const customerInput = $('customerName');
  const propertyInput = $('propertyName');
  const syncCustomer = () => { if(metaCustomer) metaCustomer.textContent = customerInput.value.trim() || '—'; };
  const syncProperty = () => { if(metaProperty) metaProperty.textContent = propertyInput.value.trim() || '—'; };
  if (customerInput) customerInput.addEventListener('input', syncCustomer);
  if (propertyInput) propertyInput.addEventListener('input', syncProperty);

  // Presets
  const presets = $('presets');
  if (presets){
    presets.addEventListener('click', (e)=>{
      const b = e.target.closest('.chip');
      if(!b) return;
      renderFields();
      $('salePrice').value = Number(b.dataset.sale||0);
      $('down').value = Number(b.dataset.down||0);
      $('apr').value = Number(b.dataset.apr||0);
      $('term').value = Number(b.dataset.term||0);
      $('calcBtn').click();
    });
  }

  currencySel.addEventListener('change', updateCurrencySymbols);

  $('calcBtn').addEventListener('click', ()=>{
    const cur = currencySel.value;
    const { salePrice=0, down=0, apr=0, term=0 } = collectValues();

    const sale = Number(salePrice)||0;
    const downPay = Number(down)||0;
    const P = Math.max(0, sale - downPay); // Teslim Sonrası Bakiye
    const n = Number(term||0);
    const m = Number(compoundSel.value);
    const r = Number(apr||0)/100/m;
    if(n<=0){ summary.textContent = 'Lütfen geçerli vade (ay) girin.'; return; }

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

    // Meta
    if (metaDate) metaDate.textContent = todayStr();
    syncCustomer();
    syncProperty();

    summary.textContent = `Satış ${fmt(sale,cur)}, Peşinat ${fmt(downPay,cur)} → Kredi ${fmt(P,cur)}, ${rows.length} ay, APR ~ ${(r*m*100).toFixed(3)}%.`;

    // Table
    scheduleBody.innerHTML = rows.map(rw=>`<tr>
      <td>${rw.k}</td>
      <td>${fmt(rw.pay,cur)}</td>
      <td>${fmt(rw.bal,cur)}</td>
    </tr>`).join('');
    scheduleWrap.style.display = 'block';

    // CSV meta
    exportBtn.dataset.csv = toCSV(rows, {
      date: metaDate?.textContent || todayStr(),
      customer: metaCustomer?.textContent || '',
      property: metaProperty?.textContent || '',
      currency: cur,
      sale: (sale||0).toFixed(2),
      down: (downPay||0).toFixed(2),
      balance: (P||0).toFixed(2),
      totalInstallments: (totalInstallments||0).toFixed(2),
      totalInterest: (totalInterestBurden||0).toFixed(2)
    });
  });

  $('resetBtn').addEventListener('click', ()=>{
    if (customerInput) customerInput.value = '';
    if (propertyInput) propertyInput.value = '';
    if (metaCustomer) metaCustomer.textContent = '—';
    if (metaProperty) metaProperty.textContent = '—';
    if (metaDate) metaDate.textContent = todayStr();
    renderFields();
  });

  // Init
  if (metaDate) metaDate.textContent = todayStr();
  renderFields();
})();