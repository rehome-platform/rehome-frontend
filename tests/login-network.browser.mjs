// Real local HTTP requests; production auth code. All identities/responses are fixtures.
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync, readdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const browserName = process.argv[2] || 'chrome';
const executable = browserName === 'edge' ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' : 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const output = mkdtempSync(join(tmpdir(), 'rehome-login-'));
let parentHtml = '', childHtml = '';
let scenario = { status: 401, role: 'admin', defer: true };
let requests = [], waiting = [];
const json = (response, status, data) => { response.writeHead(status, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(data)); };
const server = createServer(async (request, response) => {
  const path = new URL(request.url, 'http://fixture.test').pathname;
  if (path === '/__frame') { response.setHeader('Content-Type', 'text/html; charset=utf-8'); response.end(childHtml); return; }
  if (path === '/') { response.setHeader('Content-Type', 'text/html; charset=utf-8'); response.end(parentHtml); return; }
  const chunks = []; for await (const chunk of request) chunks.push(chunk);
  const body = Buffer.concat(chunks).toString();
  if (path === '/__scenario') { scenario = JSON.parse(body); requests = []; json(response, 200, {}); return; }
  if (path === '/__state') { json(response, 200, { requests }); return; }
  if (path === '/__release') { waiting.splice(0).forEach(send => send()); json(response, 200, {}); return; }
  const payload = body ? JSON.parse(body) : {};
  const record = { path, method: request.method, fields: Object.keys(payload).sort(), bearerPresent: !!request.headers.authorization, contentType: request.headers['content-type'], status: null };
  requests.push(record);
  if (path === '/api/auth/login') {
    const current = { ...scenario };
    const send = () => {
      if (response.destroyed || response.writableEnded) return;
      record.status = current.status;
      if (current.status === 0) { response.destroy(); return; }
      if (current.status === 200) json(response, 200, { accessToken: 'opaque-fixture-access', refreshToken: 'opaque-fixture-refresh', tokenType: 'Bearer' });
      else json(response, current.status, {});
    };
    if (current.defer) setTimeout(send, 150); else send();
    return;
  }
  if (path === '/api/account/me') { record.status = 200; json(response, 200, { email: 'fixture@example.test', authorities: scenario.role === 'admin' ? '[ROLE_ADMIN]' : '[ROLE_MODERATOR]' }); return; }
  if (path === '/members/me') { record.status = 403; json(response, 403, { message: 'No optional member profile' }); return; }
  record.status = 404; json(response, 404, {});
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = 'http://127.0.0.1:' + server.address().port;
try {
  const bundle = await build({
    stdin: { contents: `
      import React from 'react'; import { createRoot } from 'react-dom/client';
      import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
      import { AuthProvider, useAuth } from './src/context/AuthContext.jsx';
      import Login from './src/features/auth/pages/LoginPage.jsx';
      import PrivateRoute from './src/routes/PrivateRoute.jsx';
      const root=createRoot(document.getElementById('root')); let version=0;
      function Probe(){ const auth=useAuth(), location=useLocation(); return <output id="probe" data-path={location.pathname} data-authenticated={String(auth.isAuthenticated)} />; }
      window.mountLogin=(clear=true)=>{ if(clear)localStorage.clear(); root.render(<React.StrictMode><MemoryRouter key={version++} initialEntries={['/login']}><AuthProvider><Probe/><Routes>
        <Route path="/login" element={<Login/>}/><Route path="/admin" element={<PrivateRoute roles={['admin']}><p id="admin-dashboard">Admin</p></PrivateRoute>}/>
        <Route path="/moderator/counter" element={<PrivateRoute roles={['staff','admin']}><p id="moderator-dashboard">Moderator</p></PrivateRoute>}/>
      </Routes></AuthProvider></MemoryRouter></React.StrictMode>); };
      window.mountLogin();
    `, resolveDir: project, loader: 'jsx' }, bundle: true, write: false, format: 'iife', platform: 'browser',
    define: { 'process.env.NODE_ENV': '"development"', 'import.meta.env': JSON.stringify({ VITE_API_BASE_URL: origin }) },
    loader: { '.png': 'dataurl' },
  });
  const css = readFileSync(join(project, 'dist/assets', readdirSync(join(project, 'dist/assets')).find(name => name.endsWith('.css'))), 'utf8');
  const fonts = readFileSync(join(project, 'index.html'), 'utf8').match(/<link[\s\S]*?>/g).filter(tag => tag.includes('fonts.')).join('');
  childHtml = `<!doctype html><html lang="vi"><head><meta charset="utf-8">${fonts}<style>${css}</style></head><body><div id="root"></div><script>${bundle.outputFiles[0].text}</script></body></html>`;
  const checks = async function () {
    const frame = document.querySelector('iframe'), results = [];
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    const verify = (name, pass, detail = '') => results.push({ name, pass: !!pass, detail });
    const control = async (path, body) => (await fetch(path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })).json();
    try {
      await delay(150);
      const doc=frame.contentDocument, win=frame.contentWindow;
      await Promise.race([doc.fonts.ready, delay(2500)]);
      const input=async(id,value)=>{const node=doc.getElementById(id); Object.getOwnPropertyDescriptor(win.HTMLInputElement.prototype,'value').set.call(node,value);node.dispatchEvent(new win.Event('input',{bubbles:true}));await delay(10);};
      const fill=async()=>{await input('email-input','fixture@example.test');await input('password-input','synthetic-only');};
      const submit=()=>doc.querySelector('form').dispatchEvent(new win.Event('submit',{bubbles:true,cancelable:true}));
      const error=()=>doc.getElementById('login-error-alert');
      const reset=async(status=401,role='admin',defer=true)=>{await control('/__scenario',{status,role,defer});win.mountLogin();await delay(70);};
      const logins=async()=>(await control('/__state')).requests.filter(r=>r.path==='/api/auth/login');
      verify('TC-AUTH-001: login renders',!!doc.getElementById('submit-login-button'));
      submit();await delay(20);verify('TC-AUTH-002: empty form blocked',!!error()&&(await logins()).length===0);
      await input('email-input','invalid');await input('password-input','synthetic-only');submit();await delay(20);verify('TC-AUTH-003: invalid email blocked',!!error()&&(await logins()).length===0);
      await fill();
      const toggle=doc.querySelector('[aria-controls="password-input"]');toggle.click();await delay(20);verify('password reveal toggles',doc.getElementById('password-input').type==='text'&&toggle.getAttribute('aria-pressed')==='true');toggle.click();await delay(20);
      verify('one named, focusable password control',doc.querySelectorAll('[aria-controls="password-input"]').length===1&&toggle.tabIndex===0&&!!toggle.getAttribute('aria-label'));
      toggle.focus();verify('password control accepts focus',doc.activeElement===toggle);
      verify('scoped native reveal suppression retained',doc.querySelector('style').textContent.includes('#password-input::-ms-reveal'));
      for(const width of [375,768,1280,1440]){frame.style.width=width+'px';await delay(20);verify(width+': no login overflow',doc.documentElement.scrollWidth<=doc.documentElement.clientWidth+1);}
      await reset();await fill();for(let i=0;i<5;i++)submit();await Promise.resolve();await Promise.resolve();
      verify('pending UI disables login and Google',doc.getElementById('submit-login-button').disabled&&doc.getElementById('google-login-button').disabled);
      await delay(100);
      const pending=await logins();verify('TC-AUTH-010: rapid submits produce one HTTP login request',pending.length===1,'observed='+pending.length);
      await control('/__release',{});await delay(100);
      verify('TC-AUTH-004: 401 shown without session',!!error()&&doc.getElementById('probe').dataset.authenticated==='false'&&!win.localStorage.getItem('rehome_token'));
      verify('401 is not silently retried',(await logins()).length===pending.length);
      for(const [status,label]of [[400,'invalid request'],[403,'forbidden'],[429,'rate limit'],[500,'server'],[0,'network']]){await reset(status);await fill();submit();await delay(40);await control('/__release',{});await delay(100);verify('HTTP '+status+' '+label+': failure ends loading',!!error()&&!doc.getElementById('submit-login-button').disabled&&doc.getElementById('probe').dataset.authenticated==='false');if(status===0)verify('TC-AUTH-011: localized connectivity feedback',error().textContent.includes('Không thể kết nối'));}
      for(const role of ['admin','staff']){await reset(200,role);await fill();submit();await delay(60);const req=await logins();verify(role+': exactly one intended login request',req.length===1);verify('TC-AUTH-007: deployed payload shape',JSON.stringify(req[0].fields)===JSON.stringify(['email','password'])&&req[0].contentType.includes('application/json')&&!req[0].bearerPresent);await control('/__release',{});await delay(130);verify(role+': confirmed role redirect',doc.getElementById('probe').dataset.path===(role==='admin'?'/admin':'/moderator/counter'));win.mountLogin(false);await delay(130);verify(role+': session restored through identity endpoint',doc.getElementById('probe').dataset.path===(role==='admin'?'/admin':'/moderator/counter'));}
    }catch(error){verify('fixture execution',false,String(error.stack));}
    document.getElementById('login-results').textContent=btoa(unescape(encodeURIComponent(JSON.stringify(results))));frame.remove();
  };
  parentHtml = `<!doctype html><html><body><pre id="login-results">PENDING</pre><iframe style="width:1440px;height:2000px;border:0" src="/__frame"></iframe><script>document.querySelector('iframe').onload=${checks.toString()};</script></body></html>`;
  const run = await new Promise((resolve,reject)=>{const process=spawn(executable,['--headless=new','--disable-gpu','--no-first-run','--disable-background-networking','--user-data-dir='+join(output,'profile'),'--virtual-time-budget=18000','--dump-dom',origin],{windowsHide:true});let stdout='',stderr='';process.stdout.on('data',data=>stdout+=data);process.stderr.on('data',data=>stderr+=data);const timer=setTimeout(()=>{process.kill();reject(Error('Browser timed out'));},45000);process.on('error',reject);process.on('close',()=>{clearTimeout(timer);resolve({stdout,stderr});});});
  const encoded=run.stdout.match(/<pre id="login-results">([^<]+)<\/pre>/)?.[1];
  if(!encoded||encoded==='PENDING')throw Error('Fixture incomplete: '+run.stderr.slice(-1200));
  const results=JSON.parse(Buffer.from(encoded,'base64').toString());const failures=results.filter(r=>!r.pass);
  console.log(JSON.stringify({browser:browserName,checks:results.length,passed:results.length-failures.length,failures,network:'Actual local HTTP fixture; no deployed credentials or JWTs'},null,2));
  process.exitCode=failures.length?1:0;
}finally{waiting.splice(0).forEach(send=>send());server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
