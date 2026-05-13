// =============================================================================
// JSON → 2D array flattening — for spreadsheet custom functions like
// =IMPORTHELLOASSO(...). Generic, no API coupling.
// Logic adapted from Trevor Lohrbeer (@FastFedora) ImportJSON, GPL-3.0
// — http://blog.fastfedora.com/projects/import-json
// =============================================================================

function parseJSONObject_(object, query, options, includeFunc, transformFunc) {
  const headers = {};
  const data = [];

  if (query && !Array.isArray(query) && String(query).includes(',')) {
    query = String(query).split(',');
  }
  if (options) options = String(options).split(',');

  parseData_(headers, data, '', 1, object, query, options, includeFunc);
  parseHeaders_(headers, data);
  transformData_(data, options, transformFunc);

  return hasOption_(options, 'noHeaders') ? (data.length > 1 ? data.slice(1) : []) : data;
}

function parseData_(headers, data, path, rowIndex, value, query, options, includeFunc) {
  let dataInserted = false;

  if (isObject_(value)) {
    for (const key in value) {
      if (parseData_(headers, data, `${path}/${key}`, rowIndex, value[key], query, options, includeFunc)) {
        dataInserted = true;
      }
    }
  } else if (Array.isArray(value) && isObjectArray_(value)) {
    for (let i = 0; i < value.length; i++) {
      if (parseData_(headers, data, path, rowIndex, value[i], query, options, includeFunc)) {
        dataInserted = true;
        rowIndex++;
      }
    }
  } else if (!includeFunc || includeFunc(query, path, options)) {
    if (Array.isArray(value)) value = value.join();
    if (!data[rowIndex]) data[rowIndex] = [];
    if (headers[path] === undefined) headers[path] = Object.keys(headers).length;
    data[rowIndex][headers[path]] = value;
    dataInserted = true;
  }

  return dataInserted;
}

function parseHeaders_(headers, data) {
  data[0] = [];
  for (const key in headers) data[0][headers[key]] = key;
}

function transformData_(data, options, transformFunc) {
  for (let i = 0; i < data.length; i++) {
    for (let j = 0; j < data[i].length; j++) {
      transformFunc(data, i, j, options);
    }
  }
}

function isObject_(test) {
  return Object.prototype.toString.call(test) === '[object Object]';
}

function isObjectArray_(test) {
  return test.some(isObject_);
}

function includeXPath_(query, path, options) {
  if (!query) return true;
  if (Array.isArray(query)) return query.some(rule => applyXPathRule_(rule, path, options));
  return applyXPathRule_(query, path, options);
}

function applyXPathRule_(rule, path, _options) {
  return path.indexOf(rule) === 0;
}

function defaultTransform_(data, row, column, options) {
  if (!data[row][column]) {
    data[row][column] = row < 2 || hasOption_(options, 'noInherit') ? '' : data[row - 1][column];
  }

  if (!hasOption_(options, 'rawHeaders') && row === 0) {
    if (column === 0 && data[row].length > 1) removeCommonPrefixes_(data, row);
    data[row][column] = toTitleCase_(String(data[row][column]).replace(/[\/\_]/g, ' '));
  }

  if (!hasOption_(options, 'noTruncate') && data[row][column]) {
    data[row][column] = String(data[row][column]).substr(0, 256);
  }

  if (hasOption_(options, 'debugLocation')) {
    data[row][column] = `[${row},${column}]${data[row][column]}`;
  }
}

function removeCommonPrefixes_(data, row) {
  let matchIndex = data[row][0].length;
  for (let i = 1; i < data[row].length; i++) {
    matchIndex = findEqualityEndpoint_(data[row][i - 1], data[row][i], matchIndex);
    if (matchIndex === 0) return;
  }
  for (let i = 0; i < data[row].length; i++) {
    data[row][i] = data[row][i].substring(matchIndex);
  }
}

function findEqualityEndpoint_(s1, s2, stopAt) {
  if (!s1 || !s2) return -1;
  const max = Math.min(stopAt, s1.length, s2.length);
  for (let i = 0; i < max; i++) {
    if (s1.charAt(i) !== s2.charAt(i)) return i;
  }
  return max;
}

function toTitleCase_(text) {
  if (text == null) return null;
  return text.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.substr(1).toLowerCase());
}

function hasOption_(options, option) {
  return options && options.indexOf(option) >= 0;
}
