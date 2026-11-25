/**
 * auth.js - Manajemen Autentikasi & Session Role
 */

const Auth = {
  getSession() {
    const token = localStorage.getItem('pp_token');
    const userStr = localStorage.getItem('pp_user');
    if (!token || !userStr) return null;
    try {
      return { token, user: JSON.parse(userStr) };
    } catch (e) {
      return null;
    }
  },

  getUser() {
    const s = this.getSession();
    return s ? s.user : null;
  },

  isLoggedIn() {
    return !!this.getSession();
  },

  hasRole(roles) {
    const u = this.getUser();
    if (!u) return false;
    if (Array.isArray(roles)) return roles.includes(u.role);
    return u.role === roles;
  },

  async login(username, password) {
    const data = await API.post('login', { username, password }, 'Menghubungkan ke database...');
    localStorage.setItem('pp_token', data.token);
    localStorage.setItem('pp_user', JSON.stringify(data.user));
    return data.user;
  },

  async logout() {
    try {
      await API.post('logout', {}, 'Menghubungkan ke database...');
    } catch (e) {
      // Tetap bersihkan sesi lokal walau request gagal
    }
    this.clearSession();
    App.navigate('login');
  },

  clearSession() {
    localStorage.removeItem('pp_token');
    localStorage.removeItem('pp_user');
  }
};
