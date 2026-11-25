/**
 * login.js - Halaman Login (admin, user, pbj)
 */

const LoginPage = {
  render(container) {
    const isConfigured = CONFIG.GAS_URL && !CONFIG.GAS_URL.includes('REPLACE_WITH_YOUR_DEPLOYMENT_ID');

    container.innerHTML = `
      <div class="min-h-[85vh] flex items-center justify-center">
        <div class="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          <div class="text-center mb-6">
            <div class="w-14 h-14 mx-auto rounded-2xl bg-blue-600 text-white flex items-center justify-center text-2xl font-bold shadow-lg shadow-blue-600/30 mb-3">
              PP
            </div>
            <h1 class="text-xl font-bold text-slate-900">Pantau Pengadaan Infokom</h1>
            <p class="text-sm text-slate-500 mt-1">Monitoring Pesanan, Anggaran MAK & Proyeksi Realisasi</p>
          </div>

          ${!isConfigured ? `
            <div class="mb-5 p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
              <p class="font-semibold mb-1">⚠️ URL Google Apps Script belum diatur</p>
              <p class="mb-2">Masukkan URL Web App GAS hasil deploy Anda sebelum login.</p>
              <button type="button" onclick="LoginPage.openGasConfig()" class="px-3 py-1 bg-amber-600 text-white rounded font-medium hover:bg-amber-700">
                Atur URL GAS Sekarang
              </button>
            </div>
          ` : ''}

          <form id="login-form" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Username</label>
              <input id="login-username" type="text" required placeholder="admin / user / pbj"
                class="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input id="login-password" type="password" required placeholder="••••••••••••"
                class="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" />
            </div>

            <div id="login-error" class="hidden p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium"></div>

            <button type="submit"
              class="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition text-sm">
              Masuk ke Aplikasi
            </button>
          </form>

          <div class="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>Role: admin, user, pbj</span>
            <button type="button" onclick="LoginPage.openGasConfig()" class="text-blue-600 hover:underline">
              Konfigurasi URL Server
            </button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('login-username').value.trim();
      const password = document.getElementById('login-password').value;
      const errBox = document.getElementById('login-error');
      errBox.classList.add('hidden');

      try {
        const user = await Auth.login(username, password);
        Toast.success(`Selamat datang, ${user.nama}!`);
        App.navigate('dashboard');
      } catch (err) {
        errBox.textContent = err.message || 'Login gagal.';
        errBox.classList.remove('hidden');
      }
    });
  },

  openGasConfig() {
    const current = CONFIG.GAS_URL.includes('REPLACE_WITH') ? '' : CONFIG.GAS_URL;
    Modal.open(`
      <div class="p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold text-slate-900">Konfigurasi URL Google Apps Script</h3>
          <button onclick="Modal.close()" class="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
        </div>
        <p class="text-xs text-slate-500 mb-3">Tempel URL Web App deployment dari Google Apps Script (berakhiran <code>/exec</code>).</p>
        <input id="gas-url-input" type="url" value="${Formatter.escapeHtml(current)}" placeholder="https://script.google.com/macros/s/.../exec"
          class="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm mb-4 focus:ring-2 focus:ring-blue-500 outline-none" />
        <div class="flex justify-end gap-2">
          <button onclick="Modal.close()" class="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50">Batal</button>
          <button onclick="LoginPage.saveGasConfig()" class="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">Simpan URL</button>
        </div>
      </div>
    `, 'max-w-lg');
  },

  saveGasConfig() {
    const val = document.getElementById('gas-url-input').value.trim();
    if (!val) {
      Toast.warning('URL tidak boleh kosong.');
      return;
    }
    localStorage.setItem('gas_url_override', val);
    CONFIG.GAS_URL = val;
    Modal.close();
    Toast.success('URL Server disimpan.');
    this.render(document.getElementById('app'));
  }
};
