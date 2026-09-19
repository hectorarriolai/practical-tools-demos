'use strict';
const pageUrl = new URL(location.href);
let language = pageUrl.searchParams.get('lang') === 'en' ? 'en' : 'es';
const languageButton = document.getElementById('language');
const form = document.getElementById('brief-form');
let briefGenerated = false;

function briefText() {
  const labels = language === 'en' ? {title:'CASA CLARA — SAMPLE BRIEF', space:'Space', priority:'Priority', end:'Fictional demonstration. No booking, quote or message has been sent.'} : {title:'CASA CLARA — BRIEF DE EJEMPLO', space:'Espacio', priority:'Prioridad', end:'Demostración ficticia. No se ha enviado una reserva, cotización ni mensaje.'};
  const choice = document.getElementById('space');
  return `${labels.title}\n\n${labels.space}: ${choice.selectedOptions[0].textContent}\n\n${labels.priority}: ${document.getElementById('priority').value.trim()}\n\n${labels.end}`;
}

function setLanguage(next) {
  language = next;
  document.documentElement.lang = language;
  document.querySelectorAll('[data-es][data-en]').forEach(node => { node.textContent = node.dataset[language]; });
  document.querySelectorAll('[data-placeholder-es]').forEach(node => { node.placeholder = language === 'en' ? node.dataset.placeholderEn : node.dataset.placeholderEs; });
  document.querySelectorAll('a[data-local]').forEach(link => { const url = new URL(link.getAttribute('href'), location.href); url.searchParams.set('lang', language); link.href = url.href; });
  languageButton.textContent = language === 'en' ? 'ES ↗' : 'EN ↗';
  languageButton.setAttribute('aria-label', language === 'en' ? 'Cambiar a español' : 'Switch to English');
  document.querySelector('nav').setAttribute('aria-label', language === 'en' ? 'Main navigation' : 'Navegación principal');
  const illustration = document.querySelector('svg[role="img"]');
  if (illustration) illustration.setAttribute('aria-label', language === 'en' ? 'Illustration of an organized room' : 'Ilustración de un espacio ordenado');
  const title = location.pathname.endsWith('services.html') ? (language === 'en' ? 'Services' : 'Servicios') : location.pathname.endsWith('contact.html') ? (language === 'en' ? 'Your space' : 'Tu espacio') : (language === 'en' ? 'Home' : 'Inicio');
  document.title = `${title} — Casa Clara · Demo`;
  const current = new URL(location.href); current.searchParams.set('lang', language); history.replaceState(null, '', current);
  if (briefGenerated) document.getElementById('brief-text').textContent = briefText();
  const status = document.getElementById('brief-status'); if (status) status.textContent = '';
}

languageButton.addEventListener('click', () => setLanguage(language === 'es' ? 'en' : 'es'));
if (form) {
  const preset = pageUrl.searchParams.get('space');
  if (['01','02','03'].includes(preset)) document.getElementById('space').value = preset;
  form.addEventListener('submit', event => {
    event.preventDefault();
    const input = document.getElementById('priority');
    if (!input.value.trim()) { input.setCustomValidity(language === 'en' ? 'Describe one priority.' : 'Describe una prioridad.'); input.reportValidity(); return; }
    input.setCustomValidity(''); briefGenerated = true;
    document.getElementById('brief-empty').hidden = true;
    document.getElementById('brief-result').hidden = false;
    document.getElementById('brief-text').textContent = briefText();
    document.getElementById('brief-status').textContent = language === 'en' ? 'Sample brief created. Nothing was sent.' : 'Brief de ejemplo creado. No se envió información.';
  });
  document.getElementById('priority').addEventListener('input', event => { event.target.setCustomValidity(''); });
  form.addEventListener('input', () => { if (briefGenerated) document.getElementById('brief-text').textContent = briefText(); });
  document.getElementById('copy-brief').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(briefText()); document.getElementById('brief-status').textContent = language === 'en' ? 'Copied. You decide where to share it.' : 'Copiado. Tú decides dónde compartirlo.'; }
    catch { document.getElementById('brief-status').textContent = language === 'en' ? 'Copy is unavailable. Select the text or download the TXT.' : 'No se pudo copiar. Selecciona el texto o descarga el TXT.'; }
  });
  document.getElementById('download-brief').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([briefText()], {type:'text/plain;charset=utf-8'}));
    const a = document.createElement('a'); a.href = url; a.download = 'casa-clara-demo-brief.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}
setLanguage(language);
