(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PortfolioTools = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function parseCSV(source, required, maxRows = 1000) {
    if (typeof source !== 'string' || source.length > 1000000) throw Error('Use a CSV smaller than 1 MB.');
    const input = source.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
    const rows = []; let row = [], field = '', quoted = false, closed = false;
    const cell = () => { row.push(field); field = ''; closed = false; };
    const line = () => { cell(); if (row.some(x => x !== '')) rows.push(row); row = []; };
    for (let i = 0; i < input.length; i++) {
      const c = input[i];
      if (quoted) {
        if (c === '"' && input[i + 1] === '"') { field += '"'; i++; }
        else if (c === '"') { quoted = false; closed = true; }
        else field += c;
      } else if (c === ',') cell();
      else if (c === '\n') line();
      else if (c === '"' && field === '' && !closed) quoted = true;
      else if (c === '"' || closed) throw Error('Invalid CSV quoting. Quote the entire field and double embedded quotes.');
      else field += c;
    }
    if (quoted) throw Error('The CSV contains an unclosed quote.');
    if (field !== '' || row.length || closed) line();
    if (!rows.length) throw Error('The CSV is empty.');
    const headers = rows.shift().map(x => x.trim());
    if (headers.some(x => !x) || new Set(headers).size !== headers.length) throw Error('Column names must be present and unique.');
    if (headers.length !== required.length || required.some(x => !headers.includes(x))) throw Error('Required columns: ' + required.join(', '));
    if (rows.length > maxRows) throw Error('This demo accepts up to ' + maxRows + ' rows per source.');
    return rows.map((values, i) => {
      if (values.length !== headers.length) throw Error('Row ' + (i + 2) + ' has an unexpected number of columns.');
      return Object.fromEntries(headers.map((h, j) => [h, values[j]]));
    });
  }
  function csv(headers, rows) {
    const escape = value => {
      let str = String(value ?? '');
      // CSV is often opened in a spreadsheet: keep formula-like strings literal.
      if (typeof value === 'string' && /^[\s]*[=+\-@\t\r]/.test(str)) str = "'" + str;
      return /[",\n\r]/.test(str) ? '"' + str.replaceAll('"', '""') + '"' : str;
    };
    return [headers, ...rows.map(r => headers.map(h => r[h]))].map(r => r.map(escape).join(',')).join('\r\n') + '\r\n';
  }
  function normalizeDate(value, mode = 'DMY') {
    let y, m, d;
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
    if (iso) [, y, m, d] = iso;
    else if (slash && ['DMY', 'MDY'].includes(mode)) {
      y = slash[3]; m = slash[mode === 'DMY' ? 2 : 1]; d = slash[mode === 'DMY' ? 1 : 2];
    } else return null;
    y = Number(y); m = Number(m); d = Number(d);
    const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > days[m - 1]) return null;
    return y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  }
  const cleanHeaders = ['record_id', 'customer_name', 'signup_date', 'city'];
  function cleanCustomers(source, dateMode = 'DMY') {
    const input = parseCSV(source, cleanHeaders), rows = [], changes = [], issues = [], exact = new Map(), keys = new Map();
    input.forEach((original, index) => {
      const row = {}, sourceRow = index + 2;
      cleanHeaders.forEach(column => {
        row[column] = original[column].trim().replace(/\s+/g, ' ');
        if (row[column] !== original[column]) changes.push({source_row: sourceRow, column, original: original[column], cleaned: row[column], change: 'Normalize whitespace'});
      });
      const normalized = normalizeDate(row.signup_date, dateMode);
      if (normalized && normalized !== row.signup_date) {
        changes.push({source_row: sourceRow, column: 'signup_date', original: row.signup_date, cleaned: normalized, change: 'Normalize date (' + dateMode + ')'});
        row.signup_date = normalized;
      }
      if (!normalized) issues.push({source_row: sourceRow, record_id: row.record_id, issue: 'Missing or invalid date; original value retained'});
      for (const column of ['record_id', 'customer_name', 'city']) if (!row[column]) issues.push({source_row: sourceRow, record_id: row.record_id, issue: 'Missing ' + column + '; left blank'});
      const signature = JSON.stringify(row);
      if (row.record_id && exact.has(signature)) {
        changes.push({source_row: sourceRow, column: '*', original: JSON.stringify(original), cleaned: 'Kept source row ' + exact.get(signature), change: 'Remove exact normalized duplicate'});
        return;
      }
      if (row.record_id && keys.has(row.record_id)) {
        issues.push({source_row: sourceRow, record_id: row.record_id, issue: 'Conflicting ID also appears at source row ' + keys.get(row.record_id) + '; both records retained'});
      } else if (row.record_id) keys.set(row.record_id, sourceRow);
      exact.set(signature, sourceRow); rows.push(row);
    });
    return {rows, changes, issues, inputCount: input.length, removed: input.length - rows.length};
  }
  function cents(value, label) {
    const str = String(value).trim();
    if (!/^\d+(\.\d{1,2})?$/.test(str)) throw Error(label + ' must be a non-negative amount with at most two decimals.');
    const [whole, decimal = ''] = str.split('.');
    const amount = Number(whole) * 100 + Number(decimal.padEnd(2, '0'));
    if (!Number.isSafeInteger(amount) || amount > 100000000) throw Error(label + ' must be at most 1,000,000.');
    return amount;
  }
  function integer(value, label, max) {
    const str = String(value).trim();
    if (!/^\d+$/.test(str) || Number(str) > max) throw Error(label + ' must be a whole number from 0 to ' + max + '.');
    return Number(str);
  }
  function quote(input) {
    const base = cents(input.base, 'Setup fee'), unitRate = cents(input.unitRate, 'Price per unit'), units = integer(input.units, 'Units', 10000);
    const monthly = cents(input.monthly, 'Monthly support'), months = integer(input.months, 'Support months', 36);
    const discountBasisPoints = cents(input.discount, 'Discount');
    if (discountBasisPoints > 10000) throw Error('Discount must be between 0 and 100 percent.');
    const unitsTotal = unitRate * units, subtotal = base + unitsTotal;
    const discount = Number((BigInt(subtotal) * BigInt(discountBasisPoints) + 5000n) / 10000n);
    const projectTotal = subtotal - discount, supportTotal = monthly * months;
    return {base, unitRate, units, unitsTotal, subtotal, discount, projectTotal, monthly, months, supportTotal, total: projectTotal + supportTotal};
  }
  const mergeHeaders = ['order_id', 'date', 'channel', 'amount'];
  function mergeReports(masterCSV, batchCSVs) {
    function load(text, label) {
      const seen = new Set();
      return parseCSV(text, mergeHeaders).map((r, i) => {
        const row = Object.fromEntries(mergeHeaders.map(h => [h, r[h].trim()]));
        if (!row.order_id || !row.channel) throw Error(label + ', row ' + (i + 2) + ': order_id and channel are required.');
        if (seen.has(row.order_id)) throw Error(label + ': duplicate order_id ' + row.order_id + '.');
        seen.add(row.order_id);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date) || !normalizeDate(row.date)) throw Error(label + ', row ' + (i + 2) + ': use a valid YYYY-MM-DD date.');
        row.amount = (cents(row.amount, label + ' amount') / 100).toFixed(2);
        return row;
      });
    }
    if (!Array.isArray(batchCSVs) || batchCSVs.length !== 3) throw Error('Provide exactly three batch CSVs.');
    // Validate every source before applying any change.
    const master = load(masterCSV, 'Master');
    const batches = batchCSVs.map((s, i) => load(s, 'Batch ' + (i + 1)));
    const map = new Map(master.map(r => [r.order_id, {...r}]));
    const changes = []; let inserted = 0, updated = 0, unchanged = 0;
    batches.forEach((rows, index) => rows.forEach(row => {
      const old = map.get(row.order_id), kind = old ? (JSON.stringify(old) === JSON.stringify(row) ? 'Unchanged' : 'Updated') : 'Inserted';
      if (kind === 'Unchanged') unchanged++;
      else {
        if (old) updated++; else inserted++;
        changes.push({batch: index + 1, order_id: row.order_id, change: kind, previous: old ? JSON.stringify(old) : '', current: JSON.stringify(row)});
        map.set(row.order_id, {...row});
      }
    }));
    const rows = [...map.values()];
    return {rows, changes, inserted, updated, unchanged, totalCents: rows.reduce((sum, r) => sum + cents(r.amount, 'Amount'), 0)};
  }
  return {parseCSV, csv, normalizeDate, cleanCustomers, cleanHeaders, quote, mergeReports, mergeHeaders};
});
