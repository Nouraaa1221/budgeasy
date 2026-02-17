
(function(){
  // Utils
  const $ = sel => document.querySelector(sel);
  const $all = sel => Array.from(document.querySelectorAll(sel));
  const LS_KEY = 'budgeasy_v1';


  const DEFAULT_CATS = [
    { id: 'c1', name: 'Nourriture', icon: 'icons/food.svg' },
    { id: 'c2', name: 'Transport', icon: 'icons/transport.svg' },
    { id: 'c3', name: 'Logement', icon: 'icons/housing.svg' },
    { id: 'c4', name: 'Abonnements', icon: 'icons/subscriptions.svg' },
    { id: 'c5', name: 'Études', icon: 'icons/education.svg' },
    { id: 'c6', name: 'Autres', icon: 'icons/other.svg' }
  ];

  
  let state = {
    categories: [],
    transactions: [],
    prefs: { currency: 'EUR', hideAmounts: false }
  };

  function loadState(){
    try{
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return initDefaults();
      state = JSON.parse(raw);
      // ensure categories exist
      if(!state.categories || !state.categories.length) state.categories = DEFAULT_CATS;
    }catch(e){ console.error('load error', e); initDefaults(); }
  }
  function saveState(){ localStorage.setItem(LS_KEY, JSON.stringify(state)); }

  function initDefaults(){ state = { categories: DEFAULT_CATS, transactions: [], prefs:{currency:'EUR', hideAmounts:false} }; saveState(); }


  function formatMoney(n){
    const val = Number(n || 0).toFixed(2);
    return new Intl.NumberFormat('fr-FR',{style:'currency',currency:state.prefs.currency}).format(val);
  }

  function renderCategoriesSelect(){
    const sel = $('#categorySelect');
    sel.innerHTML = '';
    state.categories.forEach(c => {
      const opt = document.createElement('option'); opt.value = c.id; opt.textContent = c.name; sel.appendChild(opt);
    });
  }

  function renderTransactions(){
    const list = $('#tx-list'); list.innerHTML = '';
    if (!state.transactions.length){ $('#empty-transactions').style.display='block'; return; } else { $('#empty-transactions').style.display='none'; }
    state.transactions.slice().reverse().forEach(tx => {
      const div = document.createElement('div'); div.className='tx-item';
      const left = document.createElement('div'); left.innerHTML = `<strong>${(tx.type==='expense'?'- ':'+ ')}${formatMoney(tx.amount)}</strong><div style="font-size:12px;color:var(--muted)">${tx.note||''} • ${new Date(tx.date).toLocaleDateString()}</div>`;
      const right = document.createElement('div');
      const cat = state.categories.find(c=>c.id===tx.category_id);
      right.innerHTML = `${cat?cat.name:'Sans catégorie'}`;
      div.appendChild(left); div.appendChild(right);
      list.appendChild(div);
    });
  }

  function computeSummary(){
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const txs = state.transactions.filter(t => new Date(t.date) >= monthStart);
    const expenses = txs.filter(t => t.type==='expense').reduce((s,t)=>s+Number(t.amount),0);
    const incomes = txs.filter(t => t.type==='income').reduce((s,t)=>s+Number(t.amount),0);
    $('#expense-month').textContent = formatMoney(expenses);
    $('#income-month').textContent = formatMoney(incomes);
    $('.big-amount') && ($('.big-amount').textContent = formatMoney(incomes - expenses));
  }


  let chartCat=null, chartTrend=null;
  function renderCharts(){
   
    const ctx = document.getElementById('chartCategories').getContext('2d');
    const sums = {};
    state.categories.forEach(c=>sums[c.name]=0);
    state.transactions.forEach(t=>{
      const cat = state.categories.find(c=>c.id===t.category_id);
      const name = cat?cat.name:'Autres';
      if (t.type==='expense') sums[name] = (sums[name]||0) + Number(t.amount);
    });
    const labels = Object.keys(sums);
    const data = labels.map(l=>sums[l]);
    if(chartCat) chartCat.destroy();
    chartCat = new Chart(ctx, { type:'doughnut', data:{labels, datasets:[{data}]}, options:{plugins:{legend:{position:'bottom'}}} });


    const ctx2 = document.getElementById('chartTrend').getContext('2d');
    const days = 30; const labels2 = []; const values2 = Array(days).fill(0);
    for(let i=days-1;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); labels2.push(d.toLocaleDateString()); }
    state.transactions.forEach(t=>{ if(t.type==='expense'){ const d=new Date(t.date); const diff = Math.floor((new Date()-d)/(1000*60*60*24)); if(diff<30 && diff>=0) values2[30-diff-1]+=Number(t.amount); } });
    if(chartTrend) chartTrend.destroy();
    chartTrend = new Chart(ctx2,{type:'line',data:{labels:labels2,datasets:[{label:'Dépenses',data:values2,fill:true}]},options:{plugins:{legend:{display:false}}}});
  }

 
  function addTransaction(tx){
    tx.id = 't' + Math.random().toString(36).slice(2,9);
    state.transactions.push(tx); saveState(); syncIfOnline(); renderApp();
  }


  async function syncIfOnline(){
   
    if (!navigator.onLine) return;
  }


  function bind(){
    $('#btnAddTx').addEventListener('click', ()=>openModal());
    $('#empty-add').addEventListener('click', ()=>openModal());
    $('#btnCancel').addEventListener('click', closeModal);
    $('#txForm').addEventListener('submit', (e)=>{
      e.preventDefault(); const fd = new FormData(e.target);
      const tx = { type: fd.get('type'), amount: Number(fd.get('amount')), date: fd.get('date') || new Date().toISOString(), category_id: fd.get('category_id'), note: fd.get('note') };
      if (!tx.amount || tx.amount <= 0) return alert('Montant invalide');
      addTransaction(tx); closeModal();
    });
    $('#btnDemo').addEventListener('click', ()=>{
      // seed demo data
      state.transactions.push({id:'t_demo1', type:'expense', amount:12.5, date:new Date().toISOString(), category_id:'c1', note:'Déjeuner'});
      state.transactions.push({id:'t_demo2', type:'expense', amount:5.2, date:new Date().toISOString(), category_id:'c2', note:'Bus'});
      saveState(); renderApp();
    });
    $('#btnToggleView').addEventListener('click', ()=>{ state.prefs.hideAmounts = !state.prefs.hideAmounts; saveState(); renderApp(); });
  }


  function openModal(){ $('#modalTx').setAttribute('aria-hidden','false'); const today = new Date().toISOString().slice(0,10); $('#modalTx input[name=date]').value = today; }
  function closeModal(){ $('#modalTx').setAttribute('aria-hidden','true'); }


  function renderApp(){ renderCategoriesSelect(); renderTransactions(); computeSummary(); renderCharts(); // hide amounts?
    if(state.prefs.hideAmounts) $all('.big-amount, .tx-item strong').forEach(el=>el && (el.textContent='•••'));
  }

 
  loadState(); bind(); renderApp();
})();
