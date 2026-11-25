/**
 * dashboard.js - Dashboard Anggaran, Proyeksi Realisasi, & Ticket Terbaru
 */

const DashboardPage = {
  activeOutputTab: 'ALL',
  insightData: null,
  ticketsData: [],

  async render(container) {
    container.innerHTML = `
      <div class="space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 class="text-2xl font-bold text-slate-900">Dashboard Anggaran & Pengadaan</h2>
            <p class="text-sm text-slate-500">Ringkasan MAK BMB, BDC, BDB & proyeksi realisasi pesanan aktif</p>
          </div>
          <div class="flex gap-2">
            ${Auth.hasRole(['user', 'admin']) ? `
              <button onclick="App.navigate('ticket-new')" class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm">
                + Usulan Pengadaan
              </button>
            ` : ''}
            ${Auth.hasRole('admin') ? `
              <button onclick="App.navigate('upload-fa')" class="px-4 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium">
                📤 Update FA Detail
              </button>
            ` : ''}
          </div>
        </div>

        <div id="dash-content" class="space-y-6"></div>
      </div>
    `;

    try {
      const [insight, ticketsRes] = await Promise.all([
        API.get('get_insight', {}, 'Menghubungkan ke database...'),
        API.get('get_tickets', {}, 'Menghubungkan ke database...')
      ]);

      this.insightData = insight;
      this.ticketsData = ticketsRes.tickets || [];
      this.renderContent();
    } catch (err) {
      document.getElementById('dash-content').innerHTML = `
        <div class="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
          Gagal memuat dashboard: ${Formatter.escapeHtml(err.message)}
        </div>
      `;
    }
  },

  renderContent() {
    const el = document.getElementById('dash-content');
    if (!el || !this.insightData) return;

    const d = this.insightData;
    const proyeksiColor = d.proyeksi_sisa < 0 ? 'text-rose-600' : (d.proyeksi_persen > 95 ? 'text-amber-600' : 'text-emerald-600');

    el.innerHTML = `
      <!-- 4 Kartu Ringkasan -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Pagu (BMB/BDC/BDB)</p>
          <p class="text-2xl font-bold text-slate-900 mt-1">${Formatter.rupiahCompact(d.total_pagu)}</p>
          <p class="text-xs text-slate-500 mt-1">${Formatter.rupiah(d.total_pagu)}</p>
        </div>
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Realisasi Saat Ini</p>
          <p class="text-2xl font-bold text-blue-600 mt-1">${Formatter.rupiahCompact(d.total_realisasi)}</p>
          <p class="text-xs text-slate-500 mt-1">${Formatter.rupiah(d.total_realisasi)}</p>
        </div>
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sisa Anggaran Saat Ini</p>
          <p class="text-2xl font-bold text-emerald-600 mt-1">${Formatter.rupiahCompact(d.total_sisa)}</p>
          <p class="text-xs text-slate-500 mt-1">${Formatter.rupiah(d.total_sisa)}</p>
        </div>
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Persentase Realisasi</p>
          <p class="text-2xl font-bold text-slate-900 mt-1">${Formatter.persen(d.persen_sekarang)}</p>
          <p class="text-xs text-slate-500 mt-1">Periode FA: ${Formatter.date(d.periode)}</p>
        </div>
      </div>

      <!-- Insight Prediksi Realisasi -->
      <div class="bg-gradient-to-r from-slate-900 to-blue-950 text-white rounded-2xl p-6 shadow-lg">
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <span class="inline-block px-2.5 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold mb-2">
              💡 Insight Proyeksi Realisasi
            </span>
            <h3 class="text-lg font-bold">Jika seluruh pesanan aktif saat ini selesai (SP2D terbit):</h3>
            <p class="text-sm text-slate-300 mt-1">
              Total komitmen pesanan berjalan: <strong class="text-white">${Formatter.rupiah(d.total_komitmen_aktif)}</strong>
            </p>
          </div>
          <div class="grid grid-cols-2 gap-4 bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10 shrink-0">
            <div>
              <p class="text-xs text-slate-300">Proyeksi Realisasi</p>
              <p class="text-lg font-bold text-white">${Formatter.rupiahCompact(d.proyeksi_realisasi)}</p>
              <p class="text-xs text-blue-300">${Formatter.persen(d.proyeksi_persen)}</p>
            </div>
            <div>
              <p class="text-xs text-slate-300">Proyeksi Sisa Akhir</p>
              <p class="text-lg font-bold ${d.proyeksi_sisa < 0 ? 'text-rose-400' : 'text-emerald-400'}">${Formatter.rupiahCompact(d.proyeksi_sisa)}</p>
              <p class="text-xs text-slate-300">${Formatter.rupiah(d.proyeksi_sisa)}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab Output BMB / BDC / BDB + Bar Chart CSS -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <h3 class="text-base font-bold text-slate-900">Ketersediaan & Proyeksi per Output / MAK</h3>
          <div class="flex gap-1 bg-slate-100 p-1 rounded-lg">
            ${['ALL', 'BMB', 'BDC', 'BDB'].map(tab => `
              <button onclick="DashboardPage.setTab('${tab}')"
                class="px-3 py-1 rounded-md text-xs font-semibold transition ${this.activeOutputTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}">
                ${tab === 'ALL' ? 'Semua' : tab}
              </button>
            `).join('')}
          </div>
        </div>

        <div id="dash-bars" class="space-y-4">
          ${this.renderBars()}
        </div>
      </div>

      <!-- Ticket Terbaru -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="p-5 border-b border-slate-200 flex items-center justify-between">
          <h3 class="text-base font-bold text-slate-900">Ticket Pengadaan Terbaru</h3>
          <button onclick="App.navigate('tickets')" class="text-xs font-semibold text-blue-600 hover:underline">Lihat Semua →</button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead class="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th class="px-5 py-3">Ticket</th>
                <th class="px-5 py-3">Perihal</th>
                <th class="px-5 py-3">Pemohon</th>
                <th class="px-5 py-3">Nilai</th>
                <th class="px-5 py-3">Stage</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${this.ticketsData.slice(0, 5).map(t => {
                const st = CONFIG.STAGES[t.stage] || { label: t.stage, badge: 'bg-slate-100 text-slate-700' };
                const nilai = Number(t.nilai_sp2d) || Number(t.total_final) || Number(t.total_estimasi) || 0;
                return `
                  <tr class="hover:bg-slate-50 cursor-pointer" onclick="App.navigate('ticket-detail', { id: '${t.id}' })">
                    <td class="px-5 py-3.5 font-mono font-semibold text-blue-600">${Formatter.escapeHtml(t.id)}</td>
                    <td class="px-5 py-3.5 font-medium text-slate-800">${Formatter.escapeHtml(t.perihal || '-')}</td>
                    <td class="px-5 py-3.5 text-slate-500">${Formatter.escapeHtml(t.pemohon_nama || '-')}</td>
                    <td class="px-5 py-3.5 font-medium">${Formatter.rupiah(nilai)}</td>
                    <td class="px-5 py-3.5">
                      <span class="px-2.5 py-1 rounded-full text-xs font-semibold border ${st.badge}">
                        ${st.label}
                      </span>
                    </td>
                  </tr>
                `;
              }).join('') || `
                <tr><td colspan="5" class="px-5 py-8 text-center text-slate-400">Belum ada ticket pengadaan.</td></tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  setTab(tab) {
    this.activeOutputTab = tab;
    this.renderContent();
  },

  renderBars() {
    const maks = (this.insightData.proyeksi_per_mak || []).filter(m =>
      this.activeOutputTab === 'ALL' || m.output_kode === this.activeOutputTab
    );

    if (!maks.length) {
      return `<p class="text-sm text-slate-400 py-4 text-center">Belum ada data FA Detail untuk output ini. Admin dapat mengupload FA Detail di menu Upload FA Detail.</p>`;
    }

    return maks.map(m => {
      const pctReal = Math.min(100, m.persen_sekarang || 0);
      const pctProy = Math.min(100, m.proyeksi_persen || 0);
      const pctKom = Math.max(0, pctProy - pctReal);
      const isOver = m.proyeksi_sisa < 0;

      return `
        <div class="p-3.5 rounded-lg border border-slate-100 bg-slate-50/60">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
            <div>
              <span class="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">${Formatter.escapeHtml(m.mak_full)}</span>
              <span class="text-xs font-medium text-slate-700 ml-2">${Formatter.escapeHtml(m.akun_nama)}</span>
            </div>
            <div class="text-xs text-slate-600">
              Pagu: <strong>${Formatter.rupiah(m.pagu)}</strong> |
              Sisa Skrg: <strong class="text-emerald-700">${Formatter.rupiah(m.sisa_sekarang)}</strong> |
              Proyeksi Sisa: <strong class="${isOver ? 'text-rose-600' : 'text-blue-700'}">${Formatter.rupiah(m.proyeksi_sisa)}</strong>
            </div>
          </div>
          <div class="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex">
            <div class="bg-blue-600 h-full bar-fill" style="width: ${pctReal}%" title="Realisasi: ${pctReal}%"></div>
            <div class="bg-amber-400 h-full bar-fill" style="width: ${pctKom}%" title="Komitmen Aktif: +${pctKom.toFixed(1)}%"></div>
          </div>
          <div class="flex justify-between text-[11px] text-slate-500 mt-1">
            <span>Realisasi: ${Formatter.persen(m.persen_sekarang)}</span>
            <span>Komitmen aktif: ${Formatter.rupiah(m.komitmen_aktif)} → Proyeksi: ${Formatter.persen(m.proyeksi_persen)}</span>
          </div>
        </div>
      `;
    }).join('');
  }
};
