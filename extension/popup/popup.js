import { MSG, send } from '../src/messages.js';
import { signInWithPassword } from '../src/auth.js';
import { WEB_APP_ORIGIN } from '../config.app.js';

// Recruiting terms — kept in sync with the dashboard (options.js) so jobs
// added from the popup group correctly by season there.
const SEASONS = ['Summer 2027', 'Winter 2027'];

let editingId = null;

// DOM refs
const home = document.getElementById('home');
const appCount = document.getElementById('app-count');
const formView = document.getElementById('form-view');
const formTitle = document.getElementById('form-title');
const fId = document.getElementById('f-id');
const fTitle = document.getElementById('f-title');
const fCompany = document.getElementById('f-company');
const fLocation = document.getElementById('f-location');
const fDate = document.getElementById('f-date');
const fStatus = document.getElementById('f-status');
const fSeason = document.getElementById('f-season');
const fDesc = document.getElementById('f-desc');
const fNotes = document.getElementById('f-notes');
const fDupe = document.getElementById('f-dupe');
const btnDelete = document.getElementById('btn-delete');

// Populate the Term dropdown once.
SEASONS.forEach(s => fSeason.appendChild(new Option(s, s)));

// Show the total tracked-application count in the header chip.
async function loadCount() {
  try {
    const res = await send(MSG.GET_INDEX);
    appCount.textContent = (res.index || []).length || '';
  } catch {
    appCount.textContent = '';
  }
}

// Keyboard: Esc closes an open slide-in; Ctrl/Cmd+Enter saves the form.
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && formView.style.display !== 'none') {
    closeForm();
  }
  if (e.key === 'Escape' && mergeView.style.display !== 'none') {
    closeMergeView();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && formView.style.display !== 'none') {
    saveForm();
  }
});

// Add button
document.getElementById('btn-add').addEventListener('click', () => openAddForm());

// Grab page button
document.getElementById('btn-grab').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // Inline scraper — returns raw fields since we can't import modules here.
        // Keep this DOM→text logic in sync with content/content.js (extractFormatted)
        // so bullet lists, indentation, and paragraphs survive the grab.
        const BLOCK_TAGS = new Set(['P','DIV','SECTION','ARTICLE','UL','OL','LI','TABLE','TR','H1','H2','H3','H4','H5','H6','HEADER','FOOTER','BLOCKQUOTE','PRE','DD','DT']);
        function normalizeText(s) {
          return (s || '').split('\n').map((line) => {
            const lead = line.match(/^[ \t]*/)[0];
            const body = line.slice(lead.length).replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+$/, '');
            return body ? lead + body : '';
          }).join('\n').replace(/\n{3,}/g, '\n\n').replace(/^\s+|\s+$/g, '');
        }
        function extractFormatted(root) {
          let out = '';
          const walk = (node, depth) => {
            node.childNodes.forEach((child) => {
              if (child.nodeType === Node.TEXT_NODE) { out += child.textContent.replace(/\s+/g, ' '); return; }
              if (child.nodeType !== Node.ELEMENT_NODE) return;
              const tag = child.tagName;
              if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return;
              if (tag === 'BR') { out += '\n'; return; }
              if (tag === 'LI') { out += '\n' + '  '.repeat(Math.max(0, depth - 1)) + '• '; walk(child, depth); return; }
              const isList = tag === 'UL' || tag === 'OL';
              if (BLOCK_TAGS.has(tag)) out += '\n';
              walk(child, depth + (isList ? 1 : 0));
              if (BLOCK_TAGS.has(tag)) out += '\n';
            });
          };
          walk(root, 0);
          return normalizeText(out);
        }
        const readDesc = (el) => (el ? extractFormatted(el) : '');

        function fromJsonLd(doc) {
          const scripts = [...doc.querySelectorAll('script[type="application/ld+json"]')];
          for (const s of scripts) {
            try {
              const data = JSON.parse(s.textContent);
              const items = Array.isArray(data) ? data : [data];
              for (const item of items) {
                if (item['@type'] === 'JobPosting') {
                  return {
                    title: item.title || '',
                    company: item.hiringOrganization?.name || '',
                    location: item.jobLocation?.address?.addressLocality || '',
                    description: item.description
                      ? readDesc(new DOMParser().parseFromString(item.description, 'text/html').body)
                      : '',
                  };
                }
              }
            } catch {}
          }
          return null;
        }

        const jsonLd = fromJsonLd(document);
        const ogTitle = document.querySelector('meta[property="og:title"]')?.content || '';
        const sel = window.getSelection().toString().trim();

        let desc = '';
        if (sel.length > 200) {
          desc = normalizeText(sel);
        } else {
          // Prefer known ATS description containers (they keep real structure),
          // then fall back to a text-density heuristic. Reading the live DOM this
          // way preserves paragraphs and bullet lists.
          const KNOWN = [
            '[data-automation-id="jobPostingDescription"]', // Workday
            '.jobs-description__content', '#job-details',    // LinkedIn
            '.job__description', '#content',                 // Greenhouse
            '[class*="descriptionText"]', '[class*="jobDescription"]', // Ashby / misc
            '.section-wrapper',                              // Lever
          ];
          let target = null;
          for (const selector of KNOWN) {
            const el = document.querySelector(selector);
            if (el && el.innerText && el.innerText.length > 200) { target = el; break; }
          }
          if (!target) {
            const IGNORE = new Set(['nav','header','footer','aside','script','style','noscript']);
            const cands = [...document.querySelectorAll('div, article, section, main')]
              .filter(el => !IGNORE.has(el.tagName.toLowerCase()));
            let bestScore = 0;
            for (const el of cands) {
              const t = el.innerText || '';
              const links = [...el.querySelectorAll('a')].reduce((a,x)=>a+(x.innerText||'').length,0);
              const score = t.length / (1 + links);
              if (score > bestScore) { bestScore = score; target = el; }
            }
          }
          desc = readDesc(target) || normalizeText(document.body.innerText.slice(0, 20000));
        }

        // The JSON-LD description is often a pre-flattened single-line blob, so
        // prefer whichever source preserves more structure (line breaks).
        const jsonDesc = jsonLd?.description || '';
        const description =
          ((desc.match(/\n/g) || []).length >= (jsonDesc.match(/\n/g) || []).length)
            ? desc : jsonDesc;

        return {
          title: jsonLd?.title || ogTitle || document.title || '',
          company: jsonLd?.company || '',
          location: jsonLd?.location || '',
          description: description || desc || jsonDesc,
          sourceHost: location.hostname,
        };
      },
    });

    const scraped = results?.[0]?.result || {};
    openAddForm(scraped);
  } catch (err) {
    openAddForm({ title: '', company: '', description: '' });
  }
});

