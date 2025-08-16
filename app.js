(function(){
  // ----- Utils -----
  const fmt = (v, cur='TRY')=>{
    const sym = {TRY:'₺', GBP:'£', USD:'$', EUR:'€'}[cur]||'';
    return isFinite(v)? sym+Number(v).toLocaleString(undefined,{maximumFractionDigits:2,minimumFractionDigits:2}) : '—';
  };
  const byId = id=>document.getElementById(id);
  const inputsDiv = byId('inputs');
  const currencySel = byId('currency');
  const compoundSel = byId('compound');
  const currencyBadge = byId('currencyBadge');
  const primaryValue = byId('primaryValue');
  const loanAmountEl = byId('loanAmount');
  const totalInterest = byId('totalInterest');
  const totalPaid = byId('totalPaid');
  const payoffDate = byId('payoffDate');
  const summary = byId('summary');
  const scheduleWrap = byId('scheduleWrap');
  const scheduleBody = byId('schedule');
  const exportBtn = byId('exportBtn');
  const yearSpan = byId('year');
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();
  const printBtn = byId('printBtn');
  if (printBtn) printBtn.addEventListener('click', ()=> window.print());

  // ----- Render Inputs (single mode only) -----
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
    totalInterest.textContent = '—';
    totalPaid.textContent = '—';
    payoffDate.textContent = '—';
    summary.textContent = 'Değerleri girip “Hesapla”ya basın.';
  }

  // ----- Helpers -----
  function collectValues(){
    const vals = {};
    inputsDiv.querySelectorAll('input').forEach(el=>{
      vals[el.id] = Number(el.value);
    });
    return vals;
  }

  // Amortization
  function buildSchedule(P, r, n, pay){
    let bal = P, rows = [], totalI=0, totalP=0;
    for(let k=1;k<=n;k++){
      const interest = r===0? 0 : bal*r;
      const principal = Math.min(bal, pay - interest);
      bal = Math.max(0, bal - principal);
      totalI += interest; totalP += principal;
      rows.push({k, pay, interest, principal, bal});
      if(bal<=0) break;
    }
    return {rows,totalI,totalP};
  }

  function toCSV(rows){
    const header = 'Donem,Odeme,Faiz,Anapara,Bakiye\n';
    const lines = rows.map(r=>[
      r.k,
      r.pay.toFixed(2),
      r.interest.toFixed(2),
      r.principal.toFixed(2),
      r.bal.toFixed(2)
    ].join(','));
    return header + lines.join('\n');
  }

  // ----- Events -----
  // Preset chips
  const presets = document.getElementById('presets');
  if (presets){
    presets.addEventListener('click', (e)=>{
      const b = e.target.closest('.chip');
      if(!b) return;
      renderFields();
      byId('salePrice').value = Number(b.dataset.sale||0);
      byId('down').value = Number(b.dataset.down||0);
      byId('apr').value = Number(b.dataset.apr||0);
      byId('term').value = Number(b.dataset.term||0);
      byId('calcBtn').click();
    });
  }

  currencySel.addEventListener('change', ()=>{
    currencyBadge.textContent = `Para Birimi: ${currencySel.value} (${ {TRY:'₺',GBP:'£',USD:'$',EUR:'€'}[currencySel.value] })`;
  });

  byId('calcBtn').addEventListener('click', ()=>{
    const v = collectValues();
    const cur = currencySel.value;

    const P = Math.max(0,(v.salePrice||0) - (v.down||0));
    const n = Number(v.term||0);
    const m = Number(compoundSel.value);
    const r = Number(v.apr||0)/100/m;
    if(n<=0){ summary.textContent = 'Lütfen geçerli vade (ay) girin.'; return; }

    const payment = (r===0) ? P/n : P * r / (1 - Math.pow(1+r,-n));
    const sch = buildSchedule(P, r, n, payment);

    primaryValue.textContent = fmt(payment,cur);
    loanAmountEl.textContent = fmt(P,cur);
    totalInterest.textContent = fmt(sch.totalI, cur);
    totalPaid.textContent = fmt(sch.totalI + P, cur);

    const end = new Date(); end.setMonth(end.getMonth()+sch.rows.length);
    payoffDate.textContent = end.toLocaleDateString();

    summary.textContent = `Satış ${fmt(v.salePrice||0,cur)}, Peşinat ${fmt(v.down||0,cur)} → Kredi ${fmt(P,cur)}, ${sch.rows.length} ay, APR ~ ${(r*m*100).toFixed(3)}%.`;

    scheduleBody.innerHTML = sch.rows.map(rw=>`<tr>
      <td>${rw.k}</td>
      <td>${fmt(rw.pay,cur)}</td>
      <td>${fmt(rw.interest,cur)}</td>
      <td>${fmt(rw.principal,cur)}</td>
      <td>${fmt(rw.bal,cur)}</td>
    </tr>`).join('');
    scheduleWrap.style.display='block';
    exportBtn.dataset.csv = toCSV(sch.rows);
  });

  byId('resetBtn').addEventListener('click', ()=>{ renderFields(); });

  exportBtn.addEventListener('click', ()=>{
    const csv = exportBtn.dataset.csv||'';
    if(!csv){ alert('Bu ekran için dışa aktarılacak amortisman yok.'); return; }
    const blob = new Blob([csv], {type:'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'amortisman.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  // Init
  renderFields();
})();