const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { build } = require('./build');
const host = '127.0.0.1';
const root = build();
const port = Number(process.env.EDITOR_PORT || 4174);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav' };
const server = http.createServer((req, res) => {
  let file;
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  } catch (_) { res.writeHead(400).end(); return; }
  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) { res.writeHead(404).end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    if (req.method === 'HEAD') res.end(); else fs.createReadStream(file).pipe(res);
  });
});
server.on('error', error => { console.error(`编辑器服务启动失败：${error.message}`); process.exitCode = 1; });
server.listen(port, host, () => console.log(`回声工坊→ http://${host}:${port}\n按 Ctrl+C 停止。修改源文件后重新运行以构建更新。`));
