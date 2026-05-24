const COLS = 10;
const ROWS = 15;
const BLOCK = 32;

const COLORS = {
  I: '#00f0f0',
  O: '#f0f000',
  T: '#a000f0',
  S: '#00f000',
  Z: '#f00000',
  J: '#0000f0',
  L: '#f0a000',
};

const SHAPES = {
  I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  O: [[1,1],[1,1]],
  T: [[0,1,0],[1,1,1],[0,0,0]],
  S: [[0,1,1],[1,1,0],[0,0,0]],
  Z: [[1,1,0],[0,1,1],[0,0,0]],
  J: [[1,0,0],[1,1,1],[0,0,0]],
  L: [[0,0,1],[1,1,1],[0,0,0]],
};

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
canvas.width = COLS * BLOCK;
canvas.height = ROWS * BLOCK;

const nextCanvas = document.getElementById('next-board');
const nextCtx = nextCanvas.getContext('2d');
nextCanvas.width = 80;
nextCanvas.height = 80;

let board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
let current = null;
let next = null;
let dropInterval = 800;
let lastTime = 0;
let dropCounter = 0;
let gameOver = false;

let bag = [];

function refillBag() {
  bag = Object.keys(SHAPES);
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
}

function randomPiece() {
  if (bag.length === 0) refillBag();
  const key = bag.pop();
  return {
    type: key,
    shape: SHAPES[key].map(row => [...row]),
    color: COLORS[key],
    x: Math.floor(COLS / 2) - Math.floor(SHAPES[key][0].length / 2),
    y: 0,
  };
}

function rotate(shape, dir) {
  const N = shape.length;
  const M = shape[0].length;
  let rotated = Array.from({ length: M }, () => Array(N).fill(0));
  if (dir === 1) {
    for (let r = 0; r < N; r++)
      for (let c = 0; c < M; c++)
        rotated[c][N - 1 - r] = shape[r][c];
  } else {
    for (let r = 0; r < N; r++)
      for (let c = 0; c < M; c++)
        rotated[M - 1 - c][r] = shape[r][c];
  }
  return rotated;
}

function collides(piece, dx = 0, dy = 0, shape = piece.shape) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = piece.x + c + dx;
      const ny = piece.y + r + dy;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function lock(piece) {
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (!piece.shape[r][c]) continue;
      const ny = piece.y + r;
      if (ny < 0) { gameOver = true; return; }
      board[ny][piece.x + c] = piece.color;
    }
  }
  clearLines();
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(cell => cell)) {
      board.splice(r, 1);
      board.unshift(Array(COLS).fill(null));
      cleared++;
      r++;
    }
  }
}

function spawnPiece() {
  current = next || randomPiece();
  next = randomPiece();
  if (collides(current)) {
    gameOver = true;
  }
}

function ghostY() {
  let dy = 0;
  while (!collides(current, 0, dy + 1)) dy++;
  return current.y + dy;
}

function drawBlock(context, x, y, color, alpha = 1) {
  context.globalAlpha = alpha;
  context.fillStyle = color;
  context.fillRect(x * BLOCK + 1, y * BLOCK + 1, BLOCK - 2, BLOCK - 2);
  context.globalAlpha = 1;
}

function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // グリッド線
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 0.5;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      ctx.strokeRect(c * BLOCK, r * BLOCK, BLOCK, BLOCK);
    }
  }

  // 固定ブロック
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c]) drawBlock(ctx, c, r, board[r][c]);
    }
  }

  if (current && !gameOver) {
    // ゴースト
    const gy = ghostY();
    for (let r = 0; r < current.shape.length; r++) {
      for (let c = 0; c < current.shape[r].length; c++) {
        if (!current.shape[r][c]) continue;
        drawBlock(ctx, current.x + c, gy + r, current.color, 0.2);
      }
    }

    // 現在のピース
    for (let r = 0; r < current.shape.length; r++) {
      for (let c = 0; c < current.shape[r].length; c++) {
        if (!current.shape[r][c]) continue;
        drawBlock(ctx, current.x + c, current.y + r, current.color);
      }
    }
  }

  if (gameOver) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#d0d0f5';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 16);
    ctx.font = '13px monospace';
    ctx.fillText('R キーでリスタート', canvas.width / 2, canvas.height / 2 + 16);
  }
}

function drawNext() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  if (!next) return;
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  const s = 16;
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      nextCtx.fillStyle = next.color;
      nextCtx.fillRect((offX + c) * s + 8 + 1, (offY + r) * s + 8 + 1, s - 2, s - 2);
    }
  }
}

function update(time = 0) {
  if (gameOver) {
    drawBoard();
    return;
  }
  const delta = time - lastTime;
  lastTime = time;
  dropCounter += delta;
  if (dropCounter >= dropInterval) {
    if (!collides(current, 0, 1)) {
      current.y++;
    } else {
      lock(current);
      if (!gameOver) spawnPiece();
    }
    dropCounter = 0;
  }
  drawBoard();
  drawNext();
  requestAnimationFrame(update);
}

function hardDrop() {
  const dy = ghostY() - current.y;
  current.y += dy;
  lock(current);
  if (!gameOver) spawnPiece();
  dropCounter = 0;
}

function restart() {
  board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  gameOver = false;
  dropCounter = 0;
  lastTime = 0;
  next = null;
  bag = [];
  spawnPiece();
  requestAnimationFrame(update);
}

document.addEventListener('keydown', e => {
  if (gameOver) {
    if (e.key === 'r' || e.key === 'R') restart();
    return;
  }
  switch (e.key) {
    case 'a':
    case 'A':
      if (!collides(current, -1, 0)) current.x--;
      break;
    case 'd':
    case 'D':
      if (!collides(current, 1, 0)) current.x++;
      break;
    case 'ArrowLeft': {
      const r = rotate(current.shape, -1);
      if (!collides(current, 0, 0, r)) current.shape = r;
      break;
    }
    case 'ArrowRight': {
      const r = rotate(current.shape, 1);
      if (!collides(current, 0, 0, r)) current.shape = r;
      break;
    }
    case 'w':
    case 'W':
      hardDrop();
      break;
    case 's':
    case 'S':
    case 'ArrowDown':
      if (!collides(current, 0, 1)) { current.y++; dropCounter = 0; }
      break;
  }
  drawBoard();
  drawNext();
});

spawnPiece();
requestAnimationFrame(update);