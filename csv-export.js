// =============================================================================
// CSV export — dump the "Google Contacts" sheet to Drive and prompt download
// =============================================================================

function saveAsCSV() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONTACTS_SHEET_NAME);
  const folder = DriveApp.createFolder(
    `${ss.getName().toLowerCase().replace(/ /g, '_')}_csv_${new Date().getTime()}`
  );
  const fileName = `${sheet.getName()}.csv`;
  const csv = rangeToCsv(sheet.getDataRange().getValues());
  const file = folder.createFile(fileName, csv);
  const downloadURL = file.getDownloadUrl().slice(0, -8);
  showURL('Download CSV', downloadURL);
}

function rangeToCsv(data) {
  if (data.length < 1) return '';
  return data
    .map(row => row.map(escapeCsvCell).join(','))
    .join('\r\n');
}

function escapeCsvCell(value) {
  const s = value === null || value === undefined ? '' : String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function showURL(_name, url) {
  const html = `<html><body style="margin:0px;">
<div class="modal-dialog-buttons">
<a href="${url}" target="parent" onclick="google.script.host.close()">
<button style="margin:5px;">Yes</button></a>
<button onclick="google.script.host.close()">No</button>
</div></body></html>`;
  const ui = HtmlService.createHtmlOutput(html).setHeight(50).setWidth(400);
  SpreadsheetApp.getUi().showModalDialog(ui, 'Download Contacts CSV ?');
}
