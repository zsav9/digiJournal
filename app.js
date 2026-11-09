const $ = s => document.querySelector(s);
const pagesEl = $('#pages'), tray = $('#tray');
let cur = null,
 selectElement = null;

function addPage() {
  const p = document.createElement('div');
  p.className = 'page';
  const t = document.createElement('div');
  t.className = 'text'; t.contentEditable = 'true'; t.spellcheck = false;
  p.appendChild(t);
  p.dataset.color = $('#color').value;
  p.dataset.lined = '1';
  p.addEventListener('pointerdown', () => { SetCurrentPage(p); select(null); 

  });
  p.addEventListener('dragover', e => e.preventDefault());
  p.addEventListener('drop', e => {
    e.preventDefault();
    const src = e.dataTransfer.getData('text/plain'); if (!src) return;
    const r = p.getBoundingClientRect();
    act(() => addItem(p, src, e.clientX - r.left - 75, e.clientY - r.top - 75));
  });
  pagesEl.appendChild(p); paint(p); SetCurrentPage(p);
  p.scrollIntoView({ behavior: 'smooth' 

  });
}
function paint(p) {
  p.style.backgroundColor = p.dataset.color;
  p.classList.toggle('lined', p.dataset.lined === '1');
}
function SetCurrentPage(p) {
  cur = p;
  document.querySelectorAll('.page').forEach(x => x.classList.toggle('current', x === p));
  $('#color').value = p.dataset.color;
  $('#lined').checked = p.dataset.lined === '1';
}
function select(element) {
  if (selectElement) selectElement.classList.remove('sel');
  selectElement = element; if (element) element.classList.add('sel');
}

const hist = [], redoStack = [];
const state = () => JSON.stringify([...document.querySelectorAll('.page')].map(p =>
  [...p.querySelectorAll('.item')].map(el => ({
    src: el.querySelector('img').getAttribute('src'),
    x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth,
    rot: +el.dataset.rot, flip: +el.dataset.flip
  }))));
function commit(before){
  if(before === state()) return;
  hist.push(before); redoStack.length = 0;
  if(hist.length > 100) hist.shift();
}
const act = fn => { const b = state(); fn(); commit(b); };
function restore(s){
  const data = JSON.parse(s); select(null);
  document.querySelectorAll('.page').forEach((p, i) => {
    p.querySelectorAll('.item').forEach(e => e.remove());
    (data[i] || []).forEach(o => addItem(p, o.src, o.x, o.y, o));
  });
  select(null);
}
function undo(){ if(!hist.length) return; redoStack.push(state()); restore(hist.pop()); }
function redo(){ if(!redoStack.length) return; hist.push(state()); restore(redoStack.pop()); }
const applyT = el => el.style.transform = `rotate(${el.dataset.rot}deg) scaleX(${el.dataset.flip})`;

function addItem(page, src, x, y, o = {}){
  const el = document.createElement('div');
  el.className = 'item';
  el.dataset.rot = o.rot || 0; el.dataset.flip = o.flip || 1;
  el.style.cssText = `left:${x}px;top:${y}px;width:${o.w || 150}px`;
  el.innerHTML = `<img src="${src}" draggable="false"><i class="h"></i>`;
  applyT(el);
  el.addEventListener('pointerdown', e => {
    e.stopPropagation(); SetCurrentPage(page); select(el);
    const before = state();
    const resize = e.target.classList.contains('h');
    const sx = e.clientX, sy = e.clientY, ox = el.offsetLeft, oy = el.offsetTop, ow = el.offsetWidth;
    const mv = ev => {
      if(resize) el.style.width = Math.max(30, ow + ev.clientX - sx) + 'px';
      else { el.style.left = ox + ev.clientX - sx + 'px'; el.style.top = oy + ev.clientY - sy + 'px'; }
    };
    const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); commit(before); };
    addEventListener('pointermove', mv); addEventListener('pointerup', up);
  });
  page.appendChild(el); select(el);
}

