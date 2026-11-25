/**
 * insight.js - Helper Kalkulasi Proyeksi Sisa Anggaran Client-Side
 */

const InsightHelper = {
  hitungProyeksiMak(makObj, komitmenTambahan = 0) {
    const pagu = Number(makObj.pagu) || 0;
    const real = Number(makObj.realisasi_sekarang ?? makObj.realisasi) || 0;
    const sisa = Number(makObj.sisa_sekarang ?? makObj.sisa) || 0;
    const komitmen = (Number(makObj.komitmen_aktif) || 0) + komitmenTambahan;

    const proyeksiReal = real + komitmen;
    const proyeksiSisa = sisa - komitmen;
    const proyeksiPersen = pagu > 0 ? Number(((proyeksiReal / pagu) * 100).toFixed(2)) : 0;

    return {
      pagu,
      realisasi_sekarang: real,
      sisa_sekarang: sisa,
      komitmen,
      proyeksi_realisasi: proyeksiReal,
      proyeksi_sisa: proyeksiSisa,
      proyeksi_persen: proyeksiPersen
    };
  },

  badgeColor(proyeksiSisa, pagu) {
    if (proyeksiSisa < 0) return 'bg-rose-100 text-rose-800 border-rose-300';
    const pctSisa = pagu > 0 ? (proyeksiSisa / pagu) * 100 : 0;
    if (pctSisa < 5) return 'bg-rose-100 text-rose-800 border-rose-300';
    if (pctSisa <= 20) return 'bg-amber-100 text-amber-800 border-amber-300';
    return 'bg-emerald-100 text-emerald-800 border-emerald-300';
  }
};
