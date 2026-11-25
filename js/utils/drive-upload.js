/**
 * drive-upload.js - Konversi File ke Base64 & Upload ke Google Drive via GAS
 */

const DriveUpload = {
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  },

  async upload(file, ticketId, jenis, stageUpload) {
    if (!file) throw new Error('Pilih file terlebih dahulu.');
    // Batasi ukuran 15MB agar aman dengan limit payload GAS
    if (file.size > 15 * 1024 * 1024) {
      throw new Error('Ukuran file maksimal 15 MB. Silakan kompres PDF/gambar terlebih dahulu.');
    }

    const base64 = await this.fileToBase64(file);
    return await API.post('upload_to_drive', {
      ticket_id: ticketId,
      jenis: jenis,
      stage_upload: stageUpload,
      filename: file.name,
      mime_type: file.type || 'application/pdf',
      base64: base64
    }, 'Menghubungkan ke database... (Mengupload ke Google Drive)');
  }
};
