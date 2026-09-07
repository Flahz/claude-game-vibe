// Usage: NODE_PATH=/opt/node22/lib/node_modules node math.js <baseUrl> <outDir>
// Plays math mode: find-the-number, addition, subtraction, missing number, multiplication, and a hard round with hearts.
const { chromium, devices } = require('playwright');
const fs=require('fs'), path=require('path');
const [baseUrl, outDir] = process.argv.slice(2);
fs.mkdirSync(outDir,{recursive:true});
const device=devices['Pixel 5'];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let step='setup'; const errors=[];
const assert=(c,m)=>{ if(!c) throw new Error(`[${step}] ${m}`); };
(async()=>{
  const browser=await chromium.launch(); const context=await browser.newContext({...device}); const page=await context.newPage();
  page.on('pageerror',e=>errors.push('pageerror: '+e.message));
  page.on('console',m=>{ if(m.type()==='error') errors.push('console.error: '+m.text()); });
  page.on('request',r=>{ if(!r.url().startsWith(baseUrl)) errors.push('external: '+r.url()); });
  const tap=(x,y)=>page.touchscreen.tap(x,y);
  const state=()=>page.evaluate(()=>window.__bps.state());
  const vp=page.viewportSize();
  const visible=b=>b.x>b.r*0.5&&b.x<vp.width-b.r*0.5&&b.y>b.r*0.5&&b.y<vp.height-b.r*0.5;
  const tapEl=async sel=>{ const box=await page.locator(sel).boundingBox(); assert(box,'missing '+sel); await tap(box.x+box.width/2, box.y+box.height/2); };
  const noErrors=()=>assert(errors.length===0,'errors: '+errors.join(' | '));
  const waitFor=async(pred,label,ms=15000)=>{ const t0=Date.now(); while(Date.now()-t0<ms){ const s=await state(); const r=pred(s); if(r) return r; await sleep(100);} throw new Error(`[${step}] timeout waiting for ${label}`); };
  const check=(s)=>{ // every bubble's target flag agrees with the problem, and the problem is solvable
    const p=s.problem; assert(p && Number.isInteger(p.answer) && p.answer>=0, 'bad problem '+JSON.stringify(p));
    for(const b of s.bubbles){ if(b.bomb) continue; assert(Number.isInteger(b.num),'bubble without number'); assert(b.isTarget===(b.num===p.answer), `target flag wrong for ${b.num} vs ${p.answer}`); }
    if(p.kind==='add'){ const [a,b]=p.text.split(' + ').map(x=>parseInt(x)); assert(a+b===p.answer,'add wrong '+p.text); }
    if(p.kind==='sub'){ const [a,b]=p.text.split(' − ').map(x=>parseInt(x)); assert(a-b===p.answer,'sub wrong '+p.text); }
    if(p.kind==='mul'){ const [a,b]=p.text.split(' × ').map(x=>parseInt(x)); assert(a*b===p.answer,'mul wrong '+p.text); }
    if(p.kind==='miss'){ const m=p.text.match(/(\d+) \+ \? = (\d+)/); assert(m && +m[2]-+m[1]===p.answer,'miss wrong '+p.text); }
  };
  async function playRound(expected, shot){
    let guard=0, lastText=null, changes=0;
    while(true){ const s=await state(); assert(s.round===expected,'round drifted '+s.round); if(s.screen!=='play'||s.progress>=s.goal) break; assert(++guard<200,'too many attempts');
      check(s); if(shot && s.progress===0 && guard===3){ await page.screenshot({path:path.join(outDir,shot)}); }
      const tg=s.bubbles.filter(b=>b.isTarget&&!b.bomb&&visible(b)).sort((a,b)=>b.y-a.y); if(!tg.length){ await sleep(100); continue; }
      const p0=s.progress, t0=s.problem.text; await tap(tg[0].x,tg[0].y); await sleep(120); const s2=await state();
      if(s2.progress===p0+1){ if(s2.problem && s2.problem.text!==t0) changes++; } else assert(s2.progress===p0||s2.progress===0, `weird progress ${p0}->${s2.progress}`); }
    await waitFor(s=>s.screen==='celebrate','celebrate'); noErrors(); return changes;
  }
  try{
    step='1-mode'; await page.goto(baseUrl+'/',{waitUntil:'load'}); await page.waitForFunction(()=>window.__bps&&window.__bps.state);
    await page.evaluate(()=>window.__bps.resetProgress()); await page.reload({waitUntil:'load'}); await page.waitForFunction(()=>window.__bps&&window.__bps.state);
    let s=await state(); assert(s.mode==='safari','default mode safari, got '+s.mode);
    await tapEl('[data-testid="mode-math"]'); await sleep(300); s=await state(); assert(s.mode==='math','mode math');
    assert(await page.evaluate(()=>document.querySelector('[data-testid="mode-math"]').classList.contains('on')),'math btn on');
    await page.reload({waitUntil:'load'}); await page.waitForFunction(()=>window.__bps&&window.__bps.state); s=await state(); assert(s.mode==='math','mode persisted');
    await sleep(500); await page.screenshot({path:path.join(outDir,'math-home.png')}); noErrors();

    step='2-find'; await tapEl('[data-testid="play"]'); await sleep(300); s=await state(); assert(s.screen==='play'&&s.round===1,'play r1'); assert(s.problem&&s.problem.kind==='find','find kind '+JSON.stringify(s.problem));
    assert(s.goal===5,'goal 5'); const txt=await page.evaluate(()=>document.querySelector('#speech .say').textContent); assert(/^Find \d+$/.test(txt),'bubble text '+txt);
    const dots=await page.evaluate(()=>document.querySelectorAll('#speech .dots i').length); assert(dots===s.problem.answer,'dots '+dots+' vs '+s.problem.answer);
    // wrong tap does nothing
    const w=await waitFor(x=>x.bubbles.find(b=>!b.isTarget&&!b.bomb&&visible(b)),'wrong bubble'); await tap(w.x,w.y); await sleep(150); s=await state(); assert(s.progress===0,'wrong tap no progress');
    await page.screenshot({path:path.join(outDir,'math-find.png')});
    let ch=await playRound(1); assert(ch>=2,'problem changes after correct pops: '+ch); s=await state(); assert(s.best.easy[1]===3,'r1 done');
    await sleep(900); await page.screenshot({path:path.join(outDir,'math-celebrate.png')}); await tapEl('[data-testid="home"]'); await sleep(200);

    step='3-add'; await page.evaluate(()=>window.__bps.startRound(3)); await sleep(300); s=await state(); assert(s.problem.kind==='add','add kind');
    ch=await playRound(3,'math-add.png'); assert(ch>=2,'add changes '+ch); await tapEl('[data-testid="home"]'); await sleep(200);
    step='4-sub'; await page.evaluate(()=>window.__bps.startRound(5)); await sleep(300); s=await state(); assert(s.problem.kind==='sub','sub kind'); await playRound(5); await tapEl('[data-testid="home"]'); await sleep(200);
    step='5-miss'; await page.evaluate(()=>window.__bps.startRound(8)); await sleep(300); s=await state(); assert(s.problem.kind==='miss','miss kind'); await playRound(8,'math-missing.png'); await tapEl('[data-testid="home"]'); await sleep(200);
    step='6-mul'; await page.evaluate(()=>window.__bps.startRound(9)); await sleep(300); s=await state(); assert(s.problem.kind==='mul','mul kind'); await playRound(9,'math-mul.png'); await tapEl('[data-testid="home"]'); await sleep(200);
    s=await state(); assert([1,3,5,8,9].every(n=>s.unlocked.includes(n)),'unlocked '+s.unlocked);
    // animals progress untouched by math
    await page.evaluate(()=>window.__bps.setMode('safari')); s=await state(); assert(s.unlocked.length===0,'safari progress separate, got '+s.unlocked); await page.evaluate(()=>window.__bps.setMode('math'));

    step='7-hard'; await page.evaluate(()=>window.__bps.setDifficulty('hard')); await page.evaluate(()=>window.__bps.startRound(10)); await sleep(400); s=await state();
    assert(s.hearts===3,'hearts in hard math'); assert(['add','sub','miss','mul'].includes(s.problem.kind),'mix kind '+s.problem.kind);
    const wb=await waitFor(x=>x.bubbles.find(b=>!b.isTarget&&!b.bomb&&visible(b)),'wrong bubble'); await tap(wb.x,wb.y); await sleep(150); s=await state(); assert(s.hearts===2,'heart lost on wrong answer');
    await waitFor(x=>x.bubbles.some(b=>b.bomb),'a bomb',30000); await page.screenshot({path:path.join(outDir,'math-hard.png')});
    await playRound(10); s=await state(); assert(s.best.hard[10]>=1,'hard r10 stars'); noErrors();
    console.log('PASS'); await browser.close(); process.exit(0);
  }catch(e){ console.log('FAIL '+e.message); if(errors.length) console.log(errors.join('\n')); try{ await page.screenshot({path:path.join(outDir,'fail.png')}); }catch(_){} await browser.close(); process.exit(1); }
})();
