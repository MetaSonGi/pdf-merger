/* PDF 합치기 — pdf-lib (100% 클라이언트) */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const files = []; // {name, bytes, pages}
  let seq = 0;

  const dropZone = $('dropZone'), fileInput = $('fileInput');
  dropZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => { addFiles(e.target.files); fileInput.value = ''; });
  ['dragenter', 'dragover'].forEach((ev) => dropZone.addEventListener(ev, (e) => { e.preventDefault(); dropZone.classList.add('dragover'); }));
  ['dragleave', 'drop'].forEach((ev) => dropZone.addEventListener(ev, (e) => { e.preventDefault(); dropZone.classList.remove('dragover'); }));
  dropZone.addEventListener('drop', (e) => addFiles(e.dataTransfer.files));

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  async function addFiles(list) {
    for (const f of [...list]) {
      if (!/\.pdf$/i.test(f.name) && f.type !== 'application/pdf') continue;
      const bytes = new Uint8Array(await f.arrayBuffer());
      let pages = '?';
      try {
        const doc = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
        pages = doc.getPageCount();
      } catch (e) { alert(`"${f.name}" — 읽을 수 없는 PDF입니다 (암호화/손상 가능)`); continue; }
      files.push({ id: ++seq, name: f.name, bytes, pages });
    }
    render();
  }

  function render() {
    const ol = $('fileList');
    ol.innerHTML = '';
    files.forEach((f, i) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="fnum">${i + 1}</span>
        <span class="fname">${esc(f.name)}</span>
        <span class="fmeta">${f.pages}페이지</span>
        <span class="fbtns">
          <button class="btn small" ${i === 0 ? 'disabled' : ''} data-up>▲</button>
          <button class="btn small" ${i === files.length - 1 ? 'disabled' : ''} data-down>▼</button>
          <button class="btn small ghost" data-del>✕</button>
        </span>`;
      li.querySelector('[data-up]').addEventListener('click', () => { move(i, -1); });
      li.querySelector('[data-down]').addEventListener('click', () => { move(i, 1); });
      li.querySelector('[data-del]').addEventListener('click', () => { files.splice(i, 1); render(); });
      ol.appendChild(li);
    });
    const total = files.reduce((a, f) => a + (typeof f.pages === 'number' ? f.pages : 0), 0);
    $('mergeInfo').textContent = files.length ? `${files.length}개 파일 · 총 ${total}페이지` : 'PDF를 넣어주세요';
    $('mergeBtn').disabled = files.length < 1;
  }

  function move(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= files.length) return;
    [files[i], files[j]] = [files[j], files[i]];
    render();
  }

  $('mergeBtn').addEventListener('click', async () => {
    if (!files.length) return;
    const btn = $('mergeBtn');
    btn.disabled = true; btn.textContent = '합치는 중…';
    try {
      const out = await PDFLib.PDFDocument.create();
      for (const f of files) {
        const src = await PDFLib.PDFDocument.load(f.bytes, { ignoreEncryption: true });
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach((p) => out.addPage(p));
      }
      const bytes = await out.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      let name = $('outName').value.trim() || 'merged.pdf';
      if (!/\.pdf$/i.test(name)) name += '.pdf';
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch (e) {
      console.error(e);
      alert('합치기 실패: ' + e.message);
    } finally {
      btn.disabled = false; btn.textContent = '📚 합치기 & 다운로드';
    }
  });
})();
