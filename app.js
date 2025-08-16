(function(){
  const sym = { TRY:'₺', GBP:'£', USD:'$', EUR:'€' };

  const $ = id => document.getElementById(id);
  const fmt = (v, cur) => isFinite(v)
    ? (sym[cur]||'') + Number(v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})
    : '—';

  const nowYear = new Date().getFullYear();
  if ($('year')) $('year').textContent = nowYear;

  $('loanForm').addEventListener('submit', function(e){
    e.preventDefault();

    const currency = $('currency').value;
    const salePrice = parseFloat($('salePrice').value || '0');
    const downPayment = parseFloat($('downPayment').value || '0');
    const aprYear = parseFloat($('interestRate').value || '0'); // % per year
    const months = parseInt($('months').value || '0', 10);

    const P = Math.max(0, salePrice - downPayment);
    if (!months || months <= 0){ alert('Please enter a valid term (months).'); return; }

    const r = (aprYear/100) / 12; // monthly nominal rate
    let monthly;
    if (r === 0) monthly = P / months;
    else monthly = P * r / (1 - Math.pow(1 + r, -months));

    const totalPayment = monthly * months;
    const totalInterest = totalPayment - P;

    $('loanAmount').textContent = fmt(P, currency);
    $('monthlyPayment').textContent = fmt(monthly, currency);
    $('totalPayment').textContent = fmt(totalPayment, currency);
    $('totalInterest').textContent = fmt(totalInterest, currency);

    // payoff date (approx: add months from today)
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    $('payoffDate').textContent = d.toLocaleDateString();

    // Build amortization schedule
    const tbody = document.querySelector('#scheduleTable tbody');
    tbody.innerHTML = '';
    let balance = P;

    for (let k=1; k<=months; k++){
      const interest = r === 0 ? 0 : balance * r;
      const principal = Math.min(balance, monthly - interest);
      balance = Math.max(0, balance - principal);

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${k}</td>
        <td>${fmt(monthly, currency)}</td>
        <td>${fmt(principal, currency)}</td>
        <td>${fmt(interest, currency)}</td>
        <td>${fmt(balance, currency)}</td>
      `;
      tbody.appendChild(tr);

      if (balance <= 0) break;
    }

    $('result').classList.remove('hidden');
  });

  $('resetBtn').addEventListener('click', ()=>{
    $('loanForm').reset();
    $('currency').value = 'TRY';
    $('result').classList.add('hidden');
  });
})();