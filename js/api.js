/**
 * api.js - Wrapper Komunikasi ke Google Apps Script Web App
 */

const API = {
  async call(action, data = {}, method = 'POST', loadingText = 'Menghubungkan ke database...') {
    if (!CONFIG.GAS_URL || CONFIG.GAS_URL.includes('REPLACE_WITH_YOUR_DEPLOYMENT_ID')) {
      Toast.error('URL Google Apps Script (GAS_URL) belum diatur di Pengaturan atau js/config.js.');
      throw new Error('GAS_URL belum dikonfigurasi');
    }

    const token = localStorage.getItem('pp_token') || '';
    Loading.show(loadingText);

    try {
      let response;
      if (method === 'GET') {
        const params = new URLSearchParams({ action, token, ...data });
        response = await fetch(`${CONFIG.GAS_URL}?${params.toString()}`, {
          method: 'GET',
          redirect: 'follow'
        });
      } else {
        // Gunakan text/plain agar browser tidak mengirim preflight OPTIONS (CORS GAS)
        response = await fetch(CONFIG.GAS_URL, {
          method: 'POST',
          redirect: 'follow',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action, token, ...data })
        });
      }

      const json = await response.json();

      if (!json.success) {
        if (json.code === 401 && action !== 'login') {
          Auth.clearSession();
          App.navigate('login');
        }
        throw new Error(json.error || 'Terjadi kesalahan pada server.');
      }

      return json.data;
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
        throw new Error('Gagal terhubung ke server Google Apps Script. Periksa koneksi internet atau URL deployment.');
      }
      throw err;
    } finally {
      Loading.hide();
    }
  },

  get(action, params = {}, loadingText = 'Menghubungkan ke database...') {
    return this.call(action, params, 'GET', loadingText);
  },

  post(action, data = {}, loadingText = 'Menghubungkan ke database...') {
    return this.call(action, data, 'POST', loadingText);
  }
};