const rotate = d => { if (selectElement) act(() => { selectElement.dataset.rot = +selectElement.dataset.rot + d; applyT(selectElement); }); };
const flip = () => { if (selectElement) act(() => { selectElement.dataset.flip = -selectElement.dataset.flip; applyT(selectElement); }); };
const delItem = () => { if (selectElement) act(() => { selectElement.remove(); selectElement = null; }); };

function addToTray(src) {
  const img = document.createElement('img');
  img.src = src; img.draggable = true;
  img.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', src));
  img.addEventListener('click', () => act(() => addItem(cur, src, 300, 400)));
  tray.appendChild(img);
}

(window.STICKERS || []).forEach(addToTray);
$('#file').addEventListener('change', e => {
  [...e.target.files].forEach(f => addToTray(URL.createObjectURL(f)));
  e.target.value = '';
});
$('#color').addEventListener('input', e => { 
  cur.dataset.color = e.target.value; paint(cur); 
});
$('#lined').addEventListener('change', e => { 
  cur.dataset.lined = e.target.checked ? '1' : '0'; paint(cur); 
});

$('#addPage').onclick = addPage;
$('#delPage').onclick = () => {
  if (document.querySelectorAll('.page').length < 2) return;
  hist.length = 0; redoStack.length = 0;
  const next = cur.previousElementSibling || cur.nextElementSibling; 
  cur.remove(); select(null); 
  SetCurrentPage(next);
};

$('#rotL').onclick = () => rotate(-15);
$('#rotR').onclick = () => rotate(15);
$('#front').onclick = () => selectElement && act(() => selectElement.parentElement.appendChild(selectElement));
$('#flip').onclick = flip;
$('#undo').onclick = undo;
$('#redo').onclick = redo;
$('#delItem').onclick = delItem;
addEventListener('keydown', e => {
  if (e.target.isContentEditable) return;
  const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
  if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if (mod && k === 'y') { e.preventDefault(); redo(); return; }
  if (e.key === 'Delete' || e.key === 'Backspace') delItem();
});

$('#print').onclick = () => { select(null); print(); };

$('#png').onclick = async () => {

  select(null);
  const S = 2, W = 794, H = 1123;
  try {
    let n = 1;

    for (const p of document.querySelectorAll('.page')) {
      const c = document.createElement('canvas'); c.width = W * S; c.height = H * S;
      const g = c.getContext('2d'); g.scale(S, S);
      g.fillStyle = p.dataset.color; g.fillRect(0, 0, W, H);

      if (p.dataset.lined === '1') 
        { g.fillStyle = 'rgba(0,0,0,.18)'; for (let y = 31; y < H; y += 32) g.fillRect(0, y, W, 1);

         }
      const pr = p.getBoundingClientRect(), 
      tx = p.querySelector('.text'), 
      cs = getComputedStyle(tx);
      g.fillStyle = '#2b2b2b'; g.font = `${cs.fontSize} ${cs.fontFamily}`; g.textBaseline = 'middle';
      const walker = document.createTreeWalker(tx, NodeFilter.SHOW_TEXT), rg = document.createRange();

      while (walker.nextNode()) {
        const n = walker.currentNode;

        for (let i = 0; i < n.length; i++) {
          rg.setStart(n, i); rg.setEnd(n, i + 1);
          const r = rg.getBoundingClientRect();
          if (r.width) g.fillText(n.data[i], r.left - pr.left, r.top - pr.top + r.height / 2);
        }
      }
      for (const it of p.querySelectorAll('.item')) {
        const im = it.querySelector('img'), w = it.offsetWidth, h = it.offsetHeight;
        g.save(); g.translate(it.offsetLeft + w / 2, it.offsetTop + h / 2);
        g.rotate(+it.dataset.rot * Math.PI / 180); g.scale(+it.dataset.flip, 1);
        g.drawImage(im, -w / 2, -h / 2, w, h); g.restore();
      }
      const a = document.createElement('a');
      a.href = c.toDataURL('image/png'); a.download = `digijournal-${n++}.png`; a.click();
    }
  } catch (err) {
    alert('O navegador bloqueou o PNG. ');
  }
};

addPage();
