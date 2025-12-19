import { DB } from './db.js';
import { Models } from './models.js';
import { Utils } from './utils.js';
import { Calc } from './calc.js';
import { UI } from './ui.js';

const state = {
  db:null,
  settings:null,
  partners:[],
  capitalEvents:[],
  products:[],
  inventoryLots:[],
  customers:[],
  suppliers:[],
  invoices:[],
  cashAccounts:[],
  ledger:[],
  audit:[],
  nav:'dashboard',
  session:{ user:null, lastActivity: Date.now() }
};

const navItems = [
  { key:'dashboard', label:'داشبورد' },
  { key:'products', label:'کالاها' },
  { key:'sales', label:'فروش/خرید' },
  { key:'people', label:'مشتریان/تامین‌کنندگان' },
  { key:'accounts', label:'صندوق و هزینه' },
  { key:'reports', label:'گزارش‌ها' },
  { key:'settings', label:'تنظیمات' },
  { key:'help', label:'راهنما' }
];

async function init() {
  state.db = await DB.init();
  await loadAll();
  attachGlobalEvents();
  render();
}

async function loadAll() {
  state.settings = await loadSettings();
  state.partners = await state.db.getAll('partners');
  state.capitalEvents = await state.db.getAll('capitalEvents');
  state.products = await state.db.getAll('products');
  state.inventoryLots = await state.db.getAll('inventoryLots');
  state.customers = await state.db.getAll('customers');
  state.suppliers = await state.db.getAll('suppliers');
  state.invoices = await state.db.getAll('invoices');
  state.cashAccounts = await state.db.getAll('cashAccounts');
  state.ledger = await state.db.getAll('ledgerTransactions');
  state.audit = await state.db.getAll('auditLog');

  if(!state.products.length) await seed();
  if(!state.settings.security.pinHash) {
    const defaultHash = await Utils.sha256('1234');
    state.settings.security.pinHash = defaultHash;
    await state.db.put('settings', state.settings);
  }
}

async function loadSettings() {
  const stored = await state.db.get('settings','settings');
  if(stored) return stored;
  const defaults = Models.settings();
  await state.db.put('settings', defaults);
  return defaults;
}

async function seed() {
  const partners = [
    Models.partner({ name:'شریک اول', openingCapital:30000000 }),
    Models.partner({ name:'شریک دوم', openingCapital:20000000 }),
    Models.partner({ name:'شریک سوم', openingCapital:10000000 })
  ];
  const products = [
    { sku:'USB-01', name:'کابل USB', category:'کابل', sellPriceDefault:80000, minStock:5 },
    { sku:'ADP-12V', name:'آداپتور ۱۲V 2A', category:'آداپتور', sellPriceDefault:220000, minStock:3 },
    { sku:'SOLDER', name:'هویه 60W', category:'ابزار', sellPriceDefault:550000 },
    { sku:'TIN-01', name:'قلع لحیم 0.8', category:'مصرفی', sellPriceDefault:120000 },
    { sku:'LED-RED', name:'بسته LED قرمز', category:'LED', sellPriceDefault:70000 },
    { sku:'RES-100', name:'بسته مقاومت', category:'مقاومت', sellPriceDefault:40000 },
    { sku:'BAT-18650', name:'باتری 18650', category:'باتری', sellPriceDefault:160000 },
    { sku:'BRD-001', name:'بردبرد متوسط', category:'برد', sellPriceDefault:90000 }
  ].map(p => Models.product(p));
  const lots = products.map(p => Models.inventoryLot({ productId:p.id, avgCost:p.sellPriceDefault*0.6, qtyOnHand:10 }));
  const customers = [ Models.customer({ name:'مشتری ۱', phone:'09120000000' }), Models.customer({ name:'مشتری ۲', phone:'09120000001' }) ];
  const suppliers = [ Models.supplier({ name:'تامین‌کننده ۱', phone:'021777777' }), Models.supplier({ name:'تامین‌کننده ۲', phone:'021888888' }) ];
  const cash = [ Models.cashAccount({ name:'صندوق اصلی', type:'cash', balance:5000000 }), Models.cashAccount({ name:'حساب بانکی', type:'bank', balance:3000000 }) ];
  const invoicePurchase = Models.invoice({ type:'purchase', number:1, items:[ { productId:products[0].id, skuSnapshot:products[0].sku, nameSnapshot:products[0].name, qty:5, unit:products[0].unit, unitPrice:60000, discount:0, lineTotal:300000 } ], subtotal:300000, grandTotal:300000, paidAmount:300000, status:'paid', partyType:'supplier', partyId:suppliers[0].id });
  const invoiceSale = Models.invoice({ type:'sale', number:1, items:[ { productId:products[1].id, skuSnapshot:products[1].sku, nameSnapshot:products[1].name, qty:2, unit:products[1].unit, unitPrice:220000, discount:0, lineTotal:440000, costAtSale: Calc.costAtSale(lots, products[1].id, 2) } ], subtotal:440000, grandTotal:440000, paidAmount:440000, status:'paid', partyType:'customer', partyId:customers[0].id });
  await state.db.bulkAdd('partners', partners);
  await state.db.bulkAdd('products', products);
  await state.db.bulkAdd('inventoryLots', lots);
  await state.db.bulkAdd('customers', customers);
  await state.db.bulkAdd('suppliers', suppliers);
  await state.db.bulkAdd('cashAccounts', cash);
  await state.db.bulkAdd('invoices', [invoicePurchase, invoiceSale]);
  await state.db.bulkAdd('ledgerTransactions', [
    Models.ledger({ category:'invoice', amount:300000, toAccountId:cash[0].id, description:'خرید اولیه', link:{type:'invoice', invoiceId:invoicePurchase.id} }),
    Models.ledger({ category:'invoice', amount:440000, toAccountId:cash[0].id, description:'فروش اولیه', link:{type:'invoice', invoiceId:invoiceSale.id} })
  ]);

  state.partners = partners;
  state.products = products;
  state.inventoryLots = lots;
  state.customers = customers;
  state.suppliers = suppliers;
  state.cashAccounts = cash;
  state.invoices = [invoicePurchase, invoiceSale];
  state.ledger = await state.db.getAll('ledgerTransactions');
}

