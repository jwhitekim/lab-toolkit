const SERVER = 'https://veloo.page';

const queryInput = document.getElementById('queryInput');
const lookupBtn  = document.getElementById('lookupBtn');
const statusEl   = document.getElementById('status');
const resultEl   = document.getElementById('result');

// 팝업 열릴 때 입력창 포커스
queryInput.focus();

// Enter 키 지원
queryInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') doLookup();
});
lookupBtn.addEventListener('click', doLookup);

document.getElementById('openWeb').addEventListener('click', async () => {
  try {
    const res = await fetch(`${SERVER}/api/me`, { credentials: 'include' });
    const data = await res.json();
    const path = data.username ? `/${data.username}/` : '/';
    chrome.tabs.create({ url: `${SERVER}${path}` });
  } catch {
    chrome.tabs.create({ url: SERVER });
  }
});

async function doLookup() {
  const text = queryInput.value.trim();
  if (!text) return;

  setStatus('조회 중<span class="spinner"></span>', false);
  resultEl.style.display = 'none';
  lookupBtn.disabled = true;

  try {
    const res = await fetch(`${SERVER}/contextor/api/lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ text }),
    });

    if (res.status === 401) {
      setStatus('로그인이 필요합니다. 웹에서 먼저 로그인해주세요.', true);
      return;
    }
    if (!res.ok) {
      setStatus('서버 오류가 발생했습니다.', true);
      return;
    }

    const data = await res.json();
    hideStatus();
    renderResult(data);
  } catch {
    setStatus('서버 연결 실패 — 서버가 실행 중인지 확인하세요.', true);
  } finally {
    lookupBtn.disabled = false;
  }
}

function setStatus(html, isError) {
  statusEl.innerHTML = html;
  statusEl.className = 'visible' + (isError ? ' error' : '');
}

function hideStatus() {
  statusEl.className = '';
  statusEl.innerHTML = '';
}

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderResult(data) {
  const parts = [];

  parts.push(`<div class="result-query">${esc(data.query)}</div>`);

  if (!data.hasMlUsage || !data.cases?.length) {
    const note = data.note || 'ML/DL 특수 용법 없음';
    parts.push(`<div class="no-ml">${esc(note)}</div>`);
  } else {
    for (const c of data.cases) {
      parts.push(`
        <div class="case-item">
          <div class="case-label">${esc(c.label)}</div>
          <div class="case-term">${esc(c.term)}</div>
          <div class="case-meaning">${esc(c.meaning)}</div>
          ${c.exampleEn ? `
          <div class="case-example">
            <div class="en">${esc(c.exampleEn)}</div>
            <div class="ko">${esc(c.exampleKo)}</div>
          </div>` : ''}
        </div>
      `);
    }
  }

  resultEl.innerHTML = parts.join('');
  resultEl.style.display = 'block';
}

export {};
