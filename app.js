(function(){
  const fmt = (v, cur='GBP')=>{
    const sym = {GBP:'£',USD:'$',EUR:'€',TRY:'₺'}[cur]||'';
    return isFinite(v)? sym+Number(v).toLocaleString(undefined,{maximumFractionDigits:2,minimumFractionDigits:2}) : '—';
  };
  const byId = id=>document.getElementById(id);
  const inputsDiv = byId('inputs');
  const currencySel = byId('currency');
  const compoundSel = byId('compound');
  const currencyBadge = byId('currencyBadge');
  const primaryLabel = byId('primaryLabel');
  const primaryValue = byId('primaryValue');
  const totalInterest = byId('totalInterest');
  const totalPaid = byId('totalPaid');
  const payoffDate = byId('payoffDate');
  const summary = byId('summary');
  const scheduleWrap = byId('scheduleWrap');
  const scheduleBody = byId('schedule');
  const exportBtn = byId('exportBtn');

  let mode = 'payment';
  const modes = {
    payment: {
      label: 'Monthly Payment',
      fields: [
        {id:'price', label:'Price / Loan Amount', type:'number', step:'0.01', placeholder:'e.g. 55,000'},
        {id:'down', label:'Down Payment (optional)', type:'number', step:'0.01', placeholder:'e.g. 20,000'},
        {id:'apr', label:'Annual Interest Rate (%)', type:'number', step:'0.01', placeholder:'e.g. 5.5'},
        {id:'term', label:'Term (months)', type:'number', step:'1', placeholder:'e.g. 120'}
      ],
      compute: (v)=>{
        const P = Math.max(0,(v.price||0) - (v.down||0));
        const n = Number(v.term||0);
        const m = Number(compoundSel.value);
        const r = Number(v.apr||0)/100/m;
        let pay;
        if(n<=0) return null;
        if(r===0){ pay = P/n; }
        else { pay = P * r / (1 - Math.pow(1+r,-n)); }
        return {payment:pay, principal:P, r, n};
      }
    },
    loan: {
      label: 'Max Loan (given monthly)',
      fields: [
        {id:'monthly', label:'Target Monthly Payment', type:'number', step:'0.01'},
        {id:'apr', label:'Annual Interest Rate (%)', type:'number', step:'0.01'},
        {id:'term', label:'Term (months)', type:'number', step:'1'}
      ],
      compute: (v)=>{
        const A = Number(v.monthly||0);
        const n = Number(v.term||0);
        const m = Number(compoundSel.value);
        const r = Number(v.apr||0)/100/m;
        let P;
        if(n<=0) return null;
        if(r===0){ P = A*n; }
        else { P = A * (1 - Math.pow(1+r,-n)) / r; }
        return {loan:P, payment:A, r, n};
      }
    },
    rate: {
      label: 'Solve Interest Rate',
      fields: [
        {id:'price', label:'Loan Amount', type:'number', step:'0.01'},
        {id:'monthly', label:'Monthly Payment', type:'number', step:'0.01'},
        {id:'term', label:'Term (months)', type:'number', step:'1'}
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
      label: 'Solve Term',
      fields: [
        {id:'price', label:'Loan Amount', type:'number', step:'0.01'},
        {id:'monthly', label:'Monthly Payment', type:'number', step:'0.01'},
        {id:'apr', label:'Annual Interest Rate (%)', type:'number', step:'0.01'}
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
          if(x<=0) return null; // payment too small
          n = Math.ceil( -Math.log(x) / Math.log(1+r) );
        }
        return {n, r, principal:P, payment:A};
      }
    }
  };

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
    totalInterest.textContent = '—';
    totalPaid.textContent = '—';
    payoffDate.textContent = '—';
    summary.textContent = 'Enter details and click Calculate.';
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
    const header = 'Period,Payment,Interest,Principal,Balance
';
    const lines = rows.map(r=>[r.k, r.pay.toFixed(2), r.interest.toFixed(2), r.principal.toFixed(2), r.bal.toFixed(2)].join(','));
    return header + lines.join('
');
  }

  document.getElementById('modeTabs').addEventListener('click', (e)=>{
    const t = e.target.closest('.tab');
    if(!t) return;
    mode = t.dataset.mode; activeTab(t); renderFields();
  });

  currencySel.addEventListener('change', ()=>{
    currencyBadge.textContent = `Currency: ${currencySel.value} (${ {GBP:'£',USD:'$',EUR:'€',TRY:'₺'}[currencySel.value] })`;
  });

  byId('calcBtn').addEventListener('click', ()=>{
    const cfg = modes[mode];
    const v = collectValues();
    const cur = currencySel.value;
    const res = cfg.compute(v);
    if(!res){ summary.textContent = 'Please complete the fields with valid numbers.'; return; }

    if(mode==='payment'){
      const {payment, principal:P, r, n} = res;
      const sch = buildSchedule(P, r, n, payment);
      primaryValue.textContent = fmt(payment,cur);
      totalInterest.textContent = fmt(sch.totalI, cur);
      totalPaid.textContent = fmt(sch.totalI + sch.totalP, cur);
      const end = new Date(); end.setMonth(end.getMonth()+sch.rows.length);
      payoffDate.textContent = end.toLocaleDateString();
      summary.textContent = `Loan ${fmt(P,cur)} over ${sch.rows.length} months at ${(r*Number(compoundSel.value)*100).toFixed(3)}% APR.`;
      scheduleBody.innerHTML = sch.rows.map(r=>`<tr><td>${r.k}</td><td>${fmt(r.pay,cur)}</td><td>${fmt(r.interest,cur)}</td><td>${fmt(r.principal,cur)}</td><td>${fmt(r.bal,cur)}</td></tr>`).join('');
      scheduleWrap.style.display='block';
      exportBtn.dataset.csv = toCSV(sch.rows);
    }

    if(mode==='loan'){
      const {loan, payment:A, r, n} = res;
      primaryValue.textContent = fmt(loan,cur);
      totalInterest.textContent = '—';
      totalPaid.textContent = '—';
      payoffDate.textContent = new Date(new Date().setMonth(new Date().getMonth()+n)).toLocaleDateString();
      summary.textContent = `With ${fmt(A,cur)} per month for ${n} months at ${(r*Number(compoundSel.value)*100).toFixed(3)}% APR, max loan is ${fmt(loan,cur)}.`;
      scheduleWrap.style.display='none'; exportBtn.dataset.csv = '';
    }

    if(mode==='rate'){
      const {apr, principal:P, payment:A, n} = res;
      primaryValue.textContent = (apr>0? apr.toFixed(4):'0.0000') + '% APR';
      totalInterest.textContent = '—'; totalPaid.textContent='—';
      payoffDate.textContent = new Date(new Date().setMonth(new Date().getMonth()+n)).toLocaleDateString();
      summary.textContent = `To pay ${fmt(A,cur)} for ${n} months on ${fmt(P,cur)}, APR is ~ ${apr.toFixed(4)}%.`;
      scheduleWrap.style.display='none'; exportBtn.dataset.csv = '';
    }

    if(mode==='term'){
      const {n, principal:P, payment:A, r} = res;
      primaryValue.textContent = `${n} months`;
      totalInterest.textContent = '—'; totalPaid.textContent='—';
      payoffDate.textContent = new Date(new Date().setMonth(new Date().getMonth()+n)).toLocaleDateString();
      summary.textContent = `To pay ${fmt(P,cur)} with ${fmt(A,cur)} monthly at ${(r*Number(compoundSel.value)*100).toFixed(3)}% APR, you need ~${n} months.`;
      scheduleWrap.style.display='none'; exportBtn.dataset.csv = '';
    }
  });

  byId('resetBtn').addEventListener('click', ()=>{ renderFields(); });

  exportBtn.addEventListener('click', ()=>{
    const csv = exportBtn.dataset.csv||'';
    if(!csv){ alert('No amortization to export for this mode.'); return; }
    const blob = new Blob([csv], {type:'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'amortization.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  renderFields();
})();