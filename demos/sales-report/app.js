'use strict';
const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat('en-US', {style:'currency',currency:'USD',maximumFractionDigits:2}).format(n / 100);
const number = n => new Intl.NumberFormat('en-US').format(n);
let data = [], sample = true;
function week(date) { const d = new Date(date + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0,10); }
function td(text) { const el = document.createElement('td'); el.textContent = text; return el; }
function render() {
  $('error').hidden = true;
  const start = $('from').value, end = $('to').value, channel = $('channel').value;
  if (start && end && start > end) { $('error').textContent = 'The start date must be on or before the end date.'; $('error').hidden = false; }
  const rows = data.filter(r => (!start || r.date >= start) && (!end || r.date <= end) && (!channel || r.channel === channel));
  const t = ReportCore.totals(rows), hasRows = rows.length > 0;
  $('net').textContent = hasRows ? money(t.net) : '—'; $('orders').textContent = hasRows ? number(t.orders) : '—';
  $('refunds').textContent = hasRows ? money(t.refunds) : '—'; $('rate').textContent = t.refundRate === null || !hasRows ? '—' : (t.refundRate * 100).toFixed(1) + '%';
  $('table-orders').textContent = hasRows ? number(t.orders) : '—'; $('table-net').textContent = hasRows ? money(t.net) : '—';
  $('channels').replaceChildren();
  ReportCore.group(rows, r => r.channel).forEach(r => { const tr = document.createElement('tr'); tr.append(td(r.label), td(number(r.orders)), td(money(r.net))); $('channels').append(tr); });
  $('bars').replaceChildren(); const weeks = ReportCore.group(rows, r => week(r.date));
  const visible = weeks.slice(-12), max = Math.max(1, ...visible.map(r => r.net));
  visible.forEach(r => { const el = document.createElement('div'); el.className = 'bar-group'; const value = document.createElement('span'); value.className = 'bar-value'; value.textContent = money(r.net); const bar = document.createElement('div'); bar.className = 'bar'; bar.style.height = (r.net / max * 135) + 'px'; const label = document.createElement('span'); label.className = 'bar-label'; label.textContent = new Date(r.label + 'T00:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'}); el.append(value,bar,label); $('bars').append(el); });
  $('bars').setAttribute('aria-label', visible.map(r => `${r.label}: ${money(r.net)}`).join('; ') || 'No rows match the filters.');
  if (!hasRows) { const empty = document.createElement('p'); empty.className = 'empty'; empty.textContent = 'No rows match these filters.'; $('bars').append(empty); }
  $('source-label').textContent = `${sample ? 'Fictional sample' : 'Local CSV'} · ${number(rows.length)} of ${number(data.length)} rows · USD${weeks.length > 12 ? ' · Chart shows latest 12 weeks; totals cover the full filter' : ''}`;
}
function load(text, isSample) {
  const next = ReportCore.readCSV(text); data = next; sample = isSample;
  const dates = data.map(r => r.date).sort(); $('from').value = dates[0]; $('to').value = dates.at(-1);
  $('channel').replaceChildren(); const all = document.createElement('option'); all.value = ''; all.textContent = 'All channels'; $('channel').append(all);
  [...new Set(data.map(r => r.channel))].sort().forEach(name => {const option = document.createElement('option');option.value = name;option.textContent = name;$('channel').append(option);});
  $('data-badge').textContent = sample ? 'Fictional sample data' : 'Your local CSV'; render();
}
['from','to','channel'].forEach(id => $(id).addEventListener('change', render));
$('upload').addEventListener('click', () => $('file').click());
$('file').addEventListener('change', async event => { const file = event.target.files[0]; if (!file) return; try { if (file.size > 2000000) throw new Error('This demo accepts files up to 2 MB.'); load(await file.text(), false); } catch (e) { $('error').textContent = e.message + ' The previous report is unchanged.'; $('error').hidden = false; } finally { event.target.value = ''; } });
$('reset').addEventListener('click', () => load(window.SAMPLE_CSV, true));
$('print').addEventListener('click', () => window.print());
$('download-brief').addEventListener('click', () => { const text = 'REPORTING PILOT — PROJECT BRIEF\n\n1. Current report and audience:\n2. Source file format (anonymized example only):\n3. Up to five required metrics and their definitions:\n4. Refresh frequency:\n5. Expected result for a sample period:\n6. Preferred output (Excel workbook or browser report):\n\nPilot proposal: USD 450, one source, up to 10,000 rows, one report, one revision. Target: 3 business days after written scope and data confirmation. Any taxes or platform fees shown before agreement. Live integrations are quoted separately.\n'; const url = URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='reporting-project-brief.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('copy-status').textContent='Brief template downloaded. No message was sent. Share it on Contra when ready.';});
load(window.SAMPLE_CSV, true);
