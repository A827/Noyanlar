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
  const primaryLabel = byId('primaryLabel');
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

  let mode = 'payment';
  const modes = {
    payment: {
      label: 'Aylık Taksit',
      fields: [
        {id:'salePrice', label:'Satış Fiyatı', type:'number', step:'0.01', placeholder:'örn. 1.000.000'},
        {id:'down', label:'Peşinat', type:'number', step:'0.01', placeholder:'örn. 200.000'},
        {id:'apr', label:'Yıllık Faiz Oranı (%)', type:'number', step:'0.01', placeholder:'örn. 3.75'},
        {id:'term', label:'Vade (ay)', type:'number', step:'1', placeholder:'örn. 120'}
      ],
      compute: (v)=>{
        const P = Math.max(0,(v.salePrice||0) - (v.down||0));
        const n = Number(v.term||0);
        const m = Number(compoundSel.value);
        const r = Number(v.apr||0)/100/m;
        if(n<=0) return null;
        const payment = (r===0) ? P/n : P * r / (1 - Math.pow(1+r,-n));
        return {payment, principal:P, r, n, salePrice:Number(v.salePrice||0), down:Number(v.down||0)};
      }
    },
    loan: {
      label: 'Maks. Kredi',
      fields: [
        {id:'monthly', label:'Hedef Aylık Taksit', type:'number', step:'0.01'},
        {id:'apr', label:'Yıllık Faiz Oranı (%)', type:'number', step:'0.01'},
        {id:'term', label:'Vade (ay)', type:'number', step:'1'}
      ],
      compute: (v)=>{
        const A = Number(v.monthly||0);
        const n = Number(v.term||0);
        const m = Number(compoundSel.value);
        const r = Number(v.apr||0)/100/m;
        if(n<=0) return null;
        const loan = (r===0) ? A*n : A * (1 - Math.pow(1+r,-n)) / r;
        return {loan, payment:A, r, n};
      }
    },
    rate: {
      label: 'Faizi Çöz',
      fields: [
        {id:'price', label:'Kredi Tutarı', type:'number', step:'0.01'},
        {id:'monthly', label:'Aylık Taksit', type:'number', step:'0.01'},
        {id:'term', label:'Vade (ay)', type:'number', step:'1'}
      ],
      compute: (v)=>{
        const P = Number(v.price||0);
        const A = Number(v.monthly||0);
        const n = Number(v.term||0);
        if(P<=0||A<=0||n<=0) return null;
        let r = 0.01; // initial guess per period
        const f = (r)=> P*r/(1-Math.pow(1+r,-n)) - A;
        const fp = (r)=>{
          const t = Math.pow(1+r,-n);
          return P * ( (1 - t) + n*r*t ) / Math.pow(1 - t,2);
        };
        for(let i=0;i<50;i++){
          const y = f(r), dy = fp(r);
          if(!isFinite(y) || !isFinite(dy) || Math.abs(dy)<1e-12) break;
          const r1 = r - y/dy;
          if(Math.abs(r1-r) < 1e-12) { r = r1; break; }
          r = Math.max(-0.9999, r1);
        }
        if(!isFinite(r) || r<=-1) return null;
        const m = Number(compoundSel.value);
        const apr = r * m * 100;
        return {apr, r, n, payment:A, principal:P};
      }
    },
    term: {
      label: 'Vade Çöz',
      fields: [
        {id:'price', label:'Kredi Tutarı', type:'number', step:'0.01'},
        {id:'monthly', label:'Aylık Taksit', type:'number', step:'0.01'},
        {id:'apr', label:'Yıllık Faiz Oranı (%)', type:'number', step:'0.01'}
      ],
      compute: (v)=>{
        const P = Number(v.price||0);
        const A = Number(v.monthly||0);
        const m = Number(compoundSel.value);
        const r = Number(v.apr||0)/100/m;
        if(P<=0||A<=0) return null;
        let n;
        if(r===0){ n = Math.ceil(P / A); }
        else {
          const x = 1 - r*P/A;
          if(x<=0) return null;
          n = Math.ceil( -Math.log(x) / Math.log(1+r) );
        }
        return {n, r, principal:P, payment:A};
      }
    }
  };

  // ----- Render Inputs -----
  function renderFields(){
    const cfg = modes[mode];
    byId('primaryLabel').textContent = cfg.label;
    inputsDiv.innerHTML = cfg.fields.map(f=>`
      <div>
        <label for="${f.id}">${f.label}</label>
        <input id="${f.id}" type="${f.type}" step="${f.step}" placeholder="${f.placeholder||''}" />
      </div>
    `).join('');
    scheduleWrap.style.display='none';
    primaryValue.textContent = '—';
    loanAmountEl.textContent = '—';
    totalInterest.textContent = '—';
    totalPaid.textContent = '—';
    payoffDate.textContent = '—';
    summary.textContent = 'Değerleri girip “Hesapla”ya basın.';
  }

  function activeTab(btn){
    document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active', b===btn));
  }

  function collectValues(){
    const vals = {};
    inputsDiv.querySelectorAll('input,select').forEach(el=>{
      vals[el.id] = Number(el.value);
    });
    return vals;
  }

  // ----- Amortization -----
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
    return {rows,totalI,totalP,balance:bal};
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
  document.getElementById('modeTabs').addEventListener('click', (e)=>{
    const t = e.target.closest('.tab');
    if(!t) return;
    mode = t.dataset.mode; activeTab(t); renderFields();
  });

  // Preset chips
  const presets = document.getElementById('presets');
  if (presets){
    presets.addEventListener('click', (e)=>{
      const b = e.target.closest('.chip');
      if(!b) return;
      mode = b.dataset.mode || 'payment';
      document.querySelectorAll('.tab').forEach(tab=>{
        tab.classList.toggle('active', tab.dataset.mode===mode);
      });
      renderFields();
      const sale = Number(b.dataset.sale||0);
      const down = Number(b.dataset.down||0);
      const apr  = Number(b.dataset.apr||0);
      const term = Number(b.dataset.term||0);
      byId('salePrice').value = sale;
      byId('down').value = down;
      byId('apr').value = apr;
      byId('term').value = term;
      byId('calcBtn').click();
    });
  }

  currencySel.addEventListener('change', ()=>{
    currencyBadge.textContent = `Para Birimi: ${currencySel.value} (${ {TRY:'₺',GBP:'£',USD:'$',EUR:'€'}[currencySel.value] })`;
  });

  byId('calcBtn').addEventListener('click', ()=>{
    const cfg = modes[mode];
    const v = collectValues();
    const cur = currencySel.value;
    const res = cfg.compute(v);
    if(!res){ summary.textContent = 'Lütfen geçerli sayılar girin.'; return; }

    if(mode==='payment'){
      const {payment, principal:P, r, n, salePrice, down} = res;
      const sch = buildSchedule(P, r, n, payment);
      primaryValue.textContent = fmt(payment,cur);
      loanAmountEl.textContent = fmt(P,cur);
      totalInterest.textContent = fmt(sch.totalI, cur);
      totalPaid.textContent = fmt(sch.totalI + sch.totalP, cur);
      const end = new Date(); end.setMonth(end.getMonth()+sch.rows.length);
      payoffDate.textContent = end.toLocaleDateString();
      summary.textContent = `Satış ${fmt(salePrice,cur)}, Peşinat ${fmt(down,cur)} → Kredi ${fmt(P,cur)}, ${sch.rows.length} ay, APR ~ ${(r*Number(compoundSel.value)*100).toFixed(3)}%.`;
      scheduleBody.innerHTML = sch.rows.map(r=>`<tr><td>${r.k}</td><td>${fmt(r.pay,cur)}</td><td>${fmt(r.interest,cur)}</td><td>${fmt(r.principal,cur)}</td><td>${fmt(r.bal,cur)}</td></tr>`).join('');
      scheduleWrap.style.display='block';
      exportBtn.dataset.csv = toCSV(sch.rows);
    }

    if(mode==='loan'){
      const {loan, payment:A, r, n} = res;
      primaryValue.textContent = fmt(loan,cur);
      loanAmountEl.textContent = fmt(loan,cur);
      totalInterest.textContent = '—';
      totalPaid.textContent = '—';
      payoffDate.textContent = new Date(new Date().setMonth(new Date().getMonth()+n)).toLocaleDateString();
      summary.textContent = `${n} ay, APR ~ ${(r*Number(compoundSel.value)*100).toFixed(3)}% ile ${fmt(A,cur)}/ay için maks. kredi ${fmt(loan,cur)}.`;
      scheduleWrap.style.display='none'; exportBtn.dataset.csv = '';
    }

    if(mode==='rate'){
      const {apr, principal:P, payment:A, n} = res;
      primaryValue.textContent = (apr>0? apr.toFixed(4):'0.0000') + '% APR';
      loanAmountEl.textContent = fmt(P, cur);
      totalInterest.textContent = '—'; totalPaid.textContent='—';
      payoffDate.textContent = new Date(new Date().setMonth(new Date().getMonth()+n)).toLocaleDateString();
      summary.textContent = `${fmt(P,cur)} kredi için ${n} ay, aylık ${fmt(A,cur)} → APR ≈ ${apr.toFixed(4)}%.`;
      scheduleWrap.style.display='none'; exportBtn.dataset.csv = '';
    }

    if(mode==='term'){
      const {n, principal:P, payment:A, r} = res;
      primaryValue.textContent = `${n} ay`;
      loanAmountEl.textContent = fmt(P, cur);
      totalInterest.textContent = '—'; totalPaid.textContent='—';
      payoffDate.textContent = new Date(new Date().setMonth(new Date().getMonth()+n)).toLocaleDateString();
      summary.textContent = `${fmt(P,cur)} kredi, aylık ${fmt(A,cur)} ve APR ~ ${(r*Number(compoundSel.value)*100).toFixed(3)}% → vade ≈ ${n} ay.`;
      scheduleWrap.style.display='none'; exportBtn.dataset.csv = '';
    }
  });

  byId('resetBtn').addEventListener('click', ()=>{ renderFields(); });

  exportBtn.addEventListener('click', ()=>{
    const csv = exportBtn.dataset.csv||'';
    if(!csv){ alert('Bu mod için dışa aktarılacak amortisman yok.'); return; }
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