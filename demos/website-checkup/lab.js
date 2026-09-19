'use strict';
const frame = document.getElementById('demo-frame');
const sampleLink = document.getElementById('sample-link');
function setMode(mode) {
  frame.dataset.mode = mode;
  ['before','after'].forEach(id => document.getElementById(id).setAttribute('aria-pressed', String(id === mode)));
  sampleLink.textContent = mode === 'after' ? 'View the website checkup package ↗' : 'Click here';
  document.getElementById('mode-note').textContent = mode === 'after' ? 'After: the items wrap, the link describes its destination, and keyboard focus is visible.' : 'Before: fixed-width items may be clipped, the link is vague, and its keyboard focus outline is suppressed. These are intentional defects in this sample only.';
}
document.getElementById('before').addEventListener('click', () => setMode('before'));
document.getElementById('after').addEventListener('click', () => setMode('after'));
