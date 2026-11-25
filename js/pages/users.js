/**
 * users.js - Manajemen User (Admin Only)
 */

const UsersPage = {
  users: [],

  async render(container) {
    container.innerHTML = `
      <div class="max-w-4xl mx-auto space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-bold text-slate-900">👥 Kelola User</h2>
            <p class="text-sm text-slate-500">Tambah atau ubah akun admin, user, dan pbj</p>
          </div>
          <button onclick="UsersPage.openModal()" class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">
            + Tambah User
          </button>
        </div>
        <div id="usr-table-wrap" class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"></div>
      </div>
    `;
    await this.load();
  },

  async load() {
    try {
      const res = await API.get('get_users', {}, 'Menghubungkan ke database...');
      this.users = res.users || [];
      this.renderTable();
    } catch (err) {
      document.getElementById('usr-table-wrap').innerHTML = `<div class="p-6 text-rose-600 text-sm">${Formatter.escapeHtml(err.message)}</div>`;
    }
  },

  renderTable() {
    const wrap = document.getElementById('usr-table-wrap');
    if (!wrap) return;

    wrap.innerHTML = `
      <table class="w-full text-sm text-left">
        <thead class="bg-slate-50 text-xs text-slate-500 uppercase border-b">
          <tr>
            <th class="px-5 py-3">Username</th>
            <th class="px-5 py-3">Nama</th>
            <th class="px-5 py-3">Role</th>
            <th class="px-5 py-3">Status</th>
            <th class="px-5 py-3 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${this.users.map((u, idx) => `
            <tr class="hover:bg-slate-50">
              <td class="px-5 py-3 font-mono font-semibold text-slate-800">${Formatter.escapeHtml(u.username)}</td>
              <td class="px-5 py-3">${Formatter.escapeHtml(u.nama)} <span class="text-xs text-slate-400">(${Formatter.escapeHtml(u.unit || '-')})</span></td>
              <td class="px-5 py-3 uppercase text-xs font-bold">${Formatter.escapeHtml(u.role)}</td>
              <td class="px-5 py-3">
                <span class="px-2 py-0.5 rounded-full text-xs font-semibold ${u.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}">
                  ${u.active ? 'Aktif' : 'Nonaktif'}
                </span>
              </td>
              <td class="px-5 py-3 text-right space-x-2">
                <button onclick="UsersPage.openModal(${idx})" class="text-blue-600 hover:underline text-xs font-semibold">Edit</button>
                ${u.username !== 'admin' ? `<button onclick="UsersPage.remove('${u.username}')" class="text-rose-600 hover:underline text-xs font-semibold">Hapus</button>` : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  },

  openModal(idx = null) {
    const u = idx !== null ? this.users[idx] : { username: '', nama: '', unit: 'Tim Infokom', role: 'user', active: true };
    const isEdit = idx !== null;

    Modal.open(`
      <div class="p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-bold">${isEdit ? 'Edit User' : 'Tambah User Baru'}</h3>
          <button onclick="Modal.close()" class="text-slate-400 text-xl">&times;</button>
        </div>
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Username *</label>
            <input id="u-username" type="text" value="${Formatter.escapeHtml(u.username)}" ${isEdit ? 'readonly class="w-full px-3 py-2 border rounded-lg text-sm bg-slate-100"' : 'class="w-full px-3 py-2 border rounded-lg text-sm"'} />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Password ${isEdit ? '(kosongkan jika tidak ubah)' : '*'}</label>
            <input id="u-password" type="password" class="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Nama Lengkap</label>
              <input id="u-nama" type="text" value="${Formatter.escapeHtml(u.nama)}" class="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Role</label>
              <select id="u-role" class="w-full px-3 py-2 border rounded-lg text-sm bg-white">
                <option value="user" ${u.role === 'user' ? 'selected' : ''}>user</option>
                <option value="pbj" ${u.role === 'pbj' ? 'selected' : ''}>pbj</option>
                <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>admin</option>
              </select>
            </div>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Unit</label>
            <input id="u-unit" type="text" value="${Formatter.escapeHtml(u.unit || '')}" class="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <label class="flex items-center gap-2 text-sm">
            <input id="u-active" type="checkbox" ${u.active ? 'checked' : ''} />
            <span>Akun Aktif</span>
          </label>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <button onclick="Modal.close()" class="px-4 py-2 rounded-lg border text-sm">Batal</button>
          <button onclick="UsersPage.save()" class="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold">Simpan</button>
        </div>
      </div>
    `, 'max-w-md');
  },

  async save() {
    try {
      await API.post('save_user', {
        username: document.getElementById('u-username').value.trim(),
        password: document.getElementById('u-password').value,
        nama: document.getElementById('u-nama').value.trim(),
        role: document.getElementById('u-role').value,
        unit: document.getElementById('u-unit').value.trim(),
        active: document.getElementById('u-active').checked
      }, 'Menghubungkan ke database...');
      Modal.close();
      Toast.success('Data user disimpan.');
      await this.load();
    } catch (err) {
      Toast.error(err.message);
    }
  },

  async remove(username) {
    if (!confirm(`Hapus user "${username}"?`)) return;
    try {
      await API.post('delete_user', { username }, 'Menghubungkan ke database...');
      Toast.success('User dihapus.');
      await this.load();
    } catch (err) {
      Toast.error(err.message);
    }
  }
};
