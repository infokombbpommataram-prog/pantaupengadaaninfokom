/**
 * upload-fa.js - Upload FA Detail PDF & Parsing Menggunakan AI Router (Admin Only)
 */

const UploadFaPage = {
  parsedRows: [],

  render(container) {
    this.parsedRows = [];
    container.innerHTML = `
      <div class="max-w-5xl mx-auto space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-bold text-slate-900">Upload & Parsing FA Detail (AI)</h2>
            <p class="text-sm text-slate-500">Ekstrak otomatis pagu, realisasi, dan sisa khusus output <strong>BMB, BDC, dan BDB</strong></p>
          </div>
          <button onclick="App.navigate('anggaran')" class="px-3.5 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50">
            ← Kembali ke Anggaran
          </button>
        </div>

        <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Tanggal / Periode Laporan FA</label>
              <input id="fa-periode" type="date" value="${new Date().toISOString().slice(0, 10)}"
                class="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Pilih File PDF FA Detail (16 Segmen)</label>
              <input id="fa-file-input" type="file" accept=".pdf"
                class="w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer" />
            </div>
          </div>

          <div class="flex items-center justify-between pt-2">
            <p class="text-xs text-slate-400">Pastikan Endpoint, Model, dan API Key sudah diatur di menu <strong>Pengaturan AI & Drive</strong>.</p>
            <button onclick="UploadFaPage.processPdf()" class="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm">
              🤖 Ekstrak & Parsing dengan AI
            </button>
          </div>
        </div>

        <div id="fa-preview-wrap" class="hidden bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"></div>
      </div>
    `;
  },

  async processPdf() {
    const fileInput = document.getElementById('fa-file-input');
    const file = fileInput?.files?.[0];
    if (!file) {
      Toast.warning('Pilih file PDF FA Detail terlebih dahulu.');
      return;
    }

    try {
      const settings = await API.get('get_ai_settings', {}, 'Menghubungkan ke database...');
      if (!settings.ai_endpoint || !settings.ai_model || !settings.ai_api_key) {
        Toast.error('Pengaturan AI Router belum lengkap! Silakan isi di menu Pengaturan AI & Drive.');
        return;
      }

      Loading.show('Membaca teks dari PDF FA Detail...');
      const fullText = await PdfParser.extractText(file);
      Loading.hide();

      Loading.show(`Memparsing anggaran BMB/BDC/BDB menggunakan ${settings.ai_model}...`);
      const rows = await AiCaller.parseFaDetail(fullText, settings, (batch, total) => {
        const textEl = document.getElementById('db-loading-text');
        if (textEl) textEl.textContent = `Memparsing bagian ${batch}/${total} menggunakan ${settings.ai_model}...`;
      });
      Loading.hide();

      this.parsedRows = rows;
      this.renderPreview();
      Toast.success(`Berhasil memparsing ${rows.length} baris MAK (BMB/BDC/BDB).`);
    } catch (err) {
      Loading.forceHide();
      Toast.error('Gagal memparsing PDF: ' + err.message);
    }
  },

  renderPreview() {
    const wrap = document.getElementById('fa-preview-wrap');
    if (!wrap) return;
    wrap.classList.remove('hidden');

    wrap.innerHTML = `
      <div class="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50">
        <div>
          <h3 class="text-base font-bold text-slate-900">Preview Hasil Parsing AI (${this.parsedRows.length} baris)</h3>
          <p class="text-xs text-slate-500">Periksa kembali sebelum menyimpan ke database Google Sheets (data lama akan diperbarui).</p>
        </div>
        <button onclick="UploadFaPage.saveToDb()" class="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-sm">
          💾 Simpan ke Database
        </button>
      </div>
      <div class="overflow-x-auto max-h-[60vh]">
        <table class="w-full text-xs text-left">
          <thead class="bg-slate-100 text-slate-600 uppercase sticky top-0">
            <tr>
              <th class="px-3 py-2.5">Output</th>
              <th class="px-3 py-2.5">MAK Lengkap</th>
              <th class="px-3 py-2.5">Akun / Item</th>
              <th class="px-3 py-2.5 text-right">Pagu</th>
              <th class="px-3 py-2.5 text-right">Realisasi</th>
              <th class="px-3 py-2.5 text-right">Sisa</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${this.parsedRows.map(r => `
              <tr class="hover:bg-slate-50">
                <td class="px-3 py-2 font-bold">${Formatter.escapeHtml(r.output_kode)}</td>
                <td class="px-3 py-2 font-mono text-blue-700">${Formatter.escapeHtml(r.mak_full)}</td>
                <td class="px-3 py-2">
                  <div class="font-medium text-slate-800">${Formatter.escapeHtml(r.item_nama || r.akun_nama)}</div>
                  <div class="text-[11px] text-slate-400">${Formatter.escapeHtml(r.akun_nama)}</div>
                </td>
                <td class="px-3 py-2 text-right">${Formatter.rupiah(r.pagu)}</td>
                <td class="px-3 py-2 text-right">${Formatter.rupiah(r.realisasi_total)}</td>
                <td class="px-3 py-2 text-right font-semibold text-emerald-700">${Formatter.rupiah(r.sisa)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  async saveToDb() {
    if (!this.parsedRows.length) return;
    const periode = document.getElementById('fa-periode').value;
    try {
      const res = await API.post('save_fa_parsed', {
        periode,
        rows: this.parsedRows
      }, 'Menghubungkan ke database...');
      Toast.success(res.message || 'Data FA Detail berhasil disimpan!');
      App.navigate('anggaran');
    } catch (err) {
      Toast.error(err.message);
    }
  }
};
