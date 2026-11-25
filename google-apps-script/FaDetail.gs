/**
 * FaDetail.gs - Data Anggaran FA Detail (Filter BMB, BDC, BDB) & Proyeksi Insight
 */

var ALLOWED_OUTPUTS = ['BMB', 'BDC', 'BDB'];

function saveFaParsed(params, user) {
  var rows = params.rows || [];
  var periode = params.periode || new Date().toISOString().slice(0, 10);
  if (!rows.length) {
    return error('Data hasil parsing kosong.', 400);
  }

  var uploadId = 'FA-' + Utilities.formatDate(new Date(), 'Asia/Makassar', 'yyyyMMdd-HHmm');
  var sheet = getSheet('fa_detail');

  // Hapus data lama agar fa_detail selalu mencerminkan kondisi FA Detail terkini
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }

  var savedCount = 0;
  var batch = [];

  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var outKode = String(r.output_kode || '').toUpperCase().trim();
    if (ALLOWED_OUTPUTS.indexOf(outKode) === -1) {
      // Hanya simpan BMB, BDC, BDB
      continue;
    }

    var pagu = Number(r.pagu) || 0;
    var realLalu = Number(r.realisasi_lalu) || 0;
    var realIni = Number(r.realisasi_ini) || 0;
    var realTotal = Number(r.realisasi_total) || (realLalu + realIni);
    var sisa = r.sisa !== undefined ? Number(r.sisa) : (pagu - realTotal);
    var persen = pagu > 0 ? Number(((realTotal / pagu) * 100).toFixed(2)) : 0;

    batch.push([
      uploadId,
      periode,
      outKode,
      r.mak_full || '',
      r.program || 'DR.3165',
      r.kegiatan || outKode,
      r.output || '',
      r.komponen || '',
      r.subkomponen || '',
      r.akun_kode || '',
      r.akun_nama || '',
      r.item_no || '',
      r.item_nama || '',
      pagu,
      realLalu,
      realIni,
      realTotal,
      sisa,
      persen
    ]);
    savedCount++;
  }

  if (batch.length > 0) {
    sheet.getRange(2, 1, batch.length, 19).setValues(batch);
  }

  return ok({
    upload_id: uploadId,
    periode: periode,
    saved_count: savedCount,
    message: 'Berhasil menyimpan ' + savedCount + ' baris anggaran (BMB/BDC/BDB).'
  });
}

function getFaDetail(params) {
  var rows = sheetToObjects('fa_detail');
  var outputFilter = params.output_kode || '';
  var makFilter = params.mak_full || '';

  if (outputFilter) {
    rows = rows.filter(function(r) { return r.output_kode === outputFilter; });
  }
  if (makFilter) {
    rows = rows.filter(function(r) { return r.mak_full === makFilter; });
  }

  return ok({
    rows: rows,
    periode: rows.length > 0 ? rows[0].periode : null
  });
}

function getFaSummary(params) {
  var faRows = sheetToObjects('fa_detail');
  var summary = {
    total_pagu: 0,
    total_realisasi: 0,
    total_sisa: 0,
    persen_realisasi: 0,
    periode: faRows.length > 0 ? faRows[0].periode : null,
    by_output: {
      BMB: { output_kode: 'BMB', pagu: 0, realisasi: 0, sisa: 0, persen: 0 },
      BDC: { output_kode: 'BDC', pagu: 0, realisasi: 0, sisa: 0, persen: 0 },
      BDB: { output_kode: 'BDB', pagu: 0, realisasi: 0, sisa: 0, persen: 0 }
    },
    by_mak: []
  };

  var makMap = {};

  faRows.forEach(function(r) {
    var pagu = Number(r.pagu) || 0;
    var real = Number(r.realisasi_total) || 0;
    var sisa = Number(r.sisa) || 0;
    var out = r.output_kode;

    summary.total_pagu += pagu;
    summary.total_realisasi += real;
    summary.total_sisa += sisa;

    if (summary.by_output[out]) {
      summary.by_output[out].pagu += pagu;
      summary.by_output[out].realisasi += real;
      summary.by_output[out].sisa += sisa;
    }

    var mak = r.mak_full;
    if (!makMap[mak]) {
      makMap[mak] = {
        mak_full: mak,
        output_kode: out,
        akun_kode: r.akun_kode,
        akun_nama: r.akun_nama,
        pagu: 0,
        realisasi: 0,
        sisa: 0,
        persen: 0,
        items: []
      };
    }
    makMap[mak].pagu += pagu;
    makMap[mak].realisasi += real;
    makMap[mak].sisa += sisa;
    makMap[mak].items.push(r);
  });

  if (summary.total_pagu > 0) {
    summary.persen_realisasi = Number(((summary.total_realisasi / summary.total_pagu) * 100).toFixed(2));
  }

  ALLOWED_OUTPUTS.forEach(function(k) {
    var o = summary.by_output[k];
    o.persen = o.pagu > 0 ? Number(((o.realisasi / o.pagu) * 100).toFixed(2)) : 0;
  });

  Object.keys(makMap).forEach(function(mak) {
    var m = makMap[mak];
    m.persen = m.pagu > 0 ? Number(((m.realisasi / m.pagu) * 100).toFixed(2)) : 0;
    summary.by_mak.push(m);
  });

  return ok(summary);
}