function attachGlobalEvents() {
  document.getElementById('themeToggle').onclick = toggleTheme;
  document.getElementById('lockBtn').onclick = logout;
  document.addEventListener('click', resetIdle);
  document.addEventListener('keydown', resetIdle);
  setInterval(checkIdle, 30*1000);
}

function resetIdle() { state.session.lastActivity = Date.now(); }
function checkIdle() { if(state.session.user && Date.now() - state.session.lastActivity > 10*60*1000) logout(); }

function logout() {
  state.session.user = null;
  document.getElementById('userBadge').textContent = '';
  render();
}

async function login(pin) {
  const hash = await Utils.sha256(pin);
  const user = state.settings.users.find(u => u.pinHash === hash || (!u.pinHash && pin === '1234' && u.id==='admin'));
  if(user) {
    state.session.user = user;
    state.session.lastActivity = Date.now();
    document.getElementById('userBadge').textContent = `${user.name} / ${Utils.humanRole(user.role)}`;
    if(user.forceChange) showChangePin();
    render();
  } else {
    UI.showToast('رمز نادرست است', 'error');
  }
}

function requireAuth(roles=['admin','cashier','viewer']) {
  return state.session.user && roles.includes(state.session.user.role);
}

function toggleTheme() {
  const newTheme = state.settings.theme === 'light' ? 'dark' : 'light';
  state.settings.theme = newTheme;
  document.body.classList.toggle('theme-dark', newTheme === 'dark');
  document.body.classList.toggle('theme-light', newTheme === 'light');
  state.db.put('settings', state.settings);
}

function render() {
  document.body.classList.toggle('theme-dark', state.settings?.theme === 'dark');
  document.body.classList.toggle('theme-light', state.settings?.theme !== 'dark');
  UI.sidebar(navItems, state.nav, (key)=>{ state.nav = key; render(); });
  const view = document.getElementById('view');
  if(!state.session.user) { view.innerHTML = loginView(); return; }
  document.getElementById('userBadge').textContent = `${state.session.user.name} / ${Utils.humanRole(state.session.user.role)}`;
  switch(state.nav){
    case 'dashboard': view.innerHTML = dashboardView(); drawChart(); break;
    case 'products': view.innerHTML = productsView(); bindProducts(); break;
    case 'sales': view.innerHTML = salesView(); bindSales(); break;
    case 'people': view.innerHTML = peopleView(); bindPeople(); break;
    case 'accounts': view.innerHTML = accountsView(); bindAccounts(); break;
    case 'reports': view.innerHTML = reportsView(); break;
    case 'settings': view.innerHTML = settingsView(); bindSettings(); break;
    case 'help': view.innerHTML = helpView(); break;
  }
}

