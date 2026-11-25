/**
 * ticket-detail.js - Halaman Detail Ticket: Timeline 4 Stage, Upload Drive, Review PBJ, Edit Harga & Insight
 */

const TicketDetailPage = {
  ticketId: null,
  data: null,
  insightData: null,

  async render(container, params = {}) {
    this.ticketId = params.id;
    if (!this.ticketId) return App.navigate('tickets');

    container.innerHTML = `<div id="td-root" class="space-y-6"></div>`;
    await this.loadData();
  },

  async loadData() {
    try {
      const [detailRes, insightRes] = await Promise.all([
        API.get('get_ticket_detail', { id: this.ticketId }, 'Menghubungkan ke database...'),
        API.get('get_insight', {}, 'Menghubungkan ke database...').catch(() => null)
      ]);
      this.data = detailRes;
      this.insightData = insightRes;
      this.renderDetail();
    } catch (err) {
      document.getElementById('td-root').innerHTML = `
        <div class="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
          Gagal memuat detail ticket: ${Formatter.escapeHtml(err.message)}
        </div>
      `;
    }
  },

  renderDetail() {
    const root = document.getElementById('td-root');
    if (!root || !this.data) return;

    const { ticket, items, dokumen, history } = this.data;
    const st = CONFIG.STAGES[ticket.stage] || { step: 1, label: ticket.stage, badge: 'bg-slate-100 text-slate-700' };
    const isPbjOrAdmin = Auth.hasRole(['pbj', 'admin']);
    const isUserOrAdmin = Auth.hasRole(['user', 'admin']);
    const isSelesai = ticket.stage === 'selesai';

    root.innerHTML = `
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div class="flex items-center gap-2.5">
            <button onclick="App.navigate('tickets')" class="text-sm text-slate-500 hover:text-slate-800">← Daftar Ticket</button>
            <span class="text-slate-300">/</span>
            <span class="font-mono font-bold text-blue-600">${Formatter.escapeHtml(ticket.id)}</span>
          </div>
          <h2 class="text-2xl font-bold text-slate-900 mt-1">${Formatter.escapeHtml(ticket.perihal || '-')}</h2>
          <p class="text-xs text-slate-500 mt-0.5">
            Nodin: <strong>${Formatter.escapeHtml(ticket.nodin_nomor || '-')}</strong> (${Formatter.date(ticket.nodin_tanggal)}) •
            Pemohon: <strong>${Formatter.escapeHtml(ticket.pemohon_nama)}</strong> (${Formatter.escapeHtml(ticket.pemohon_unit)})
          </p>
        </div>
        <span class="self-start px-3.5 py-1.5 rounded-full text-xs font-bold border ${st.badge}">
          ${st.label}
        </span>
      </div>

      ${ticket.stage === 'ditolak' && ticket.catatan_tolak ? `
        <div class="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
          <strong>❌ Catatan Revisi / Penolakan PBJ:</strong> ${Formatter.escapeHtml(ticket.catatan_tolak)}
          <p class="text-xs mt-1">Silakan upload ulang dokumen yang diperbaiki pada panel Stage 2 di bawah.</p>
        </div>
      ` : ''}

      <!-- 4-Stage Stepper -->
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          ${[
            { step: 1, title: '1. Permintaan Diusulkan', desc: 'Ticket & daftar item dibuat' },
            { step: 2, title: '2. Data Usulan Lengkap', desc: 'Upload Nodin, Desain, SPB & ACC PBJ' },
            { step: 3, title: '3. Proses Pengadaan', desc: 'PBJ edit harga, status & bukti' },
            { step: 4, title: '4. Pembayaran Selesai', desc: 'SP2D terbit & anggaran sinkron' }
          ].map(s => {
            const done = st.step > s.step || ticket.stage === 'selesai';
            const active = st.step === s.step && ticket.stage !== 'selesai';
            return `
              <div class="p-3.5 rounded-xl border ${done ? 'bg-emerald-50 border-emerald-200' : active ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500/20' : 'bg-slate-50 border-slate-200 opacity-60'}">
                <div class="flex items-center gap-2">
                  <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${done ? 'bg-emerald-600 text-white' : active ? 'bg-blue-600 text-white' : 'bg-slate-300 text-slate-600'}">
                    ${done ? '✓' : s.step}
                  </span>
                  <span class="text-xs font-bold text-slate-900">${s.title}</span>
                </div>
                <p class="text-[11px] text-slate-500 mt-1.5">${s.desc}</p>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Insight Dampak ke Anggaran MAK -->
      ${this.renderMakInsight(items, ticket)}

      <!-- Daftar Item & Edit Harga (PBJ) -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 class="text-base font-bold text-slate-900">Rincian Barang & Harga</h3>
            <p class="text-xs text-slate-400">
              ${isPbjOrAdmin && !isSelesai ? 'PBJ dapat mengedit harga final & detail pesanan secara langsung' : 'Rincian item pengadaan'}
            </p>
          </div>
          <div class="text-right">
            <span class="text-xs text-slate-400">Total Estimasi: ${Formatter.rupiah(ticket.total_estimasi)}</span>
            <p class="text-lg font-bold text-blue-600">Total Final: ${Formatter.rupiah(ticket.total_final || ticket.total_estimasi)}</p>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead class="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th class="px-4 py-3">Barang</th>
                <th class="px-4 py-3">Spesifikasi</th>
                <th class="px-4 py-3">Jml</th>
                <th class="px-4 py-3">MAK</th>
                <th class="px-4 py-3">Estimasi</th>
                <th class="px-4 py-3">Harga Final (Rp)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${items.map((it, idx) => `
                <tr>
                  <td class="px-4 py-3">
                    ${isPbjOrAdmin && !isSelesai
                      ? `<input id="pbj-nama-${idx}" type="text" value="${Formatter.escapeHtml(it.nama_barang)}" class="w-full px-2 py-1 border rounded text-sm" />`
                      : `<span class="font-medium text-slate-800">${Formatter.escapeHtml(it.nama_barang)}</span>`}
                  </td>
                  <td class="px-4 py-3">
                    ${isPbjOrAdmin && !isSelesai
                      ? `<input id="pbj-spec-${idx}" type="text" value="${Formatter.escapeHtml(it.spesifikasi)}" class="w-full px-2 py-1 border rounded text-xs" />`
                      : `<span class="text-xs text-slate-600">${Formatter.escapeHtml(it.spesifikasi)}</span>`}
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">${it.jumlah} ${Formatter.escapeHtml(it.satuan)}</td>
                  <td class="px-4 py-3 font-mono text-xs text-blue-700">${Formatter.escapeHtml(it.mak_full)}</td>
                  <td class="px-4 py-3 text-slate-500">${Formatter.rupiah(it.estimasi_harga)}</td>
                  <td class="px-4 py-3">
                    ${isPbjOrAdmin && !isSelesai
                      ? `<input id="pbj-harga-${idx}" type="number" value="${Number(it.harga_final) || Number(it.estimasi_harga) || 0}" class="w-32 px-2.5 py-1 border border-blue-300 rounded font-semibold text-sm text-blue-700" />`
                      : `<span class="font-semibold text-slate-900">${Formatter.rupiah(it.harga_final || it.estimasi_harga)}</span>`}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Grid: Dokumen Stage 2 & Panel PBJ Stage 3 -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Dokumen Stage 2 (Google Drive) -->
        <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 class="text-base font-bold text-slate-900">📎 Stage 2: Kelengkapan Usulan (Google Drive)</h3>
          <div class="space-y-3">
            ${CONFIG.DOC_TYPES_STAGE2.map(dt => this.renderDocRow(dt, dokumen, 'stage2', isUserOrAdmin && !isSelesai)).join('')}
          </div>

          ${isPbjOrAdmin && (ticket.stage === 'data_usulan_lengkap' || ticket.stage === 'permintaan_diusulkan') ? `
            <div class="pt-4 border-t border-slate-200 space-y-3">
              <p class="text-xs font-bold text-slate-700 uppercase">Verifikasi Dokumen oleh PBJ</p>
              <input id="pbj-review-note" type="text" placeholder="Catatan review / alasan penolakan (opsional untuk ACC)..."
                class="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
              <div class="flex gap-2">
                <button onclick="TicketDetailPage.review('acc')" class="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold">
                  ✅ ACC & Masuk Proses Pengadaan
                </button>
                <button onclick="TicketDetailPage.review('tolak')" class="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold">
                  ❌ Tolak / Revisi
                </button>
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Stage 3: Proses Pengadaan & Bukti Pengerjaan PBJ -->
        <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 class="text-base font-bold text-slate-900">🛒 Stage 3: Proses Pengadaan & Bukti PBJ</h3>

          ${isPbjOrAdmin && !isSelesai ? `
            <div class="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-3">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Sub-Status Pengadaan</label>
                  <select id="pbj-substatus" class="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm">
                    ${CONFIG.SUBSTATUS_STAGE3.map(s => `
                      <option value="${s.kode}" ${ticket.substatus === s.kode ? 'selected' : ''}>${s.label}</option>
                    `).join('')}
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Nama Vendor / Penyedia</label>
                  <input id="pbj-vendor" type="text" value="${Formatter.escapeHtml(ticket.vendor || '')}" placeholder="CV / Toko..."
                    class="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm" />
                </div>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Catatan PBJ</label>
                <input id="pbj-catatan" type="text" value="${Formatter.escapeHtml(ticket.catatan_pbj || '')}" placeholder="Keterangan proses pengadaan..."
                  class="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm" />
              </div>
              <div class="flex flex-wrap gap-2 pt-1">
                <button onclick="TicketDetailPage.saveStage3()" class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold">
                  💾 Simpan Perubahan Harga & Status
                </button>
                <button onclick="TicketDetailPage.openSp2dModal()" class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold">
                  💸 Selesaikan Pembayaran (SP2D)
                </button>
              </div>
            </div>
          ` : `
            <div class="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
              <p><strong>Sub-Status:</strong> ${CONFIG.SUBSTATUS_STAGE3.find(s => s.kode === ticket.substatus)?.label || '-'}</p>
              <p><strong>Vendor:</strong> ${Formatter.escapeHtml(ticket.vendor || '-')}</p>
              <p><strong>Catatan PBJ:</strong> ${Formatter.escapeHtml(ticket.catatan_pbj || '-')}</p>
              ${isSelesai ? `<p class="text-emerald-700 font-bold pt-1">✅ SP2D No: ${Formatter.escapeHtml(ticket.nomor_sp2d || '-')} (${Formatter.date(ticket.tanggal_sp2d)}) — ${Formatter.rupiah(ticket.nilai_sp2d)}</p>` : ''}
            </div>
          `}

          <div class="space-y-3 pt-2">
            <p class="text-xs font-bold text-slate-500 uppercase">Bukti Pengerjaan PBJ (Google Drive)</p>
            ${CONFIG.DOC_TYPES_STAGE3.map(dt => this.renderDocRow(dt, dokumen, 'stage3', isPbjOrAdmin && !isSelesai)).join('')}
          </div>
        </div>
      </div>

      <!-- Riwayat Status -->
      <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 class="text-base font-bold text-slate-900 mb-4">🕒 Riwayat Perubahan Status</h3>
        <div class="space-y-3">
          ${history.slice().reverse().map(h => `
            <div class="flex items-start gap-3 text-xs border-l-2 border-blue-500 pl-3 py-1">
              <div class="flex-1">
                <p class="font-semibold text-slate-800">${Formatter.escapeHtml(h.keterangan)}</p>
                <p class="text-slate-400 mt-0.5">Oleh: ${Formatter.escapeHtml(h.updated_by)} • ${Formatter.datetime(h.updated_at)}</p>
              </div>
            </div>
          `).join('') || '<p class="text-xs text-slate-400">Belum ada riwayat.</p>'}
        </div>
      </div>
    `;
  },

  renderDocRow(dt, dokumenList, stageUpload, canUpload) {
    const uploaded = dokumenList.filter(d => d.jenis === dt.jenis);
    const latest = uploaded[uploaded.length - 1];

    return `
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border ${latest ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-slate-50/50'}">
        <div class="min-w-0">
          <p class="text-xs font-bold text-slate-800">
            ${latest ? '✅' : '⏳'} ${dt.label}
            ${dt.wajib ? '<span class="text-rose-500">*</span>' : ''}
          </p>
          ${latest ? `
            <p class="text-[11px] text-slate-500 truncate">${Formatter.escapeHtml(latest.filename)} (${latest.file_size_kb || 0} KB)</p>
          ` : `<p class="text-[11px] text-slate-400">Belum diupload</p>`}
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          ${latest ? `
            <button type="button" onclick="DrivePreview.show('${latest.gdrive_file_id}', '${Formatter.escapeHtml(latest.filename)}', '${Formatter.escapeHtml(latest.mime_type)}', '${Formatter.escapeHtml(latest.gdrive_url)}')"
              class="px-2.5 py-1 rounded bg-white border border-slate-300 hover:bg-slate-100 text-xs font-medium text-slate-700">
              👁️ Lihat
            </button>
          ` : ''}
          ${canUpload ? `
            <label class="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer">
              ${latest ? '↻ Ganti' : '⬆️ Upload'}
              <input type="file" accept="${dt.accept}" class="hidden"
                onchange="TicketDetailPage.handleUpload(this, '${dt.jenis}', '${stageUpload}')" />
            </label>
          ` : ''}
        </div>
      </div>
    `;
  },

  renderMakInsight(items, ticket) {
    if (!this.insightData || !this.insightData.proyeksi_per_mak) return '';
    const uniqueMaks = [...new Set(items.map(i => i.mak_full).filter(Boolean))];
    if (!uniqueMaks.length) return '';

    const rows = uniqueMaks.map(mak => {
      const m = this.insightData.proyeksi_per_mak.find(x => x.mak_full === mak);
      if (!m) return '';
      const isOver = m.proyeksi_sisa < 0;
      return `
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs py-1.5 border-b border-blue-900/20 last:border-0">
          <div>
            <span class="font-mono font-bold text-blue-200">${Formatter.escapeHtml(mak)}</span>
            <span class="text-slate-300 ml-1">(${Formatter.escapeHtml(m.akun_nama)})</span>
          </div>
          <div class="text-right">
            Sisa saat ini: <strong>${Formatter.rupiah(m.sisa_sekarang)}</strong> →
            Jika semua pesanan aktif selesai, sisa:
            <strong class="${isOver ? 'text-rose-400' : 'text-emerald-400'}">${Formatter.rupiah(m.proyeksi_sisa)} (${Formatter.persen(100 - m.proyeksi_persen)})</strong>
          </div>
        </div>
      `;
    }).join('');

    if (!rows.trim()) return '';
    return `
      <div class="bg-slate-900 text-white rounded-xl p-4 shadow">
        <p class="text-xs font-bold text-blue-300 uppercase mb-2">💡 Insight Dampak Anggaran MAK Terkait</p>
        ${rows}
      </div>
    `;
  },

  async handleUpload(input, jenis, stageUpload) {
    const file = input.files[0];
    if (!file) return;
    try {
      await DriveUpload.upload(file, this.ticketId, jenis, stageUpload);
      Toast.success(`Dokumen ${jenis.toUpperCase()} berhasil diupload ke Google Drive!`);
      await this.loadData();
    } catch (err) {
      Toast.error('Gagal upload: ' + err.message);
    }
  },

  async review(decision) {
    const catatan = document.getElementById('pbj-review-note')?.value.trim() || '';
    if (decision === 'tolak' && !catatan) {
      Toast.warning('Mohon isi catatan alasan penolakan/revisi.');
      return;
    }
    try {
      await API.post('review_dokumen', {
        ticket_id: this.ticketId,
        decision,
        catatan
      }, 'Menghubungkan ke database...');
      Toast.success(decision === 'acc' ? 'Dokumen di-ACC! Masuk ke Stage 3.' : 'Ticket dikembalikan untuk revisi.');
      await this.loadData();
    } catch (err) {
      Toast.error(err.message);
    }
  },

  async saveStage3() {
    const itemsPayload = (this.data.items || []).map((it, idx) => ({
      id: it.id,
      nama_barang: document.getElementById(`pbj-nama-${idx}`)?.value ?? it.nama_barang,
      spesifikasi: document.getElementById(`pbj-spec-${idx}`)?.value ?? it.spesifikasi,
      harga_final: Number(document.getElementById(`pbj-harga-${idx}`)?.value ?? it.harga_final)
    }));

    try {
      await API.post('update_stage3', {
        ticket_id: this.ticketId,
        substatus: document.getElementById('pbj-substatus')?.value,
        vendor: document.getElementById('pbj-vendor')?.value.trim(),
        catatan_pbj: document.getElementById('pbj-catatan')?.value.trim(),
        items: itemsPayload
      }, 'Menghubungkan ke database...');
      Toast.success('Perubahan Stage 3 & harga final disimpan! Anggaran tersinkronisasi.');
      await this.loadData();
    } catch (err) {
      Toast.error(err.message);
    }
  },

  openSp2dModal() {
    const totalFinal = Number(this.data.ticket.total_final) || Number(this.data.ticket.total_estimasi) || 0;
    Modal.open(`
      <div class="p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-bold text-slate-900">💸 Selesaikan Pembayaran (Stage 4 - SP2D)</h3>
          <button onclick="Modal.close()" class="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
        </div>
        <p class="text-xs text-slate-500">Setelah SP2D disimpan, ticket akan berstatus <strong>Pembayaran Selesai</strong> dan harga terkunci.</p>
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Nominal SP2D (Rp) *</label>
            <input id="sp2d-nilai" type="number" value="${totalFinal}" class="w-full px-3 py-2 border rounded-lg text-sm font-bold" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Nomor SP2D</label>
            <input id="sp2d-nomor" type="text" placeholder="Contoh: 2605213..." class="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Tanggal SP2D</label>
            <input id="sp2d-tanggal" type="date" value="${new Date().toISOString().slice(0, 10)}" class="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <button onclick="Modal.close()" class="px-4 py-2 rounded-lg border text-sm">Batal</button>
          <button onclick="TicketDetailPage.submitSp2d()" class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold">
            Simpan & Selesaikan
          </button>
        </div>
      </div>
    `, 'max-w-md');
  },

  async submitSp2d() {
    const nilai = Number(document.getElementById('sp2d-nilai').value);
    const nomor = document.getElementById('sp2d-nomor').value.trim();
    const tanggal = document.getElementById('sp2d-tanggal').value;
    if (!nilai || nilai <= 0) {
      Toast.warning('Nominal SP2D harus lebih dari 0.');
      return;
    }
    try {
      await API.post('selesai_sp2d', {
        ticket_id: this.ticketId,
        nilai_sp2d: nilai,
        nomor_sp2d: nomor,
        tanggal_sp2d: tanggal
      }, 'Menghubungkan ke database...');
      Modal.close();
      Toast.success('Pembayaran selesai! Realisasi anggaran telah tersinkronisasi.');
      await this.loadData();
    } catch (err) {
      Toast.error(err.message);
    }
  }
};
