/**
 * ai-settings.js - Pengaturan 9Router / AI Parser & Google Drive Root Folder (Admin Only)
 */

const AiSettingsPage = {
  async render(container) {
    container.innerHTML = `
      <div class="max-w-3xl mx-auto space-y-6">
        <div>
          <h2 class="text-2xl font-bold text-slate-900">⚙️ Pengaturan AI Router & Google Drive</h2>
          <p class="text-sm text-slate-500">Konfigurasi model AI (9Router / OpenAI-compatible / Gemini) dan Folder Root Google Drive</p>
        </div>

        <!-- Pengaturan AI Router -->
        <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div class="border-b border-slate-100 pb-3">
            <h3 class="text-base font-bold text-slate-900">🤖 Pengaturan AI Parser (9Router / Multi-Provider)</h3>
            <p class="text-xs text-slate-400">Anda bebas mengganti Endpoint, Model, dan API Key kapan saja.</p>
          </div>

          <div class="space-y-3">
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Endpoint URL (Chat Completions)</label>
              <input id="ai-endpoint" type="url" placeholder="https://.../v1/chat/completions"
                class="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm font-mono" />
              <p class="text-[11px] text-slate-400 mt-1">Contoh 9Router: <code>http://localhost:20128/v1/chat/completions</code> atau URL tunnel Anda, atau Gemini OpenAI endpoint.</p>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Nama Model</label>
              <input id="ai-model" type="text" placeholder="gemini-2.5-flash / gpt-4o-mini / claude-3-5-sonnet"
                class="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm font-mono" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">API Key</label>
              <input id="ai-key" type="password" placeholder="Masukkan API Key baru (kosongkan jika tidak ingin mengubah)"
                class="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm font-mono" />
              <p id="ai-key-status" class="text-[11px] text-slate-400 mt-1"></p>
            </div>
          </div>

          <div id="ai-test-status" class="text-xs text-slate-500"></div>

          <div class="flex flex-wrap gap-2 pt-2">
            <button onclick="AiSettingsPage.testAi()" class="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold">
              🧪 Test Koneksi AI
            </button>
            <button onclick="AiSettingsPage.saveAi()" class="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold">
              💾 Simpan Pengaturan AI
            </button>
          </div>
        </div>

        <!-- Pengaturan Google Drive -->
        <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div class="border-b border-slate-100 pb-3">
            <h3 class="text-base font-bold text-slate-900">📁 Pengaturan Folder Root Google Drive</h3>
            <p class="text-xs text-slate-400">Semua dokumen Nodin, Desain, SPB, dan bukti PBJ akan otomatis masuk ke folder ini.</p>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Google Drive Folder ID</label>
            <input id="drive-folder-id" type="text" placeholder="Contoh: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2up"
              class="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm font-mono" />
            <p class="text-[11px] text-slate-400 mt-1">Ambil ID dari URL Google Drive setelah <code>/folders/</code>.</p>
          </div>

          <div id="drive-test-status" class="text-xs text-slate-500"></div>

          <div class="flex flex-wrap gap-2 pt-2">
            <button onclick="AiSettingsPage.testDrive()" class="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold">
              🔍 Test Akses Folder
            </button>
            <button onclick="AiSettingsPage.saveDrive()" class="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold">
              💾 Simpan Folder Drive
            </button>
          </div>
        </div>
      </div>
    `;

    try {
      const [aiRes, driveRes] = await Promise.all([
        API.get('get_ai_settings', {}, 'Menghubungkan ke database...'),
        API.get('get_drive_settings', {}, 'Menghubungkan ke database...')
      ]);

      document.getElementById('ai-endpoint').value = aiRes.ai_endpoint || '';
      document.getElementById('ai-model').value = aiRes.ai_model || '';
      document.getElementById('ai-key-status').textContent = aiRes.ai_api_key
        ? `API Key tersimpan (${aiRes.ai_api_key.slice(0, 6)}••••)`
        : 'API Key belum diisi';
      if (aiRes.ai_last_test) {
        document.getElementById('ai-test-status').textContent =
          `Terakhir ditest: ${Formatter.datetime(aiRes.ai_last_test)} (${aiRes.ai_last_test_status})`;
      }

      document.getElementById('drive-folder-id').value = driveRes.drive_root_folder_id || '';
    } catch (err) {
      Toast.error('Gagal memuat pengaturan: ' + err.message);
    }
  },

  async saveAi() {
    try {
      await API.post('save_ai_settings', {
        ai_endpoint: document.getElementById('ai-endpoint').value.trim(),
        ai_model: document.getElementById('ai-model').value.trim(),
        ai_api_key: document.getElementById('ai-key').value.trim()
      }, 'Menghubungkan ke database...');
      Toast.success('Pengaturan AI Router disimpan.');
    } catch (err) {
      Toast.error(err.message);
    }
  },

  async testAi() {
    try {
      const res = await API.post('test_ai', {
        ai_endpoint: document.getElementById('ai-endpoint').value.trim(),
        ai_model: document.getElementById('ai-model').value.trim(),
        ai_api_key: document.getElementById('ai-key').value.trim()
      }, 'Menghubungkan ke database... (Testing AI)');
      document.getElementById('ai-test-status').innerHTML =
        `<span class="text-emerald-600 font-semibold">✅ Koneksi AI berhasil! (${Formatter.datetime(res.tested_at)})</span>`;
      Toast.success('Koneksi AI berhasil!');
    } catch (err) {
      document.getElementById('ai-test-status').innerHTML =
        `<span class="text-rose-600 font-semibold">❌ ${Formatter.escapeHtml(err.message)}</span>`;
      Toast.error(err.message);
    }
  },

  async saveDrive() {
    try {
      await API.post('save_drive_settings', {
        drive_root_folder_id: document.getElementById('drive-folder-id').value.trim()
      }, 'Menghubungkan ke database...');
      Toast.success('Folder Root Drive disimpan.');
    } catch (err) {
      Toast.error(err.message);
    }
  },

  async testDrive() {
    try {
      const res = await API.post('test_drive_access', {
        folder_id: document.getElementById('drive-folder-id').value.trim()
      }, 'Menghubungkan ke database...');
      document.getElementById('drive-test-status').innerHTML =
        `<span class="text-emerald-600 font-semibold">✅ Folder ditemukan: "${Formatter.escapeHtml(res.folder_name)}"</span>`;
      Toast.success('Akses Google Drive berhasil!');
    } catch (err) {
      document.getElementById('drive-test-status').innerHTML =
        `<span class="text-rose-600 font-semibold">❌ ${Formatter.escapeHtml(err.message)}</span>`;
      Toast.error(err.message);
    }
  }
};
