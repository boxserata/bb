import { Utils } from './utils.js';

export const Calc = {
  applyAverageCost(lots, productId, qtyDelta, unitCost) {
    let lot = lots.find(l => l.productId === productId);
    if(!lot) {
      lot = { id: Utils.uuid(), productId, avgCost: unitCost || 0, qtyOnHand: 0 };
      lots.push(lot);
    }
    const currentQty = Number(lot.qtyOnHand||0);
    if(qtyDelta > 0) {
      // purchase increases qty
      const totalCost = (currentQty * lot.avgCost) + (qtyDelta * unitCost);
      const newQty = currentQty + qtyDelta;
      lot.avgCost = newQty ? totalCost / newQty : lot.avgCost;
      lot.qtyOnHand = newQty;
    } else {
      const newQty = currentQty + qtyDelta; // qtyDelta negative on sale
      lot.qtyOnHand = Math.max(0, newQty);
    }
    lot.updatedAt = new Date().toISOString();
    return lot;
  },
  costAtSale(lots, productId, qty) {
    const lot = lots.find(l => l.productId === productId);
    const avg = lot ? Number(lot.avgCost||0) : 0;
    return avg * qty;
  },
  profit(invoice) {
    const revenue = Utils.sum(invoice.items, 'lineTotal');
    const cost = Utils.sum(invoice.items.map(i => i.costAtSale || 0));
    return revenue - cost;
  },
  partnerShares(partners, capitalEvents, totalProfit) {
    const partnerTotals = partners.map(p => {
      const invest = Utils.sum(capitalEvents.filter(c => c.partnerId===p.id && c.type==='invest'), 'amount');
      const withdraw = Utils.sum(capitalEvents.filter(c => c.partnerId===p.id && c.type==='withdraw'), 'amount');
      const basis = (p.openingCapital || 0) + invest - withdraw;
      return { id:p.id, name:p.name, basis };
    });
    const totalBasis = Utils.sum(partnerTotals, 'basis') || 1;
    return partnerTotals.map(pt => ({ ...pt, percent: (pt.basis/totalBasis)*100, share: (pt.basis/totalBasis)*totalProfit }));
  }
};