function loginView() {
  return `
    <div class="card" style="max-width:420px;margin:40px auto;">
      <h3>ورود</h3>
      <p>برای ورود رمز عبور مدیر یا نقش خود را وارد کنید. رمز پیش‌فرض: 1234</p>
      <form id="loginForm">
        <label>رمز</label>
        <input type="password" name="pin" required>
        <button style="margin-top:12px;width:100%;">ورود</button>
      </form>
    </div>`;
}

function dashboardView() {
  const today = Utils.formatDate();
  const salesToday = state.invoices.filter(i => i.type==='sale' && i.date===today);
  const revenueToday = Utils.sum(salesToday, 'grandTotal');
  const profitToday = Utils.sum(salesToday.map(Calc.profit));
  const lowStock = state.inventoryLots.filter(l => {
    const p = state.products.find(pr => pr.id===l.productId);
    return p && l.qtyOnHand <= p.minStock;
  });
  const topCustomers = [...state.customers].sort((a,b)=>b.balance-a.balance).slice(0,5);
  const topSuppliers = [...state.suppliers].sort((a,b)=>b.balance-a.balance).slice(0,5);
  return `
    <div class="grid grid-2">
      <div class="card"><h3>فروش امروز</h3><div class="big">${Utils.formatMoney(revenueToday,state.settings.currency)}</div></div>
      <div class="card"><h3>سود امروز</h3><div class="big">${Utils.formatMoney(profitToday,state.settings.currency)}</div></div>
    </div>
    <div class="card">
      <h3>کالاهای کم‌موجودی</h3>
      ${lowStock.length?UI.table(['کالا','موجودی','حداقل'], lowStock.map(l=>{
        const p = state.products.find(pr=>pr.id===l.productId);
        return [p?.name||'', l.qtyOnHand, p?.minStock||0];
      })):'موردی نیست'}
    </div>
    <div class="grid grid-2">
      <div class="card"><h3>بدهی مشتریان</h3>${UI.table(['مشتری','مانده'], topCustomers.map(c=>[c.name, Utils.formatMoney(c.balance)]))}</div>
      <div class="card"><h3>بدهی به تامین‌کنندگان</h3>${UI.table(['تامین‌کننده','مانده'], topSuppliers.map(s=>[s.name, Utils.formatMoney(s.balance)]))}</div>
    </div>
    <div class="card">
      <h3>نمودار فروش/سود ماهانه</h3>
      <canvas id="chart" height="200"></canvas>
    </div>
  `;
}

function drawChart() {
  const canvas = document.getElementById('chart');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const months = Array.from({length:6}).map((_,i)=>{
    const d = new Date();
    d.setMonth(d.getMonth()-i);
    const key = d.toISOString().slice(0,7);
    const sales = state.invoices.filter(inv=>inv.type==='sale' && inv.date.startsWith(key));
    const revenue = Utils.sum(sales, 'grandTotal');
    const profit = Utils.sum(sales.map(Calc.profit));
    return { label:key, revenue, profit };
  }).reverse();
  const max = Math.max(...months.map(m=>m.revenue),1);
  const w = canvas.width;
  const h = canvas.height;
  months.forEach((m,idx)=>{
    const x = (idx+1) * (w/(months.length+1));
    const revHeight = (m.revenue/max)*(h-30);
    const profHeight = (m.profit/max)*(h-30);
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(x-16, h-revHeight, 12, revHeight);
    ctx.fillStyle = '#16a34a';
    ctx.fillRect(x+4, h-profHeight, 12, profHeight);
    ctx.fillStyle = state.settings.theme==='dark'?'#e5e7eb':'#111827';
    ctx.font = '10px sans-serif';
    ctx.fillText(m.label.slice(5), x-10, h-4);
  });
}

function productsView() {
  const rows = state.products.map(p => {
    const lot = state.inventoryLots.find(l=>l.productId===p.id);
    return [p.sku, p.name, p.category, lot?.qtyOnHand||0, Utils.formatMoney(p.sellPriceDefault), `<button data-id="${p.id}" class="ghost edit-product">ویرایش</button>`];
  });
  return `
    <div class="flex between"><h3>کالاها</h3><button id="addProduct">افزودن کالا</button></div>
    <input type="search" id="productSearch" placeholder="جستجو..." />
    ${UI.table(['کد','نام','دسته','موجودی','قیمت فروش',''], rows)}
  `;
}

