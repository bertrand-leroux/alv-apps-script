// =============================================================================
// CE payment attestation — fills a Doc template per eligible row,
// converts to PDF, mails it, stores PDF URL back in the sheet.
// =============================================================================

function sendCertificates() {
  const tz = Session.getScriptTimeZone();
  const now = Utilities.formatDate(new Date(), tz, 'dd/MM/yyyy');
  const sheet = getSheet();
  const template = DriveApp.getFilesByName(CERT_TEMPLATE_DOC).next();
  const destinationFolder = DriveApp.getFoldersByName(CERT_FOLDER).next();
  const data = sheet.getDataRange().getValues();
  const certCol = getColNumberByName('Attestation CE', data);

  const lines = eligibleLines(sheet, data, line => {
    const total = getByName('Total cotisation', line, data);
    return total >= COTISATION_MIN
      && total <= COTISATION_MAX
      && getByName('Statut', line, data) === 'Inscrit'
      && getByName('Attestation CE', line, data) === '';
  });

  lines.forEach(line => {
    const nomEnfant = getByName(`Nom de l'enfant`, line, data);
    const prenomEnfant = getByName(`Prénom de l'enfant`, line, data);
    const dateDeNaissance = getByName('Date de naissance', line, data);
    const nomParent1 = getByName('Nom Parent 1', line, data);
    const emailParent1 = getByName('Adresse e-mail', line, data);
    const nomParent2 = getByName('Nom Parent 2', line, data);
    const emailParent2 = getByName('Email Parent 2', line, data);
    const paidAmount = getByName('Total payé', line, data);

    const docCopy = template.makeCopy(`Attestation CE - ${nomEnfant} ${prenomEnfant}`, destinationFolder);
    const doc = DocumentApp.openById(docCopy.getId());
    const body = doc.getBody();

    body.replaceText("{{ Prénom de l'enfant }}", prenomEnfant);
    body.replaceText("{{ Nom de l'enfant }}", nomEnfant);
    body.replaceText('{{ Date de naissance }}', Utilities.formatDate(dateDeNaissance, tz, 'dd/MM/yyyy'));
    body.replaceText('{{ Nom Parent 1 }}', nomParent1);
    body.replaceText('{{ Nom Parent 2 }}', nomParent2);
    body.replaceText('{{ section }}', SECTION_NAME);
    body.replaceText('{{ responsable }}', RESPONSABLE);
    body.replaceText('{{ year }}', String(YEAR_START));
    body.replaceText('{{ nextyear }}', String(YEAR_END));
    body.replaceText('{{ now }}', now);
    body.replaceText('{{ paidAmount }}', String(paidAmount));
    doc.saveAndClose();

    const pdfBlob = doc.getAs('application/pdf').setName(`${doc.getName()}.pdf`);
    const pdf = destinationFolder.createFile(pdfBlob);

    const mailBody = `Bonjour,

Veuillez trouver joint à ce courriel votre attestation de paiement de cotisation, suite à l'inscription de ${prenomEnfant} à la section ${SECTION_NAME} (${ASSO_NAME}) pour la saison ${SEASON}.

${signature()}
`;

    sendMail({
      to: emailParent1,
      cc: emailParent2 || undefined,
      subject: `Attestation paiement cotisation saison ${SEASON} - ${nomEnfant} ${prenomEnfant}`,
      body: mailBody,
      attachments: [pdf.getAs(MimeType.PDF)],
    });

    sheet.getRange(line, certCol).setValue(pdf.getUrl());
    DriveApp.getFileById(doc.getId()).setTrashed(true);
  });

  SpreadsheetApp.getUi().alert(`${lines.length} attestations envoyées.`);
}