function getInsight(params) {
  var faSummaryRes = JSON.parse(getFaSummary(params).getContent());
  var faData = faSummaryRes.data;

  var tickets = sheetToObjects('tickets');
  var ticketItems = sheetToObjects('ticket_items');

  // Ticket aktif = belum selesai dan tidak ditolak
  var activeTicketMap = {};
  tickets.forEach(function(t) {
    if (t.stage !== 'selesai' && t.stage !== 'ditolak') {
      activeTicketMap[t.id] = t;
    }
  });

  var komitmenPerMak = {};
  var komitmenPerOutput = { BMB: 0, BDC: 0, BDB: 0 };
  var totalKomitmenAktif = 0;

  ticketItems.forEach(function(it) {
    if (!activeTicketMap[it.ticket_id]) return;
    var nilai = Number(it.harga_final) || Number(it.estimasi_harga) || 0;
    var mak = it.mak_full;
    var out = it.output_kode;

    totalKomitmenAktif += nilai;
    if (komitmenPerOutput[out] !== undefined) {
      komitmenPerOutput[out] += nilai;
    }
    if (!komitmenPerMak[mak]) komitmenPerMak[mak] = { total: 0, items: [] };
    komitmenPerMak[mak].total += nilai;
    komitmenPerMak[mak].items.push({
      ticket_id: it.ticket_id,
      nama_barang: it.nama_barang,
      nilai: nilai,
      stage: activeTicketMap[it.ticket_id].stage,
      substatus: activeTicketMap[it.ticket_id].substatus
    });
  });

  var proyeksiMak = faData.by_mak.map(function(m) {
    var kom = komitmenPerMak[m.mak_full] ? komitmenPerMak[m.mak_full].total : 0;
    var proyReal = m.realisasi + kom;
    var proySisa = m.sisa - kom;
    var proyPersen = m.pagu > 0 ? Number(((proyReal / m.pagu) * 100).toFixed(2)) : 0;
    return {
      mak_full: m.mak_full,
      output_kode: m.output_kode,
      akun_nama: m.akun_nama,
      pagu: m.pagu,
      realisasi_sekarang: m.realisasi,
      sisa_sekarang: m.sisa,
      persen_sekarang: m.persen,
      komitmen_aktif: kom,
      proyeksi_realisasi: proyReal,
      proyeksi_sisa: proySisa,
      proyeksi_persen: proyPersen,
      pesanan_aktif: komitmenPerMak[m.mak_full] ? komitmenPerMak[m.mak_full].items : []
    };
  });

  var proyTotalReal = faData.total_realisasi + totalKomitmenAktif;
  var proyTotalSisa = faData.total_sisa - totalKomitmenAktif;
  var proyTotalPersen = faData.total_pagu > 0 ? Number(((proyTotalReal / faData.total_pagu) * 100).toFixed(2)) : 0;

  return ok({
    periode: faData.periode,
    total_pagu: faData.total_pagu,
    total_realisasi: faData.total_realisasi,
    total_sisa: faData.total_sisa,
    persen_sekarang: faData.persen_realisasi,
    total_komitmen_aktif: totalKomitmenAktif,
    proyeksi_realisasi: proyTotalReal,
    proyeksi_sisa: proyTotalSisa,
    proyeksi_persen: proyTotalPersen,
    by_output: faData.by_output,
    komitmen_per_output: komitmenPerOutput,
    proyeksi_per_mak: proyeksiMak
  });
}
