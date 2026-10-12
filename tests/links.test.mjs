import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {checkLinks} from '../scripts/check-links.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const fixture=files=>{
 const dir=mkdtempSync(join(tmpdir(),'skip-echo-links-'));
 for(const [path,text] of Object.entries(files)){mkdirSync(dirname(join(dir,path)),{recursive:true});writeFileSync(join(dir,path),text);}
 return dir;
};
test('all relative Markdown links and heading anchors in the repository resolve',()=>{
 assert.deepEqual(checkLinks(root),[]);
});
test('link checker reports missing files, missing headings, and ignores code and external links',()=>{
 const dir=fixture({
  'README.md':[
   '# Title','','[ok](docs/a.md) [ok anchor](docs/a.md#second-heading) [same file](#title) [line](docs/a.md#L10)','',
   '[missing file](docs/nope.md) [missing heading](docs/a.md#nope) [bad same-file](#nope)','',
   '[external](https://example.com/missing) [mail](mailto:a@example.com)','',
   '`[inline code](docs/inline.md)`','','```','[fenced](docs/fenced.md)','```','',
   '[ref]: docs/a.md','[bad ref]: docs/gone.md'
  ].join('\n'),
  'docs/a.md':'# A\n\n## Second heading\n\n## Same\n\n## Same\n',
  'evals/native/case/prompt.md':'[generated](nowhere.md)'
 });
 try{
  const problems=checkLinks(dir);
  assert.deepEqual(problems.map(p=>p.replace(/^README\.md:\d+: /,'')),[
   '(docs/nope.md) file not found','(docs/a.md#nope) no such heading','(#nope) no such heading','(docs/gone.md) file not found'
  ]);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('duplicate headings get numbered anchors like GitHub',()=>{
 const dir=fixture({'README.md':'[a](docs/a.md#same) [b](docs/a.md#same-1) [c](docs/a.md#same-2)','docs/a.md':'# Same\n\n## Same\n'});
 try{assert.deepEqual(checkLinks(dir).map(p=>p.split(': ')[1]),['(docs/a.md#same-2) no such heading']);}finally{rmSync(dir,{recursive:true,force:true});}
});
