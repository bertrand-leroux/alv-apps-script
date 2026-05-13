// =============================================================================
// Mail helpers — signature + Gmail send wrapper
// =============================================================================

function signature() {
  return `Cordialement,

Le bureau de la section ${SECTION_NAME}
Association ${ASSO_NAME}`;
}

function sendMail({ to, cc, subject, body, attachments }) {
  const options = {
    from: Session.getActiveUser().getEmail(),
    name: FROM_NAME,
  };
  if (cc) options.cc = cc;
  if (attachments) options.attachments = attachments;
  GmailApp.sendEmail(to, subject, body, options);
}