function bindProducts() {
  document.getElementById('addProduct').onclick = () => openProductForm();
  document.querySelectorAll('.edit-product').forEach(btn => btn.onclick = () => {
    const p = state.products.find(x=>x.id===btn.dataset.id);
    openProductForm(p);
  });
  const search = document.getElementById('productSearch');
  search.oninput = Utils.debounce(() => {
    const term = search.value.trim();
    const filtered = state.products.filter(p => p.name.includes(term) || p.sku.includes(term));
    const rows = filtered.map(p => {
      const lot = state.inventoryLots.find(l=>l.productId===p.id);
      return [p.sku,p.name,p.category,lot?.qtyOnHand||0,Utils.formatMoney(p.sellPriceDefault),``];
    });
    document.getElementById('view').querySelector('tbody').innerHTML = rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('');
  },200);
}

function openProductForm(product=null) {
  const p = product ? {...product} : Models.product();
  UI.modal(product?'ویرایش کالا':'کالای جدید',`
    <form class="grid">
      <label>کد SKU<input name="sku" value="${p.sku}" required></label>
      <label>نام<input name="name" value="${p.name}" required></label>
      <label>دسته<input name="category" value="${p.category}"></label>
      <label>برند<input name="brand" value="${p.brand}"></label>
      <label>واحد<input name="unit" value="${p.unit}"></label>
      <label>قیمت فروش<input name="sellPriceDefault" type="number" value="${p.sellPriceDefault}"></label>
      <label>حداقل موجودی<input name="minStock" type="number" value="${p.minStock}"></label>
      <label>فعال<select name="isActive"><option value="true" ${p.isActive?'selected':''}>بله</option><option value="false" ${!p.isActive?'selected':''}>خیر</option></select></label>
      <button style="margin-top:12px">ثبت</button>
    </form>
  `, async (data, modal)=>{
    const updated = Models.product({...p, ...data, sellPriceDefault:Number(data.sellPriceDefault), minStock:Number(data.minStock), isActive:data.isActive==='true'});
    const errors = Models.validateProduct(updated, state.products);
    if(errors.length) { UI.showToast(errors.join(' / '), 'error'); return; }
    updated.updatedAt = new Date().toISOString();
    await state.db.put('products', updated);
    if(!state.inventoryLots.find(l=>l.productId===updated.id)) {
      await state.db.put('inventoryLots', Models.inventoryLot({ productId:updated.id, qtyOnHand:0, avgCost:0 }));
    }
    UI.showToast('ذخیره شد','success');
    modal.classList.add('hidden');
    await loadAll();
    render();
  });
}

function salesView() {
  const invoices = state.invoices.slice(-20).reverse();
  const rows = invoices.map(i => [i.type==='sale'?'فروش':i.type==='purchase'?'خرید':'مرجوعی', i.number, i.date, Utils.formatMoney(i.grandTotal), i.status, `<button class="ghost view-invoice" data-id="${i.id}">مشاهده</button>`]);
  return `
    <div class="flex between"><h3>فاکتور جدید</h3><div class="tabs">
      <button data-type="sale" class="secondary tab-invoice">فروش</button>
      <button data-type="purchase" class="ghost tab-invoice">خرید</button>
    </div></div>
    <div id="invoiceForm"></div>
    <div class="card"><h3>آخرین فاکتورها</h3>${UI.table(['نوع','شماره','تاریخ','مبلغ','وضعیت',''], rows)}</div>
  `;
}

function bindSales() {
  document.querySelectorAll('.tab-invoice').forEach(btn => btn.onclick = () => buildInvoiceForm(btn.dataset.type));
  buildInvoiceForm('sale');
  document.querySelectorAll('.view-invoice').forEach(btn => btn.onclick = () => showInvoice(btn.dataset.id));
}

