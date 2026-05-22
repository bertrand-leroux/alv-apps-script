// =============================================================================
// Spreadsheet menu — wired at open. Item names must match function names
// defined elsewhere in the project (Apps Script shares global scope).
// =============================================================================

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu(`ACTIONS Bureau ${SECTION_NAME}`)
    .addItem('Envoi des attestations CE', 'sendCertificates')
    .addSubMenu(ui.createMenu('Relances mail')
      .addItem('Certificats médicaux', 'sendMedCertificateMail')
      .addItem('Cotisations', 'missingPaymentMail'))
    .addSubMenu(ui.createMenu('Contacts')
      .addItem('Créer tous les manquants', 'createAllUnexistingContacts')
      .addItem('Créer (ligne du curseur)', 'createOneContact')
      .addItem('Mise à jour (ligne du curseur)', 'updateContact')
      .addItem('Suppression (ligne du curseur)', 'deleteContact'))
    .addSeparator()
    .addItem('Import HelloAsso', 'importHelloAsso')
    .addToUi();
}
