import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

await build({
  entryPoints: [path.join(__dirname, 'apps/api/src/server.ts')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: path.join(__dirname, 'dist-server/server.mjs'),
  sourcemap: false,
  minify: false,
  external: ['electron'],
  banner: {
    js: `import { createRequire } from 'module';const require = createRequire(import.meta.url);`,
  },
});

console.log('Server bundled to dist-server/server.mjs');
