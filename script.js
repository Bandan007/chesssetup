const boardEl = document.getElementById('board');
const arrowsLayer = document.getElementById('arrows-layer');
const arrowToolbar = document.getElementById('arrow-toolbar');

let currentMode = 'move';
let arrowStartSquare = null;
let activeArrowColor = '#313639';
let activeArrowColorName = ''; // Default dark arrow has no prefix marker name

// Populate piece SVGs from hidden templates
document.querySelectorAll('.piece').forEach(p => {
  const char = p.dataset.fenChar;
  const template = document.querySelector(`#piece-templates [data-fen-char="${char}"]`);
  if (template) {
    p.innerHTML = template.innerHTML;
  }
});

// Build the Blank Board
for (let row = 0; row < 8; row++) {
  for (let col = 0; col < 8; col++) {
    const square = document.createElement('div');
    const isLight = (row + col) % 2 === 0;
    square.className = `square ${isLight ? 'light' : 'dark'}`;
    square.dataset.row = row;
    square.dataset.col = col;
    boardEl.appendChild(square);
  }
}

// --- Mode Toggling ---
function setMode(mode) {
  currentMode = mode;
  document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`btn-${mode}`).classList.add('active');
  
  if (mode === 'arrow') {
    arrowToolbar.classList.add('visible');
  } else {
    arrowToolbar.classList.remove('visible');
  }

  if (arrowStartSquare) {
    arrowStartSquare.classList.remove('arrow-start-selected');
    arrowStartSquare = null;
  }
}

function selectArrowColor(hex, name, el) {
  activeArrowColor = hex;
  activeArrowColorName = name;
  document.querySelectorAll('.color-dot').forEach(dot => dot.classList.remove('selected'));
  el.classList.add('selected');
}

// --- Mobile Touch Engine (Fixed Offset Dragging) ---
let dragData = null;

document.addEventListener('pointerdown', (e) => {
  if (e.target.closest('button') || e.target.closest('#arrow-toolbar')) return;

  const piece = e.target.closest('.piece');

  if (currentMode === 'move' && piece) {
    e.preventDefault(); 
    
    const isBank = piece.closest('#piece-bank') !== null;
    const rect = piece.getBoundingClientRect();
    
    dragData = {
      sourcePiece: piece,
      isBank: isBank,
      clone: piece.cloneNode(true),
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      startX: e.clientX,
      startY: e.clientY,
      width: rect.width,
      height: rect.height
    };

    dragData.clone.style.position = 'fixed';
    dragData.clone.style.pointerEvents = 'none';
    dragData.clone.style.zIndex = 1000;
    dragData.clone.style.width = rect.width + 'px';
    dragData.clone.style.height = rect.height + 'px';
    dragData.clone.style.left = (e.clientX - dragData.offsetX) + 'px';
    dragData.clone.style.top = (e.clientY - dragData.offsetY) + 'px';
    document.body.appendChild(dragData.clone);

    if (!isBank) piece.style.opacity = '0.3';
  }
}, { passive: false });

document.addEventListener('pointermove', (e) => {
  if (dragData) {
    e.preventDefault();
    dragData.clone.style.left = (e.clientX - dragData.offsetX) + 'px';
    dragData.clone.style.top = (e.clientY - dragData.offsetY) + 'px';
  }
}, { passive: false });

document.addEventListener('pointerup', (e) => {
  if (dragData) {
    dragData.clone.remove();
    if (!dragData.isBank) dragData.sourcePiece.style.opacity = '1';

    const dist = Math.hypot(e.clientX - dragData.startX, e.clientY - dragData.startY);
    
    if (dist <= 10) {
      if (!dragData.isBank) {
        dragData.sourcePiece.remove();
        dragData = null;
        return;
      }
    } else {
      const dropTarget = document.elementFromPoint(e.clientX, e.clientY);
      const square = dropTarget ? dropTarget.closest('.square') : null;

      if (square) {
        const existing = square.querySelector('.piece');
        if (existing && existing !== dragData.sourcePiece) existing.remove();

        if (dragData.isBank) {
          const char = dragData.sourcePiece.dataset.fenChar;
          const template = document.querySelector(`#piece-templates [data-fen-char="${char}"]`);
          const newPiece = document.createElement('div');
          newPiece.className = 'piece';
          newPiece.dataset.fenChar = char;
          newPiece.innerHTML = template.innerHTML;
          square.appendChild(newPiece);
        } else {
          square.appendChild(dragData.sourcePiece);
        }
      } else if (!dragData.isBank && !dropTarget?.closest('#piece-bank')) {
        dragData.sourcePiece.remove(); 
      }
    }
    
    dragData = null;
    return;
  } 

  const target = document.elementFromPoint(e.clientX, e.clientY);
  const square = target ? target.closest('.square') : null;

  if (square) {
    if (currentMode === 'highlight') {
      square.classList.toggle('highlighted');
    } 
    else if (currentMode === 'arrow') {
      if (!arrowStartSquare) {
        arrowStartSquare = square;
        square.classList.add('arrow-start-selected');
      } else {
        if (arrowStartSquare !== square) {
          drawArrow(arrowStartSquare, square);
        }
        arrowStartSquare.classList.remove('arrow-start-selected');
        arrowStartSquare = null;
      }
    }
  }
});

