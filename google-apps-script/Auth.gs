/**
 * Auth.gs - Login, Logout, & Session Token Management
 */

function login(params) {
  var username = String(params.username || params.email || '').trim().toLowerCase();
  var password = String(params.password || '');

  if (!username || !password) {
    return error('Username dan password wajib diisi.', 400);
  }

  var users = sheetToObjects('users');
  var found = null;
  for (var i = 0; i < users.length; i++) {
    var u = users[i];
    if (String(u.username).trim().toLowerCase() === username) {
      found = u;
      break;
    }
  }

  if (!found) {
    return error('Username tidak ditemukan.', 401);
  }

  if (found.active === false || String(found.active).toUpperCase() === 'FALSE') {
    return error('Akun Anda dinonaktifkan. Hubungi Admin.', 403);
  }

  if (String(found.password) !== password) {
    return error('Password salah.', 401);
  }

  var token = generateToken();
  var now = new Date();
  var expires = new Date(now.getTime() + 8 * 60 * 60 * 1000); // 8 jam

  var sessionSheet = getSheet('sessions');
  sessionSheet.appendRow([
    token,
    found.username,
    found.role,
    found.nama,
    now.toISOString(),
    expires.toISOString()
  ]);

  return ok({
    token: token,
    user: {
      username: found.username,
      role: found.role,
      nama: found.nama,
      unit: found.unit || ''
    },
    expires_at: expires.toISOString()
  });
}

function logout(params) {
  var token = params.token;
  if (!token) return ok({ message: 'Logged out' });

  var sheet = getSheet('sessions');
  var values = sheet.getDataRange().getValues();
  for (var i = values.length - 1; i >= 1; i--) {
    if (values[i][0] === token) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
  return ok({ message: 'Berhasil logout.' });
}

function validateToken(token) {
  if (!token) return null;
  var sessions = sheetToObjects('sessions');
  var now = new Date();

  for (var i = 0; i < sessions.length; i++) {
    var s = sessions[i];
    if (s.token === token) {
      var exp = new Date(s.expires_at);
      if (exp > now) {
        return {
          username: s.username,
          role: s.role,
          nama: s.nama
        };
      }
      // Hapus sesi kadaluarsa
      getSheet('sessions').deleteRow(s._rowIndex);
      return null;
    }
  }
  return null;
}

function generateToken() {
  return Utilities.getUuid();
}