function openAddForm(prefill = {}) {
  editingId = null;
  formTitle.textContent = 'Add Application';
  fId.value = '';
  fTitle.value = prefill.title || '';
  fCompany.value = prefill.company || '';
  fLocation.value = prefill.location || '';
  fDate.value = new Date().toISOString().slice(0, 10);
  fStatus.value = 'applied';
  fSeason.value = prefill.season || '';
  fDesc.value = prefill.description || '';
  fNotes.value = prefill.notes || '';
  fDupe.style.display = 'none';
  btnDelete.style.display = 'none';
  home.style.display = 'none';
  formView.style.display = 'flex';
}

function closeForm() {
  formView.style.display = 'none';
  home.style.display = 'flex';
  editingId = null;
}

async function saveForm() {
  const title = fTitle.value.trim();
  const company = fCompany.value.trim();
  if (!title || !company) {
    fTitle.reportValidity?.();
    fTitle.focus();
    return;
  }

  const app = {
    id: fId.value || crypto.randomUUID(),
    title,
    company,
    location: fLocation.value.trim(),
    appliedAt: fDate.value || new Date().toISOString().slice(0, 10),
    status: fStatus.value,
    season: fSeason.value || null,
    description: fDesc.value.trim(),
    notes: fNotes.value.trim(),
  };

  const msgType = editingId ? MSG.UPDATE_APPLICATION : MSG.SAVE_APPLICATION;

  let res;
  try {
    res = await send(msgType, { app });
  } catch (err) {
    showFormError(`Save failed: ${err.message}`);
    return;
  }

  if (!res || res.error || res.ok === false) {
    showFormError(`Save failed: ${res?.error || 'unknown error'}`);
    return;
  }

  if (res.dupe) {
    fDupe.textContent = '⚠ This looks like a duplicate of an existing application.';
    fDupe.style.display = 'block';
    return;
  }

  closeForm();
  await loadCount();
}

