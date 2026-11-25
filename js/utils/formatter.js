/**
 * formatter.js - Helper Format Rupiah, Tanggal, Persen, dan Teks
 */

const Formatter = {
  rupiah(amount) {
    const num = Number(amount) || 0;
    return 'Rp ' + num.toLocaleString('id-ID');
  },

  rupiahCompact(amount) {
    const num = Number(amount) || 0;
    if (Math.abs(num) >= 1e9) return 'Rp ' + (num / 1e9).toFixed(2).replace('.', ',') + ' M';
    if (Math.abs(num) >= 1e6) return 'Rp ' + (num / 1e6).toFixed(1).replace('.', ',') + ' jt';
    if (Math.abs(num) >= 1e3) return 'Rp ' + (num / 1e3).toFixed(0) + ' rb';
    return 'Rp ' + num;
  },

  persen(val) {
    const num = Number(val) || 0;
    return num.toFixed(2).replace('.', ',') + '%';
  },

  date(isoStr) {
    if (!isoStr) return '-';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return String(isoStr);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  },

  datetime(isoStr) {
    if (!isoStr) return '-';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return String(isoStr);
    return d.toLocaleDateString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  },

  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
};