// --- FEN Import Feature ---
function importFENPrompt() {
  const fen = prompt("Enter FEN string (e.g., rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR):");
  if (!fen) return;
  
  const piecePlacement = fen.trim().split(' ')[0];
  const ranks = piecePlacement.split('/');
  
  if (ranks.length !== 8) {
    alert("Invalid FEN: Must contain 8 ranks separated by '/'");
    return;
  }

  clearPieces();

  for (let r = 0; r < 8; r++) {
    let fileIdx = 0;
    const rankStr = ranks[r];
    
    for (let i = 0; i < rankStr.length; i++) {
      const char = rankStr[i];
      
      if (!isNaN(char)) {
        fileIdx += parseInt(char);
      } else {
        const square = boardEl.querySelector(`[data-row='${r}'][data-col='${fileIdx}']`);
        if (square) {
          const template = document.querySelector(`#piece-templates [data-fen-char="${char}"]`);
          if (template) {
            const newPiece = document.createElement('div');
            newPiece.className = 'piece';
            newPiece.dataset.fenChar = char;
            newPiece.innerHTML = template.innerHTML;
            square.appendChild(newPiece);
          }
        }
        fileIdx++;
      }
    }
  }
}

// --- Arrow Drawing ---
function drawArrow(startSq, endSq) {
  const startCol = parseInt(startSq.dataset.col);
  const startRow = parseInt(startSq.dataset.row);
  const endCol = parseInt(endSq.dataset.col);
  const endRow = parseInt(endSq.dataset.row);

  const dx = Math.abs(endCol - startCol);
  const dy = Math.abs(endRow - startRow);
  const isKnight = (dx === 1 && dy === 2) || (dx === 2 && dy === 1);

  const startX = (startCol * 12.5) + 6.25;
  const startY = (startRow * 12.5) + 6.25;
  const endX = (endCol * 12.5) + 6.25;
  const endY = (endRow * 12.5) + 6.25;

  let pathData = "";
  let midX = (startX + endX) / 2;
  let midY = (startY + endY) / 2;

  if (isKnight) {
    if (dx > dy) {
      pathData = `M ${startX} ${startY} L ${endX} ${startY} L ${endX} ${endY}`;
      midX = endX;
      midY = (startY + endY) / 2;
    } else {
      pathData = `M ${startX} ${startY} L ${startX} ${endY} L ${endX} ${endY}`;
      midX = startX;
      midY = (startY + endY) / 2;
    }
  } else {
    pathData = `M ${startX} ${startY} L ${endX} ${endY}`;
  }

  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'arrow-group');

  const markerId = activeArrowColorName ? `arrowhead-${activeArrowColorName}` : 'arrowhead-orange';

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', pathData);
  path.setAttribute('stroke', activeArrowColor);
  path.setAttribute('stroke-width', '1.5');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke-linejoin', 'miter');
  path.setAttribute('marker-end', `url(#${markerId})`);
  g.appendChild(path);

  const labelInput = document.getElementById('arrow-num');
  const labelText = labelInput ? labelInput.value.trim() : '';

  if (labelText !== '') {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', midX);
    circle.setAttribute('cy', midY);
    circle.setAttribute('r', '3');
    circle.setAttribute('fill', '#ffffff');
    circle.setAttribute('stroke', activeArrowColor);
    circle.setAttribute('stroke-width', '0.6');

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', midX);
    text.setAttribute('y', midY + 0.4);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('font-size', '3.2');
    text.setAttribute('font-weight', 'bold');
    text.setAttribute('font-family', 'sans-serif');
    text.setAttribute('fill', '#000000');
    text.textContent = labelText;

    g.appendChild(circle);
    g.appendChild(text);

    if (!isNaN(labelText)) {
      labelInput.value = parseInt(labelText) + 1;
    }
  }

  arrowsLayer.appendChild(g);
}

