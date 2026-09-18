(function () {
  'use strict';
  const C = PortfolioTools, $ = id => document.getElementById(id);
  const money = value => (value / 100).toLocaleString('en-US', {style:'currency', currency:'USD'});
  const fixtures = {
    cleaner: 'record_id,customer_name,signup_date,city\n001, Ana   López ,2026-09-01, Monterrey \n002,John Smith,03/09/2026,Austin\n003,María Ruiz,2026-09-05,Mexico City\n003,María Ruiz,2026-09-05,Mexico City\n004,Sam Lee,31/02/2026,Dallas\n005,,2026-09-08,Miami\n002,John Smith,2026-09-04,Austin\n006,Zoë Green,2026-09-09,London\n',
    master: 'order_id,date,channel,amount\nA001,2026-09-01,Direct,180.00\nA002,2026-09-02,Partner,200.00\n',
    batch1: 'order_id,date,channel,amount\nA002,2026-09-02,Partner,220.00\nA003,2026-09-03,Direct,90.00\n',
    batch2: 'order_id,date,channel,amount\nA004,2026-09-04,Online,150.00\n',
    batch3: 'order_id,date,channel,amount\nA003,2026-09-03,Direct,120.00\n'
  };
  function download(name, content, type = 'text/csv;charset=utf-8') {
    const blob = new Blob([content], {type}), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function table(id, headers, rows) {
    const holder = $(id); holder.replaceChildren();
    if (!rows.length) { const p = document.createElement('p'); p.textContent = 'No items.'; holder.append(p); return; }
    const el = document.createElement('table'), head = document.createElement('thead'), tr = document.createElement('tr'), body = document.createElement('tbody');
    headers.forEach(h => { const th = document.createElement('th'); th.textContent = h.replaceAll('_', ' '); th.scope = 'col'; tr.append(th); });
    head.append(tr); el.append(head);
    rows.slice(0, 20).forEach(row => { const tr = document.createElement('tr'); headers.forEach(h => { const td = document.createElement('td'); td.textContent = row[h]; tr.append(td); }); body.append(tr); });
    el.append(body); holder.append(el);
    if (rows.length > 20) { const p = document.createElement('p'); p.textContent = 'Showing 20 of ' + rows.length + ' rows. Downloads contain the full result.'; holder.append(p); }
  }
  let result;
  const mode = document.body.dataset.tool;
  function run() {
    $('error').hidden = true;
    try {
      if (mode === 'cleaner') {
        result = C.cleanCustomers($('source').value, $('date-mode').value);
        $('input-count').textContent = result.inputCount; $('output-count').textContent = result.rows.length;
        $('removed').textContent = result.removed; $('issues-count').textContent = result.issues.length;
        table('clean-table', C.cleanHeaders, result.rows);
        table('issues-table', ['source_row','record_id','issue'], result.issues);
        table('audit-table', ['source_row','column','original','cleaned','change'], result.changes);
      } else if (mode === 'quote') {
        result = C.quote(Object.fromEntries(['base','units','unitRate','discount','monthly','months'].map(id => [id,$(id).value])));
        $('quote-total').textContent = money(result.total);
        $('breakdown').replaceChildren();
        for (const [label, value] of [['Setup',result.base],['Units (' + result.units + ')',result.unitsTotal],['One-time discount',-result.discount],['Project total',result.projectTotal],['Support (' + result.months + ' months)',result.supportTotal]]) {
          const li = document.createElement('li'), name = document.createElement('span'), amount = document.createElement('strong');
          name.textContent = label; amount.textContent = money(value); li.append(name,amount); $('breakdown').append(li);
        }
      } else {
        result = C.mergeReports($('master').value, ['batch1','batch2','batch3'].map(id => $(id).value));
        $('rows-count').textContent = result.rows.length; $('insert-count').textContent = result.inserted;
        $('update-count').textContent = result.updated; $('sum').textContent = money(result.totalCents);
        table('master-table', C.mergeHeaders, result.rows);
        table('events-table', ['batch','order_id','change','previous','current'], result.changes);
      }
      $('results').hidden = false;
    } catch (err) {
      $('error').textContent = err.message; $('error').hidden = false; $('results').hidden = true;
      for (const id of ['issues-table','audit-table','events-table']) if ($(id)) $(id).replaceChildren();
      result = null;
    }
  }
  function reset() {
    if (mode === 'cleaner') { $('source').value = fixtures.cleaner; $('date-mode').value = 'DMY'; }
    else if (mode === 'quote') for (const input of $('quote-form').querySelectorAll('input')) input.value = input.defaultValue;
    else for (const id of ['master','batch1','batch2','batch3']) $(id).value = fixtures[id];
    run();
  }
  $('reset').addEventListener('click',reset);
  if (mode === 'quote') {
    $('quote-form').addEventListener('submit',event => { event.preventDefault(); run(); });
    $('quote-form').addEventListener('input',run);
    $('download-quote').addEventListener('click',() => {
      if (!result) return;
      download('sample-estimate.txt', 'ILLUSTRATIVE SERVICE ESTIMATE\nUSD; taxes and payment fees excluded.\n\n' + [...$('breakdown').children].map(li => li.children[0].textContent + ': ' + li.children[1].textContent).join('\n') + '\nTotal: ' + money(result.total) + '\n\nSample prices only. Scope must be agreed before work starts.\n','text/plain;charset=utf-8');
    });
  } else {
    $('run').addEventListener('click',run);
    const invalidate = () => { $('results').hidden = true; result = null; $('error').textContent = 'Inputs changed. Run validation to produce a new result.'; $('error').hidden = false; for (const id of ['issues-table','audit-table','events-table']) if ($(id)) $(id).replaceChildren(); };
    document.querySelectorAll('textarea,select').forEach(el => el.addEventListener('input',invalidate));
    if (mode === 'cleaner') {
      $('download-clean').addEventListener('click',() => { if (result) download('customers_clean.csv',C.csv(C.cleanHeaders,result.rows)); });
      $('download-log').addEventListener('click',() => { if (result) download('cleanup_changes.csv',C.csv(['source_row','column','original','cleaned','change'],result.changes)); });
      $('download-issues').addEventListener('click',() => { if (result) download('cleanup_review.csv',C.csv(['source_row','record_id','issue'],result.issues)); });
    } else {
      $('download-master').addEventListener('click',() => { if (result) download('master_updated.csv',C.csv(C.mergeHeaders,result.rows)); });
      $('download-events').addEventListener('click',() => { if (result) download('consolidation_log.csv',C.csv(['batch','order_id','change','previous','current'],result.changes)); });
    }
  }
  reset();
})();
