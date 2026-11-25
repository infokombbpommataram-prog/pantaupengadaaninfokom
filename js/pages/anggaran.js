/**
 * anggaran.js - Halaman Anggaran MAK (BMB, BDC, BDB) & Insight Proyeksi
 */

const AnggaranPage = {
  filterOutput: 'ALL',
  insight: null,

  async render(container) {
    container.innerHTML = `
      <div class="space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 class="text-2xl font-bold text-slate-900">Kondisi Anggaran & MAK</h2>
            <p class="text-sm text-slate-500">Data Pagu, Realisasi, Sisa & Proyeksi Pesanan Aktif (Khusus Output BMB, BDC, BDB)</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button onclick="AnggaranPage.exportExcel()" class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm">
              📥 Export Excel (.xlsx)
            </button>
            ${Auth.hasRole('admin') ? `
              <button onclick="App.navigate('upload-fa')" class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm">
                📤 Upload FA Detail Baru
              </button>
            ` : ''}
          </div>
        </div>

        <div class="flex gap-1 bg-white p-1.5 rounded-xl border border-slate-200 w-fit">
          ${['ALL', 'BMB', 'BDC', 'BDB'].map(tab => `
            <button onclick="AnggaranPage.setFilter('${tab}')" id="ang-tab-${tab}"
              class="px-4 py-1.5 rounded-lg text-xs font-bold transition ${this.filterOutput === tab ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}">
              ${tab === 'ALL' ? 'Semua Output' : tab}
            </button>
          `).join('')}
        </div>

        <div id="ang-table-wrap" class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"></div>
      </div>
    `;

    try {
      this.insight = await API.get('get_insight', {}, 'Menghubungkan ke database...');
      this.renderTable();
    } catch (err) {
      document.getElementById('ang-table-wrap').innerHTML = `
        <div class="p-6 text-center text-rose-600 text-sm">${Formatter.escapeHtml(err.message)}</div>
      `;
    }
  },

  setFilter(tab) {
    this.filterOutput = tab;
    ['ALL', 'BMB', 'BDC', 'BDB'].forEach(t => {
      const btn = document.getElementById(`ang-tab-${t}`);
      if (btn) {
        btn.className = `px-4 py-1.5 rounded-lg text-xs font-bold transition ${t === tab ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`;
      }
    });
    this.renderTable();
  },

  renderTable() {
    const wrap = document.getElementById('ang-table-wrap');
    if (!wrap || !this.insight) return;

    const list = (this.insight.proyeksi_per_mak || []).filter(m =>
      this.filterOutput === 'ALL' || m.output_kode === this.filterOutput
    );

    if (!list.length) {
      wrap.innerHTML = `<div class="p-10 text-center text-slate-400 text-sm">Belum ada data FA Detail. Admin dapat mengupload FA Detail terlebih dahulu.</div>`;
      return;
    }

    wrap.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead class="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-200">
            <tr>
              <th class="px-4 py-3">Kode MAK & Akun</th>
              <th class="px-4 py-3 text-right">Pagu</th>
              <th class="px-4 py-3 text-right">Realisasi</th>
              <th class="px-4 py-3 text-right">Sisa Saat Ini</th>
              <th class="px-4 py-3 text-right">Pesanan Aktif</th>
              <th class="px-4 py-3 text-right">Proyeksi Sisa</th>
              <th class="px-4 py-3 text-center">Proyeksi %</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${list.map((m, idx) => {
              const badgeCls = InsightHelper.badgeColor(m.proyeksi_sisa, m.pagu);
              return `
                <tr class="hover:bg-slate-50">
                  <td class="px-4 py-3.5">
                    <span class="font-mono text-xs font-bold text-blue-700">${Formatter.escapeHtml(m.mak_full)}</span>
                    <div class="text-xs text-slate-600 mt-0.5">${Formatter.escapeHtml(m.akun_nama)}</div>
                  </td>
                  <td class="px-4 py-3.5 text-right font-medium">${Formatter.rupiah(m.pagu)}</td>
                  <td class="px-4 py-3.5 text-right text-slate-600">${Formatter.rupiah(m.realisasi_sekarang)}</td>
                  <td class="px-4 py-3.5 text-right font-semibold text-emerald-700">${Formatter.rupiah(m.sisa_sekarang)}</td>
                  <td class="px-4 py-3.5 text-right font-semibold text-amber-600">${Formatter.rupiah(m.komitmen_aktif)}</td>
                  <td class="px-4 py-3.5 text-right font-bold ${m.proyeksi_sisa < 0 ? 'text-rose-600' : 'text-blue-700'}">
                    ${Formatter.rupiah(m.proyeksi_sisa)}
                  </td>
                  <td class="px-4 py-3.5 text-center">
                    <span class="px-2 py-0.5 rounded-full text-xs font-bold border ${badgeCls}">
                      ${Formatter.persen(m.proyeksi_persen)}
                    </span>
                  </td>
                  <td class="px-4 py-3.5 text-right">
                    <button onclick="AnggaranPage.showMakDetail('${Formatter.escapeHtml(m.mak_full)}')"
                      class="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700">
                      Detail (${(m.pesanan_aktif || []).length})
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  showMakDetail(makFull) {
    const m = (this.insight.proyeksi_per_mak || []).find(x => x.mak_full === makFull);
    if (!m) return;

    const pesananHtml = (m.pesanan_aktif || []).map(p => `
      <div class="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
        onclick="Modal.close(); App.navigate('ticket-detail', { id: '${p.ticket_id}' })">
        <div>
          <span class="font-mono text-xs font-bold text-blue-600">${Formatter.escapeHtml(p.ticket_id)}</span>
          <p class="text-sm font-medium text-slate-800">${Formatter.escapeHtml(p.nama_barang)}</p>
        </div>
        <div class="text-right">
          <p class="text-sm font-bold text-slate-900">${Formatter.rupiah(p.nilai)}</p>
          <span class="text-[11px] text-slate-500">${Formatter.escapeHtml(p.stage)}</span>
        </div>
      </div>
    `).join('');

    Modal.open(`
      <div class="p-6 space-y-4">
        <div class="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <span class="font-mono text-sm font-bold text-blue-700">${Formatter.escapeHtml(m.mak_full)}</span>
            <h3 class="text-base font-bold text-slate-900">${Formatter.escapeHtml(m.akun_nama)}</h3>
          </div>
          <button onclick="Modal.close()" class="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div class="p-3 rounded-lg bg-slate-50 border">
            <span class="text-slate-400">Pagu</span>
            <p class="font-bold text-slate-900 mt-0.5">${Formatter.rupiah(m.pagu)}</p>
          </div>
          <div class="p-3 rounded-lg bg-slate-50 border">
            <span class="text-slate-400">Realisasi Skrg</span>
            <p class="font-bold text-blue-700 mt-0.5">${Formatter.rupiah(m.realisasi_sekarang)}</p>
          </div>
          <div class="p-3 rounded-lg bg-amber-50 border border-amber-200">
            <span class="text-amber-700">Pesanan Aktif</span>
            <p class="font-bold text-amber-800 mt-0.5">${Formatter.rupiah(m.komitmen_aktif)}</p>
          </div>
          <div class="p-3 rounded-lg ${m.proyeksi_sisa < 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'} border">
            <span class="text-slate-600">Proyeksi Sisa</span>
            <p class="font-bold ${m.proyeksi_sisa < 0 ? 'text-rose-700' : 'text-emerald-700'} mt-0.5">${Formatter.rupiah(m.proyeksi_sisa)}</p>
          </div>
        </div>

        <div>
          <h4 class="text-xs font-bold text-slate-500 uppercase mb-2">Pesanan Aktif pada MAK Ini</h4>
          <div class="space-y-2 max-h-64 overflow-y-auto">
            ${pesananHtml || '<p class="text-xs text-slate-400 py-4 text-center">Tidak ada pesanan aktif pada MAK ini.</p>'}
          </div>
        </div>
      </div>
    `);
  },

  async exportExcel() {
    if (!this.insight) {
      Toast.warning('Data anggaran belum dimuat.');
      return;
    }
    try {
      const detailRes = await API.get('get_fa_detail', {}, 'Menghubungkan ke database...');
      const detailRows = (detailRes.rows || []).map(r => ({
        Output: r.output_kode,
        MAK: r.mak_full,
        SubOutput: r.output,
        Komponen: r.komponen,
        SubKomponen: r.subkomponen,
        Kode_Akun: r.akun_kode,
        Nama_Akun: r.akun_nama,
        No_Item: r.item_no,
        Nama_Item: r.item_nama,
        Pagu: Number(r.pagu) || 0,
        Realisasi_Lalu: Number(r.realisasi_lalu) || 0,
        Realisasi_Ini: Number(r.realisasi_ini) || 0,
        Realisasi_Total: Number(r.realisasi_total) || 0,
        Sisa: Number(r.sisa) || 0,
        Persen: Number(r.persen) || 0
      }));

      const summaryRows = (this.insight.proyeksi_per_mak || []).map(m => ({
        Output: m.output_kode,
        MAK: m.mak_full,
        Nama_Akun: m.akun_nama,
        Pagu: m.pagu,
        Realisasi_Saat_Ini: m.realisasi_sekarang,
        Sisa_Saat_Ini: m.sisa_sekarang,
        Komitmen_Pesanan_Aktif: m.komitmen_aktif,
        Proyeksi_Realisasi: m.proyeksi_realisasi,
        Proyeksi_Sisa: m.proyeksi_sisa,
        Proyeksi_Persen: m.proyeksi_persen
      }));

      const tgl = new Date().toISOString().slice(0, 10);
      ExcelExport.exportWorkbook([
        { name: 'Ringkasan_Proyeksi_MAK', rows: summaryRows },
        { name: 'Detail_FA_BMB_BDC_BDB', rows: detailRows }
      ], `Anggaran_Infokom_${tgl}.xlsx`);
    } catch (err) {
      Toast.error('Gagal export Excel: ' + err.message);
    }
  }
};
