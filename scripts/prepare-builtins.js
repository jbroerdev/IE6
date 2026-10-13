'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.join(__dirname, '..');
const target = path.join(root, 'vendor/youtube-redux');
fs.mkdirSync(target, { recursive: true });
fs.cpSync(path.join(root, 'reference/youtube-redux/Chrome'), target, { recursive: true });
for (const file of fs.readdirSync(target).filter(f => f.endsWith('.js'))) {
  const filename = path.join(target, file);
  fs.writeFileSync(filename, fs.readFileSync(filename, 'utf8').replaceAll('.storage.sync', '.storage.local'));
}
const manifestPath = path.join(target, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
delete manifest.background; delete manifest.action; delete manifest.optional_permissions;
manifest.permissions = ['storage'];
const keyPath = path.join(root, 'vendor/youtube-extension-key.txt');
if (!fs.existsSync(keyPath)) {
  const { publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  fs.writeFileSync(keyPath, publicKey.export({ type: 'spki', format: 'der' }).toString('base64'));
}
manifest.key = fs.readFileSync(keyPath, 'utf8').trim();
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
fs.writeFileSync(path.join(target, 'host.html'), '<!doctype html><title>YouTube Redux storage</title>');
const initial = fs.readFileSync(path.join(target, 'initial-setup.js'), 'utf8');
const defaults = JSON.parse(initial.match(/const defaultSettings = (\{[\s\S]*?\n\});/)[1]);
defaults.showChangelog = false; defaults.completedSettingsTutorial = true;
const html = fs.readFileSync(path.join(target, 'popup.html'), 'utf8');
const schema = Object.entries(defaults).filter(([key]) => !['showChangelog', 'completedSettingsTutorial'].includes(key)).map(([key, value]) => {
  const values = [...html.matchAll(new RegExp('<input[^>]*name=["\x27]' + key + '["\x27][^>]*>', 'g'))].map(m => m[0].match(/value=(?:["']([^"']+)["']|([^\s>]+))/)?.slice(1).find(Boolean)).filter(Boolean);
  const label = [...html.matchAll(/<label\b[^>]*>([\s\S]*?)<\/label>/g)].find(m => new RegExp('name=["\x27]' + key + '["\x27]').test(m[1]));
  const labelText = label?.[1].replace(/<span[^>]*class="tooltip[\s\S]*/, '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  return { key, default: value, label: labelText || undefined, choices: typeof value !== 'boolean' && new Set(values).size > 1 ? [...new Set(values)] : undefined };
});
fs.writeFileSync(path.join(root, 'vendor/youtube-defaults.json'), JSON.stringify(defaults, null, 2));
fs.writeFileSync(path.join(root, 'ui/youtube-schema.json'), JSON.stringify(schema, null, 2));
for (const [name, source] of [['legacy-wikipedia','legacy-wikipedia'],['old-reddit','old-reddit']]) {
  const dir=path.join(root,'vendor/upstream',name); fs.mkdirSync(dir,{recursive:true});
  for(const file of fs.readdirSync(path.join(root,'reference',source))){
    if(/^(LICENSE|README|main\.js|service\.js|background\.js|rules\.json|styles\.css)/i.test(file)) fs.copyFileSync(path.join(root,'reference',source,file),path.join(dir,file));
  }
}
console.log('Bundled YouTube Redux '+manifest.version+'; native adapter sources and settings schema prepared.');
