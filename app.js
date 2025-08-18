// app.js — NO LOGIN / NO ROLES — ES5 SAFE — Presets removed
(function () {
// THEME TOGGLE — 2-state (light/dark) only
var THEME_KEY = 'theme';
var root = document.documentElement;
var themeToggle = document.getElementById('themeToggle');

function systemPrefersLight(){
  try { return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches; }
  catch(e){ return false; }
}

function applyTheme(mode){
  // normalize to 'light' or 'dark'
  var m = (mode === 'light' || mode === 'dark') ? mode : (systemPrefersLight() ? 'light' : 'dark');

  root.classList.remove('light');
  root.setAttribute('data-theme', m);
  if (m === 'light') root.classList.add('light');

  try { localStorage.setItem(THEME_KEY, m); } catch(e){}

  if (themeToggle){
    themeToggle.textContent = m === 'light' ? '☀️' : '🌙';
    themeToggle.title = 'Tema: ' + m + ' (tıkla: ' + (m === 'light' ? 'dark' : 'light') + ')';
  }
}

function initTheme(){
  var saved = null;
  try { saved = localStorage.getItem(THEME_KEY); } catch(e){}

  // migrate any legacy 'auto' value to a concrete mode once
  if (saved === 'auto' || saved === null){
    applyTheme(systemPrefersLight() ? 'light' : 'dark');
  } else {
    applyTheme(saved);
  }
}

function cycleTheme(){
  var cur = 'dark';
  try { cur = localStorage.getItem(THEME_KEY) || 'dark'; } catch(e){}
  applyTheme(cur === 'light' ? 'dark' : 'light'); // only two states
}

if (themeToggle) themeToggle.addEventListener('click', cycleTheme);
initTheme();

  // DOM GETTER
  function $(id){ return document.getElementById(id); }
  if ($('year')) $('year').textContent = new Date().getFullYear();

  // ELEMENTS
  var appHeader = $('appHeader');
  var appMain   = $('appMain');
  var appFooter = $('appFooter');

  var inputsDiv     = $('inputs');
  var currencySel   = $('currency');
  var compoundSel   = $('compound');
  var interestFree  = $('interestFree');
  var currencyBadge = $('currencyBadge');

  var preparedByInp    = $('preparedBy');
  var customerNameInp  = $('customerName');
  var customerPhoneInp = $('customerPhone');
  var customerEmailInp = $('customerEmail');
  var propertyNameInp  = $('propertyName');
  var propertyBlockInp = $('propertyBlock');
  var propertyUnitInp  = $('propertyUnit');
  var propertyTypeInp  = $('propertyType');

  var termInp = $('term');

  var metaDate     = $('metaDate');
  var metaCustomer = $('metaCustomer');
  var metaProperty = $('metaProperty');
  var metaPrepared = $('metaPrepared');

  var sbSale   = $('sbSale');
  var sbDown   = $('sbDown');
  var sbBalance= $('sbBalance');
  var sbBalancePlusInterest = $('sbBalancePlusInterest');
  var sbTotalBurden = $('sbTotalBurden');

  var primaryValue = $('primaryValue');
  var loanAmountEl = $('loanAmount');
  var totalPaid    = $('totalPaid');
  var payoffDate   = $('payoffDate');
  var summary      = $('summary');

  var scheduleWrap = $('scheduleWrap');
  var scheduleBody = $('schedule');

  var exportBtn      = $('exportBtn');
  var printBtn       = $('printBtn');
  var calcBtn        = $('calcBtn');
  var resetBtn       = $('resetBtn');

  // HELPERS
  var sym = { GBP:'£', EUR:'€', USD:'$' };
  function fmt(v, cur){
    if (!isFinite(v)) return '—';
    var s = sym[cur] || '';
    return s + Number(v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
  }
  function todayStr(){ return new Date().toLocaleDateString(); }
  function getSymbol(){ return sym[currencySel && currencySel.value] || ''; }

  // RENDER INPUTS (now ONLY the three money/interest fields)
  function renderFields(){
    if (!inputsDiv) return;
    inputsDiv.innerHTML =
      '<div class="field prefix-wrap">' +
        '<label for="salePrice">Satış Fiyatı</label>' +
        '<span class="prefix" id="symSale">'+getSymbol()+'</span>' +
        '<input id="salePrice" type="number" step="0.01" placeholder="örn. 75.000" />' +
      '</div>' +
      '<div class="field prefix-wrap">' +
        '<label for="down">Peşinat</label>' +
        '<span class="prefix" id="symDown">'+getSymbol()+'</span>' +
        '<input id="down" type="number" step="0.01" placeholder="örn. 20.000" />' +
      '</div>' +
      '<div class="field">' +
        '<label for="apr">Yıllık Faiz Oranı (%)</label>' +
        '<input id="apr" type="number" step="0.01" placeholder="örn. 3.75" '+(interestFree && interestFree.checked ? 'disabled' : '')+'/>' +
      '</div>';

    if (scheduleWrap) scheduleWrap.style.display='none';
    var clears = [primaryValue, loanAmountEl, totalPaid, payoffDate, sbSale, sbDown, sbBalance, sbBalancePlusInterest, sbTotalBurden];
    for (var i=0;i<clears.length;i++){ if (clears[i]) clears[i].textContent = '—'; }
    if (summary) summary.textContent = 'Değerleri girip “Hesapla”ya basın.';
    if (metaDate) metaDate.textContent = todayStr();

    if (preparedByInp) {
      var pb = '';
      try { pb = localStorage.getItem('preparedBy') || preparedByInp.value || ''; } catch(e){}
      preparedByInp.value = pb;
      if (metaPrepared) metaPrepared.textContent = pb || '—';
    }
  }

  function updateCurrencyUI(){
    if (currencyBadge) currencyBadge.textContent = 'Para Birimi: ' + (currencySel ? currencySel.value : '') + ' ('+getSymbol()+')';
    var sale = $('symSale'), down = $('symDown');
    if (sale) sale.textContent = getSymbol();
    if (down) down.textContent = getSymbol();
  }

  function collectValues(){
    var salePriceEl = $('salePrice');
    var downEl = $('down');
    var aprEl = $('apr');
    var termEl = termInp;
    var salePrice = Number(salePriceEl && salePriceEl.value ? salePriceEl.value : 0);
    var down = Number(downEl && downEl.value ? downEl.value : 0);
    var apr  = (interestFree && interestFree.checked) ? 0 : Number(aprEl && aprEl.value ? aprEl.value : 0);
    var term = Number(termEl && termEl.value ? termEl.value : 0);
    return { salePrice: salePrice, down: down, apr: apr, term: term };
  }

  function buildSchedule(P, r, n, pay){
    var bal = P;
    var rows = [];
    for(var k=1;k<=n;k++){
      var interest = r===0 ? 0 : bal*r;
      var principal = Math.min(bal, pay - interest);
      bal = Math.max(0, bal - principal);
      rows.push({k:k, pay:pay, bal:bal});
      if (bal<=0) break;
    }
    return rows;
  }

  function toCSV(rows, meta){
    var top =
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

    var header = 'Period,Payment,Balance\n';
    var lines = [];
    for (var i=0;i<rows.length;i++){
      var r = rows[i];
      lines.push([r.k, r.pay.toFixed(2), r.bal.toFixed(2)].join(','));
    }
    return top + header + lines.join('\n');
  }

  function syncMeta(){
    if (metaDate) metaDate.textContent = todayStr();
    if (metaCustomer) metaCustomer.textContent = (customerNameInp && customerNameInp.value ? customerNameInp.value.trim() : '') || '—';
    var bits = [];
    if (propertyNameInp && propertyNameInp.value) bits.push(propertyNameInp.value);
    if (propertyBlockInp && propertyBlockInp.value) bits.push('Blok ' + propertyBlockInp.value);
    if (propertyUnitInp && propertyUnitInp.value) bits.push('No ' + propertyUnitInp.value);
    if (propertyTypeInp && propertyTypeInp.value) bits.push(propertyTypeInp.value);
    if (metaProperty) metaProperty.textContent = bits.length ? bits.join(' • ') : '—';
    if (metaPrepared) metaPrepared.textContent = (preparedByInp && preparedByInp.value ? preparedByInp.value.trim() : '') || '—';
  }

  function calculate(){
    var cur = currencySel ? currencySel.value : 'GBP';
    var vals = collectValues();
    var sale = Number(vals.salePrice) || 0;
    var downPay = Number(vals.down) || 0;
    var P = Math.max(0, sale - downPay);
    var n = Number(vals.term || 0);
    var m = Number(compoundSel && compoundSel.value ? compoundSel.value : 12);
    if (!m || m <= 0) m = 12;
    var r = Number(vals.apr || 0) / 100 / m;

    if(n<=0){
      if (summary) summary.textContent = 'Lütfen geçerli vade (ay) girin.';
      return;
    }

    var payment = (r===0) ? P/n : P * r / (1 - Math.pow(1+r,-n));
    var rows = buildSchedule(P, r, n, payment);

    var totalInstallments = 0;
    for (var i=0;i<rows.length;i++){ totalInstallments += rows[i].pay; }
    var totalInterestBurden = (downPay + totalInstallments) - sale;

    if (sbSale) sbSale.textContent = fmt(sale, cur);
    if (sbDown) sbDown.textContent = fmt(downPay, cur);
    if (sbBalance) sbBalance.textContent = fmt(P, cur);
    if (sbBalancePlusInterest) sbBalancePlusInterest.textContent = fmt(totalInstallments, cur);
    if (sbTotalBurden) sbTotalBurden.textContent = fmt(totalInterestBurden, cur);

    if (primaryValue) primaryValue.textContent = fmt(payment,cur);
    if (loanAmountEl) loanAmountEl.textContent = fmt(P,cur);
    if (totalPaid) totalPaid.textContent = fmt(totalInstallments,cur);

    var end = new Date(); end.setMonth(end.getMonth() + rows.length);
    if (payoffDate) payoffDate.textContent = end.toLocaleDateString();

    if (summary) summary.textContent =
      'Satış '+fmt(sale,cur)+', Peşinat '+fmt(downPay,cur)+' → Kredi '+fmt(P,cur)+', '+rows.length+' ay, APR ~ '+(r*m*100).toFixed(3)+'%.';

    if (scheduleBody){
      var html = '';
      for (var j=0;j<rows.length;j++){
        var rw = rows[j];
        html += '<tr><td>'+rw.k+'</td><td>'+fmt(rw.pay,cur)+'</td><td>'+fmt(rw.bal,cur)+'</td></tr>';
      }
      scheduleBody.innerHTML = html;
    }
    if (scheduleWrap) scheduleWrap.style.display = 'block';

    if (exportBtn) {
      var csv = toCSV(rows, {
        date: (metaDate && metaDate.textContent) || todayStr(),
        preparedBy: (preparedByInp && preparedByInp.value) || '',
        customer: (customerNameInp && customerNameInp.value) || '',
        phone: (customerPhoneInp && customerPhoneInp.value) || '',
        email: (customerEmailInp && customerEmailInp.value) || '',
        property: (propertyNameInp && propertyNameInp.value) || '',
        block: (propertyBlockInp && propertyBlockInp.value) || '',
        unit: (propertyUnitInp && propertyUnitInp.value) || '',
        type: (propertyTypeInp && propertyTypeInp.value) || '',
        currency: cur,
        sale: (sale||0).toFixed(2),
        down: (downPay||0).toFixed(2),
        balance: (P||0).toFixed(2),
        totalInstallments: (totalInstallments||0).toFixed(2),
        totalInterest: (totalInterestBurden||0).toFixed(2)
      });
      exportBtn.dataset.csv = csv;
    }
  }

  // EVENTS
  if (printBtn) printBtn.addEventListener('click', function(){
    var customer = (customerNameInp && customerNameInp.value ? customerNameInp.value : 'Musteri').trim().replace(/\s+/g,'_');
    var property = (propertyNameInp && propertyNameInp.value ? propertyNameInp.value : 'Proje').trim().replace(/\s+/g,'_');
    var date = new Date().toISOString().slice(0,10);
    var prevTitle = document.title;
    document.title = 'Noyanlar_'+customer+'_'+property+'_'+date;
    window.print();
    setTimeout(function(){ document.title = prevTitle; }, 300);
  });

  if (currencySel) currencySel.addEventListener('change', function(){
    try { localStorage.setItem('currency', currencySel.value); } catch(e){}
    updateCurrencyUI();
  });
  if (compoundSel) compoundSel.addEventListener('change', function(){});

  if (interestFree) interestFree.addEventListener('change', function(){
    var aprInput = $('apr');
    if (interestFree.checked){ if (aprInput) { aprInput.value = 0; aprInput.disabled = true; } }
    else { if (aprInput) aprInput.disabled = false; }
  });

  if (preparedByInp) preparedByInp.addEventListener('input', function(){
    try { localStorage.setItem('preparedBy', preparedByInp.value||''); } catch(e){}
    if (metaPrepared) metaPrepared.textContent = (preparedByInp.value || '').trim() || '—';
  });

  var metaInputs = [customerNameInp, customerPhoneInp, customerEmailInp,
    propertyNameInp, propertyBlockInp, propertyUnitInp, propertyTypeInp, termInp];
  for (var k=0;k<metaInputs.length;k++){
    (function(inp){
      if (!inp) return;
      inp.addEventListener('input', syncMeta);
    })(metaInputs[k]);
  }

  if (calcBtn) calcBtn.addEventListener('click', function(){ syncMeta(); calculate(); });

  if (resetBtn) resetBtn.addEventListener('click', function(){
    var arr = [customerNameInp, customerPhoneInp, customerEmailInp,
      propertyNameInp, propertyBlockInp, propertyUnitInp, propertyTypeInp, termInp];
    for (var i=0;i<arr.length;i++){ if (arr[i]) arr[i].value=''; }
    syncMeta();
    renderFields();
  });

  if (exportBtn) exportBtn.addEventListener('click', function(){
    var csv = exportBtn.dataset.csv || '';
    if(!csv){ alert('Bu ekran için dışa aktarılacak amortisman yok.'); return; }
    var blob = new Blob([csv], {type:'text/csv'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'odeme_plani.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  // INIT — app always visible
  (function init(){
    if (appHeader) appHeader.classList.remove('hidden');
    if (appMain)   appMain.classList.remove('hidden');
    if (appFooter) appFooter.classList.remove('hidden');

    var savedCur = null;
    try { savedCur = localStorage.getItem('currency'); } catch(e){}
    if (savedCur && sym[savedCur]) currencySel.value = savedCur;

    renderFields();
    updateCurrencyUI();
    syncMeta();
  })();
})();