(function(){
  // ----- Utils -----
  const sym = { TRY:'₺', GBP:'£', USD:'$', EUR:'€' };
  const fmt = (v, cur='TRY') => isFinite(v)
    ? (sym[cur]||'') + Number(v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})
    : '—';
  const $ = id => document.getElementById(id);

  const inputsDiv = $('inputs');
  const currencySel = $('currency');
  const compoundSel = $('compound');
  const currencyBadge = $('currencyBadge');
  const primaryValue = $('primaryValue');
  const loanAmountEl = $('loanAmount');
  const totalPaid = $('totalPaid');
  const payoffDate = $('payoffDate');
  const summary = $('summary');
  const scheduleWrap = $('scheduleWrap');
  const scheduleBody = $('schedule');
  const exportBtn = $('exportBtn');
  if ($('year')) $('year').textContent = new Date().getFullYear();
  if ($('printBtn')) $('printBtn').addEventListener('click', ()=> window.print());

  // ----- Render Inputs -----
  function renderFields(){
    inputsDiv.innerHTML = `
      <div>
        <label for="salePrice">Satış Fiyatı</label>
        <input id="salePrice" type="number" step="0.01" placeholder="örn. 1.000.000" />
      </div>
      <div>
        <label for="down">Peşinat</label>
        <input id="down" type="number" step="0.01" placeholder="örn. 200.000" />
      </div>
      <div>
        <label for="apr">Yıllık Faiz Oranı (%)</label>
        <input id="apr" type="number" step="0.01" placeholder="örn. 3.75" />
      </div>
      <div>
        <label for="term">Vade (ay)</label>
        <input id="term" type="number" step="1" placeholder="örn. 120" />
      </div>
    `;
    scheduleWrap.style.display='none';
    primaryValue.textContent = '—';
    loanAmountEl.textContent = '—';
    totalPaid.textContent = '—';
    payoffDate.textContent = '—';
    summary.textContent = 'Değerleri girip “Hesapla”ya basın.';
  }

  function collectValues(){
    const v = {};
    inputsDiv.querySelectorAll('input').forEach(el=> v[el.id] = Number(el.value) );
    return v;
  }

  // Build schedule (we still compute interest/principal internally but DO NOT display them)
  function buildSchedule(P, r, n, pay){
    let bal = P, rows = [];
    for(let k=1; k<=n; k++){
      const interest = r===0 ? 0 : bal*r;
      const principal = Math.min(bal, pay - interest);
      bal = Math.max(0, bal - principal);
      rows.push({ k, pay, bal });
      if (bal<=0) break;
    }
    return rows;
  }

  function toCSV(rows){
    const header = 'Donem,Odeme,Bakiye\n';
    const lines = rows.map(r=>[r.k, r.pay.toFixed(2), r.bal.toFixed(2)].join(','));
    return header + lines.join('\n');
  }

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

  currencySel.addEventListener('change', ()=>{
    const m = {TRY:'₺',GBP:'£',USD:'$',EUR:'€'}[currencySel.value];
    currencyBadge.textContent = `Para Birimi: ${currencySel.value} (${m})`;
  });

  $('calcBtn').addEventListener('click', ()=>{
    const cur = currencySel.value;
    const { salePrice=0, down=0, apr=0, term=0 } = collectValues();
    const P = Math.max(0, salePrice - down);
    const n = Number(term||0);
    const m = Number(compoundSel.value);
    const r = Number(apr||0)/100/m;
    if(n<=0){ summary.textContent = 'Lütfen geçerli vade (ay) girin.'; return; }

    const payment = (r===0) ? P/n : P * r / (1 - Math.pow(1+r, -n));
    const rows = buildSchedule(P, r, n, payment);

    primaryValue.textContent = fmt(payment, cur);
    loanAmountEl.textContent = fmt(P, cur);
    totalPaid.textContent = fmt(payment * rows.length, cur);
    const end = new Date(); end.setMonth(end.getMonth() + rows.length);
    payoffDate.textContent = end.toLocaleDateString();
    summary.textContent = `Satış ${fmt(salePrice,cur)}, Peşinat ${fmt(down,cur)} → Kredi ${fmt(P,cur)}, ${rows.length} ay, APR ~ ${(r*m*100).toFixed(3)}%.`;

    scheduleBody.innerHTML = rows.map(rw=>`<tr>
      <td>${rw.k}</td>
      <td>${fmt(rw.pay,cur)}</td>
      <td>${fmt(rw.bal,cur)}</td>
    </tr>`).join('');
    scheduleWrap.style.display='block';
    exportBtn.dataset.csv = toCSV(rows);
  });

  $('resetBtn').addEventListener('click', ()=> renderFields());

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

  renderFields();
})();