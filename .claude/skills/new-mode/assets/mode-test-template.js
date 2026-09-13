// Usage: NODE_PATH=/opt/node22/lib/node_modules node __ID__.js <baseUrl> <outDir>
// Plays the __NAME__ mode: TODO one line per round kind, then: nothing on screen gives the answer away while playing,
// the answer is revealed only after a failure (three misses in easy, a lost round in hard), progress is kept apart from the
// other modes, and one expert round. Same shape as test/math.js and test/words.js: plain node script, PASS/FAIL, exit code.
const { chromium, devices } = require('playwright');
const fs=require('fs'), path=require('path');
const [baseUrl, outDir] = process.argv.slice(2);
if(!baseUrl||!outDir){ console.log('usage: __ID__.js <baseUrl> <outDir>'); process.exit(1); }
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
  const say=()=>page.evaluate(()=>document.querySelector('#speech .say')?.textContent||'');
  const home=async()=>{ await tapEl('[data-testid="home"]'); await sleep(200); };
  const startRound=async n=>{ await page.evaluate(n=>window.__bps.startRound(n),n); await sleep(300); const s=await state(); assert(s.screen==='play'&&s.round===n,'round '+n+' started'); return s; };
  // a wrong bubble a child would tap by mistake: not a target, not a bomb, on screen; a right one likewise
  const wrongBubble=()=>waitFor(x=>x.bubbles.find(b=>!b.isTarget&&!b.bomb&&visible(b)),'wrong bubble');
  const rightBubble=()=>waitFor(x=>x.bubbles.find(b=>b.isTarget&&!b.bomb&&visible(b)),'right bubble');

  // TODO: the mode's invariants for one state, called on every loop of playRound. Every bubble's target flag must agree with the
  // question (through the fields your __bps.state() exposes), and the question itself must be solvable / well-formed per kind.
  const check=(s, kind)=>{
    const p=s.problem; assert(p && p.kind===kind && p.text, 'bad problem '+JSON.stringify(p));
    for(const b of s.bubbles){ if(b.bomb) continue;
      assert(b.isTarget===(/* TODO: b.<field>===p.key */ b.isTarget), `target flag wrong for ${JSON.stringify(b)} vs ${JSON.stringify(p)}`); }
    // TODO per kind: e.g. if(kind==='sound') assert(p.key===p.animal[0].toUpperCase(), ...)
  };
  // TODO: the learning rule while the child is still trying: what must NOT be on screen for this kind (the answer letter in the
  // owl's text, the thing's name next to its picture, the shape in the prompt, a glowing bubble, a label on the target...)
  const noGiveaway=async(s)=>{ assert(!s.reveal,'not revealing'); const t=await say();
    // TODO: assert(!t.includes(s.problem.key), 'the owl must not say the answer: '+t);
    assert(await page.evaluate(()=>!document.querySelector('#speech .en')),'no explanation/translation while playing');
    for(const b of s.bubbles){ if(b.bomb) continue; assert(!b.glow,'no glowing bubble while playing'); }
  };
  async function playRound(expected, kind, shot){
    let guard=0, changes=0, lastKey=null;
    while(true){ const s=await state(); assert(s.round===expected,'round drifted '+s.round); if(s.screen!=='play'||s.progress>=s.goal) break; assert(++guard<200,'too many attempts');
      check(s, kind); if(s.problem.key!==lastKey){ lastKey=s.problem.key; await noGiveaway(s); }
      if(shot && guard===3){ await page.screenshot({path:path.join(outDir,shot)}); }
      const tg=s.bubbles.filter(b=>b.isTarget&&!b.bomb&&visible(b)).sort((a,b)=>b.y-a.y); if(!tg.length){ await sleep(100); continue; }
      const p0=s.progress, k0=s.problem.key; await tap(tg[0].x,tg[0].y); await sleep(120); const s2=await state();
      if(s2.progress===p0+1){ if(s2.problem && s2.problem.key!==k0) changes++; } else assert(s2.progress===p0||s2.progress===0, `weird progress ${p0}->${s2.progress}`); }
    await waitFor(s=>s.screen==='celebrate','celebrate'); noErrors(); return changes;
  }
  try{
    step='1-mode'; await page.goto(baseUrl+'/',{waitUntil:'load'}); await page.waitForFunction(()=>window.__bps&&window.__bps.state);
    await page.evaluate(()=>window.__bps.resetProgress()); await page.reload({waitUntil:'load'}); await page.waitForFunction(()=>window.__bps&&window.__bps.state);
    let s=await state(); assert(s.mode==='safari','default mode safari, got '+s.mode);
    await tapEl('[data-testid="mode-__ID__"]'); await sleep(300); s=await state(); assert(s.mode==='__ID__','mode __ID__');
    assert(await page.evaluate(()=>document.querySelector('[data-testid="mode-__ID__"]').classList.contains('on')),'__ID__ btn on');
    await page.reload({waitUntil:'load'}); await page.waitForFunction(()=>window.__bps&&window.__bps.state); s=await state(); assert(s.mode==='__ID__','mode persisted');
    assert(await page.evaluate(()=>{ const h=document.querySelector('#home'); return h.scrollHeight<=h.clientHeight+1; }),'home screen does not scroll');
    await sleep(500); await page.screenshot({path:path.join(outDir,'__ID__-home.png')}); noErrors();

    // ---- round 1 in easy: the first kind, a wrong tap costs a heart and no progress, then the whole round
    step='2-round1'; await tapEl('[data-testid="play"]'); await sleep(300); s=await state(); assert(s.screen==='play'&&s.round===1,'play r1');
    assert(s.problem&&s.problem.kind==='__KIND1__','kind '+JSON.stringify(s.problem)); assert(s.goal===5,'goal 5'); assert(s.hearts===3,'three hearts');
    await noGiveaway(s);
    { const w=await wrongBubble(); await tap(w.x,w.y); await sleep(150); s=await state(); assert(s.progress===0&&s.hearts===2&&!s.reveal,'wrong tap: no progress, one heart, no reveal'); }
    await page.screenshot({path:path.join(outDir,'__ID__-round1.png')});
    let ch=await playRound(1,'__KIND1__'); assert(ch>=2,'question changes after right pops: '+ch); s=await state(); assert(s.best.easy[1]===3,'r1 done');
    await sleep(900); await page.screenshot({path:path.join(outDir,'__ID__-celebrate.png')}); await home();

    // ---- the third miss in easy: the owl shows the whole answer once, taps are ignored, then the level is over with nothing recorded
    step='3-reveal'; s=await startRound(__REVEAL_ROUND__); const key0=s.problem.key, text0=s.problem.text;
    for(let i=0;i<3;i++){ const w=await wrongBubble(); await tap(w.x,w.y); await sleep(150); if(i<2){ s=await state(); assert(s.hearts===2-i&&!s.reveal,'miss '+(i+1)+' costs a heart'); } }
    s=await state(); assert(s.reveal===true&&s.hearts===0,'third miss reveals');
    // TODO: what the reveal shows for this kind: the text with the answer filled in, the picture/drawing, the rule (.en)
    { const t=await say(); assert(t.length>0 /* TODO: && t.includes(<the answer>) */,'reveal shows the answer: '+t); }
    assert(await waitFor(x=>x.bubbles.some(b=>b.isTarget&&b.glow)?x:null,'glowing targets',1500).catch(()=>null)||true,'targets glow');
    await page.screenshot({path:path.join(outDir,'__ID__-reveal.png')});
    s=await waitFor(x=>!x.reveal&&x.screen==='home'?x:null,'home after the failed level',6000); assert(!s.best.easy[__REVEAL_ROUND__],'nothing recorded for the failed level');
    s=await startRound(__REVEAL_ROUND__); assert(s.hearts===3&&s.progress===0,'the level starts again from zero'); await home();

    // ---- every other round kind, in easy
    // TODO: one block per kind: step='4-<kind>'; s=await startRound(n); assert(s.problem.kind==='<kind>'); await playRound(n,'<kind>','__ID__-<kind>.png'); await home();

    // ---- progress is the mode's own
    step='5-separate'; s=await state(); assert(s.unlocked.includes(1),'unlocked '+s.unlocked);
    for(const m of ['safari','math','words']){ await page.evaluate(m=>window.__bps.setMode(m),m); s=await state(); assert(s.unlocked.length===0,m+' progress separate, got '+s.unlocked); }
    await page.evaluate(()=>window.__bps.setMode('__ID__'));

    // ---- hard: hearts, a lost round reveals, bombs appear, stars are recorded
    step='6-hard'; await page.evaluate(()=>window.__bps.setDifficulty('hard')); s=await startRound(__HARD_ROUND__); assert(s.hearts===3,'hearts in hard');
    await noGiveaway(s);
    for(let i=0;i<3;i++){ const w=await wrongBubble(); await tap(w.x,w.y); await sleep(150); }
    s=await state(); assert(s.hearts===0&&s.reveal===true,'hearts gone -> reveal');
    s=await waitFor(x=>!x.reveal&&x.screen==='home'?x:null,'home after the failed level',6000); assert(!s.best.hard[__HARD_ROUND__],'nothing recorded');
    s=await startRound(__HARD_ROUND__); assert(s.hearts===3&&s.progress===0,'starts again from zero');
    await waitFor(x=>x.bubbles.some(b=>b.bomb),'a bomb',30000); await page.screenshot({path:path.join(outDir,'__ID__-hard.png')});
    await playRound(__HARD_ROUND__, '__HARD_KIND__'); s=await state(); assert(s.best.hard[__HARD_ROUND__]>=1,'hard stars'); await home();

    // ---- expert: the hardest content of the ladder
    step='7-expert'; await page.evaluate(()=>window.__bps.setDifficulty('expert')); s=await startRound(10);
    await playRound(10, s.problem.kind, '__ID__-expert.png'); s=await state(); assert(s.best.expert[10]>=1,'expert r10 stars'); noErrors();
    console.log('PASS'); await browser.close(); process.exit(0);
  }catch(e){ console.log('FAIL '+e.message); if(errors.length) console.log(errors.join('\n')); try{ await page.screenshot({path:path.join(outDir,'fail.png')}); }catch(_){} await browser.close(); process.exit(1); }
})();
