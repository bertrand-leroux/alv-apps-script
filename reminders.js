// =============================================================================
// Reminder mails — missing payment / missing medical certificate
// =============================================================================

function missingPaymentMail() {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();

  const lines = eligibleLines(sheet, data, line =>
    getByName('Total cotisation', line, data) <= 70
    && getByName('Statut', line, data) === 'Inscrit'
  );

  const sent = [];
  lines.forEach(line => {
    const nomEnfant = getByName(`Nom de l'enfant`, line, data);
    const prenomEnfant = getByName(`Prénom de l'enfant`, line, data);
    const emailParent1 = getByName('Adresse e-mail', line, data);
    const emailParent2 = getByName('Email Parent 2', line, data);

    const body = `Bonjour,

Sauf erreur de notre part, nous n'avons pas reçu l'intégralité du paiement de votre cotisation pour l'inscription de ${prenomEnfant}.

Merci de nous le faire parvenir dans les meilleurs délais.

Lien vers paiement sécurisé en ligne de la cotisation :
${HELLOASSO_URL}

Lien vers le fichier de suivi de votre demande d'inscription :
${TRACKING_SHEET_URL}


${signature()}
`;

    sendMail({
      to: emailParent1,
      cc: emailParent2 || undefined,
      subject: `Cotisation saison ${SEASON} - ${nomEnfant} ${prenomEnfant}`,
      body,
    });
    sent.push(emailParent1);
  });

  SpreadsheetApp.getUi().alert(`${sent.length} emails de relance envoyés. \n\n${sent.join(' \n ')}`);
}

function sendMedCertificateMail() {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();

  const lines = eligibleLines(sheet, data, line =>
    getByName('Date certificat médical', line, data) === ''
    && getByName('Statut', line, data) === 'Inscrit'
    && getByName(`Déclaration sur l'honneur`, line, data) !== 'Non'
  );

  const sent = [];
  lines.forEach(line => {
    const nomEnfant = getByName(`Nom de l'enfant`, line, data);
    const prenomEnfant = getByName(`Prénom de l'enfant`, line, data);
    const emailParent1 = getByName('Adresse e-mail', line, data);
    const emailParent2 = getByName('Email Parent 2', line, data);

    const body = `Bonjour,

Lors de l'inscription de votre enfant à la section ${SECTION_NAME}, vous avez déclaré devoir nous fournir un certificat médical.

Merci de nous le faire parvenir en version numérisée (lisible et dans le bon sens) par mail uniquement.

${signature()}
`;

    sendMail({
      to: emailParent1,
      cc: emailParent2 || undefined,
      subject: `Certificat médical saison ${SEASON} - ${nomEnfant} ${prenomEnfant}`,
      body,
    });
    sent.push(emailParent1);
  });

  SpreadsheetApp.getUi().alert(`${sent.length} emails envoyés. \n\n${sent.join(' \n ')}`);
}
