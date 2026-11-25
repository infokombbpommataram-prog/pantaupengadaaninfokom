/**
 * ticket-form.js - Form Usulan Pengadaan Baru (Stage 1) + Input Cepat + Dropdown MAK
 */

const TicketFormPage = {
  items: [],
  faMaks: [],
  insightMap: {},

  async render(container) {
    const user = Auth.getUser();
    this.items = [
      { nama_barang: '', spesifikasi: '', jumlah: 1, satuan: 'pcs', mak_full: '', estimasi_harga: 0 }
    ];

    container.innerHTML = `
      <div class="max-w-5xl mx-auto space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-bold text-slate-900">Buat Usulan Pengadaan Baru</h2>
            <p class="text-sm text-slate-500">Stage 1: Permintaan Diusulkan — Ticket ID akan otomatis dibuat setelah submit</p>
          </div>
          <button onclick="App.navigate('tickets')" class="px-3.5 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50">
            ← Kembali
          </button>
        </div>

        <!-- Opsional: Auto-fill dari PDF Nodin -->
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p class="text-sm font-bold text-blue-900">✨ Punya File PDF Nota Dinas?</p>
            <p class="text-xs text-blue-700">Upload PDF Nodin untuk auto-isi nomor, perihal, dan daftar barang menggunakan AI (opsional).</p>
          </div>
          <label class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer shrink-0 text-center">
            📄 Auto-Isi dari Nodin PDF
            <input type="file" accept=".pdf" class="hidden" onchange="TicketFormPage.autoFillNodin(this)" />
          </label>
        </div>

        <form id="ticket-create-form" class="space-y-6">
          <!-- Info Nodin -->
          <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 class="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">Informasi Nota Dinas & Pemohon</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Nomor Nota Dinas</label>
                <input id="tf-nodin-nomor" type="text" placeholder="Contoh: PM.02.04.36B.11.26.755"
                  class="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Tanggal Nota Dinas</label>
                <input id="tf-nodin-tanggal" type="date" value="${new Date().toISOString().slice(0, 10)}"
                  class="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div class="sm:col-span-2">
                <label class="block text-xs font-semibold text-slate-600 mb-1">Perihal / Judul Pengadaan *</label>
                <input id="tf-perihal" type="text" required placeholder="Contoh: Permohonan Percetakan Bingkai, Spanduk & Baliho"
                  class="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Nama Pemohon *</label>
                <input id="tf-pemohon-nama" type="text" required value="${Formatter.escapeHtml(user?.nama || '')}"
                  class="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Unit / Tim</label>
                <input id="tf-pemohon-unit" type="text" value="${Formatter.escapeHtml(user?.unit || 'Tim Infokom')}"
                  class="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
          </div>

          <!-- Daftar Item -->
          <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div class="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h3 class="text-base font-bold text-slate-900">Daftar Barang / Jasa (MAK BMB, BDC, BDB)</h3>
                <p class="text-xs text-slate-400">Gunakan tombol <strong>⚡ Input Cepat</strong> untuk mengisi estimasi harga otomatis</p>
              </div>
              <button type="button" onclick="TicketFormPage.addItem()"
                class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold">
                + Tambah Baris
              </button>
            </div>

            <div id="tf-items-container" class="space-y-4"></div>

            <!-- Total & Live Insight -->
            <div class="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div id="tf-live-insight" class="text-xs text-slate-600 space-y-1"></div>
              <div class="text-right">
                <p class="text-xs text-slate-500">Total Estimasi Pengajuan</p>
                <p id="tf-total-estimasi" class="text-2xl font-bold text-blue-600">Rp 0</p>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3">
            <button type="button" onclick="App.navigate('tickets')" class="px-5 py-2.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Batal
            </button>
            <button type="submit" class="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm">
              Ajukan Pengadaan & Generate Ticket
            </button>
          </div>
        </form>
      </div>
    `;

    try {
      const insight = await API.get('get_insight', {}, 'Menghubungkan ke database...');
      this.faMaks = insight.proyeksi_per_mak || [];
      this.insightMap = {};
      this.faMaks.forEach(m => { this.insightMap[m.mak_full] = m; });
    } catch (err) {
      Toast.warning('Data MAK dari FA Detail belum tersedia atau gagal dimuat.');
    }

    this.renderItems();

    document.getElementById('ticket-create-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitForm();
    });
  },

  renderItems() {
    const container = document.getElementById('tf-items-container');
    if (!container) return;

    const makOptions = this.faMaks.map(m =>
      `<option value="${Formatter.escapeHtml(m.mak_full)}">${Formatter.escapeHtml(m.mak_full)} — ${Formatter.escapeHtml(m.akun_nama)} (Sisa: ${Formatter.rupiahCompact(m.proyeksi_sisa)})</option>`
    ).join('');

    container.innerHTML = this.items.map((it, idx) => `
      <div class="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-500">ITEM #${idx + 1}</span>
          <div class="flex items-center gap-2">
            <button type="button" onclick="TicketFormPage.openInputCepat(${idx})"
              class="px-2.5 py-1 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-semibold">
              ⚡ Input Cepat Harga
            </button>
            ${this.items.length > 1 ? `
              <button type="button" onclick="TicketFormPage.removeItem(${idx})" class="text-rose-600 hover:text-rose-800 text-xs font-semibold">
                Hapus
              </button>
            ` : ''}
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div class="sm:col-span-5">
            <label class="block text-[11px] font-semibold text-slate-500 mb-1">Nama Barang *</label>
            <input type="text" required value="${Formatter.escapeHtml(it.nama_barang)}"
              oninput="TicketFormPage.updateField(${idx}, 'nama_barang', this.value)"
              placeholder="Contoh: Spanduk Hari Kesehatan Nasional"
              class="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div class="sm:col-span-4">
            <label class="block text-[11px] font-semibold text-slate-500 mb-1">Spesifikasi (mis. 4 x 1 m2)</label>
            <input type="text" value="${Formatter.escapeHtml(it.spesifikasi)}"
              oninput="TicketFormPage.updateField(${idx}, 'spesifikasi', this.value)"
              placeholder="4 x 1 m2 / A3 portrait"
              class="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div class="sm:col-span-1">
            <label class="block text-[11px] font-semibold text-slate-500 mb-1">Jml</label>
            <input type="number" min="1" value="${it.jumlah}"
              oninput="TicketFormPage.updateField(${idx}, 'jumlah', Number(this.value))"
              class="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div class="sm:col-span-2">
            <label class="block text-[11px] font-semibold text-slate-500 mb-1">Satuan</label>
            <input type="text" value="${Formatter.escapeHtml(it.satuan)}"
              oninput="TicketFormPage.updateField(${idx}, 'satuan', this.value)"
              placeholder="pcs / m2"
              class="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div class="sm:col-span-8">
            <label class="block text-[11px] font-semibold text-slate-500 mb-1">Kode MAK (BMB / BDC / BDB) *</label>
            ${this.faMaks.length > 0 ? `
              <select required onchange="TicketFormPage.updateField(${idx}, 'mak_full', this.value)"
                class="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">-- Pilih MAK --</option>
                ${this.faMaks.map(m => `
                  <option value="${Formatter.escapeHtml(m.mak_full)}" ${it.mak_full === m.mak_full ? 'selected' : ''}>
                    ${Formatter.escapeHtml(m.mak_full)} — ${Formatter.escapeHtml(m.akun_nama)} (Proyeksi Sisa: ${Formatter.rupiah(m.proyeksi_sisa)})
                  </option>
                `).join('')}
              </select>
            ` : `
              <input type="text" required value="${Formatter.escapeHtml(it.mak_full)}"
                oninput="TicketFormPage.updateField(${idx}, 'mak_full', this.value)"
                placeholder="Contoh: 3165.BDC.001.052.A.521211"
                class="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500" />
            `}
          </div>
          <div class="sm:col-span-4">
            <label class="block text-[11px] font-semibold text-slate-500 mb-1">Estimasi Total Harga (Rp) *</label>
            <input type="number" min="0" required value="${it.estimasi_harga}"
              oninput="TicketFormPage.updateField(${idx}, 'estimasi_harga', Number(this.value))"
              class="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </div>
    `).join('');

    this.recalcSummary();
  },

  updateField(idx, key, val) {
    this.items[idx][key] = val;
    if (key === 'estimasi_harga' || key === 'mak_full') {
      this.recalcSummary();
    }
  },

  addItem() {
    this.items.push({ nama_barang: '', spesifikasi: '', jumlah: 1, satuan: 'pcs', mak_full: '', estimasi_harga: 0 });
    this.renderItems();
  },

  removeItem(idx) {
    this.items.splice(idx, 1);
    this.renderItems();
  },

  openInputCepat(idx) {
    const it = this.items[idx];
    InputCepat.open(it.spesifikasi, it.jumlah, (refItem, total) => {
      if (!this.items[idx].nama_barang) {
        this.items[idx].nama_barang = refItem.nama_item;
      }
      this.items[idx].satuan = refItem.satuan;
      this.items[idx].estimasi_harga = total;
      this.renderItems();
      Toast.success(`Harga ${refItem.nama_item} diterapkan: ${Formatter.rupiah(total)}`);
    });
  },

  recalcSummary() {
    const total = this.items.reduce((s, it) => s + (Number(it.estimasi_harga) || 0), 0);
    const totalEl = document.getElementById('tf-total-estimasi');
    if (totalEl) totalEl.textContent = Formatter.rupiah(total);

    const insightEl = document.getElementById('tf-live-insight');
    if (!insightEl) return;

    const perMak = {};
    this.items.forEach(it => {
      if (!it.mak_full) return;
      perMak[it.mak_full] = (perMak[it.mak_full] || 0) + (Number(it.estimasi_harga) || 0);
    });

    const lines = Object.keys(perMak).map(mak => {
      const m = this.insightMap[mak];
      if (!m) return `<div>MAK <code>${Formatter.escapeHtml(mak)}</code>: +${Formatter.rupiah(perMak[mak])}</div>`;
      const sisaSetelah = m.proyeksi_sisa - perMak[mak];
      const cls = sisaSetelah < 0 ? 'text-rose-600 font-bold' : 'text-emerald-700 font-semibold';
      return `<div>💡 MAK <strong>${Formatter.escapeHtml(mak)}</strong>: Sisa setelah pesanan ini → <span class="${cls}">${Formatter.rupiah(sisaSetelah)}</span></div>`;
    });

    insightEl.innerHTML = lines.join('');
  },

  async autoFillNodin(input) {
    const file = input.files[0];
    if (!file) return;
    try {
      Loading.show('Membaca PDF Nota Dinas...');
      const text = await PdfParser.extractText(file);
      Loading.hide();

      const settings = await API.get('get_ai_settings', {}, 'Menghubungkan ke database...').catch(() => null);
      if (!settings || !settings.ai_api_key) {
        Toast.warning('AI Router belum dikonfigurasi oleh Admin. Silakan isi form secara manual.');
        return;
      }

      Loading.show('Menganalisis Nota Dinas dengan AI...');
      const parsed = await AiCaller.parseNodin(text, settings);
      Loading.hide();

      if (parsed.nodin_nomor) document.getElementById('tf-nodin-nomor').value = parsed.nodin_nomor;
      if (parsed.nodin_tanggal) document.getElementById('tf-nodin-tanggal').value = parsed.nodin_tanggal;
      if (parsed.perihal) document.getElementById('tf-perihal').value = parsed.perihal;
      if (parsed.pemohon_nama) document.getElementById('tf-pemohon-nama').value = parsed.pemohon_nama;
      if (parsed.pemohon_unit) document.getElementById('tf-pemohon-unit').value = parsed.pemohon_unit;

      if (Array.isArray(parsed.items) && parsed.items.length > 0) {
        this.items = parsed.items.map(it => ({
          nama_barang: it.nama_barang || '',
          spesifikasi: it.spesifikasi || '',
          jumlah: Number(it.jumlah) || 1,
          satuan: it.satuan || 'pcs',
          mak_full: it.mak_full || '',
          estimasi_harga: 0
        }));
        this.renderItems();
      }
      Toast.success('Data Nota Dinas berhasil diekstrak! Silakan lengkapi estimasi harga.');
    } catch (err) {
      Loading.forceHide();
      Toast.error('Gagal auto-fill Nodin: ' + err.message);
    }
  },

  async submitForm() {
    try {
      const payload = {
        nodin_nomor: document.getElementById('tf-nodin-nomor').value.trim(),
        nodin_tanggal: document.getElementById('tf-nodin-tanggal').value,
        perihal: document.getElementById('tf-perihal').value.trim(),
        pemohon_nama: document.getElementById('tf-pemohon-nama').value.trim(),
        pemohon_unit: document.getElementById('tf-pemohon-unit').value.trim(),
        items: this.items
      };

      const res = await API.post('create_ticket', payload, 'Menghubungkan ke database...');
      Toast.success(res.message || 'Ticket berhasil dibuat!');
      App.navigate('ticket-detail', { id: res.ticket_id });
    } catch (err) {
      Toast.error(err.message);
    }
  }
};
