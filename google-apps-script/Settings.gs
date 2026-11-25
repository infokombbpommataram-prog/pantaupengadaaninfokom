/**
 * Settings.gs - Harga Referensi (Input Cepat), AI Router Settings, & Google Drive Settings
 */

function getSettingsMap() {
  var rows = sheetToObjects('ai_settings');
  var map = {};
  rows.forEach(function(r) {
    map[r.key] = r.value;
  });
  return map;
}

function setSettingValue(key, value) {
  var sheet = getSheet('ai_settings');
  var rows = sheetToObjects('ai_settings');
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].key === key) {
      sheet.getRange(rows[i]._rowIndex, 2).setValue(value);
      return;
    }
  }
  sheet.appendRow([key, value]);
}

// === HARGA REFERENSI ===

function getHargaRef() {
  var rows = sheetToObjects('harga_referensi');
  return ok({ harga_ref: rows });
}

function saveHargaRef(params, user) {
  var sheet = getSheet('harga_referensi');
  var nowIso = new Date().toISOString();
  var id = params.id;

  if (id) {
    // Update existing
    var rows = sheetToObjects('harga_referensi');
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].id === id) {
        var r = rows[i]._rowIndex;
        sheet.getRange(r, 2).setValue(params.kategori || 'Cetak');
        sheet.getRange(r, 3).setValue(params.nama_item || '');
        sheet.getRange(r, 4).setValue(params.satuan || 'pcs');
        sheet.getRange(r, 5).setValue(Number(params.harga) || 0);
        sheet.getRange(r, 6).setValue(params.keterangan || '');
        sheet.getRange(r, 7).setValue(user.username);
        sheet.getRange(r, 8).setValue(nowIso);
        return ok({ message: 'Harga referensi diperbarui.', id: id });
      }
    }
  }

  // Create new
  var newId = 'HR-' + Utilities.getUuid().slice(0, 6).toUpperCase();
  sheet.appendRow([
    newId,
    params.kategori || 'Cetak',
    params.nama_item || '',
    params.satuan || 'pcs',
    Number(params.harga) || 0,
    params.keterangan || '',
    user.username,
    nowIso
  ]);

  return ok({ message: 'Harga referensi ditambahkan.', id: newId });
}

function deleteHargaRef(params) {
  var id = params.id;
  if (!id) return error('ID wajib diisi.', 400);
  var rows = sheetToObjects('harga_referensi');
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].id === id) {
      getSheet('harga_referensi').deleteRow(rows[i]._rowIndex);
      return ok({ message: 'Item harga dihapus.' });
    }
  }
  return error('Item tidak ditemukan.', 404);
}

// === AI ROUTER SETTINGS ===

function getAiSettings() {
  var map = getSettingsMap();
  return ok({
    ai_endpoint: map['ai_endpoint'] || '',
    ai_model: map['ai_model'] || '',
    ai_api_key: map['ai_api_key'] || '',
    ai_last_test: map['ai_last_test'] || '',
    ai_last_test_status: map['ai_last_test_status'] || ''
  });
}

function saveAiSettings(params) {
  if (params.ai_endpoint !== undefined) setSettingValue('ai_endpoint', String(params.ai_endpoint).trim());
  if (params.ai_model !== undefined) setSettingValue('ai_model', String(params.ai_model).trim());
  if (params.ai_api_key !== undefined && params.ai_api_key !== '') {
    setSettingValue('ai_api_key', String(params.ai_api_key).trim());
  }
  return ok({ message: 'Pengaturan AI Router disimpan.' });
}

function testAi(params) {
  var map = getSettingsMap();
  var endpoint = params.ai_endpoint || map['ai_endpoint'];
  var model = params.ai_model || map['ai_model'];
  var apiKey = params.ai_api_key || map['ai_api_key'];

  if (!endpoint || !model || !apiKey) {
    return error('Endpoint, Model, dan API Key wajib diisi untuk test koneksi.', 400);
  }

  try {
    var payload = {
      model: model,
      messages: [{ role: 'user', content: 'Balas hanya dengan kata: OK' }],
      max_tokens: 10
    };
    var res = UrlFetchApp.fetch(endpoint, {
      method: 'post',
      contentType: 'application/json',
      headers: { 'Authorization': 'Bearer ' + apiKey },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    var code = res.getResponseCode();
    var body = res.getContentText();
    var nowIso = new Date().toISOString();

    if (code >= 200 && code < 300) {
      setSettingValue('ai_last_test', nowIso);
      setSettingValue('ai_last_test_status', 'success');
      return ok({ status: 'success', code: code, tested_at: nowIso, reply: body.slice(0, 200) });
    } else {
      setSettingValue('ai_last_test', nowIso);
      setSettingValue('ai_last_test_status', 'failed: ' + code);
      return error('AI endpoint merespons HTTP ' + code + ': ' + body.slice(0, 300), 400);
    }
  } catch (e) {
    return error('Gagal menghubungi AI endpoint: ' + e.message, 500);
  }
}

// === DRIVE SETTINGS ===

function getDriveSettings() {
  var map = getSettingsMap();
  return ok({
    drive_root_folder_id: map['drive_root_folder_id'] || ''
  });
}

function saveDriveSettings(params) {
  setSettingValue('drive_root_folder_id', String(params.drive_root_folder_id || '').trim());
  return ok({ message: 'Folder Root Google Drive disimpan.' });
}
