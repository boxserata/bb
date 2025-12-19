import { Utils } from './utils.js';

export const Models = {
  partner(data={}) {
    return {
      id: data.id || Utils.uuid(),
      name: data.name || '',
      notes: data.notes || '',
      openingCapital: Number(data.openingCapital||0),
      createdAt: data.createdAt || new Date().toISOString(),
      isActive: data.isActive ?? true
    };
  },
  capitalEvent(data={}) {
    return {
      id: data.id || Utils.uuid(),
      partnerId: data.partnerId,
      type: data.type || 'invest',
      amount: Number(data.amount||0),
      date: data.date || Utils.formatDate(),
      note: data.note || ''
    };
  },
  product(data={}) {
    return {
      id: data.id || Utils.uuid(),
      sku: data.sku || '',
      name: data.name || '',
      category: data.category || 'سایر',
      brand: data.brand || '',
      unit: data.unit || 'عدد',
      barcode: data.barcode || '',
      sellPriceDefault: Number(data.sellPriceDefault||0),
      minStock: Number(data.minStock||0),
      location: data.location || '',
      isActive: data.isActive ?? true,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString()
    };
  },
  inventoryLot(data={}) {
    return {
      id: data.id || Utils.uuid(),
      productId: data.productId,
      avgCost: Number(data.avgCost||0),
      qtyOnHand: Number(data.qtyOnHand||0),
      updatedAt: data.updatedAt || new Date().toISOString()
    };
  },
  customer(data={}) {
    return {
      id: data.id || Utils.uuid(),
      name: data.name || '',
      phone: data.phone || '',
      notes: data.notes || '',
      balance: Number(data.balance||0),
      createdAt: data.createdAt || new Date().toISOString()
    };
  },
  supplier(data={}) {
    return {
      id: data.id || Utils.uuid(),
      name: data.name || '',
      phone: data.phone || '',
      notes: data.notes || '',
      balance: Number(data.balance||0),
      createdAt: data.createdAt || new Date().toISOString()
    };
  },
  invoice(data={}) {
    return {
      id: data.id || Utils.uuid(),
      type: data.type || 'sale',
      number: data.number || 1,
      date: data.date || Utils.formatDate(),
      partyType: data.partyType || 'cash',
      partyId: data.partyId || null,
      items: data.items || [],
      subtotal: Number(data.subtotal||0),
      discountTotal: Number(data.discountTotal||0),
      taxEnabled: data.taxEnabled ?? false,
      taxPercent: Number(data.taxPercent||0),
      taxAmount: Number(data.taxAmount||0),
      shipping: Number(data.shipping||0),
      grandTotal: Number(data.grandTotal||0),
      payment: data.payment || [],
      paidAmount: Number(data.paidAmount||0),
      remainingAmount: Number(data.remainingAmount||0),
      status: data.status || 'paid',
      note: data.note || '',
      createdByUserId: data.createdByUserId || 'system',
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString()
    };
  },
  cashAccount(data={}) {
    return {
      id: data.id || Utils.uuid(),
      name: data.name || '',
      type: data.type || 'cash',
      balance: Number(data.balance||0)
    };
  },
  ledger(data={}) {
    return {
      id: data.id || Utils.uuid(),
      date: data.date || Utils.formatDate(),
      time: data.time || new Date().toISOString().slice(11,19),
      category: data.category || 'invoice',
      amount: Number(data.amount||0),
      fromAccountId: data.fromAccountId || null,
      toAccountId: data.toAccountId || null,
      partyType: data.partyType || null,
      partyId: data.partyId || null,
      description: data.description || '',
      scope: data.scope || 'shared',
      partnerId: data.partnerId || null,
      link: data.link || null,
      createdByUserId: data.createdByUserId || 'system',
      createdAt: data.createdAt || new Date().toISOString()
    };
  },
  audit(data={}) {
    return {
      id: data.id || Utils.uuid(),
      dateTime: data.dateTime || new Date().toISOString(),
      userId: data.userId || 'system',
      action: data.action || 'create',
      entity: data.entity || 'settings',
      entityId: data.entityId || '',
      summary: data.summary || ''
    };
  },
  settings(data={}) {
    return {
      id: 'settings',
      currency: data.currency || 'تومان',
      taxEnabled: data.taxEnabled ?? false,
      taxPercent: Number(data.taxPercent||9),
      inventoryMethod: data.inventoryMethod || 'AVG',
      allowNegativeStock: data.allowNegativeStock ?? false,
      theme: data.theme || 'light',
      shopName: data.shopName || 'فروشگاه قطعات الکترونیک',
      shopPhone: data.shopPhone || '021000000',
      shopAddress: data.shopAddress || 'تهران',
      invoicePrefixSale: data.invoicePrefixSale || 'S-',
      invoicePrefixPurchase: data.invoicePrefixPurchase || 'P-',
      roundingMode: data.roundingMode || 0,
      backupVersion: data.backupVersion || 1,
      security: data.security || { pinHash:null, forceChangePin:true },
      users: data.users || [ { id:'admin', role:'admin', name:'مدیر', pinHash:null, forceChange:true } ]
    };
  },
  validateProduct(product, existing=[]) {
    const errors = [];
    if(!product.name) errors.push('نام کالا الزامی است');
    if(!product.sku) errors.push('کد کالا الزامی است');
    if(existing.find(p => p.sku === product.sku && p.id !== product.id)) errors.push('کد کالا تکراری است');
    if(product.sellPriceDefault < 0) errors.push('قیمت منفی مجاز نیست');
    return errors;
  },
  validateInvoice(inv) {
    const errors = [];
    if(!inv.items || !inv.items.length) errors.push('حداقل یک ردیف کالا لازم است');
    if(inv.items.some(i => i.qty <= 0)) errors.push('تعداد هر ردیف باید مثبت باشد');
    if(inv.grandTotal < 0) errors.push('مبلغ کل معتبر نیست');
    return errors;
  }
};
