/**
 * loading.js - Lock layar, blur, dan tampilkan notifikasi di tengah saat akses database
 */

const Loading = {
  _count: 0,

  show(message = 'Menghubungkan ke database...') {
    this._count++;
    const overlay = document.getElementById('db-loading-overlay');
    const textEl = document.getElementById('db-loading-text');
    if (textEl) textEl.textContent = message;
    if (overlay) {
      overlay.classList.remove('hidden');
      overlay.setAttribute('aria-hidden', 'false');
    }
    document.body.style.overflow = 'hidden';
  },

  hide() {
    this._count = Math.max(0, this._count - 1);
    if (this._count === 0) {
      const overlay = document.getElementById('db-loading-overlay');
      if (overlay) {
        overlay.classList.add('hidden');
        overlay.setAttribute('aria-hidden', 'true');
      }
      document.body.style.overflow = '';
    }
  },

  forceHide() {
    this._count = 0;
    this.hide();
  }
};
