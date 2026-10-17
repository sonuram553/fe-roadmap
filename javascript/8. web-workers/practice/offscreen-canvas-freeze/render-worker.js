// Runs in the worker thread. It owns the right-hand canvas.
let ctx, frames = 0, angle = 0;

self.onmessage = (event) => {
  if (event.data.type === 'init') {
    ctx = event.data.canvas.getContext('2d');
    requestAnimationFrame(draw);
  }
  if (event.data.type === 'count') {
    self.postMessage({ frames });
  }
};

function draw() {
  const { width, height } = ctx.canvas;
  ctx.fillStyle = '#222';
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate(angle += 0.05);
  ctx.fillStyle = 'orange';
  ctx.fillRect(-40, -40, 80, 80);
  ctx.restore();
  ctx.fillStyle = '#eee';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText(`worker · frame ${frames}`, 10, 20);
  frames++;
  requestAnimationFrame(draw);
}