document.getElementById('btn-back').addEventListener('click', closeForm);
document.getElementById('btn-save').addEventListener('click', saveForm);
document.getElementById('btn-delete').addEventListener('click', async () => {
  if (!editingId) return;
  if (!confirm('Delete this application?')) return;
  await send(MSG.DELETE_APPLICATION, { id: editingId });
  closeForm();
  await loadCount();
});

function showFormError(msg) {
  fDupe.textContent = msg;
  fDupe.style.display = 'block';
  console.error('[jobtrack]', msg);
}

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Combine PDFs ────────────────────────────────────────────────────────────
// Client-side PDF merge using the vendored pdf-lib (global `PDFLib`). Nothing
// leaves the browser — files are read, merged in list order, and downloaded.
const mergeView = document.getElementById('merge-view');
const mergeInput = document.getElementById('merge-input');
const mergeDrop = document.getElementById('merge-drop');
const mergeListEl = document.getElementById('merge-list');
const mergeName = document.getElementById('merge-name');
const mergeStatus = document.getElementById('merge-status');
const btnMergeGo = document.getElementById('btn-merge-go');
const btnMergeClear = document.getElementById('btn-merge-clear');

let mergeFiles = []; // ordered File[]

function openMergeView() {
  mergeFiles = [];
  renderMergeList();
  setMergeStatus('');
  mergeName.value = 'combined.pdf';
  home.style.display = 'none';
  mergeView.style.display = 'flex';
}
function closeMergeView() {
  mergeView.style.display = 'none';
  home.style.display = 'flex';
}

function humanSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function addMergeFiles(fileList) {
  const pdfs = [...fileList].filter(f => f.type === 'application/pdf' || /\.pdf$/i.test(f.name));
  const skipped = fileList.length - pdfs.length;
  mergeFiles.push(...pdfs);
  renderMergeList();
  if (skipped > 0) setMergeStatus(`Skipped ${skipped} non-PDF file${skipped > 1 ? 's' : ''}.`, 'info');
  else setMergeStatus('');
}

function renderMergeList() {
  mergeListEl.innerHTML = '';
  mergeFiles.forEach((file, i) => {
    const li = document.createElement('li');
    li.className = 'merge-item';
    li.innerHTML = `
      <span class="merge-item-idx">${i + 1}</span>
      <span class="merge-item-name" title="${esc(file.name)}">${esc(file.name)}</span>
      <span class="merge-item-size">${humanSize(file.size)}</span>
      <span class="merge-item-btns">
        <button class="up" title="Move up" ${i === 0 ? 'disabled' : ''}>
          <svg viewBox="0 0 20 20"><path d="M10 5l5 6H5l5-6z"/></svg>
        </button>
        <button class="down" title="Move down" ${i === mergeFiles.length - 1 ? 'disabled' : ''}>
          <svg viewBox="0 0 20 20"><path d="M10 15l-5-6h10l-5 6z"/></svg>
        </button>
        <button class="rm" title="Remove">
          <svg viewBox="0 0 20 20"><path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
        </button>
      </span>`;
    li.querySelector('.up').addEventListener('click', () => moveMerge(i, -1));
    li.querySelector('.down').addEventListener('click', () => moveMerge(i, 1));
    li.querySelector('.rm').addEventListener('click', () => { mergeFiles.splice(i, 1); renderMergeList(); });
    mergeListEl.appendChild(li);
  });
  btnMergeGo.disabled = mergeFiles.length < 1;
  btnMergeClear.style.display = mergeFiles.length ? 'inline-flex' : 'none';
}

function moveMerge(i, dir) {
  const j = i + dir;
  if (j < 0 || j >= mergeFiles.length) return;
  [mergeFiles[i], mergeFiles[j]] = [mergeFiles[j], mergeFiles[i]];
  renderMergeList();
}

function setMergeStatus(msg, kind = 'info') {
  if (!msg) { mergeStatus.style.display = 'none'; return; }
  mergeStatus.textContent = msg;
  mergeStatus.className = `merge-status ${kind}`;
  mergeStatus.style.display = 'block';
}

