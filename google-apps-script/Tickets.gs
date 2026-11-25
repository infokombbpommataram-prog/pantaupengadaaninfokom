/**
 * Tickets.gs - CRUD Ticket & Ticket Items (Stage 1)
 */

function getTickets(params, user) {
  var tickets = sheetToObjects('tickets');
  var items = sheetToObjects('ticket_items');
  var docs = sheetToObjects('ticket_dokumen');

  // Filter untuk role 'user': lihat semua atau milik sendiri (user bisa melihat semua atau difilter di UI)
  // Sesuai UX, user bisa lihat daftar pengajuan; kita kirim semua tapi tandai kepemilikan, atau filter jika diminta
  var filterStage = params.stage || '';
  var filterOutput = params.output_kode || '';
  var onlyMine = params.only_mine === 'true' || params.only_mine === true;

  var result = [];
  for (var i = tickets.length - 1; i >= 0; i--) {
    var t = tickets[i];
    if (onlyMine && t.created_by !== user.username) continue;
    if (filterStage && t.stage !== filterStage) continue;

    var tItems = items.filter(function(it) { return it.ticket_id === t.id; });
    if (filterOutput) {
      var hasOutput = tItems.some(function(it) { return it.output_kode === filterOutput; });
      if (!hasOutput) continue;
    }

    var tDocs = docs.filter(function(d) { return d.ticket_id === t.id; });

    t.items = tItems;
    t.dokumen_count = tDocs.length;
    t.dokumen_stage2 = {
      nodin: tDocs.some(function(d) { return d.jenis === 'nodin'; }),
      desain: tDocs.some(function(d) { return d.jenis === 'desain'; }),
      spb: tDocs.some(function(d) { return d.jenis === 'spb'; })
    };
    result.push(t);
  }

  return ok({ tickets: result });
}

function getTicketDetail(params, user) {
  var id = params.id || params.ticket_id;
  if (!id) return error('ID ticket wajib diisi.', 400);

  var tickets = sheetToObjects('tickets');
  var ticket = null;
  for (var i = 0; i < tickets.length; i++) {
    if (tickets[i].id === id) {
      ticket = tickets[i];
      break;
    }
  }
  if (!ticket) return error('Ticket tidak ditemukan.', 404);

  var items = sheetToObjects('ticket_items').filter(function(it) { return it.ticket_id === id; });
  var dokumen = sheetToObjects('ticket_dokumen').filter(function(d) { return d.ticket_id === id; });
  var history = sheetToObjects('ticket_history').filter(function(h) { return h.ticket_id === id; });

  return ok({
    ticket: ticket,
    items: items,
    dokumen: dokumen,
    history: history
  });
}

function createTicket(params, user) {
  var items = params.items || [];
  if (!items.length) {
    return error('Minimal harus ada 1 item barang.', 400);
  }

  var now = new Date();
  var ym = Utilities.formatDate(now, 'Asia/Makassar', 'yyyyMM');
  var existing = sheetToObjects('tickets');
  var seq = 1;
  var prefix = 'PGD-' + ym + '-';
  existing.forEach(function(t) {
    if (String(t.id).indexOf(prefix) === 0) {
      var num = parseInt(String(t.id).replace(prefix, ''), 10);
      if (!isNaN(num) && num >= seq) seq = num + 1;
    }
  });
  var ticketId = prefix + ('000' + seq).slice(-3);

  var totalEstimasi = 0;
  var itemSheet = getSheet('ticket_items');

  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var est = Number(it.estimasi_harga) || 0;
    totalEstimasi += est;

    var makFull = String(it.mak_full || '').trim();
    var outputKode = it.output_kode || extractOutputKode(makFull);
    var akunKode = it.akun_kode || extractAkunKode(makFull);
    var itemId = 'ITEM-' + ticketId + '-' + ('00' + (i + 1)).slice(-2);

    itemSheet.appendRow([
      itemId,
      ticketId,
      it.nama_barang || '',
      it.spesifikasi || '',
      Number(it.jumlah) || 1,
      it.satuan || 'pcs',
      makFull,
      outputKode,
      akunKode,
      est,
      est, // harga_final awal disamakan dengan estimasi
      it.keterangan || ''
    ]);
  }

  var nowIso = now.toISOString();
  var ticketSheet = getSheet('tickets');
  ticketSheet.appendRow([
    ticketId,
    'permintaan_diusulkan',
    '',
    params.nodin_nomor || '',
    params.nodin_tanggal || '',
    params.perihal || '',
    params.pemohon_nama || user.nama,
    params.pemohon_unit || 'Tim Infokom',
    totalEstimasi,
    totalEstimasi,
    0,
    '',
    '',
    '',
    user.username,
    nowIso,
    user.username,
    nowIso,
    '',
    ''
  ]);

  // Catat history
  getSheet('ticket_history').appendRow([
    ticketId,
    '',
    'permintaan_diusulkan',
    '',
    'Ticket pengadaan dibuat oleh ' + user.nama,
    user.username,
    nowIso
  ]);

  // Coba buat folder di Drive jika sudah dikonfigurasi (tidak menggagalkan create jika belum)
  try {
    createTicketFolder(ticketId);
  } catch (e) {
    // Abaikan jika root folder belum diset
  }

  return ok({
    ticket_id: ticketId,
    total_estimasi: totalEstimasi,
    message: 'Ticket ' + ticketId + ' berhasil dibuat.'
  });
}

function extractOutputKode(mak) {
  if (!mak) return '';
  var parts = mak.split('.');
  for (var i = 0; i < parts.length; i++) {
    if (parts[i] === 'BMB' || parts[i] === 'BDC' || parts[i] === 'BDB') {
      return parts[i];
    }
  }
  return '';
}

function extractAkunKode(mak) {
  if (!mak) return '';
  var parts = mak.split('.');
  return parts[parts.length - 1] || '';
}
