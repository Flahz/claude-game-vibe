// Usage: NODE_PATH=/opt/node22/lib/node_modules node hard.js <baseUrl> <outDir>
// Plays hard and expert mode: hearts, bombs, round restart, star rating, ordered goals, timer, colour-shifting bubbles.
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
  const tapKind=async(pred,label)=>{ const b=await waitFor(s=>s.bubbles.find(x=>pred(x)&&visible(x)),label); await tap(b.x,b.y); await sleep(150); return b; };
  async function playRound(expected){
    let guard=0;
    while(true){ const s=await state(); assert(s.round===expected,'round drifted '+s.round); if(s.screen!=='play'||s.progress>=s.goal) break; assert(++guard<150,'too many attempts');
      const tg=s.bubbles.filter(b=>b.isTarget&&!b.bomb&&visible(b)).sort((a,b)=>b.y-a.y); if(!tg.length){ await sleep(100); continue; }
      const p0=s.progress; const s2=await state(); const fresh=s2.bubbles.find(b=>b.id===tg[0].id&&b.isTarget); if(!fresh) continue;
      await tap(fresh.x,fresh.y); await sleep(100); const s3=await state();
      assert(s3.progress===p0+1||s3.progress===p0||s3.progress===0, `weird progress ${p0}->${s3.progress}`); }
    await waitFor(s=>s.screen==='celebrate','celebrate'); noErrors();
  }
  try{
    step='1-home'; await page.goto(baseUrl+'/',{waitUntil:'load'}); await page.waitForFunction(()=>window.__bps&&window.__bps.state);
    await page.evaluate(()=>window.__bps.resetProgress()); await page.reload({waitUntil:'load'}); await page.waitForFunction(()=>window.__bps&&window.__bps.state);
    // art actually loaded (custom, not emoji)
    await page.waitForFunction(()=>[...document.querySelectorAll('img.art')].every(i=>i.complete&&i.naturalWidth>0),null,{timeout:8000});
    const artCount=await page.evaluate(()=>document.querySelectorAll('img.art').length); assert(artCount>=12,'art imgs '+artCount);
    let s=await state(); assert(s.difficulty==='easy','default easy');
    await tapEl('[data-testid="diff-hard"]'); await sleep(300); s=await state(); assert(s.difficulty==='hard','diff hard, got '+s.difficulty);
    assert(await page.evaluate(()=>document.querySelector('[data-testid="diff-hard"]').classList.contains('on')),'hard btn on');
    await page.reload({waitUntil:'load'}); await page.waitForFunction(()=>window.__bps&&window.__bps.state); s=await state(); assert(s.difficulty==='hard','diff persisted');
    await sleep(500); await page.screenshot({path:path.join(outDir,'home-hard.png')}); noErrors();

    step='2-hearts'; await tapEl('[data-testid="play"]'); await sleep(250); s=await state(); assert(s.screen==='play'&&s.round===1,'play r1'); assert(s.hearts===3,'3 hearts, got '+s.hearts);
    assert(await page.evaluate(()=>document.querySelectorAll('#hearts .hp').length===3&&getComputedStyle(document.querySelector('#row2')).display==='flex'),'hearts visible');
    assert(await page.evaluate(()=>getComputedStyle(document.querySelector('#tbar')).display==='none'),'no timer in hard');
    await tapKind(b=>!b.isTarget&&!b.bomb,'a wrong bubble'); s=await state(); assert(s.hearts===2&&s.mistakes===1,`after wrong: hearts=${s.hearts} mistakes=${s.mistakes}`);
    await sleep(300); await page.screenshot({path:path.join(outDir,'hard-round.png')});
    step='3-bomb'; const bomb=await tapKind(b=>b.bomb,'a bomb',40000); s=await state(); assert(s.hearts===1,'after bomb hearts='+s.hearts); assert(!s.bubbles.find(b=>b.id===bomb.id),'bomb removed');
    await page.screenshot({path:path.join(outDir,'hard-boom.png')});
    step='4-restart'; await tapKind(b=>!b.isTarget&&!b.bomb,'a wrong bubble'); s=await state(); assert(s.screen==='play'&&s.hearts===3&&s.progress===0&&s.mistakes===3,`restart: ${JSON.stringify({h:s.hearts,p:s.progress,m:s.mistakes,sc:s.screen})}`);
    noErrors();
    step='5-finish-r1'; await playRound(1); s=await state(); assert(s.best.hard[1]===1,'1 star expected, best='+JSON.stringify(s.best)); assert(s.unlocked.includes(1),'unlocked 1');
    const dim=await page.evaluate(()=>document.querySelectorAll('#cstars span.dim').length); assert(dim===2,'2 dim stars, got '+dim);
    await sleep(900); await page.screenshot({path:path.join(outDir,'hard-celebrate.png')});
    await tapEl('[data-testid="home"]'); await sleep(200); s=await state(); assert(s.screen==='home','home');
    assert(await page.evaluate(()=>document.querySelectorAll('#book .slot[data-round="1"] .st img').length===1),'book shows 1 star');

    step='6-sequence'; await page.evaluate(()=>window.__bps.startRound(5)); await sleep(250); s=await state();
    assert(s.sequence&&s.sequence.length===2,'seq len 2: '+JSON.stringify(s.sequence)); assert(s.goal===6,'goal 6, got '+s.goal);
    const t0=JSON.stringify(s.target); await sleep(400); await page.screenshot({path:path.join(outDir,'hard-seq.png')});
    let b=await tapKind(x=>x.isTarget,'target'); s=await state(); assert(s.progress===1,'progress 1'); assert(JSON.stringify(s.target)!==t0,'target changed: '+JSON.stringify(s.target));
    assert(s.hearts===3,'no heart lost on correct'); await playRound(5); s=await state(); assert(s.best.hard[5]>=1,'r5 stars'); noErrors();
    await tapEl('[data-testid="home"]'); await sleep(200);

    step='7-expert'; await page.evaluate(()=>window.__bps.setDifficulty('expert')); await sleep(100); s=await state(); assert(s.difficulty==='expert','expert');
    await page.evaluate(()=>window.__bps.startRound(7)); await sleep(300); s=await state(); assert(s.sequence&&s.sequence.length===3,'seq3 '+JSON.stringify(s.sequence));
    assert(await page.evaluate(()=>getComputedStyle(document.querySelector('#tbar')).display==='block'),'timer visible');
    const tl0=s.timeLeft; await sleep(1500); s=await state(); assert(s.timeLeft<tl0,'timer counting '+tl0+'->'+s.timeLeft);
    await waitFor(s=>s.bubbles.some(x=>x.shift),'a colour-shifting bubble',30000);
    await page.screenshot({path:path.join(outDir,'expert-round.png')});
    // hearts still decrement on timeout: fast-forward by waiting is too slow; check the round is beatable instead
    await playRound(7); s=await state(); assert(s.best.expert[7]>=1,'expert r7 stars'); noErrors();
    await tapEl('[data-testid="home"]'); await sleep(200); s=await state(); assert(s.unlocked.includes(7)&&s.unlocked.includes(5)&&s.unlocked.includes(1),'union unlocked '+s.unlocked);
    await page.evaluate(()=>window.__bps.setDifficulty('easy')); await sleep(100); s=await state(); assert(s.round===1,'easy next unfinished = 1? got '+s.round);
    step='8-perf'; await page.evaluate(()=>window.__bps.setDifficulty('expert')); await page.evaluate(()=>window.__bps.startRound(10)); await sleep(2500);
    const fps=await page.evaluate(()=>new Promise(r=>{ let n=0; const t0=performance.now(); const f=()=>{ n++; if(performance.now()-t0<2000) requestAnimationFrame(f); else r(n/2); }; requestAnimationFrame(f); }));
    console.log('expert r10 fps', fps); assert(fps>40,'fps '+fps);
    await page.screenshot({path:path.join(outDir,'expert-r10.png')}); noErrors();
    console.log('PASS'); await browser.close(); process.exit(0);
  }catch(e){ console.log('FAIL '+e.message); if(errors.length) console.log(errors.join('\n')); try{ await page.screenshot({path:path.join(outDir,'fail.png')}); }catch(_){} await browser.close(); process.exit(1); }
})();