// --- Utilities ---
function clearArrows() {
  const groups = arrowsLayer.querySelectorAll('.arrow-group');
  groups.forEach(g => g.remove());
}

function clearHighlights() {
  const squares = boardEl.querySelectorAll('.highlighted');
  squares.forEach(s => s.classList.remove('highlighted'));
}

function clearPieces() {
  const pieces = boardEl.querySelectorAll('.piece');
  pieces.forEach(p => p.remove());
}

function clearBoard() {
  clearPieces();
  clearHighlights();
  clearArrows();
}

// --- Canvas Exporter with Pattern Image & Tint Preloader ---
async function exportToJPEG() {
  if (arrowStartSquare) {
    arrowStartSquare.classList.remove('arrow-start-selected');
    arrowStartSquare = null;
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  const size = 1000;
  const sqSize = size / 8;
  canvas.width = size;
  canvas.height = size;

  // 1. Load background pattern image safely
  const patternImg = new Image();
  patternImg.src = 'pattern-with-black-zig-zag-lines_1060-27.jpg';

  await new Promise((resolve) => {
    patternImg.onload = resolve;
    patternImg.onerror = () => {
      // Fallback color if image file fails to fetch
      resolve();
    };
  });

  // 2. Render Board Squares
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const square = boardEl.querySelector(`[data-row='${r}'][data-col='${c}']`);
      const isHighlighted = square.classList.contains('highlighted');
      const isLight = (r + c) % 2 === 0;

      if (isLight) {
        ctx.fillStyle = isHighlighted ? '#FFB6C1' : '#FFFFFF';
        ctx.fillRect(c * sqSize, r * sqSize, sqSize, sqSize);
      } else {
        // Dark square with pattern image
        if (patternImg.complete && patternImg.naturalWidth !== 0) {
          ctx.drawImage(patternImg, c * sqSize, r * sqSize, sqSize, sqSize);
        } else {
          ctx.fillStyle = '#444444';
          ctx.fillRect(c * sqSize, r * sqSize, sqSize, sqSize);
        }

        // Apply pink overlay if highlighted
        if (isHighlighted) {
          ctx.fillStyle = 'rgba(255, 182, 193, 0.6)';
          ctx.fillRect(c * sqSize, r * sqSize, sqSize, sqSize);
        }
      }
    }
  }

  // 3. Render Chess Pieces
  const pieces = boardEl.querySelectorAll('.square .piece');
  for (const piece of pieces) {
    const parent = piece.parentElement;
    const r = parseInt(parent.dataset.row);
    const c = parseInt(parent.dataset.col);
    
    const svgEl = piece.querySelector('svg');
    if (svgEl) {
      const svgData = new XMLSerializer().serializeToString(svgEl);
      const img = new Image();
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      await new Promise((resolve) => {
        img.onload = () => {
          ctx.drawImage(img, c * sqSize + sqSize * 0.075, r * sqSize + sqSize * 0.075, sqSize * 0.85, sqSize * 0.85);
          URL.revokeObjectURL(url);
          resolve();
        };
        img.src = url;
      });
    }
  }

  // 4. Render Overlay Arrows
  const arrowSvg = arrowsLayer.cloneNode(true);
  arrowSvg.setAttribute('width', size);
  arrowSvg.setAttribute('height', size);
  const arrowData = new XMLSerializer().serializeToString(arrowSvg);
  const arrowBlob = new Blob([arrowData], { type: 'image/svg+xml;charset=utf-8' });
  const arrowUrl = URL.createObjectURL(arrowBlob);
  const arrowImg = new Image();

  await new Promise((resolve) => {
    arrowImg.onload = () => {
      ctx.drawImage(arrowImg, 0, 0, size, size);
      URL.revokeObjectURL(arrowUrl);
      resolve();
    };
    arrowImg.src = arrowUrl;
  });

  // 5. Trigger Image Download
  const link = document.createElement('a');
  link.download = 'chess-position.jpeg';
  link.href = canvas.toDataURL('image/jpeg', 0.95);
  link.click();
              }

