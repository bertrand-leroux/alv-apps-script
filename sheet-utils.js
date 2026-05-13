// =============================================================================
// Spreadsheet helpers — column lookup by header name, cursor line, filtering
// =============================================================================

function getSheet(name = SHEET_NAME) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

function getByName(colName, line, data) {
  const col = data[0].indexOf(colName);
  if (col === -1) return undefined;
  return data[line - 1][col];
}

function getColNumberByName(colName, data) {
  const col = data[0].indexOf(colName);
  return col === -1 ? undefined : col + 1;
}

function getDataValue(data, key) {
  return data[key] !== undefined ? data[key][0].trim() : '';
}

function eligibleLines(sheet, data, predicate) {
  const lines = [];
  for (let index = 1; index < data.length; index++) {
    const line = index + 1;
    if (sheet.isRowHiddenByFilter(line) || sheet.isRowHiddenByUser(line)) continue;
    if (!predicate(line)) continue;
    lines.push(line);
  }
  return lines;
}

function getCursorLine(sheet) {
  const ui = SpreadsheetApp.getUi();
  const activeSheet = SpreadsheetApp.getActiveSheet();
  if (activeSheet.getName() !== sheet.getName()) {
    ui.alert(`Place le curseur sur la feuille "${sheet.getName()}".`);
    return null;
  }
  const line = activeSheet.getActiveCell().getRow();
  if (line < 2) {
    ui.alert(`Place le curseur sur une ligne de données (pas l'en-tête).`);
    return null;
  }
  return line;
}
