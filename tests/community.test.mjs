import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(resolve(root,p),'utf8');
test('community files exist',()=>{
 for(const f of ['CONTRIBUTING.md','GOVERNANCE.md','SUPPORT.md','SECURITY.md','.github/pull_request_template.md','.github/CODEOWNERS','.github/dependabot.yml'])assert.ok(existsSync(resolve(root,f)),f);
});
test('CODEOWNERS names an owner for every pattern and each pattern matches a repository path',()=>{
 const rules=read('.github/CODEOWNERS').split('\n').map(l=>l.trim()).filter(l=>l&&!l.startsWith('#'));
 assert.ok(rules.some(l=>l.startsWith('* ')),'catch-all rule');
 for(const rule of rules){
  const [pattern,...owners]=rule.split(/\s+/);
  assert.ok(owners.length>0&&owners.every(o=>/^@[\w-]+(\/[\w-]+)?$/.test(o)),rule);
  if(pattern!=='*')assert.ok(existsSync(resolve(root,pattern.replace(/^\//,''))),'CODEOWNERS path does not exist: '+pattern);
 }
});
test('every issue form has a name, description, body, and required fields; config.yml lists contact links',()=>{
 const dir=resolve(root,'.github/ISSUE_TEMPLATE');const forms=readdirSync(dir).filter(f=>f.endsWith('.yml')&&f!=='config.yml').sort();
 assert.deepEqual(forms,['activation.yml','feature-request.yml','over-omission.yml','question.yml','repetition.yml']);
 for(const f of forms){const y=read('.github/ISSUE_TEMPLATE/'+f);for(const key of ['name','description','body'])assert.match(y,new RegExp('^'+key+':','m'),f+' '+key);assert.match(y,/required: true/,f);}
 const config=read('.github/ISSUE_TEMPLATE/config.yml');assert.match(config,/^contact_links:/m);
 for(const f of ['SECURITY.md','SUPPORT.md'])assert.ok(config.includes('/blob/main/'+f)&&existsSync(resolve(root,f)),f);
});
