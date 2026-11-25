/**
 * Users.gs - Manajemen User (Admin Only)
 */

function getUsers() {
  var users = sheetToObjects('users').map(function(u) {
    return {
      username: u.username,
      role: u.role,
      nama: u.nama,
      unit: u.unit,
      active: u.active === true || String(u.active).toUpperCase() === 'TRUE'
    };
  });
  return ok({ users: users });
}

function saveUser(params) {
  var username = String(params.username || '').trim().toLowerCase();
  if (!username) return error('Username wajib diisi.', 400);

  var sheet = getSheet('users');
  var rows = sheetToObjects('users');
  var activeVal = params.active !== undefined ? Boolean(params.active) : true;

  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].username).toLowerCase() === username) {
      var r = rows[i]._rowIndex;
      if (params.password) sheet.getRange(r, 2).setValue(params.password);
      if (params.role) sheet.getRange(r, 3).setValue(params.role);
      if (params.nama) sheet.getRange(r, 4).setValue(params.nama);
      if (params.unit !== undefined) sheet.getRange(r, 5).setValue(params.unit);
      sheet.getRange(r, 6).setValue(activeVal);
      return ok({ message: 'User "' + username + '" diperbarui.' });
    }
  }

  if (!params.password) {
    return error('Password wajib diisi untuk user baru.', 400);
  }

  sheet.appendRow([
    username,
    params.password,
    params.role || 'user',
    params.nama || username,
    params.unit || 'Tim Infokom',
    activeVal
  ]);

  return ok({ message: 'User "' + username + '" berhasil ditambahkan.' });
}

function deleteUser(params) {
  var username = String(params.username || '').trim().toLowerCase();
  if (username === 'admin') {
    return error('Akun admin utama tidak boleh dihapus.', 400);
  }
  var rows = sheetToObjects('users');
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].username).toLowerCase() === username) {
      getSheet('users').deleteRow(rows[i]._rowIndex);
      return ok({ message: 'User "' + username + '" dihapus.' });
    }
  }
  return error('User tidak ditemukan.', 404);
}
