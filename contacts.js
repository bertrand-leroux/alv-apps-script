// =============================================================================
// Google Contacts sync — generic. Driven by a schema describing how spreadsheet
// columns map to People API Person fields.
//
// Schema shape (all keys optional except `name`):
// {
//   name:       { familyName: 'col A', givenName: 'col B' },
//   emails:     [ { col, label, required? }, ... ],
//   phones:     [ { col, label, required? }, ... ],
//   birthday:   { col },
//   address:    { defaults: {...}, mapping: { postalCode: 'col', city: 'col', ... } },
//   memberships:{ staticGroups: ['Group A'], dynamicGroup: { col, allowedValues: [...] } },
//   trackingColumn: 'Google Contact'   // sheet column where contact URL is written/read
// }
// =============================================================================

const CONTACT_URL_PREFIX = 'https://contacts.google.com/person/';
const CONTACT_PERSON_FIELDS = 'names,emailAddresses,phoneNumbers,addresses,birthdays,memberships,metadata';
const CONTACT_BATCH_LIMIT = 200;

// -----------------------------------------------------------------------------
// Schema validation
// -----------------------------------------------------------------------------

function collectSchemaColumns_(schema) {
  const cols = [schema.trackingColumn];
  if (schema.name) cols.push(...Object.values(schema.name));
  if (schema.emails) cols.push(...schema.emails.map(s => s.col));
  if (schema.phones) cols.push(...schema.phones.map(s => s.col));
  if (schema.birthday) cols.push(schema.birthday.col);
  if (schema.address) cols.push(...Object.values(schema.address.mapping));
  if (schema.memberships && schema.memberships.dynamicGroup) {
    cols.push(schema.memberships.dynamicGroup.col);
  }
  return cols.filter(Boolean);
}

function validateSchema_(schema, data) {
  const header = data[0];
  const missing = collectSchemaColumns_(schema).filter(col => header.indexOf(col) === -1);
  if (missing.length) {
    throw new Error(`Colonnes manquantes dans la feuille: ${missing.map(c => `"${c}"`).join(', ')}`);
  }
}

// -----------------------------------------------------------------------------
// Groups
// -----------------------------------------------------------------------------

function listAllContactGroups_() {
  const all = [];
  let pageToken;
  do {
    const res = People.ContactGroups.list({ pageSize: 1000, pageToken });
    if (res.contactGroups) all.push(...res.contactGroups);
    pageToken = res.nextPageToken;
  } while (pageToken);
  return all;
}

function ensureContactGroups_(schema) {
  const spec = schema.memberships;
  if (!spec) return {};
  const wanted = [...(spec.staticGroups || []), ...(spec.dynamicGroup ? spec.dynamicGroup.allowedValues : [])];
  const existing = listAllContactGroups_();
  const byName = {};
  wanted.forEach(name => {
    const found = existing.find(g => g.name === name);
    byName[name] = found || People.ContactGroups.create({ contactGroup: { name } });
  });
  return byName;
}

// -----------------------------------------------------------------------------
// Person builders — pure, take (line, data, schema, groups)
// -----------------------------------------------------------------------------

function buildContactName_(spec, line, data) {
  const entry = {};
  Object.entries(spec).forEach(([field, col]) => {
    entry[field] = getByName(col, line, data);
  });
  return [entry];
}

function buildContactLabeledValues_(specs, line, data) {
  return specs
    .map(({ col, label, required }) => {
      const value = getByName(col, line, data);
      if (!value && !required) return null;
      return { value, type: label };
    })
    .filter(Boolean);
}

function buildContactBirthday_(spec, line, data) {
  const raw = getByName(spec.col, line, data);
  if (!raw) return [];
  const date = raw instanceof Date ? raw : new Date(raw);
  return [{ date: { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() } }];
}

function buildContactAddress_(spec, line, data) {
  const entry = { ...(spec.defaults || {}) };
  Object.entries(spec.mapping).forEach(([field, col]) => {
    entry[field] = String(getByName(col, line, data));
  });
  return [entry];
}

function buildContactMemberships_(spec, groups, line, data) {
  if (!spec) return [];
  const out = (spec.staticGroups || []).map(name => ({
    contactGroupMembership: { contactGroupResourceName: groups[name].resourceName },
  }));
  if (spec.dynamicGroup) {
    const groupName = getByName(spec.dynamicGroup.col, line, data);
    if (!groups[groupName]) {
      throw new Error(`Groupe inconnu ligne ${line}: "${groupName}" (colonne "${spec.dynamicGroup.col}")`);
    }
    out.push({ contactGroupMembership: { contactGroupResourceName: groups[groupName].resourceName } });
  }
  return out;
}

