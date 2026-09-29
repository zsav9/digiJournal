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
    addItem(p, src, e.clientX - r.left - 75, e.clientY - r.top - 75);
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

function addItem(page, src, x, y) {
  const element = document.createElement('div');
  element.className = 'item'; element.dataset.rot = 0;
  element.style.cssText = `left:${x}px;top:${y}px;width:150px`;
  element.innerHTML = `<img src="${src}" draggable="false"><i class="h"></i>`;
  element.addEventListener('pointerdown', e => {
    e.stopPropagation(); SetCurrentPage(page); select(element);
    const resize = e.target.classList.contains('h');
    const sx = e.clientX, sy = e.clientY, ox = element.offsetLeft, oy = element.offsetTop, ow = element.offsetWidth;
    const mv = ev => {
      if (resize) element.style.width = Math.max(30, ow + ev.clientX - sx) + 'px';
      else { element.style.left = ox + ev.clientX - sx + 'px'; element.style.top = oy + ev.clientY - sy + 'px'; }
    };
    const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); };
    addEventListener('pointermove', mv); addEventListener('pointerup', up);
  });
  page.appendChild(element); select(element);
}
const rotate = d => { if (!selectElement) return; const r = (+selectElement.dataset.rot + d); selectElement.dataset.rot = r; selectElement.style.transform = `rotate(${r}deg)`; };
const delItem = () => { if (selectElement) { selectElement.remove(); selectElement = null; } };

function addToTray(src) {
  const img = document.createElement('img');
  img.src = src; img.draggable = true;
  img.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', src));
  img.addEventListener('click', () => addItem(cur, src, 300, 400));
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
  const next = cur.previousElementSibling || cur.nextElementSibling; 
  cur.remove(); select(null); 
  SetCurrentPage(next);
};

$('#rotL').onclick = () => rotate(-15);
$('#rotR').onclick = () => rotate(15);
$('#front').onclick = () => selectElement && selectElement.parentElement.appendChild(selectElement);
$('#delItem').onclick = delItem;
addEventListener('keydown', e => {
  if (e.target.isContentEditable) return;
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
        g.rotate(+it.dataset.rot * Math.PI / 180); g.drawImage(im, -w / 2, -h / 2, w, h); g.restore();
      }
      const a = document.createElement('a');
      a.href = c.toDataURL('image/png'); a.download = `digijournal-${n++}.png`; a.click();
    }
  } catch (err) {
    alert('O navegador bloqueou o PNG. ');
  }
};

addPage();
