/**
 * harga-ref.js - Kelola Daftar Harga Referensi (Input Cepat)
 */

const HargaRefPage = {
  items: [],

  async render(container) {
    container.innerHTML = `
      <div class="max-w-5xl mx-auto space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 class="text-2xl font-bold text-slate-900">⚡ Daftar Harga Referensi (Input Cepat)</h2>
            <p class="text-sm text-slate-500">Digunakan untuk mempercepat estimasi harga saat membuat usulan pengadaan</p>
          </div>
          <button onclick="HargaRefPage.openModal()" class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm">
            + Tambah Item Harga
          </button>
        </div>

        <div id="hr-table-wrap" class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"></div>
      </div>
    `;

    await this.load();
  },

  async load() {
    try {
      const res = await API.get('get_harga_ref', {}, 'Menghubungkan ke database...');
      this.items = res.harga_ref || [];
      InputCepat.clearCache();
      this.renderTable();
    } catch (err) {
      document.getElementById('hr-table-wrap').innerHTML = `<div class="p-6 text-rose-600 text-sm">${Formatter.escapeHtml(err.message)}</div>`;
    }
  },

  renderTable() {
    const wrap = document.getElementById('hr-table-wrap');
    if (!wrap) return;

    wrap.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead class="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-200">
            <tr>
              <th class="px-5 py-3">Kategori</th>
              <th class="px-5 py-3">Nama Item</th>
              <th class="px-5 py-3">Satuan</th>
              <th class="px-5 py-3 text-right">Harga Satuan</th>
              <th class="px-5 py-3">Keterangan</th>
              <th class="px-5 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${this.items.map((it, idx) => `
              <tr class="hover:bg-slate-50">
                <td class="px-5 py-3 text-xs font-semibold text-slate-500">${Formatter.escapeHtml(it.kategori)}</td>
                <td class="px-5 py-3 font-semibold text-slate-800">${Formatter.escapeHtml(it.nama_item)}</td>
                <td class="px-5 py-3 text-slate-600">${Formatter.escapeHtml(it.satuan)}</td>
                <td class="px-5 py-3 text-right font-bold text-blue-700">${Formatter.rupiah(it.harga)}</td>
                <td class="px-5 py-3 text-xs text-slate-500">${Formatter.escapeHtml(it.keterangan || '-')}</td>
                <td class="px-5 py-3 text-right space-x-2 whitespace-nowrap">
                  <button onclick="HargaRefPage.openModal(${idx})" class="text-blue-600 hover:underline text-xs font-semibold">Edit</button>
                  <button onclick="HargaRefPage.remove('${it.id}')" class="text-rose-600 hover:underline text-xs font-semibold">Hapus</button>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="6" class="p-8 text-center text-slate-400">Belum ada data harga.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  },

  openModal(idx = null) {
    const it = idx !== null ? this.items[idx] : { id: '', kategori: 'Cetak', nama_item: '', satuan: 'pcs', harga: 0, keterangan: '' };
    Modal.open(`
      <div class="p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-bold text-slate-900">${it.id ? 'Edit Harga Referensi' : 'Tambah Harga Referensi'}</h3>
          <button onclick="Modal.close()" class="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
        </div>
        <div class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Kategori</label>
              <input id="hr-kat" type="text" value="${Formatter.escapeHtml(it.kategori)}" class="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Satuan (m2 / pcs / lembar / paket)</label>
              <input id="hr-sat" type="text" value="${Formatter.escapeHtml(it.satuan)}" class="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Nama Item *</label>
            <input id="hr-nama" type="text" value="${Formatter.escapeHtml(it.nama_item)}" class="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Harga (Rp) *</label>
            <input id="hr-harga" type="number" value="${it.harga}" class="w-full px-3 py-2 border rounded-lg text-sm font-bold" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Keterangan</label>
            <input id="hr-ket" type="text" value="${Formatter.escapeHtml(it.keterangan || '')}" class="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <button onclick="Modal.close()" class="px-4 py-2 rounded-lg border text-sm">Batal</button>
          <button onclick="HargaRefPage.save('${it.id || ''}')" class="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold">Simpan</button>
        </div>
      </div>
    `, 'max-w-md');
  },

  async save(id) {
    try {
      await API.post('save_harga_ref', {
        id: id || undefined,
        kategori: document.getElementById('hr-kat').value.trim(),
        nama_item: document.getElementById('hr-nama').value.trim(),
        satuan: document.getElementById('hr-sat').value.trim(),
        harga: Number(document.getElementById('hr-harga').value),
        keterangan: document.getElementById('hr-ket').value.trim()
      }, 'Menghubungkan ke database...');
      Modal.close();
      Toast.success('Harga referensi disimpan.');
      await this.load();
    } catch (err) {
      Toast.error(err.message);
    }
  },

  async remove(id) {
    if (!confirm('Hapus item harga referensi ini?')) return;
    try {
      await API.post('delete_harga_ref', { id }, 'Menghubungkan ke database...');
      Toast.success('Item dihapus.');
      await this.load();
    } catch (err) {
      Toast.error(err.message);
    }
  }
};