async function combineAndDownload() {
  if (mergeFiles.length < 1 || typeof PDFLib === 'undefined') {
    setMergeStatus('PDF library not loaded.', 'error');
    return;
  }
  btnMergeGo.disabled = true;
  setMergeStatus('Combining…', 'info');
  try {
    const out = await PDFLib.PDFDocument.create();
    for (const file of mergeFiles) {
      const bytes = await file.arrayBuffer();
      const src = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
      const pages = await out.copyPages(src, src.getPageIndices());
      pages.forEach(p => out.addPage(p));
    }
    const merged = await out.save();
    let name = (mergeName.value || 'combined.pdf').trim();
    if (!/\.pdf$/i.test(name)) name += '.pdf';

    const blob = new Blob([merged], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);

    setMergeStatus(`Combined ${mergeFiles.length} file${mergeFiles.length > 1 ? 's' : ''} → ${name}`, 'ok');
  } catch (err) {
    console.error('[jobtrack] merge failed', err);
    setMergeStatus(`Couldn't combine: ${err.message}`, 'error');
  } finally {
    btnMergeGo.disabled = mergeFiles.length < 1;
  }
}

document.getElementById('btn-merge').addEventListener('click', openMergeView);
document.getElementById('btn-merge-back').addEventListener('click', closeMergeView);
btnMergeGo.addEventListener('click', combineAndDownload);
btnMergeClear.addEventListener('click', () => { mergeFiles = []; renderMergeList(); setMergeStatus(''); });
mergeInput.addEventListener('change', () => { addMergeFiles(mergeInput.files); mergeInput.value = ''; });

// Drag-and-drop onto the drop zone
['dragenter', 'dragover'].forEach(ev =>
  mergeDrop.addEventListener(ev, (e) => { e.preventDefault(); mergeDrop.classList.add('dragover'); }));
['dragleave', 'drop'].forEach(ev =>
  mergeDrop.addEventListener(ev, (e) => { e.preventDefault(); mergeDrop.classList.remove('dragover'); }));
mergeDrop.addEventListener('drop', (e) => {
  if (e.dataTransfer?.files?.length) addMergeFiles(e.dataTransfer.files);
});

// ── Auth gate ────────────────────────────────────────────────────────────────
// The popup has two views: a login gate (logged out) and the action hub (logged
// in). Both login paths are offered: "Log in with JobMaxxing" opens the web
// login, and the email/password form logs in without leaving the popup.
const loginView = document.getElementById('login-view');
const linkWebsite = document.getElementById('link-website');
const btnSignout = document.getElementById('btn-signout');
const loginError = document.getElementById('login-error');

function showLoginError(msg) {
  loginError.textContent = msg;
  loginError.style.display = msg ? 'block' : 'none';
}

// Toggle between the login gate and the logged-in hub.
function renderAuth(loggedIn) {
  loginView.style.display = loggedIn ? 'none' : 'flex';
  home.style.display = loggedIn ? 'flex' : 'none';
  linkWebsite.style.display = loggedIn ? 'inline-flex' : 'none';
  btnSignout.style.display = loggedIn ? 'inline-flex' : 'none';
  appCount.style.display = loggedIn ? '' : 'none';
}

async function refreshAuth() {
  let loggedIn = false;
  try {
    const res = await send(MSG.GET_SESSION);
    loggedIn = Boolean(res?.session);
  } catch { /* treat as logged out */ }
  renderAuth(loggedIn);
  if (loggedIn) loadCount();
  return loggedIn;
}

// "View Website" → open the web app's applications dashboard in a new tab.
linkWebsite.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: `${WEB_APP_ORIGIN}/applications` });
});

// "Log in with JobMaxxing" → open the web login page. After the user logs in
// there, the auth-bridge content script pushes the session back to the extension
// (Phase 2 wires the real session), and storage.onChanged below flips this view.
document.getElementById('btn-login-web').addEventListener('click', () => {
  chrome.tabs.create({ url: `${WEB_APP_ORIGIN}/login` });
});

// Email/password login inside the popup. Stub until Supabase is configured.
document.getElementById('btn-login-email').addEventListener('click', async () => {
  showLoginError('');
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) {
    showLoginError('Enter your email and password.');
    return;
  }
  const res = await signInWithPassword(email, password);
  if (!res || res.ok === false) {
    showLoginError(res?.error || 'Sign-in failed.');
    return;
  }
  // TODO(phase-2): on success, persist the real session:
  //   await send(MSG.SET_SESSION, { session: res.session });
  await refreshAuth();
});

btnSignout.addEventListener('click', async () => {
  await send(MSG.SIGN_OUT);
  await refreshAuth();
});

// If a session arrives while the popup is open (e.g. the web login just
// completed and the bridge pushed it), flip to the logged-in view live.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.jm_session) refreshAuth();
});

refreshAuth();
