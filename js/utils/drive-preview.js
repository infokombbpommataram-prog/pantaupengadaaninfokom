/**
 * drive-preview.js - Modal Preview Dokumen Google Drive Inline
 */

const DrivePreview = {
  show(fileId, filename, mimeType, gdriveUrl) {
    const isImage = mimeType && mimeType.startsWith('image/');
    const previewUrl = isImage
      ? `https://drive.google.com/uc?export=view&id=${fileId}`
      : `https://drive.google.com/file/d/${fileId}/preview`;

    const openUrl = gdriveUrl || `https://drive.google.com/file/d/${fileId}/view`;

    Modal.open(`
      <div class="p-5">
        <div class="flex items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div class="min-w-0">
            <h3 class="font-bold text-slate-900 truncate">${Formatter.escapeHtml(filename || 'Preview Dokumen')}</h3>
            <p class="text-xs text-slate-400">Google Drive Viewer</p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <a href="${openUrl}" target="_blank" rel="noopener"
              class="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold">
              🔗 Buka di Tab Baru
            </a>
            <button onclick="Modal.close()" class="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold">
              Tutup
            </button>
          </div>
        </div>
        <div class="mt-4 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center min-h-[65vh]">
          ${isImage
            ? `<img src="${previewUrl}" alt="${Formatter.escapeHtml(filename)}" class="max-h-[70vh] object-contain" />`
            : `<iframe src="${previewUrl}" class="w-full h-[70vh] border-0" allow="autoplay"></iframe>`
          }
        </div>
      </div>
    `, 'max-w-4xl');
  }
};