function buildInvoiceForm(type) {
  const container = document.getElementById('invoiceForm');
  const parties = type==='purchase' ? state.suppliers : state.customers;
  container.innerHTML = `
    <div class="card">
      <form id="newInvoice">
        <div class="grid grid-2">
          <label>تاریخ<input type="date" name="date" value="${Utils.formatDate()}"></label>
          <label>${type==='purchase'?'تامین‌کننده':'مشتری'}
            <select name="partyId">
              <option value="">نقدی</option>
              ${parties.map(p=>`<option value="${p.id}">${p.name}</option>`).join('')}
            </select>
          </label>
          <label>کالا
            <select name="productId" id="invoiceProduct">
              ${state.products.filter(p=>p.isActive).map(p=>`<option value="${p.id}">${p.name} (${p.sku})</option>`).join('')}
            </select>
          </label>
          <label>تعداد<input type="number" step="0.01" name="qty" value="1"></label>
          <label>قیمت واحد<input type="number" name="unitPrice" value="${type==='sale'?state.products[0]?.sellPriceDefault||0:0}"></label>
          <label>تخفیف ردیف<input type="number" name="discount" value="0"></label>
        </div>
        <label>روش پرداخت<select name="payment"><option value="cash">نقد</option><option value="card">کارت</option><option value="transfer">انتقال</option></select></label>
        <label>شرح<input name="note"></label>
        <button style="margin-top:12px">ثبت فاکتور ${type==='sale'?'فروش':'خرید'}</button>
      </form>
    </div>`;

  document.getElementById('newInvoice').onsubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    const product = state.products.find(p=>p.id===data.productId);
    const qty = Utils.parseNumber(data.qty);
    const unitPrice = Utils.parseNumber(data.unitPrice || (type==='sale'?product.sellPriceDefault:0));
    const discount = Utils.parseNumber(data.discount);
    const lineTotal = (qty * unitPrice) - discount;
    const subtotal = lineTotal;
    const grandTotal = subtotal;
    const paidAmount = grandTotal;
    const remainingAmount = 0;
    if(type==='sale' && !state.settings.allowNegativeStock) {
      const lot = state.inventoryLots.find(l=>l.productId===product.id);
      if(lot && lot.qtyOnHand < qty) { UI.showToast('موجودی کافی نیست','error'); return; }
    }
    const costAtSale = type==='sale' ? Calc.costAtSale(state.inventoryLots, product.id, qty) : 0;
    const inv = Models.invoice({
      type,
      number: nextNumber(type),
      date: data.date,
      partyType: data.partyId ? (type==='purchase'?'supplier':'customer') : 'cash',
      partyId: data.partyId || null,
      items:[{ productId:product.id, skuSnapshot:product.sku, nameSnapshot:product.name, qty, unit:product.unit, unitPrice, discount, lineTotal, costAtSale }],
      subtotal, grandTotal, discountTotal:discount, paidAmount, remainingAmount, status:'paid', payment:[{method:data.payment, amount:paidAmount}], note:data.note, createdByUserId: state.session.user.id
    });
    const errors = Models.validateInvoice(inv);
    if(errors.length) { UI.showToast(errors.join(' / '),'error'); return; }
    await persistInvoice(inv, type);
    UI.showToast('ثبت شد','success');
    await loadAll();
    render();
  };
}

function nextNumber(type) {
  const invoices = state.invoices.filter(i=>i.type===type);
  const max = invoices.reduce((m,i)=>Math.max(m,i.number||0),0);
  return max+1;
}

async function persistInvoice(inv, type) {
  // inventory
  const productId = inv.items[0].productId;
  const qty = inv.items[0].qty;
  const unitPrice = inv.items[0].unitPrice;
  let lot = state.inventoryLots.find(l=>l.productId===productId);
  if(state.settings.inventoryMethod === 'AVG') {
    lot = Calc.applyAverageCost(state.inventoryLots, productId, type==='purchase'?qty:-qty, unitPrice);
    await state.db.put('inventoryLots', lot);
  }
  // party balance
  if(inv.partyType==='customer') {
    const customer = state.customers.find(c=>c.id===inv.partyId);
    customer.balance += inv.remainingAmount;
    await state.db.put('customers', customer);
  } else if(inv.partyType==='supplier') {
    const supplier = state.suppliers.find(s=>s.id===inv.partyId);
    supplier.balance += inv.remainingAmount;
    await state.db.put('suppliers', supplier);
  }
  // cash account
  if(inv.payment?.length) {
    const account = state.cashAccounts[0];
    account.balance += type==='sale' ? inv.paidAmount : -inv.paidAmount;
    await state.db.put('cashAccounts', account);
  }
  // ledger
  await state.db.put('invoices', inv);
  await state.db.put('ledgerTransactions', Models.ledger({ category:'invoice', amount:inv.grandTotal, toAccountId: state.cashAccounts[0]?.id, description:`${type==='sale'?'فروش':'خرید'} ${inv.number}`, link:{type:'invoice', invoiceId:inv.id}, createdByUserId: state.session.user.id }));
}

