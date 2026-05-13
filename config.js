// =============================================================================
// Project-wide config — season, branding, sheet/form/doc references, contact labels
// =============================================================================

const SHEET_NAME = 'Demandes';
const CONTACTS_SHEET_NAME = 'Google Contacts';

const YEAR_START = 2025;
const YEAR_END = 2026;
const SEASON = `${YEAR_START}/${YEAR_END}`;

// -----------------------------------------------------------------------------
// À renseigner par chaque section avant utilisation. Valeurs ci-dessous = exemples
// génériques / placeholders, à remplacer par les vraies valeurs de la section.
// -----------------------------------------------------------------------------

const ASSO_NAME = 'Amicale Laïque de Vertou';
const ASSO_SHORT = 'ALV';
const SECTION_NAME = 'Nom de la section';
const RESPONSABLE = 'Prénom NOM';
const FROM_NAME = SECTION_NAME;

const SECTION_POSTAL_ADDRESS = `${ASSO_SHORT} ${SECTION_NAME}, chez ${RESPONSABLE}
Numéro et nom de rue
Code postal VILLE`;

// URL publique de la campagne d'adhésion HelloAsso de la section.
const HELLOASSO_URL = `https://www.helloasso.com/associations/<asso-slug>/adhesions/<campaign-slug>-${YEAR_START}-${YEAR_END}`;

// IDs Google des ressources liées au tableur d'inscriptions de la section.
const TRACKING_SHEET_URL = 'https://docs.google.com/spreadsheets/d/<GOOGLE_SHEET_ID>';
const INSCRIPTION_FORM_ID = '<GOOGLE_FORM_ID>';

const CERT_TEMPLATE_DOC = 'TEMPLATE Attestation CE';
const CERT_FOLDER = `Attestations CE ${YEAR_START}`;
const COTISATION_MIN = 80;
const COTISATION_MAX = 90;

// Google Contact labels appliqués dynamiquement par contacts.js selon la valeur
// d'une colonne (cf. CONTACT_SCHEMA.memberships.dynamicGroup). Permet de cibler
// des sous-groupes (cours, niveau, créneau, …) lors de la rédaction d'un mail.
const CONTACT_LABELS = [
  'PILATES  - Mardi 10h - 15 personnes maximum',
  'PILATES - Mardi 11h  - 15 personnes maximum',
  'PILATES - Mardi 20h30 - 20 personnes maximum',
];
