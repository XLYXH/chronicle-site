// 构建并把 dist/ 发布到 gh-pages 分支（GitHub Pages 选择「Deploy from a branch → gh-pages」）
// 用法：npm run deploy
import { execSync } from 'node:child_process'
import { writeFileSync, rmSync } from 'node:fs'

const run = (cmd, cwd = process.cwd()) => execSync(cmd, { stdio: 'inherit', cwd })
const remote = execSync('git remote get-url origin').toString().trim()
const sha = execSync('git rev-parse --short HEAD').toString().trim()

run('npm run build')
writeFileSync('dist/.nojekyll', '')
rmSync('dist/.git', { recursive: true, force: true })
run('git init -q -b gh-pages', 'dist')
run('git add -A', 'dist')
run(`git -c user.name="$(git -C .. config user.name)" -c user.email="$(git -C .. config user.email)" commit -q -m "deploy: ${sha}"`, 'dist')
// gh-pages 只存放构建产物，每次发布整体替换
run(`git push -q --force ${remote} gh-pages`, 'dist')
rmSync('dist/.git', { recursive: true, force: true })
console.log(`\n已发布 ${sha} 到 gh-pages`)