function showInvoice(id) {
  const inv = state.invoices.find(i=>i.id===id);
  UI.modal('نمایش فاکتور', `
    <div class="invoice-print">
      <h2>${inv.type==='sale'?'فاکتور فروش':'فاکتور خرید'}</h2>
      <p>شماره: ${inv.number} - تاریخ: ${inv.date}</p>
      ${UI.table(['کالا','تعداد','قیمت','تخفیف','جمع'], inv.items.map(it=>[it.nameSnapshot, it.qty, Utils.formatMoney(it.unitPrice), Utils.formatMoney(it.discount), Utils.formatMoney(it.lineTotal)]))}
      <p>مبلغ کل: ${Utils.formatMoney(inv.grandTotal)}</p>
    </div>
    <button onclick="window.print()">چاپ</button>
  `);
}

function peopleView() {
  const custRows = state.customers.map(c=>[c.name, c.phone, Utils.formatMoney(c.balance), `<button data-id="${c.id}" class="ghost pay-customer">ثبت دریافت</button>`]);
  const supRows = state.suppliers.map(s=>[s.name, s.phone, Utils.formatMoney(s.balance), `<button data-id="${s.id}" class="ghost pay-supplier">ثبت پرداخت</button>`]);
  return `
    <div class="grid grid-2">
      <div class="card"><div class="flex between"><h3>مشتریان</h3><button id="addCustomer">مشتری جدید</button></div>${UI.table(['نام','تلفن','مانده',''], custRows)}</div>
      <div class="card"><div class="flex between"><h3>تامین‌کنندگان</h3><button id="addSupplier">تامین‌کننده جدید</button></div>${UI.table(['نام','تلفن','مانده',''], supRows)}</div>
    </div>`;
}

function bindPeople() {
  document.getElementById('addCustomer').onclick = () => openPartyForm('customer');
  document.getElementById('addSupplier').onclick = () => openPartyForm('supplier');
  document.querySelectorAll('.pay-customer').forEach(btn => btn.onclick = () => openSettlement('customer', btn.dataset.id));
  document.querySelectorAll('.pay-supplier').forEach(btn => btn.onclick = () => openSettlement('supplier', btn.dataset.id));
}

function openPartyForm(type, party=null) {
  const model = type==='customer'?Models.customer:Models.supplier;
  const p = party ? {...party} : model();
  UI.modal(`${type==='customer'?'مشتری':'تامین‌کننده'} جدید`,`
    <form>
      <label>نام<input name="name" value="${p.name}" required></label>
      <label>تلفن<input name="phone" value="${p.phone}"></label>
      <label>یادداشت<textarea name="notes">${p.notes||''}</textarea></label>
      <button style="margin-top:12px">ثبت</button>
    </form>
  `, async (data, modal)=>{
    const merged = model({...p, ...data});
    await state.db.put(type==='customer'?'customers':'suppliers', merged);
    modal.classList.add('hidden');
    await loadAll();
    render();
  });
}

function openSettlement(type, id) {
  const party = (type==='customer'?state.customers:state.suppliers).find(p=>p.id===id);
  UI.modal(type==='customer'?'دریافت از مشتری':'پرداخت به تامین‌کننده',`
    <form>
      <p>مانده فعلی: ${Utils.formatMoney(party.balance)}</p>
      <label>مبلغ<input name="amount" type="number" required></label>
      <label>حساب<select name="account">${state.cashAccounts.map(a=>`<option value="${a.id}">${a.name}</option>`).join('')}</select></label>
      <button style="margin-top:12px">ثبت</button>
    </form>
  `, async (data, modal)=>{
    const amt = Utils.parseNumber(data.amount);
    const account = state.cashAccounts.find(a=>a.id===data.account);
    if(type==='customer') {
      party.balance -= amt;
      account.balance += amt;
    } else {
      party.balance -= amt;
      account.balance -= amt;
    }
    await state.db.put(type==='customer'?'customers':'suppliers', party);
    await state.db.put('cashAccounts', account);
    await state.db.put('ledgerTransactions', Models.ledger({ category:type==='customer'?'receive_from_customer':'pay_to_supplier', amount:amt, toAccountId: type==='customer'?account.id:null, fromAccountId: type==='supplier'?account.id:null, partyType:type, partyId:party.id, description:'تسویه دستی', createdByUserId: state.session.user.id }));
    modal.classList.add('hidden');
    await loadAll();
    render();
  });
}

