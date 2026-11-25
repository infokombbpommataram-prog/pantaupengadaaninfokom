/**
 * Drive.gs - Google Drive Folder & File Upload Management
 */

function getRootDriveFolder() {
  var settings = getSettingsMap();
  var folderId = settings['drive_root_folder_id'];
  if (!folderId) {
    throw new Error('Folder Root Google Drive belum dikonfigurasi di Pengaturan.');
  }
  try {
    return DriveApp.getFolderById(folderId.trim());
  } catch (e) {
    throw new Error('Folder Google Drive dengan ID "' + folderId + '" tidak dapat diakses.');
  }
}

function getOrCreateSubfolder(parentFolder, name) {
  var folders = parentFolder.getFoldersByName(name);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parentFolder.createFolder(name);
}

function createTicketFolder(ticketId) {
  var root = getRootDriveFolder();
  var ticketFolder = getOrCreateSubfolder(root, ticketId);
  getOrCreateSubfolder(ticketFolder, 'Stage2 - Usulan');
  getOrCreateSubfolder(ticketFolder, 'Stage3 - Pengadaan');
  return ticketFolder;
}

function uploadFileToDrive(base64Data, filename, mimeType, ticketId, stageFolderName) {
  var root = getRootDriveFolder();
  var ticketFolder = getOrCreateSubfolder(root, ticketId);
  var targetFolder = stageFolderName ? getOrCreateSubfolder(ticketFolder, stageFolderName) : ticketFolder;

  // Bersihkan prefix data URI jika ada (mis. "data:application/pdf;base64,")
  var cleanBase64 = base64Data;
  if (cleanBase64.indexOf(',') !== -1) {
    cleanBase64 = cleanBase64.split(',')[1];
  }

  var decoded = Utilities.base64Decode(cleanBase64);
  var blob = Utilities.newBlob(decoded, mimeType || 'application/octet-stream', filename);
  var file = targetFolder.createFile(blob);

  // Set sharing agar preview iframe & link bisa dibuka tim
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  var fileId = file.getId();
  return {
    file_id: fileId,
    url: file.getUrl(),
    view_url: 'https://drive.google.com/file/d/' + fileId + '/preview',
    size_kb: Math.round(file.getSize() / 1024)
  };
}

function testDriveAccess(params) {
  var folderId = params.folder_id;
  if (folderId) {
    try {
      var folder = DriveApp.getFolderById(folderId.trim());
      return ok({ accessible: true, folder_name: folder.getName(), folder_id: folder.getId() });
    } catch (e) {
      return error('Tidak bisa mengakses folder: ' + e.message, 400);
    }
  }
  var root = getRootDriveFolder();
  return ok({ accessible: true, folder_name: root.getName(), folder_id: root.getId() });
}
