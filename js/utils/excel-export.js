/**
 * excel-export.js - Export Data ke Excel (.xlsx) menggunakan SheetJS
 */

const ExcelExport = {
  exportWorkbook(sheets, filename = 'export.xlsx') {
    if (!window.XLSX) {
      Toast.error('Library Excel (SheetJS) belum termuat. Periksa koneksi internet.');
      return;
    }

    const wb = XLSX.utils.book_new();
    sheets.forEach(({ name, rows }) => {
      const safeName = String(name || 'Sheet1').slice(0, 31).replace(/[\\/?*[\]]/g, '_');
      const ws = XLSX.utils.json_to_sheet(rows && rows.length ? rows : [{ Info: 'Tidak ada data' }]);
      XLSX.utils.book_append_sheet(wb, ws, safeName);
    });

    XLSX.writeFile(wb, filename);
    Toast.success(`File ${filename} berhasil diunduh!`);
  }
};
