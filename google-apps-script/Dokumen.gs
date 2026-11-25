/**
 * Dokumen.gs - Upload & Manajemen Dokumen Ticket (Stage 2 & Stage 3)
 */

function uploadDokumen(params, user) {
  var ticketId = params.ticket_id;
  var jenis = params.jenis; // nodin, desain, spb, penawaran, spk, bast, spm, sp2d
  var stageUpload = params.stage_upload || (['nodin', 'desain', 'spb'].indexOf(jenis) !== -1 ? 'stage2' : 'stage3');
  var filename = params.filename;
  var mimeType = params.mime_type || 'application/pdf';
  var base64Data = params.base64;

  if (!ticketId || !jenis || !filename || !base64Data) {
    return error('Parameter upload dokumen tidak lengkap.', 400);
  }

  var stageFolder = stageUpload === 'stage2' ? 'Stage2 - Usulan' : 'Stage3 - Pengadaan';
  var driveRes = uploadFileToDrive(base64Data, filename, mimeType, ticketId, stageFolder);

  var dokId = 'DOK-' + Utilities.getUuid().slice(0, 8).toUpperCase();
  var nowIso = new Date().toISOString();

  var sheet = getSheet('ticket_dokumen');
  sheet.appendRow([
    dokId,
    ticketId,
    jenis,
    stageUpload,
    filename,
    driveRes.file_id,
    driveRes.url,
    driveRes.view_url,
    mimeType,
    driveRes.size_kb,
    user.username,
    nowIso
  ]);

  // Jika stage 2 dan ketiga dokumen (nodin, desain, spb) sudah lengkap, otomatis ubah stage ke data_usulan_lengkap
  if (stageUpload === 'stage2') {
    checkAndAdvanceStage2(ticketId, user);
  }

  return ok({
    id: dokId,
    ticket_id: ticketId,
    jenis: jenis,
    filename: filename,
    gdrive_file_id: driveRes.file_id,
    gdrive_url: driveRes.url,
    gdrive_view_url: driveRes.view_url,
    size_kb: driveRes.size_kb
  });
}

function checkAndAdvanceStage2(ticketId, user) {
  var docs = sheetToObjects('ticket_dokumen').filter(function(d) { return d.ticket_id === ticketId; });
  var hasNodin = docs.some(function(d) { return d.jenis === 'nodin'; });
  var hasDesain = docs.some(function(d) { return d.jenis === 'desain'; });
  var hasSpb = docs.some(function(d) { return d.jenis === 'spb'; });

  if (hasNodin && hasDesain && hasSpb) {
    var ticketSheet = getSheet('tickets');
    var tickets = sheetToObjects('tickets');
    for (var i = 0; i < tickets.length; i++) {
      var t = tickets[i];
      if (t.id === ticketId && (t.stage === 'permintaan_diusulkan' || t.stage === 'ditolak')) {
        var nowIso = new Date().toISOString();
        ticketSheet.getRange(t._rowIndex, 2).setValue('data_usulan_lengkap');
        ticketSheet.getRange(t._rowIndex, 17).setValue(user.username);
        ticketSheet.getRange(t._rowIndex, 18).setValue(nowIso);

        getSheet('ticket_history').appendRow([
          ticketId,
          t.stage,
          'data_usulan_lengkap',
          '',
          'Dokumen Nodin, Desain, dan SPB telah lengkap. Menunggu review PBJ.',
          user.username,
          nowIso
        ]);
        break;
      }
    }
  }
}

function getDokumen(ticketId) {
  var docs = sheetToObjects('ticket_dokumen').filter(function(d) {
    return d.ticket_id === ticketId;
  });
  return ok({ dokumen: docs });
}

function deleteDokumen(params, user) {
  var dokId = params.id;
  if (!dokId) return error('ID dokumen wajib diisi.', 400);

  var docs = sheetToObjects('ticket_dokumen');
  var target = null;
  for (var i = 0; i < docs.length; i++) {
    if (docs[i].id === dokId) {
      target = docs[i];
      break;
    }
  }
  if (!target) return error('Dokumen tidak ditemukan.', 404);

  if (user.role !== 'admin' && target.uploaded_by !== user.username) {
    return error('Anda hanya bisa menghapus dokumen yang Anda upload.', 403);
  }

  // Hapus file di Drive (trashed)
  try {
    if (target.gdrive_file_id) {
      DriveApp.getFileById(target.gdrive_file_id).setTrashed(true);
    }
  } catch (e) {
    // Abaikan jika file sudah terhapus di Drive
  }

  getSheet('ticket_dokumen').deleteRow(target._rowIndex);
  return ok({ message: 'Dokumen berhasil dihapus.' });
}