function accountsView() {
  const rows = state.cashAccounts.map(a=>[a.name, a.type, Utils.formatMoney(a.balance)]);
  return `
    <div class="flex between"><h3>حساب‌ها</h3><button id="addAccount">حساب جدید</button></div>
    ${UI.table(['نام','نوع','موجودی'], rows)}
    <div class="card"><h3>ثبت هزینه/درآمد</h3>
      <form id="expenseForm" class="grid grid-2">
        <label>نوع<select name="kind"><option value="expense">هزینه</option><option value="income">درآمد</option><option value="transfer">انتقال بین حساب</option></select></label>
        <label>مبلغ<input name="amount" type="number" required></label>
        <label>از حساب<select name="from">${state.cashAccounts.map(a=>`<option value="${a.id}">${a.name}</option>`).join('')}</select></label>
        <label>به حساب<select name="to">${state.cashAccounts.map(a=>`<option value="${a.id}">${a.name}</option>`).join('')}</select></label>
        <label>شرح<input name="desc"></label>
        <button style="margin-top:12px">ثبت</button>
      </form>
    </div>`;
}

function bindAccounts() {
  document.getElementById('addAccount').onclick = () => UI.modal('حساب جدید',`
    <form>
      <label>نام<input name="name" required></label>
      <label>نوع<select name="type"><option value="cash">صندوق</option><option value="bank">بانک</option><option value="card">کارت</option></select></label>
      <label>موجودی اولیه<input type="number" name="balance" value="0"></label>
      <button style="margin-top:12px">ثبت</button>
    </form>
  `, async (data, modal)=>{
    const acc = Models.cashAccount({ ...data, balance:Utils.parseNumber(data.balance) });
    await state.db.put('cashAccounts', acc);
    modal.classList.add('hidden');
    await loadAll(); render();
  });
  document.getElementById('expenseForm').onsubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    const amount = Utils.parseNumber(data.amount);
    const from = state.cashAccounts.find(a=>a.id===data.from);
    const to = state.cashAccounts.find(a=>a.id===data.to);
    if(data.kind==='expense') { from.balance -= amount; }
    else if(data.kind==='income') { to.balance += amount; }
    else if(data.kind==='transfer') { from.balance -= amount; to.balance += amount; }
    await state.db.put('cashAccounts', from);
    if(to) await state.db.put('cashAccounts', to);
    await state.db.put('ledgerTransactions', Models.ledger({ category:data.kind, amount, fromAccountId:from.id, toAccountId:to?.id||null, description:data.desc, createdByUserId: state.session.user.id }));
    UI.showToast('ثبت شد','success');
    await loadAll(); render();
  };
}

function reportsView() {
  const totalSales = Utils.sum(state.invoices.filter(i=>i.type==='sale'), 'grandTotal');
  const totalPurchases = Utils.sum(state.invoices.filter(i=>i.type==='purchase'), 'grandTotal');
  const grossProfit = Utils.sum(state.invoices.filter(i=>i.type==='sale').map(Calc.profit));
  const inventoryValue = Utils.sum(state.inventoryLots.map(l=> l.qtyOnHand * l.avgCost ));
  const shares = Calc.partnerShares(state.partners, state.capitalEvents, grossProfit);
  return `
    <div class="grid grid-2">
      <div class="card"><h3>گزارش فروش</h3><p>جمع فروش: ${Utils.formatMoney(totalSales)}</p><p>جمع خرید: ${Utils.formatMoney(totalPurchases)}</p></div>
      <div class="card"><h3>سود/زیان</h3><p>سود ناخالص: ${Utils.formatMoney(grossProfit)}</p><p>ارزش موجودی: ${Utils.formatMoney(inventoryValue)}</p></div>
    </div>
    <div class="card"><h3>سهم شرکا</h3>${UI.table(['شریک','سرمایه موثر','درصد','سهم'], shares.map(s=>[s.name, Utils.formatMoney(s.basis), s.percent.toFixed(1)+'%', Utils.formatMoney(s.share)]))}</div>
    <button id="exportJson">Export JSON</button>
  `;
}

