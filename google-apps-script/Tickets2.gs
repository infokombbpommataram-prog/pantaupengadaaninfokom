/**
 * Tickets2.gs - Review Dokumen (Stage 2->3), Update Proses Pengadaan (Stage 3), & Selesai SP2D (Stage 4)
 */

function reviewDokumen(params, user) {
  var ticketId = params.ticket_id;
  var decision = params.decision; // 'acc' atau 'tolak'
  var catatan = params.catatan || '';

  if (!ticketId || !decision) {
    return error('ticket_id dan decision wajib diisi.', 400);
  }

  var tickets = sheetToObjects('tickets');
  var target = null;
  for (var i = 0; i < tickets.length; i++) {
    if (tickets[i].id === ticketId) {
      target = tickets[i];
      break;
    }
  }
  if (!target) return error('Ticket tidak ditemukan.', 404);

  var sheet = getSheet('tickets');
  var nowIso = new Date().toISOString();
  var stageLama = target.stage;
  var stageBaru = decision === 'acc' ? 'proses_pengadaan' : 'ditolak';
  var substatusBaru = decision === 'acc' ? 'mencari_vendor' : '';

  sheet.getRange(target._rowIndex, 2).setValue(stageBaru);
  sheet.getRange(target._rowIndex, 3).setValue(substatusBaru);
  sheet.getRange(target._rowIndex, 17).setValue(user.username);
  sheet.getRange(target._rowIndex, 18).setValue(nowIso);

  if (decision === 'acc') {
    sheet.getRange(target._rowIndex, 19).setValue(catatan);
  } else {
    sheet.getRange(target._rowIndex, 20).setValue(catatan);
  }

  getSheet('ticket_history').appendRow([
    ticketId,
    stageLama,
    stageBaru,
    substatusBaru,
    decision === 'acc' ? ('Dokumen di-ACC oleh PBJ. ' + catatan) : ('Dokumen ditolak/revisi: ' + catatan),
    user.username,
    nowIso
  ]);

  return ok({ ticket_id: ticketId, stage: stageBaru, substatus: substatusBaru });
}

function updateStage3(params, user) {
  var ticketId = params.ticket_id;
  if (!ticketId) return error('ticket_id wajib diisi.', 400);

  var tickets = sheetToObjects('tickets');
  var target = null;
  for (var i = 0; i < tickets.length; i++) {
    if (tickets[i].id === ticketId) {
      target = tickets[i];
      break;
    }
  }
  if (!target) return error('Ticket tidak ditemukan.', 404);
  if (target.stage === 'selesai') {
    return error('Ticket sudah selesai (SP2D terbit), tidak dapat diubah lagi.', 400);
  }

  var sheet = getSheet('tickets');
  var nowIso = new Date().toISOString();

  // Update item jika PBJ mengedit harga final atau detail item
  var totalFinal = Number(target.total_final) || 0;
  if (params.items && params.items.length > 0) {
    var itemSheet = getSheet('ticket_items');
    var allItems = sheetToObjects('ticket_items');
    totalFinal = 0;

    params.items.forEach(function(upd) {
      var hargaFinal = Number(upd.harga_final) || 0;
      totalFinal += hargaFinal;
      for (var j = 0; j < allItems.length; j++) {
        if (allItems[j].id === upd.id && allItems[j].ticket_id === ticketId) {
          var row = allItems[j]._rowIndex;
          if (upd.nama_barang !== undefined) itemSheet.getRange(row, 3).setValue(upd.nama_barang);
          if (upd.spesifikasi !== undefined) itemSheet.getRange(row, 4).setValue(upd.spesifikasi);
          if (upd.jumlah !== undefined) itemSheet.getRange(row, 5).setValue(Number(upd.jumlah));
          if (upd.satuan !== undefined) itemSheet.getRange(row, 6).setValue(upd.satuan);
          if (upd.mak_full !== undefined) {
            itemSheet.getRange(row, 7).setValue(upd.mak_full);
            itemSheet.getRange(row, 8).setValue(extractOutputKode(upd.mak_full));
            itemSheet.getRange(row, 9).setValue(extractAkunKode(upd.mak_full));
          }
          itemSheet.getRange(row, 11).setValue(hargaFinal);
          if (upd.keterangan !== undefined) itemSheet.getRange(row, 12).setValue(upd.keterangan);
          break;
        }
      }
    });
  }

  var newSubstatus = params.substatus !== undefined ? params.substatus : target.substatus;
  var vendor = params.vendor !== undefined ? params.vendor : target.vendor;
  var catatanPbj = params.catatan_pbj !== undefined ? params.catatan_pbj : target.catatan_pbj;

  sheet.getRange(target._rowIndex, 3).setValue(newSubstatus);
  sheet.getRange(target._rowIndex, 10).setValue(totalFinal);
  sheet.getRange(target._rowIndex, 14).setValue(vendor);
  sheet.getRange(target._rowIndex, 17).setValue(user.username);
  sheet.getRange(target._rowIndex, 18).setValue(nowIso);
  sheet.getRange(target._rowIndex, 19).setValue(catatanPbj);

  getSheet('ticket_history').appendRow([
    ticketId,
    target.stage,
    target.stage,
    newSubstatus,
    params.history_note || ('Update Stage 3 (' + newSubstatus + ') - Total Final: ' + totalFinal),
    user.username,
    nowIso
  ]);

  return ok({
    ticket_id: ticketId,
    substatus: newSubstatus,
    total_final: totalFinal
  });
}

function selesaiSp2d(params, user) {
  var ticketId = params.ticket_id;
  var nilaiSp2d = Number(params.nilai_sp2d);
  var nomorSp2d = params.nomor_sp2d || '';
  var tanggalSp2d = params.tanggal_sp2d || new Date().toISOString().slice(0, 10);

  if (!ticketId || isNaN(nilaiSp2d) || nilaiSp2d <= 0) {
    return error('ticket_id dan nilai_sp2d yang valid wajib diisi.', 400);
  }

  var tickets = sheetToObjects('tickets');
  var target = null;
  for (var i = 0; i < tickets.length; i++) {
    if (tickets[i].id === ticketId) {
      target = tickets[i];
      break;
    }
  }
  if (!target) return error('Ticket tidak ditemukan.', 404);

  var sheet = getSheet('tickets');
  var nowIso = new Date().toISOString();

  sheet.getRange(target._rowIndex, 2).setValue('selesai');
  sheet.getRange(target._rowIndex, 3).setValue('sp2d_terbit');
  sheet.getRange(target._rowIndex, 10).setValue(nilaiSp2d);
  sheet.getRange(target._rowIndex, 11).setValue(nilaiSp2d);
  sheet.getRange(target._rowIndex, 12).setValue(nomorSp2d);
  sheet.getRange(target._rowIndex, 13).setValue(tanggalSp2d);
  sheet.getRange(target._rowIndex, 17).setValue(user.username);
  sheet.getRange(target._rowIndex, 18).setValue(nowIso);

  getSheet('ticket_history').appendRow([
    ticketId,
    target.stage,
    'selesai',
    'sp2d_terbit',
    'Pembayaran selesai. SP2D No: ' + nomorSp2d + ' senilai Rp ' + nilaiSp2d,
    user.username,
    nowIso
  ]);

  return ok({ ticket_id: ticketId, stage: 'selesai', nilai_sp2d: nilaiSp2d });
}
