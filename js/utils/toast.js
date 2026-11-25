/**
 * toast.js - Notifikasi Toast Sudut Kanan Bawah
 */

const Toast = {
  show(message, type = 'info', duration = 3800) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const colors = {
      success: 'bg-emerald-600 text-white border-emerald-700',
      error: 'bg-rose-600 text-white border-rose-700',
      warning: 'bg-amber-500 text-white border-amber-600',
      info: 'bg-slate-800 text-white border-slate-900'
    };

    const el = document.createElement('div');
    el.className = `px-4 py-3 rounded-lg shadow-lg border text-sm font-medium flex items-center justify-between gap-3 transition-all duration-300 ${colors[type] || colors.info}`;
    el.innerHTML = `
      <span>${Formatter.escapeHtml(message)}</span>
      <button class="opacity-75 hover:opacity-100 text-xs font-bold" onclick="this.parentElement.remove()">✕</button>
    `;

    container.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 300);
    }, duration);
  },

  success(msg) { this.show(msg, 'success'); },
  error(msg) { this.show(msg, 'error', 5500); },
  warning(msg) { this.show(msg, 'warning'); },
  info(msg) { this.show(msg, 'info'); }
};
