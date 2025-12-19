export const Utils = {
  uuid() {
    return crypto.randomUUID ? crypto.randomUUID() : 'xxxx-4xxx-yxxx-xxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },
  formatMoney(num, currency = 'تومان') {
    const n = Number(num || 0);
    return n.toLocaleString('fa-IR') + ' ' + currency;
  },
  formatDate(d) {
    const date = d ? new Date(d) : new Date();
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0,10);
  },
  parseNumber(value) {
    const n = parseFloat(String(value).replace(/,/g,''));
    return Number.isFinite(n) ? n : 0;
  },
  debounce(fn, delay=300) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  },
  async sha256(text) {
    const data = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2,'0')).join('');
  },
  clone(obj) { return JSON.parse(JSON.stringify(obj)); },
  sum(arr, key) {
    if (!Array.isArray(arr)) return 0;
    return arr.reduce((t, i) => t + (key ? Number(i[key]||0) : Number(i||0)), 0);
  },
  store(key, value) {
    if (value === undefined) {
      const raw = localStorage.getItem(key);
      try { return JSON.parse(raw); } catch { return raw; }
    }
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  },
  humanRole(role) {
    return role === 'admin' ? 'مدیر' : role === 'cashier' ? 'صندوقدار' : 'مشاهده';
  }
};