function buildContactPerson_(line, data, schema, groups) {
  const person = {};
  if (schema.name) person.names = buildContactName_(schema.name, line, data);
  if (schema.emails) person.emailAddresses = buildContactLabeledValues_(schema.emails, line, data);
  if (schema.phones) person.phoneNumbers = buildContactLabeledValues_(schema.phones, line, data);
  if (schema.birthday) person.birthdays = buildContactBirthday_(schema.birthday, line, data);
  if (schema.address) person.addresses = buildContactAddress_(schema.address, line, data);
  if (schema.memberships) person.memberships = buildContactMemberships_(schema.memberships, groups, line, data);
  return person;
}

// -----------------------------------------------------------------------------
// URL helpers
// -----------------------------------------------------------------------------

function contactResourceNameFromUrl_(url) {
  return 'people/' + url.split('/').pop();
}

function contactUrlFromResourceName_(resourceName) {
  return CONTACT_URL_PREFIX + resourceName.split('/').pop();
}

// -----------------------------------------------------------------------------
// Batch create — for many lines
// -----------------------------------------------------------------------------

function chunk_(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function createContactsForLines_(sheet, data, lines, schema) {
  validateSchema_(schema, data);
  const groups = ensureContactGroups_(schema);
  const contactCol = getColNumberByName(schema.trackingColumn, data);

  const result = { created: 0, skipped: 0, failed: 0, errors: [] };
  const queue = [];
  lines.forEach(line => {
    try {
      queue.push({ line, contactPerson: buildContactPerson_(line, data, schema, groups) });
    } catch (e) {
      result.skipped++;
      result.errors.push(`Ligne ${line} skipped: ${e.message}`);
      Logger.log(`Skip line ${line}: ${e.message}`);
    }
  });

  chunk_(queue, CONTACT_BATCH_LIMIT).forEach(batch => {
    const contacts = batch.map(({ contactPerson }) => ({ contactPerson }));
    let res;
    try {
      res = People.People.batchCreateContacts({ contacts, readMask: 'names' });
    } catch (e) {
      result.failed += batch.length;
      result.errors.push(`Batch (${batch.length} lignes): ${e.message}`);
      Logger.log(`Batch failure: ${e}`);
      return;
    }
    (res.createdPeople || []).forEach((wrap, i) => {
      const { line } = batch[i];
      const person = wrap.person;
      if (!person) {
        result.failed++;
        result.errors.push(`Ligne ${line}: aucun person renvoyé`);
        Logger.log(`No person returned line ${line}`);
        return;
      }
      sheet.getRange(line, contactCol).setValue(contactUrlFromResourceName_(person.resourceName));
      result.created++;
    });
  });

  return result;
}

// -----------------------------------------------------------------------------
// Single-row ops — used from menu (cursor line)
// -----------------------------------------------------------------------------

function syncContactCreate(sheet, line, schema) {
  const data = sheet.getDataRange().getValues();
  return createContactsForLines_(sheet, data, [line], schema);  // { created, skipped, failed, errors }
}

function syncContactUpdate(sheet, line, schema) {
  const data = sheet.getDataRange().getValues();
  validateSchema_(schema, data);
  const url = getByName(schema.trackingColumn, line, data);
  if (!url) throw new Error(`Aucun Google Contact sur la ligne ${line}.`);

  const groups = ensureContactGroups_(schema);
  const resourceName = contactResourceNameFromUrl_(url);
  const existing = People.People.get(resourceName, { personFields: CONTACT_PERSON_FIELDS });
  const fresh = buildContactPerson_(line, data, schema, groups);

  // updatePersonFields must list only what we actually send. Listing a field
  // and omitting it from the body would clear it on the contact.
  const updatePersonFields = Object.keys(fresh).join(',');
  const body = { etag: existing.etag, ...fresh };
  People.People.updateContact(body, existing.resourceName, { updatePersonFields });
}

function syncContactDelete(sheet, line, schema) {
  const data = sheet.getDataRange().getValues();
  validateSchema_(schema, data);
  const url = getByName(schema.trackingColumn, line, data);
  if (!url) throw new Error(`Aucun Google Contact sur la ligne ${line}.`);

  const contactCol = getColNumberByName(schema.trackingColumn, data);
  People.People.deleteContact(contactResourceNameFromUrl_(url));
  sheet.getRange(line, contactCol).clearContent();
}
