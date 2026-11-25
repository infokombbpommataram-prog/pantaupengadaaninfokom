/**
 * anggaran.js - Halaman Anggaran MAK (BMB, BDC, BDB) dengan Filter Hierarki, Cari, Sort & Keterangan Akun
 */

const AnggaranPage = {
  filterOutput: 'ALL',
  filterSubOutput: 'ALL',
  filterKomponen: 'ALL',
  searchQuery: '',
  sortBy: 'mak_asc',
  insight: null,
  faRows: [],

  async render(container) {
    container.innerHTML = `
      <div class="space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 class="text-2xl font-bold text-slate-900">Kondisi Anggaran & MAK</h2>
            <p class="text-sm text-slate-500">Filter per hierarki Output → SubOutput → Komponen, cari keterangan akun/item, dan lihat proyeksi sisa</p>
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

        <!-- Filter & Sort Bar -->
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div class="flex flex-wrap items-center gap-2">
            <div class="flex gap-1 bg-slate-100 p-1 rounded-lg">
              ${['ALL', 'BMB', 'BDC', 'BDB'].map(tab => `
                <button onclick="AnggaranPage.setOutput('${tab}')" id="ang-tab-${tab}"
                  class="px-3.5 py-1.5 rounded-md text-xs font-bold transition ${this.filterOutput === tab ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}">
                  ${tab === 'ALL' ? 'Semua' : tab}
                </button>
              `).join('')}
            </div>

            <select id="ang-suboutput" onchange="AnggaranPage.setSubOutput(this.value)"
              class="px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium bg-white focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="ALL">Semua SubOutput</option>
            </select>

            <select id="ang-komponen" onchange="AnggaranPage.setKomponen(this.value)"
              class="px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium bg-white focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="ALL">Semua Komponen / Sub</option>
            </select>

            <select id="ang-sort" onchange="AnggaranPage.setSort(this.value)"
              class="px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium bg-white focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="mak_asc" ${this.sortBy === 'mak_asc' ? 'selected' : ''}>Urut: Kode MAK (A-Z)</option>
              <option value="sisa_desc" ${this.sortBy === 'sisa_desc' ? 'selected' : ''}>Urut: Sisa Terbesar</option>
              <option value="sisa_asc" ${this.sortBy === 'sisa_asc' ? 'selected' : ''}>Urut: Sisa Terkecil</option>
              <option value="proyeksi_desc" ${this.sortBy === 'proyeksi_desc' ? 'selected' : ''}>Urut: Proyeksi % Tertinggi</option>
              <option value="pagu_desc" ${this.sortBy === 'pagu_desc' ? 'selected' : ''}>Urut: Pagu Terbesar</option>
            </select>
          </div>

          <div class="flex flex-col sm:flex-row gap-2 items-center">
            <input id="ang-search" type="text" value="${Formatter.escapeHtml(this.searchQuery)}"
              oninput="AnggaranPage.setSearch(this.value)"
              placeholder="Cari kode MAK (mis. BDB.001.052.B), nama akun (Belanja Bahan), atau nama item (Spanduk)..."
              class="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            <button onclick="AnggaranPage.resetFilters()"
              class="px-3.5 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-600 shrink-0">
              Reset Filter
            </button>
          </div>
        </div>

        <!-- Ringkasan Dinamis Sesuai Filter -->
        <div id="ang-filter-summary" class="grid grid-cols-2 lg:grid-cols-4 gap-3"></div>

        <!-- Tabel MAK -->
        <div id="ang-table-wrap" class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"></div>
      </div>
    `;

    try {
      const [insightRes, detailRes] = await Promise.all([
        API.get('get_insight', {}, 'Menghubungkan ke database...'),
        API.get('get_fa_detail', {}, 'Menghubungkan ke database...')
      ]);
      this.insight = insightRes;
      this.faRows = detailRes.rows || [];
      this.populateDropdowns();
      this.renderTable();
    } catch (err) {
      document.getElementById('ang-table-wrap').innerHTML = `
        <div class="p-6 text-center text-rose-600 text-sm">${Formatter.escapeHtml(err.message)}</div>
      `;
    }
  },

  extractHierarchy(makFull) {
    const parts = String(makFull || '').split('.');
    // Format umum: 3165.BDB.001.052.B.521211 atau BDB.001.052.0B.521211
    const outIdx = parts.findIndex(p => ['BMB', 'BDC', 'BDB'].includes(p));
    if (outIdx === -1) return { output: '', subOutput: '', kompSub: '', akun: '' };
    const output = parts[outIdx] || '';
    const subNo = parts[outIdx + 1] || '';
    const subOutput = subNo ? `${output}.${subNo}` : '';
    const komp = parts[outIdx + 2] || '';
    const subKomp = parts[outIdx + 3] || '';
    const kompSub = komp && subKomp ? `${komp}.${subKomp}` : komp;
    const akun = parts[parts.length - 1] || '';
    return { output, subOutput, kompSub, akun };
  },

  populateDropdowns() {
    const list = (this.insight?.proyeksi_per_mak || []).filter(m =>
      this.filterOutput === 'ALL' || m.output_kode === this.filterOutput
    );

    const subSet = new Set();
    list.forEach(m => {
      const h = this.extractHierarchy(m.mak_full);
      if (h.subOutput) subSet.add(h.subOutput);
    });

    const subEl = document.getElementById('ang-suboutput');
    if (subEl) {
      const sortedSubs = [...subSet].sort();
      if (this.filterSubOutput !== 'ALL' && !subSet.has(this.filterSubOutput)) {
        this.filterSubOutput = 'ALL';
      }
      subEl.innerHTML = `<option value="ALL">Semua SubOutput (${sortedSubs.length})</option>` +
        sortedSubs.map(s => `<option value="${s}" ${this.filterSubOutput === s ? 'selected' : ''}>${s}</option>`).join('');
    }

    const kompSet = new Set();
    list.forEach(m => {
      const h = this.extractHierarchy(m.mak_full);
      if (this.filterSubOutput !== 'ALL' && h.subOutput !== this.filterSubOutput) return;
      if (h.kompSub) kompSet.add(h.kompSub);
    });

    const kompEl = document.getElementById('ang-komponen');
    if (kompEl) {
      const sortedKomps = [...kompSet].sort();
      if (this.filterKomponen !== 'ALL' && !kompSet.has(this.filterKomponen)) {
        this.filterKomponen = 'ALL';
      }
      kompEl.innerHTML = `<option value="ALL">Semua Komponen (${sortedKomps.length})</option>` +
        sortedKomps.map(k => `<option value="${k}" ${this.filterKomponen === k ? 'selected' : ''}>${k}</option>`).join('');
    }
  },

  setOutput(tab) {
    this.filterOutput = tab;
    this.filterSubOutput = 'ALL';
    this.filterKomponen = 'ALL';
    ['ALL', 'BMB', 'BDC', 'BDB'].forEach(t => {
      const btn = document.getElementById(`ang-tab-${t}`);
      if (btn) {
        btn.className = `px-3.5 py-1.5 rounded-md text-xs font-bold transition ${t === tab ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`;
      }
    });
    this.populateDropdowns();
    this.renderTable();
  },

  setSubOutput(val) {
    this.filterSubOutput = val;
    this.filterKomponen = 'ALL';
    this.populateDropdowns();
    this.renderTable();
  },

  setKomponen(val) {
    this.filterKomponen = val;
    this.renderTable();
  },

  setSort(val) {
    this.sortBy = val;
    this.renderTable();
  },

  setSearch(val) {
    this.searchQuery = val;
    this.renderTable();
  },

  resetFilters() {
    this.filterOutput = 'ALL';
    this.filterSubOutput = 'ALL';
    this.filterKomponen = 'ALL';
    this.searchQuery = '';
    this.sortBy = 'mak_asc';
    const searchEl = document.getElementById('ang-search');
    if (searchEl) searchEl.value = '';
    const sortEl = document.getElementById('ang-sort');
    if (sortEl) sortEl.value = 'mak_asc';
    this.setOutput('ALL');
  },

  getItemsByMak(makFull) {
    return this.faRows.filter(r => r.mak_full === makFull);
  },

  renderTable() {
    const wrap = document.getElementById('ang-table-wrap');
    const summaryEl = document.getElementById('ang-filter-summary');
    if (!wrap || !this.insight) return;

    const q = this.searchQuery.trim().toLowerCase();

    let list = (this.insight.proyeksi_per_mak || []).filter(m => {
      if (this.filterOutput !== 'ALL' && m.output_kode !== this.filterOutput) return false;
      const h = this.extractHierarchy(m.mak_full);
      if (this.filterSubOutput !== 'ALL' && h.subOutput !== this.filterSubOutput) return false;
      if (this.filterKomponen !== 'ALL' && h.kompSub !== this.filterKomponen) return false;

      if (q) {
        const items = this.getItemsByMak(m.mak_full);
        const itemNames = items.map(it => `${it.item_no} ${it.item_nama}`).join(' ');
        const hay = `${m.mak_full} ${m.akun_nama} ${itemNames}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    // Sorting
    list.sort((a, b) => {
      switch (this.sortBy) {
        case 'sisa_desc': return (b.sisa_sekarang || 0) - (a.sisa_sekarang || 0);
        case 'sisa_asc': return (a.sisa_sekarang || 0) - (b.sisa_sekarang || 0);
        case 'proyeksi_desc': return (b.proyeksi_persen || 0) - (a.proyeksi_persen || 0);
        case 'pagu_desc': return (b.pagu || 0) - (a.pagu || 0);
        default: return String(a.mak_full).localeCompare(String(b.mak_full));
      }
    });

    // Update ringkasan dinamis
    const totPagu = list.reduce((s, m) => s + (m.pagu || 0), 0);
    const totReal = list.reduce((s, m) => s + (m.realisasi_sekarang || 0), 0);
    const totSisa = list.reduce((s, m) => s + (m.sisa_sekarang || 0), 0);
    const totProySisa = list.reduce((s, m) => s + (m.proyeksi_sisa || 0), 0);

    if (summaryEl) {
      summaryEl.innerHTML = `
        <div class="bg-white p-3.5 rounded-xl border border-slate-200">
          <p class="text-[11px] font-semibold text-slate-400 uppercase">Pagu (Filter Aktif: ${list.length} MAK)</p>
          <p class="text-lg font-bold text-slate-900 mt-0.5">${Formatter.rupiah(totPagu)}</p>
        </div>
        <div class="bg-white p-3.5 rounded-xl border border-slate-200">
          <p class="text-[11px] font-semibold text-slate-400 uppercase">Realisasi Saat Ini</p>
          <p class="text-lg font-bold text-blue-600 mt-0.5">${Formatter.rupiah(totReal)}</p>
        </div>
        <div class="bg-white p-3.5 rounded-xl border border-slate-200">
          <p class="text-[11px] font-semibold text-slate-400 uppercase">Sisa Saat Ini</p>
          <p class="text-lg font-bold text-emerald-600 mt-0.5">${Formatter.rupiah(totSisa)}</p>
        </div>
        <div class="bg-white p-3.5 rounded-xl border border-slate-200">
          <p class="text-[11px] font-semibold text-slate-400 uppercase">Proyeksi Sisa Akhir</p>
          <p class="text-lg font-bold ${totProySisa < 0 ? 'text-rose-600' : 'text-blue-700'} mt-0.5">${Formatter.rupiah(totProySisa)}</p>
        </div>
      `;
    }

    if (!list.length) {
      wrap.innerHTML = `<div class="p-10 text-center text-slate-400 text-sm">Tidak ada data MAK yang sesuai filter atau FA Detail belum diupload.</div>`;
      return;
    }

    wrap.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead class="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-200">
            <tr>
              <th class="px-4 py-3">Kode MAK, Keterangan Akun & Item</th>
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
            ${list.map(m => {
              const badgeCls = InsightHelper.badgeColor(m.proyeksi_sisa, m.pagu);
              const items = this.getItemsByMak(m.mak_full);
              const itemSummary = items.map(it => it.item_nama).filter(Boolean).join(', ');
              return `
                <tr class="hover:bg-slate-50">
                  <td class="px-4 py-3.5 max-w-sm">
                    <span class="font-mono text-xs font-bold text-blue-700">${Formatter.escapeHtml(m.mak_full)}</span>
                    <div class="text-xs font-semibold text-slate-800 mt-0.5">${Formatter.escapeHtml(m.akun_nama || '-')}</div>
                    ${itemSummary ? `
                      <div class="text-[11px] text-slate-500 mt-0.5 line-clamp-2" title="${Formatter.escapeHtml(itemSummary)}">
                        Item: ${Formatter.escapeHtml(itemSummary)}
                      </div>
                    ` : ''}
                  </td>
                  <td class="px-4 py-3.5 text-right font-medium whitespace-nowrap">${Formatter.rupiah(m.pagu)}</td>
                  <td class="px-4 py-3.5 text-right text-slate-600 whitespace-nowrap">${Formatter.rupiah(m.realisasi_sekarang)}</td>
                  <td class="px-4 py-3.5 text-right font-semibold text-emerald-700 whitespace-nowrap">${Formatter.rupiah(m.sisa_sekarang)}</td>
                  <td class="px-4 py-3.5 text-right font-semibold text-amber-600 whitespace-nowrap">${Formatter.rupiah(m.komitmen_aktif)}</td>
                  <td class="px-4 py-3.5 text-right font-bold whitespace-nowrap ${m.proyeksi_sisa < 0 ? 'text-rose-600' : 'text-blue-700'}">
                    ${Formatter.rupiah(m.proyeksi_sisa)}
                  </td>
                  <td class="px-4 py-3.5 text-center whitespace-nowrap">
                    <span class="px-2 py-0.5 rounded-full text-xs font-bold border ${badgeCls}">
                      ${Formatter.persen(m.proyeksi_persen)}
                    </span>
                  </td>
                  <td class="px-4 py-3.5 text-right whitespace-nowrap">
                    <button onclick="AnggaranPage.showMakDetail('${Formatter.escapeHtml(m.mak_full)}')"
                      class="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700">
                      Detail (${items.length} item • ${(m.pesanan_aktif || []).length} tiket)
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

    const items = this.getItemsByMak(makFull);
    const itemsHtml = items.map(it => `
      <tr class="border-b border-slate-100 last:border-0">
        <td class="py-2 pr-3 text-slate-700">${Formatter.escapeHtml(it.item_no ? it.item_no + '. ' : '')}${Formatter.escapeHtml(it.item_nama)}</td>
        <td class="py-2 px-2 text-right">${Formatter.rupiah(it.pagu)}</td>
        <td class="py-2 px-2 text-right text-slate-500">${Formatter.rupiah(it.realisasi_total)}</td>
        <td class="py-2 pl-2 text-right font-semibold text-emerald-700">${Formatter.rupiah(it.sisa)}</td>
      </tr>
    `).join('');

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
          <h4 class="text-xs font-bold text-slate-500 uppercase mb-2">Rincian Item Anggaran (FA Detail)</h4>
          <div class="border rounded-lg p-3 max-h-48 overflow-y-auto">
            <table class="w-full text-xs">
              <thead class="text-slate-400 border-b">
                <tr>
                  <th class="text-left pb-1">Item</th>
                  <th class="text-right pb-1">Pagu</th>
                  <th class="text-right pb-1">Realisasi</th>
                  <th class="text-right pb-1">Sisa</th>
                </tr>
              </thead>
              <tbody>${itemsHtml || '<tr><td colspan="4" class="py-2 text-center text-slate-400">Tidak ada rincian item.</td></tr>'}</tbody>
            </table>
          </div>
        </div>

        <div>
          <h4 class="text-xs font-bold text-slate-500 uppercase mb-2">Pesanan Aktif pada MAK Ini</h4>
          <div class="space-y-2 max-h-48 overflow-y-auto">
            ${pesananHtml || '<p class="text-xs text-slate-400 py-4 text-center">Tidak ada pesanan aktif pada MAK ini.</p>'}
          </div>
        </div>
      </div>
    `);
  },

  exportExcel() {
    if (!this.insight) {
      Toast.warning('Data anggaran belum dimuat.');
      return;
    }
    const detailRows = (this.faRows || []).map(r => ({
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
  }
};
