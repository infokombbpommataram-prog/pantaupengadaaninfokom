/**
 * input-cepat.js - Modal Input Cepat Harga Referensi & Auto-Kalkulasi m2
 */

const InputCepat = {
  _cache: null,

  async open(spesifikasiStr, jumlah, onSelect) {
    try {
      if (!this._cache) {
        const res = await API.get('get_harga_ref', {}, 'Menghubungkan ke database...');
        this._cache = res.harga_ref || [];
      }

      // Deteksi dimensi P x L dari spesifikasi (mis. "4 x 1 m2" atau "2x4")
      const area = this.parseArea(spesifikasiStr);
      const qty = Number(jumlah) || 1;

      const rowsHtml = this._cache.map((item, idx) => {
        const isM2 = String(item.satuan).toLowerCase().includes('m2') || String(item.satuan).includes('m²');
        const total = isM2 && area > 0
          ? Math.round(Number(item.harga) * area * qty)
          : Math.round(Number(item.harga) * qty);

        return `
          <tr class="hover:bg-blue-50/70 transition">
            <td class="px-4 py-2.5">
              <p class="font-semibold text-slate-800 text-sm">${Formatter.escapeHtml(item.nama_item)}</p>
              <p class="text-xs text-slate-400">${Formatter.escapeHtml(item.kategori)} • ${Formatter.escapeHtml(item.keterangan || '')}</p>
            </td>
            <td class="px-4 py-2.5 text-sm text-slate-600">
              ${Formatter.rupiah(item.harga)} / ${Formatter.escapeHtml(item.satuan)}
              ${isM2 && area > 0 ? `<br><span class="text-[11px] text-blue-600 font-medium">(${area} m² × ${qty})</span>` : ''}
            </td>
            <td class="px-4 py-2.5 text-sm font-bold text-slate-900">${Formatter.rupiah(total)}</td>
            <td class="px-4 py-2.5 text-right">
              <button type="button" onclick="InputCepat._pick(${idx}, ${total})"
                class="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold">
                + Pilih
              </button>
            </td>
          </tr>
        `;
      }).join('');

      this._onSelect = onSelect;

      Modal.open(`
        <div class="p-6">
          <div class="flex items-center justify-between mb-3">
            <div>
              <h3 class="text-lg font-bold text-slate-900">⚡ Input Cepat Harga Referensi</h3>
              <p class="text-xs text-slate-500">
                ${area > 0 ? `Dimensi terdeteksi: <strong>${area} m²</strong> | ` : ''}Jumlah: <strong>${qty}</strong>
              </p>
            </div>
            <button onclick="Modal.close()" class="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
          </div>

          <div class="border border-slate-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
            <table class="w-full text-left">
              <thead class="bg-slate-50 text-xs text-slate-500 uppercase">
                <tr>
                  <th class="px-4 py-2.5">Item</th>
                  <th class="px-4 py-2.5">Harga Satuan</th>
                  <th class="px-4 py-2.5">Estimasi Total</th>
                  <th class="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${rowsHtml || '<tr><td colspan="4" class="p-6 text-center text-slate-400 text-sm">Daftar harga kosong.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      `);
    } catch (err) {
      Toast.error('Gagal memuat daftar harga: ' + err.message);
    }
  },

  _pick(idx, calculatedTotal) {
    const item = this._cache[idx];
    if (this._onSelect && item) {
      this._onSelect(item, calculatedTotal);
    }
    Modal.close();
  },

  parseArea(spec) {
    if (!spec) return 0;
    const match = String(spec).replace(/,/g, '.').match(/(\d+(?:\.\d+)?)\s*[x×\*]\s*(\d+(?:\.\d+)?)/i);
    if (match) {
      return Number(match[1]) * Number(match[2]);
    }
    return 0;
  },

  clearCache() {
    this._cache = null;
  }
};
