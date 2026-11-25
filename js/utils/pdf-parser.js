/**
 * pdf-parser.js - Ekstrak Teks dari PDF di Browser menggunakan pdf.js CDN
 */

const PdfParser = {
  async extractText(file) {
    if (!window.pdfjsLib) {
      throw new Error('Library pdf.js belum termuat. Periksa koneksi internet.');
    }

    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(' ');
      fullText += `\n--- HALAMAN ${i} ---\n` + pageText;
    }
    return fullText;
  }
};