function helpView() {
  return `
    <div class="card">
      <h3>راهنمای سریع</h3>
      <ul>
        <li>فایل را باز کنید و روی index.html دوبار کلیک کنید.</li>
        <li>رمز پیش‌فرض 1234 است؛ پس از ورود از منوی تنظیمات آن را تغییر دهید.</li>
        <li>انبار بر اساس میانگین موزون عمل می‌کند.</li>
        <li>در صورت غیرفعال بودن اینترنت، همه چیز در مرورگر شما ذخیره می‌شود.</li>
      </ul>
    </div>`;
}

function settingsView() {
  const s = state.settings;
  return `
    <div class="card">
      <h3>تنظیمات پایه</h3>
      <form id="settingsForm" class="grid grid-2">
        <label>نام فروشگاه<input name="shopName" value="${s.shopName}"></label>
        <label>تلفن<input name="shopPhone" value="${s.shopPhone}"></label>
        <label>آدرس<textarea name="shopAddress">${s.shopAddress}</textarea></label>
        <label>مالیات فعال<select name="taxEnabled"><option value="true" ${s.taxEnabled?'selected':''}>بله</option><option value="false" ${!s.taxEnabled?'selected':''}>خیر</option></select></label>
        <label>درصد مالیات<input type="number" name="taxPercent" value="${s.taxPercent}"></label>
        <label>روش انبار<select name="inventoryMethod"><option value="AVG" ${s.inventoryMethod==='AVG'?'selected':''}>میانگین موزون</option><option value="FIFO" ${s.inventoryMethod==='FIFO'?'selected':''}>FIFO</option></select></label>
        <label>اجازه موجودی منفی<select name="allowNegativeStock"><option value="true" ${s.allowNegativeStock?'selected':''}>بله</option><option value="false" ${!s.allowNegativeStock?'selected':''}>خیر</option></select></label>
        <label>تم<select name="theme"><option value="light" ${s.theme==='light'?'selected':''}>روشن</option><option value="dark" ${s.theme==='dark'?'selected':''}>تاریک</option></select></label>
        <button style="margin-top:12px">ذخیره</button>
      </form>
    </div>
    <div class="card">
      <h3>امنیت</h3>
      <button id="changePin">تغییر رمز</button>
    </div>`;
}

function bindSettings() {
  document.getElementById('settingsForm').onsubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    Object.assign(state.settings, {
      shopName:data.shopName,
      shopPhone:data.shopPhone,
      shopAddress:data.shopAddress,
      taxEnabled:data.taxEnabled==='true',
      taxPercent:Number(data.taxPercent),
      inventoryMethod:data.inventoryMethod,
      allowNegativeStock:data.allowNegativeStock==='true',
      theme:data.theme
    });
    await state.db.put('settings', state.settings);
    UI.showToast('ذخیره شد','success');
    render();
  };
  document.getElementById('changePin').onclick = showChangePin;
}

function showChangePin() {
  UI.modal('تغییر رمز',`
    <form>
      <label>رمز جدید<input type="password" name="pin" required></label>
      <button style="margin-top:12px">ثبت</button>
    </form>
  `, async (data, modal)=>{
    const hash = await Utils.sha256(data.pin);
    const user = state.settings.users.find(u=>u.id===state.session.user.id);
    user.pinHash = hash;
    user.forceChange = false;
    state.settings.security.pinHash = hash;
    state.settings.security.forceChangePin = false;
    await state.db.put('settings', state.settings);
    modal.classList.add('hidden');
    UI.showToast('رمز تغییر کرد','success');
  });
}

function accountsCsv() {
  const rows = state.invoices.map(i => ({number:i.number, type:i.type, date:i.date, total:i.grandTotal}));
  const csv = ['number,type,date,total', ...rows.map(r=>`${r.number},${r.type},${r.date},${r.total}`)].join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'reports.csv'; a.click();
  URL.revokeObjectURL(url);
}

document.addEventListener('submit', (e)=>{
  if(e.target && e.target.id === 'loginForm') {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    login(data.pin);
  }
});

document.addEventListener('click', (e)=>{
  if(e.target && e.target.id === 'exportJson') {
    const json = JSON.stringify({ settings:state.settings, partners:state.partners, products:state.products, customers:state.customers, suppliers:state.suppliers, invoices:state.invoices, inventoryLots:state.inventoryLots, cashAccounts:state.cashAccounts, ledger:state.ledger }, null, 2);
    const blob = new Blob([json], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='backup.json'; a.click(); URL.revokeObjectURL(url);
  }
});

window.accountsCsv = accountsCsv;
window.print = window.print;

init();
