/**
 * Code.gs - Entry Point & Router untuk Pantau Pengadaan Infokom
 * Deploy sebagai Web App: Execute as "Me", Who has access "Anyone"
 */

function doGet(e) {
  return handleRequest(e, 'GET');
}

function doPost(e) {
  return handleRequest(e, 'POST');
}

function handleRequest(e, method) {
  try {
    var params = {};
    if (method === 'POST' && e.postData && e.postData.contents) {
      params = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      params = e.parameter;
    }

    var action = params.action || '';
    var token = params.token || '';

    // Endpoint publik tanpa auth
    if (action === 'ping') {
      return ok({ message: 'Pantau Pengadaan Infokom API Ready', timestamp: new Date().toISOString() });
    }
    if (action === 'login') {
      return login(params);
    }
    if (action === 'setup_db') {
      return setupDatabase();
    }

    // Validasi token untuk semua endpoint terproteksi
    var user = validateToken(token);
    if (!user) {
      return error('Unauthorized: Sesi tidak valid atau telah berakhir. Silakan login kembali.', 401);
    }

    switch (action) {
      // Auth
      case 'logout':
        return logout(params);
      case 'validate_token':
        return ok({ user: user });

      // Tickets (Stage 1 - 4)
      case 'get_tickets':
        return getTickets(params, user);
      case 'get_ticket_detail':
        return getTicketDetail(params, user);
      case 'create_ticket':
        requireRole(user, ['user', 'admin']);
        return createTicket(params, user);
      case 'review_dokumen':
        requireRole(user, ['pbj', 'admin']);
        return reviewDokumen(params, user);
      case 'update_stage3':
        requireRole(user, ['pbj', 'admin']);
        return updateStage3(params, user);
      case 'selesai_sp2d':
        requireRole(user, ['pbj', 'admin']);
        return selesaiSp2d(params, user);

      // Dokumen & Google Drive
      case 'upload_to_drive':
        requireRole(user, ['user', 'admin', 'pbj']);
        return uploadDokumen(params, user);
      case 'get_dokumen':
        return getDokumen(params.ticket_id);
      case 'delete_dokumen':
        requireRole(user, ['user', 'admin', 'pbj']);
        return deleteDokumen(params, user);
      case 'test_drive_access':
        requireRole(user, ['admin']);
        return testDriveAccess(params);

      // FA Detail & Insight Anggaran
      case 'get_fa_summary':
        return getFaSummary(params);
      case 'get_fa_detail':
        return getFaDetail(params);
      case 'save_fa_parsed':
        requireRole(user, ['admin']);
        return saveFaParsed(params, user);
      case 'get_insight':
        return getInsight(params);

      // Settings (Harga Referensi, AI Router, Drive)
      case 'get_harga_ref':
        return getHargaRef();
      case 'save_harga_ref':
        requireRole(user, ['admin', 'pbj']);
        return saveHargaRef(params, user);
      case 'delete_harga_ref':
        requireRole(user, ['admin', 'pbj']);
        return deleteHargaRef(params);
      case 'get_ai_settings':
        requireRole(user, ['admin']);
        return getAiSettings();
      case 'save_ai_settings':
        requireRole(user, ['admin']);
        return saveAiSettings(params);
      case 'test_ai':
        requireRole(user, ['admin']);
        return testAi(params);
      case 'get_drive_settings':
        requireRole(user, ['admin']);
        return getDriveSettings();
      case 'save_drive_settings':
        requireRole(user, ['admin']);
        return saveDriveSettings(params);

      // Users Management
      case 'get_users':
        requireRole(user, ['admin']);
        return getUsers();
      case 'save_user':
        requireRole(user, ['admin']);
        return saveUser(params);
      case 'delete_user':
        requireRole(user, ['admin']);
        return deleteUser(params);

      default:
        return error('Unknown action: ' + action, 400);
    }
  } catch (err) {
    return error(err.message || String(err), 500);
  }
}

// === HELPERS ===

function ok(data) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: true, data: data }))
    .setMimeType(ContentService.MimeType.JSON);
}

function error(message, code) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: false, error: message, code: code || 400 }))
    .setMimeType(ContentService.MimeType.JSON);
}

function requireRole(user, allowedRoles) {
  if (!user || allowedRoles.indexOf(user.role) === -1) {
    throw new Error('Forbidden: Anda tidak memiliki akses untuk tindakan ini.');
  }
}

function getSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    throw new Error('Sheet "' + name + '" tidak ditemukan. Jalankan setupDatabase() terlebih dahulu.');
  }
  return sheet;
}

function sheetToObjects(sheetName) {
  var sheet = getSheet(sheetName);
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  var headers = values[0];
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (row.join('') === '') continue;
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
    }
    obj._rowIndex = i + 1;
    rows.push(obj);
  }
  return rows;
}

/**
 * Jalankan fungsi ini SEKALI dari editor GAS untuk membuat 9 sheet & data awal
 */
function setupDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var schemas = {
    users: ['username', 'password', 'role', 'nama', 'unit', 'active'],
    fa_detail: ['upload_id', 'periode', 'output_kode', 'mak_full', 'program', 'kegiatan', 'output', 'komponen', 'subkomponen', 'akun_kode', 'akun_nama', 'item_no', 'item_nama', 'pagu', 'realisasi_lalu', 'realisasi_ini', 'realisasi_total', 'sisa', 'persen'],
    tickets: ['id', 'stage', 'substatus', 'nodin_nomor', 'nodin_tanggal', 'perihal', 'pemohon_nama', 'pemohon_unit', 'total_estimasi', 'total_final', 'nilai_sp2d', 'nomor_sp2d', 'tanggal_sp2d', 'vendor', 'created_by', 'created_at', 'updated_by', 'updated_at', 'catatan_pbj', 'catatan_tolak'],
    ticket_items: ['id', 'ticket_id', 'nama_barang', 'spesifikasi', 'jumlah', 'satuan', 'mak_full', 'output_kode', 'akun_kode', 'estimasi_harga', 'harga_final', 'keterangan'],
    ticket_dokumen: ['id', 'ticket_id', 'jenis', 'stage_upload', 'filename', 'gdrive_file_id', 'gdrive_url', 'gdrive_view_url', 'mime_type', 'file_size_kb', 'uploaded_by', 'uploaded_at'],
    ticket_history: ['ticket_id', 'stage_lama', 'stage_baru', 'substatus', 'keterangan', 'updated_by', 'updated_at'],
    sessions: ['token', 'username', 'role', 'nama', 'created_at', 'expires_at'],
    harga_referensi: ['id', 'kategori', 'nama_item', 'satuan', 'harga', 'keterangan', 'updated_by', 'updated_at'],
    ai_settings: ['key', 'value']
  };

  Object.keys(schemas).forEach(function(name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      sheet.appendRow(schemas[name]);
      sheet.getRange(1, 1, 1, schemas[name].length).setFontWeight('bold');
    }
  });

  // Seed users jika kosong
  var userSheet = ss.getSheetByName('users');
  if (userSheet.getLastRow() <= 1) {
    userSheet.appendRow(['admin', 'adaptif 2025', 'admin', 'Administrator', 'Tata Usaha / Infokom', true]);
    userSheet.appendRow(['user', 'adaptif 2025', 'user', 'Staff Infokom', 'Tim Infokom', true]);
    userSheet.appendRow(['pbj', 'adaptif 2025', 'pbj', 'Petugas PBJ', 'Unit Pengadaan (PBJ)', true]);
  }

  // Seed harga_referensi jika kosong
  var hargaSheet = ss.getSheetByName('harga_referensi');
  if (hargaSheet.getLastRow() <= 1) {
    var now = new Date().toISOString();
    var defaultHarga = [
      ['HR-001', 'Cetak', 'Spanduk', 'm2', 55000, 'Harga rata-rata vendor lokal per m2', 'admin', now],
      ['HR-002', 'Cetak', 'Baliho', 'm2', 65000, 'Cetak baliho outdoor per m2', 'admin', now],
      ['HR-003', 'Cetak', 'Poster A3', 'lembar', 12000, 'Art paper 260gr per lembar', 'admin', now],
      ['HR-004', 'Cetak', 'Poster A2', 'lembar', 18000, 'Art paper 260gr per lembar', 'admin', now],
      ['HR-005', 'Display', 'X-Banner', 'pcs', 120000, 'Cetak + tiang X-Banner 60x160cm', 'admin', now],
      ['HR-006', 'Cetak', 'Brosur A5', 'paket', 85000, 'Per 100 lembar bolak-balik', 'admin', now],
      ['HR-007', 'Cetak', 'Stiker A4', 'lembar', 15000, 'Stiker vinyl anti air', 'admin', now],
      ['HR-008', 'Perlengkapan', 'Bingkai A3', 'pcs', 480000, 'Bingkai A3 + cetak sertifikat', 'admin', now],
      ['HR-009', 'Cetak', 'Sertifikat', 'pcs', 25000, 'Cetak sertifikat kertas linen/concord', 'admin', now]
    ];
    defaultHarga.forEach(function(r) { hargaSheet.appendRow(r); });
  }

  // Seed ai_settings jika kosong
  var aiSheet = ss.getSheetByName('ai_settings');
  if (aiSheet.getLastRow() <= 1) {
    aiSheet.appendRow(['ai_endpoint', 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions']);
    aiSheet.appendRow(['ai_model', 'gemini-2.5-flash']);
    aiSheet.appendRow(['ai_api_key', '']);
    aiSheet.appendRow(['ai_last_test', '']);
    aiSheet.appendRow(['ai_last_test_status', '']);
    aiSheet.appendRow(['drive_root_folder_id', '']);
  }

  return ok({ message: 'Database 9 sheet berhasil diinisialisasi.' });
}
