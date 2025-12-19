import { Utils } from './utils.js';

export const UI = {
  sidebar(navItems, active, onClick) {
    const container = document.getElementById('sidebar');
    container.innerHTML = '';
    navItems.forEach(item => {
      const btn = document.createElement('button');
      btn.textContent = item.label;
      if(active === item.key) btn.classList.add('secondary');
      btn.onclick = () => onClick(item.key);
      container.appendChild(btn);
    });
  },
  showToast(msg, type='info') {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.remove('hidden');
    toast.classList.add('show');
    toast.style.borderColor = type==='success' ? 'var(--success)' : type==='error' ? 'var(--danger)' : 'var(--border)';
    setTimeout(() => toast.classList.add('hidden'), 2200);
    setTimeout(() => toast.classList.remove('show'), 2000);
  },
  modal(title, html, onSubmit) {
    const modal = document.getElementById('modal');
    document.getElementById('modalTitle').textContent = title;
    const body = document.getElementById('modalBody');
    body.innerHTML = html;
    modal.classList.remove('hidden');
    document.getElementById('modalClose').onclick = () => modal.classList.add('hidden');
    const form = body.querySelector('form');
    if(form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        onSubmit && onSubmit(data, modal);
      };
    }
  },
  table(headers, rows) {
    const th = headers.map(h => `<th>${h}</th>`).join('');
    const tr = rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('');
    return `<table class="table"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`;
  },
  pill(text) { return `<span class="tag">${text}</span>`; }
};
