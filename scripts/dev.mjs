import { build } from 'esbuild'
import { spawn } from 'child_process'
import http from 'http'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const isWin = process.platform === 'win32'

function run(binName, args = [], opts = {}) {
  const binPath = resolve(root, 'node_modules', '.bin', binName)
  if (isWin) {
    return spawn('cmd.exe', ['/c', binPath + '.cmd', ...args], {
      cwd: root,
      ...opts,
    })
  }
  return spawn(binPath, args, { cwd: root, ...opts })
}

async function compileElectron() {
  const distDir = resolve(root, 'dist-electron')
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true })
  }

  await build({
    entryPoints: [resolve(root, 'electron/main.ts')],
    outfile: resolve(root, 'dist-electron/main.js'),
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'cjs',
    external: ['electron', 'sql.js'],
  })

  await build({
    entryPoints: [resolve(root, 'electron/preload.ts')],
    outfile: resolve(root, 'dist-electron/preload.js'),
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'cjs',
    external: ['electron'],
  })
}

function waitForVite(url, maxRetries = 60) {
  return new Promise((resolvePromise, reject) => {
    let retries = 0
    const check = () => {
      http.get(url, () => resolvePromise())
        .on('error', () => {
          retries++
          if (retries >= maxRetries) {
            reject(new Error('Vite did not start in time'))
          } else {
            setTimeout(check, 500)
          }
        })
    }
    check()
  })
}

async function main() {
  console.log('[dev] Compiling electron files...')
  await compileElectron()

  console.log('[dev] Starting Vite dev server...')
  const vite = run('vite', [], { stdio: 'pipe' })
  vite.stdout.on('data', (data) => process.stdout.write(data))
  vite.stderr.on('data', (data) => process.stderr.write(data))

  console.log('[dev] Waiting for Vite to be ready...')
  await waitForVite('http://localhost:5173')

  console.log('[dev] Starting Electron...')
  const electron = run('electron', ['.'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_DEV_SERVER_URL: 'http://localhost:5173',
    },
  })

  electron.on('close', (code) => {
    vite.kill()
    process.exit(code ?? 0)
  })

  process.on('SIGINT', () => {
    vite.kill()
    electron.kill()
    process.exit(0)
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
