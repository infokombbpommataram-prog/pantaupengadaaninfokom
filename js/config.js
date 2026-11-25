/**
 * config.js - Konstanta Global Aplikasi
 */

const CONFIG = {
  // URL Web App Google Apps Script
  GAS_URL: localStorage.getItem('gas_url_override') || 'https://script.google.com/macros/s/AKfycbzcEsNR6CvvkgwPLtapHz05RHrZlU-XvgRbPLM8cIlLAOtYGcwsCWM9PMzj6fNKgKAq/exec',

  // Output MAK yang dikelola
  MAK_OUTPUTS: ['BMB', 'BDC', 'BDB'],

  // 4 Stage Utama Ticket
  STAGES: {
    permintaan_diusulkan: {
      step: 1,
      label: 'Permintaan Diusulkan',
      badge: 'bg-slate-100 text-slate-700 border-slate-300'
    },
    data_usulan_lengkap: {
      step: 2,
      label: 'Data Usulan Lengkap',
      badge: 'bg-amber-100 text-amber-800 border-amber-300'
    },
    proses_pengadaan: {
      step: 3,
      label: 'Proses Pengadaan',
      badge: 'bg-blue-100 text-blue-800 border-blue-300'
    },
    selesai: {
      step: 4,
      label: 'Pembayaran Selesai',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-300'
    },
    ditolak: {
      step: 0,
      label: 'Ditolak / Revisi',
      badge: 'bg-rose-100 text-rose-800 border-rose-300'
    }
  },

  // Sub-status di dalam Stage 3 (PBJ)
  SUBSTATUS_STAGE3: [
    { kode: 'mencari_vendor', label: 'Mencari Vendor', desc: 'PBJ sedang survey harga', docLabel: 'Screenshot Penawaran' },
    { kode: 'penawaran_diterima', label: 'Penawaran Diterima', desc: 'Sudah ada penawaran dari vendor', docLabel: 'PDF Penawaran Harga' },
    { kode: 'pemesanan_dilakukan', label: 'Pemesanan Dilakukan', desc: 'SPK / PO sudah dikeluarkan', docLabel: 'PDF SPK / PO' },
    { kode: 'barang_diterima', label: 'Barang Diterima', desc: 'BAST sudah ditandatangani', docLabel: 'PDF / Foto BAST' },
    { kode: 'spm_diproses', label: 'SPP/SPM Diproses', desc: 'Proses pembayaran di keuangan', docLabel: 'PDF SPP / SPM' },
    { kode: 'sp2d_terbit', label: 'SP2D Terbit', desc: 'Dana sudah cair dari KPPN', docLabel: 'PDF / Screenshot SP2D' }
  ],

  // Jenis Dokumen Stage 2 & Stage 3
  DOC_TYPES_STAGE2: [
    { jenis: 'nodin', label: 'Nota Dinas (Nodin)', accept: '.pdf', wajib: true },
    { jenis: 'desain', label: 'Desain / Referensi', accept: '.pdf,.jpg,.jpeg,.png', wajib: true },
    { jenis: 'spb', label: 'SPB (Surat Permintaan Barang)', accept: '.pdf', wajib: true }
  ],

  DOC_TYPES_STAGE3: [
    { jenis: 'penawaran', label: 'Penawaran Harga', accept: '.pdf,.jpg,.jpeg,.png', wajib: false },
    { jenis: 'spk', label: 'SPK / Purchase Order', accept: '.pdf,.jpg,.jpeg,.png', wajib: false },
    { jenis: 'bast', label: 'BAST (Berita Acara Serah Terima)', accept: '.pdf,.jpg,.jpeg,.png', wajib: true },
    { jenis: 'spm', label: 'SPP / SPM', accept: '.pdf,.jpg,.jpeg,.png', wajib: false },
    { jenis: 'sp2d', label: 'SP2D', accept: '.pdf,.jpg,.jpeg,.png', wajib: true }
  ]
};
