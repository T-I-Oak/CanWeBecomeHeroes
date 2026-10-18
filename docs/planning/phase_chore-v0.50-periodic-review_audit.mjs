import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// Run from the game root. This audit belongs to the review phase and is removed at merge.
const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
  entry.isDirectory() ? walk(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);
const baseline = 'e0c030329ac409f997af681c3684413db2064254';
const files = ['src', 'tests', 'scripts', 'examples', 'docs', 'public/data'].flatMap(walk);
const code = files.filter(file => !file.startsWith(`docs${path.sep}`) && /\.(?:js|mjs|css|html)$/.test(file)).concat('index.html');
const documents = files.filter(file => file.endsWith('.md'));
const issues = [];
const imports = new Set();
let links = 0;
let jsonFiles = 0;
for (const file of code) {
  const text = fs.readFileSync(file, 'utf8');
  for (const match of text.matchAll(/(?:from\s*|import\s*|import\s*\()(['"])([^'"]+)\1/g)) {
    if (!match[2].startsWith('.')) continue;
    const target = path.resolve(path.dirname(file), match[2]);
    imports.add(target);
    if (!fs.existsSync(target)) issues.push(`${file}: missing import ${match[2]}`);
  }
  for (const match of text.matchAll(/['"](\/(?:assets|data)\/[^'"${}]+\.[a-z0-9]+)['"]/g)) {
    if (!fs.existsSync(path.join('public', match[1]))) issues.push(`${file}: missing public path ${match[1]}`);
  }
}
for (const file of documents) {
  const text = fs.readFileSync(file, 'utf8');
  // Inline code contains mathematical array notation; it is not a Markdown link.
  const prose = text.replace(/`[^`\n]*`/g, '');
  for (const match of prose.matchAll(/\]\(([^)]+)\)/g)) {
    const reference = match[1].split('#')[0];
    if (!reference || /^[a-z]+:/i.test(reference)) continue;
    links++;
    if (!fs.existsSync(path.resolve(path.dirname(file), reference))) issues.push(`${file}: missing link ${reference}`);
  }
  for (const match of text.matchAll(/`((?:src|tests|scripts|public)\/[\w./-]+\.[\w]+)`/g)) {
    if (!fs.existsSync(match[1])) issues.push(`${file}: missing code path ${match[1]}`);
  }
  if (text.trimEnd().split(/\r?\n/).length > 300) issues.push(`${file}: document exceeds 300 lines`);
}
for (const file of files.filter(file => file.endsWith('.json'))) {
  JSON.parse(fs.readFileSync(file, 'utf8'));
  jsonFiles++;
}
for (const file of walk('src')) {
  if (/\.(?:js|css)$/.test(file) && fs.readFileSync(file, 'utf8').trimEnd().split(/\r?\n/).length > 500) {
    issues.push(`${file}: source exceeds 500 lines`);
  }
}
const unimported = walk('src').filter(file => file.endsWith('.js') && !imports.has(path.resolve(file)));
assert.deepEqual(unimported, [path.join('src', 'main.js')]);
assert.match(fs.readFileSync('index.html', 'utf8'), /src="\/src\/main.js"/);

const previousTests = execFileSync('git', ['ls-tree', '-r', '--name-only', baseline, 'tests/implementation'], { encoding: 'utf8' })
  .trim().split('\n').filter(file => file.endsWith('.test.js'));
const currentTests = walk('tests/implementation').filter(file => file.endsWith('.test.js'));
assert.equal(currentTests.length, previousTests.length);
let moved = 0;
for (const previous of previousTests) {
  const current = currentTests.find(file => path.basename(file) === path.basename(previous));
  assert.ok(current, previous);
  const original = execFileSync('git', ['show', `${baseline}:${previous}`], { encoding: 'utf8' });
  let expected = previous.split('/').length === 3 ? original.replace(/(['"`])(\.\.\/)/g, '$1../$2') : original;
  if (path.basename(previous) === 'StatusLocalization.test.js') {
    expected = expected.replace('/assets/items/sword.png', '/assets/items/hand-sword.png');
  }
  assert.equal(fs.readFileSync(current, 'utf8').replaceAll('\r\n', '\n'), expected.replaceAll('\r\n', '\n'), current);
  if (previous.split('/').length === 3) moved++;
}
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
assert.equal(packageJson.version, '0.50.0');
assert.equal(lock.version, packageJson.version);
assert.equal(lock.packages[''].version, packageJson.version);
assert.deepEqual(JSON.parse(fs.readFileSync('public/data/update_history.json', 'utf8')), []);
const metadata = JSON.parse(fs.readFileSync('public/data/project_info.json', 'utf8'));
assert.ok(fs.existsSync(path.join('public', metadata.logo.path)));
assert.ok(fs.existsSync(path.join('public', metadata.image)));
assert.deepEqual(issues, []);
console.log(JSON.stringify({ documents: documents.length, localLinks: links, jsonFiles,
  sourceFiles: walk('src').length, implementationFiles: currentTests.length,
  movedTestsWithUnchangedAssertions: moved, unimportedEntry: unimported, issues }, null, 2));
