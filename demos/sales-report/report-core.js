(function (root) {
  'use strict';
  const headers = ['date', 'channel', 'orders', 'gross_sales', 'refunds'];
  function parseCSV(text) {
    const rows = []; let row = [], field = '', quoted = false, closed = false;
    text = text.replace(/^\uFEFF/, '');
    const finishField = () => { row.push(field); field = ''; closed = false; };
    const finishRow = () => { finishField(); if (row.some(v => v.trim() !== '')) rows.push(row); row = []; };
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted) {
        if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (c === '"') { quoted = false; closed = true; }
        else field += c;
      } else if (c === ',') finishField();
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; finishRow(); }
      else if (c === '"' && field === '' && !closed) quoted = true;
      else if (c === '"' || (closed && c.trim() !== '')) throw new Error('Malformed CSV quotation. Export again as comma-separated UTF-8 CSV.');
      else if (!closed) field += c;
    }
    if (quoted) throw new Error('The CSV ends inside a quoted field.');
    if (field !== '' || row.length || closed) finishRow();
    return rows;
  }
  function cents(value, row, label) {
    if (!/^\d+(\.\d{1,2})?$/.test(value)) throw new Error(`Row ${row}: ${label} must be a non-negative amount with a decimal point and no currency symbol.`);
    const [whole, fraction = ''] = value.split('.');
    const n = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
    if (!Number.isSafeInteger(n) || n > 100000000000) throw new Error(`Row ${row}: ${label} is too large.`);
    return n;
  }
  function readCSV(text) {
    if (text.length > 2000000) throw new Error('This demo accepts files up to 2 MB.');
    const rows = parseCSV(text);
    if (rows.length < 2) throw new Error('Include a header and at least one data row.');
    if (rows.length > 10001) throw new Error('This demo accepts up to 10,000 data rows.');
    const keys = rows.shift().map(v => v.trim());
    if (keys.length !== headers.length || new Set(keys).size !== headers.length || headers.some(v => !keys.includes(v))) throw new Error('Required columns: ' + headers.join(', ') + '.');
    const seen = new Set();
    return rows.map((cells, index) => {
      const row = index + 2;
      if (cells.length !== keys.length) throw new Error(`Row ${row}: the number of fields does not match the header.`);
      const item = Object.fromEntries(keys.map((key, i) => [key, cells[i].trim()]));
      const date = new Date(item.date + 'T00:00:00Z');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== item.date) throw new Error(`Row ${row}: use a valid date in YYYY-MM-DD format.`);
      if (!item.channel || item.channel.length > 80) throw new Error(`Row ${row}: provide a channel name of 1–80 characters.`);
      if (!/^\d+$/.test(item.orders) || !Number.isSafeInteger(Number(item.orders)) || Number(item.orders) > 1000000000) throw new Error(`Row ${row}: orders must be a whole non-negative number.`);
      const id = JSON.stringify([item.date, item.channel]);
      if (seen.has(id)) throw new Error(`Row ${row}: duplicate date and channel. Use one aggregated row per day and channel.`);
      seen.add(id);
      const gross = cents(item.gross_sales, row, 'gross_sales'), refunds = cents(item.refunds, row, 'refunds');
      if (refunds > gross) throw new Error(`Row ${row}: refunds exceed gross sales. This demo uses refunds against the same sales cohort.`);
      return { date: item.date, channel: item.channel, orders: Number(item.orders), gross, refunds };
    });
  }
  function totals(rows) {
    const out = rows.reduce((a, r) => ({ orders: a.orders + r.orders, gross: a.gross + r.gross, refunds: a.refunds + r.refunds }), {orders: 0, gross: 0, refunds: 0});
    return {...out, net: out.gross - out.refunds, refundRate: out.gross === 0 ? null : out.refunds / out.gross};
  }
  function group(rows, key) {
    const groups = new Map();
    rows.forEach(r => { const k = key(r); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); });
    return [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([label, list]) => ({label, ...totals(list)}));
  }
  const api = {headers, parseCSV, readCSV, totals, group};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ReportCore = api;
})(typeof window === 'undefined' ? {} : window);
