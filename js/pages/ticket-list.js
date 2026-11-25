/**
 * ticket-list.js - Daftar Ticket Pengadaan dengan Filter Stage & Output
 */

const TicketListPage = {
  tickets: [],
  filterStage: '',
  filterOutput: '',
  searchQuery: '',

  async render(container, params = {}) {
    if (params.stage) this.filterStage = params.stage;

    container.innerHTML = `
      <div class="space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 class="text-2xl font-bold text-slate-900">Daftar Ticket Pengadaan</h2>
            <p class="text-sm text-slate-500">Pantau status usulan, kelengkapan dokumen, proses PBJ, hingga SP2D</p>
          </div>
          ${Auth.hasRole(['user', 'admin']) ? `
            <button onclick="App.navigate('ticket-new')" class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm">
              + Buat Usulan Pengadaan
            </button>
          ` : ''}
        </div>

        <!-- Filter Bar -->
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-3 items-center">
          <input id="tl-search" type="text" placeholder="Cari Ticket ID, perihal, pemohon..." value="${Formatter.escapeHtml(this.searchQuery)}"
            oninput="TicketListPage.onSearch(this.value)"
            class="flex-1 min-w-[200px] px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />

          <select id="tl-stage" onchange="TicketListPage.onFilterStage(this.value)"
            class="px-3.5 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">Semua Stage</option>
            <option value="permintaan_diusulkan" ${this.filterStage === 'permintaan_diusulkan' ? 'selected' : ''}>1. Permintaan Diusulkan</option>
            <option value="data_usulan_lengkap" ${this.filterStage === 'data_usulan_lengkap' ? 'selected' : ''}>2. Data Usulan Lengkap</option>
            <option value="proses_pengadaan" ${this.filterStage === 'proses_pengadaan' ? 'selected' : ''}>3. Proses Pengadaan</option>
            <option value="selesai" ${this.filterStage === 'selesai' ? 'selected' : ''}>4. Pembayaran Selesai</option>
            <option value="ditolak" ${this.filterStage === 'ditolak' ? 'selected' : ''}>Ditolak / Revisi</option>
          </select>

          <select id="tl-output" onchange="TicketListPage.onFilterOutput(this.value)"
            class="px-3.5 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">Semua Output</option>
            <option value="BMB" ${this.filterOutput === 'BMB' ? 'selected' : ''}>BMB</option>
            <option value="BDC" ${this.filterOutput === 'BDC' ? 'selected' : ''}>BDC</option>
            <option value="BDB" ${this.filterOutput === 'BDB' ? 'selected' : ''}>BDB</option>
          </select>
        </div>

        <!-- Table -->
        <div id="tl-table-wrap" class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"></div>
      </div>
    `;

    try {
      const res = await API.get('get_tickets', {}, 'Menghubungkan ke database...');
      this.tickets = res.tickets || [];
      this.renderTable();
    } catch (err) {
      document.getElementById('tl-table-wrap').innerHTML = `
        <div class="p-6 text-center text-rose-600 text-sm">${Formatter.escapeHtml(err.message)}</div>
      `;
    }
  },

  onSearch(val) {
    this.searchQuery = val.toLowerCase();
    this.renderTable();
  },

  onFilterStage(val) {
    this.filterStage = val;
    this.renderTable();
  },

  onFilterOutput(val) {
    this.filterOutput = val;
    this.renderTable();
  },

  renderTable() {
    const wrap = document.getElementById('tl-table-wrap');
    if (!wrap) return;

    const filtered = this.tickets.filter(t => {
      if (this.filterStage && t.stage !== this.filterStage) return false;
      if (this.filterOutput) {
        const hasOut = (t.items || []).some(it => it.output_kode === this.filterOutput);
        if (!hasOut) return false;
      }
      if (this.searchQuery) {
        const hay = `${t.id} ${t.perihal} ${t.pemohon_nama} ${t.nodin_nomor}`.toLowerCase();
        if (!hay.includes(this.searchQuery)) return false;
      }
      return true;
    });

    if (!filtered.length) {
      wrap.innerHTML = `<div class="p-10 text-center text-slate-400 text-sm">Tidak ada ticket yang sesuai filter.</div>`;
      return;
    }

    wrap.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead class="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-200">
            <tr>
              <th class="px-5 py-3">Ticket ID</th>
              <th class="px-5 py-3">Perihal & Nodin</th>
              <th class="px-5 py-3">Item & MAK</th>
              <th class="px-5 py-3">Dokumen Stage 2</th>
              <th class="px-5 py-3">Nilai (Est / Final)</th>
              <th class="px-5 py-3">Stage</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${filtered.map(t => {
              const st = CONFIG.STAGES[t.stage] || { label: t.stage, badge: 'bg-slate-100 text-slate-700' };
              const subObj = CONFIG.SUBSTATUS_STAGE3.find(s => s.kode === t.substatus);
              const d2 = t.dokumen_stage2 || {};
              const nilai = Number(t.nilai_sp2d) || Number(t.total_final) || Number(t.total_estimasi) || 0;
              const outputs = [...new Set((t.items || []).map(i => i.output_kode).filter(Boolean))];

              return `
                <tr class="hover:bg-slate-50 cursor-pointer transition" onclick="App.navigate('ticket-detail', { id: '${t.id}' })">
                  <td class="px-5 py-3.5 align-top">
                    <span class="font-mono font-bold text-blue-600">${Formatter.escapeHtml(t.id)}</span>
                    <div class="text-[11px] text-slate-400 mt-0.5">${Formatter.date(t.created_at)}</div>
                  </td>
                  <td class="px-5 py-3.5 align-top">
                    <p class="font-semibold text-slate-800">${Formatter.escapeHtml(t.perihal || '-')}</p>
                    <p class="text-xs text-slate-500 mt-0.5">Nodin: ${Formatter.escapeHtml(t.nodin_nomor || '-')}</p>
                    <p class="text-xs text-slate-400">Pemohon: ${Formatter.escapeHtml(t.pemohon_nama || '-')}</p>
                  </td>
                  <td class="px-5 py-3.5 align-top">
                    <p class="text-xs font-medium text-slate-700">${(t.items || []).length} item</p>
                    <div class="flex flex-wrap gap-1 mt-1">
                      ${outputs.map(o => `<span class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">${o}</span>`).join('')}
                    </div>
                  </td>
                  <td class="px-5 py-3.5 align-top text-xs">
                    <span title="Nota Dinas" class="${d2.nodin ? 'text-emerald-600' : 'text-slate-300'}">📄 Nodin</span><br>
                    <span title="Desain" class="${d2.desain ? 'text-emerald-600' : 'text-slate-300'}">🎨 Desain</span><br>
                    <span title="SPB" class="${d2.spb ? 'text-emerald-600' : 'text-slate-300'}">📋 SPB</span>
                  </td>
                  <td class="px-5 py-3.5 align-top font-semibold text-slate-900">
                    ${Formatter.rupiah(nilai)}
                    ${t.stage === 'selesai' ? '<div class="text-[11px] text-emerald-600 font-normal">SP2D Cair</div>' : ''}
                  </td>
                  <td class="px-5 py-3.5 align-top">
                    <span class="inline-block px-2.5 py-1 rounded-full text-xs font-semibold border ${st.badge}">
                      ${st.label}
                    </span>
                    ${subObj && t.stage === 'proses_pengadaan' ? `
                      <div class="text-[11px] text-blue-600 font-medium mt-1">↳ ${subObj.label}</div>
                    ` : ''}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
};
