// Usage: NODE_PATH=/opt/node22/lib/node_modules node lives.js <baseUrl> <outDir>
// Three lives on every level. In easy too, every wrong tap costs a heart and a right pop gives none back; the third miss shows
// the answer once (the owl's bubble, the right bubbles glowing), then the level is over: home screen, nothing recorded, Play again from zero.
// Nothing on screen gives the answer away while playing.
const { chromium, devices } = require('playwright');
const fs=require('fs'), path=require('path');
const [baseUrl, outDir] = process.argv.slice(2);
if(!baseUrl||!outDir){ console.log('usage: lives.js <baseUrl> <outDir>'); process.exit(1); }
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
  page.on('requestfailed',r=>{ if(!r.url().startsWith(baseUrl)) errors.push('external: '+r.url()); });
  const tap=(x,y)=>page.touchscreen.tap(x,y);
  const state=()=>page.evaluate(()=>window.__bps.state());
  const vp=page.viewportSize();
  const visible=b=>b.x>b.r&&b.x<vp.width-b.r&&b.y>b.r*1.5&&b.y<vp.height-b.r*1.5;
  const tapEl=async sel=>{ const box=await page.locator(sel).boundingBox(); assert(box,'missing '+sel); await tap(box.x+box.width/2, box.y+box.height/2); };
  const noErrors=()=>assert(errors.length===0,'errors: '+errors.join(' | '));
  const waitFor=async(pred,label,ms=15000,every=100)=>{ const t0=Date.now(); while(Date.now()-t0<ms){ const s=await state(); const r=pred(s); if(r) return r; await sleep(every);} throw new Error(`[${step}] timeout waiting for ${label}`); };
  const say=()=>page.evaluate(()=>document.querySelector('#speech .say')?.textContent);
  const hud=()=>page.evaluate(()=>({ hp:document.querySelectorAll('#hearts .hp').length, lost:document.querySelectorAll('#hearts .hp.lost').length, row2:getComputedStyle(document.querySelector('#row2')).display }));
  const noGiveaway=async(s)=>{ // the learning rule while the child is still trying
    assert(!s.reveal,'not revealing');
    assert(await page.evaluate(()=>!document.querySelector('#speech .en')),'no english word on screen while playing');
    if(s.mode==='words'&&s.problem&&s.problem.kind==='pic') assert(await page.evaluate(()=>document.querySelector('#speech .icons .q')?.textContent==='?'),'question mark, no picture hint');
    if(s.mode==='math') assert(await page.evaluate(()=>!document.querySelector('#speech .icons .q')||document.querySelector('#speech .icons .q').textContent==='?'),'no answer number in the owl bubble');
    for(const b of s.bubbles){ if(b.bomb) continue; assert(!b.glow,'no glowing bubble while playing');
      if(s.mode==='words'&&s.problem.kind==='pic') assert(b.word==null,'picture bubble must not wear its word'); }
  };
  // during a reveal the targets glow; the ones on screen may still be rising into view, so give them a moment
  // (state() lists the bubbles on screen; a reveal that starts while every target is still under the pill has nothing to glow yet)
  const glowSoon=async()=>{ let last=null; const r=await waitFor(x=>{ last=x; if(x.reveal) for(const b of x.bubbles) assert(b.isTarget||!b.glow,'only targets glow'); return x.reveal&&x.bubbles.some(b=>b.isTarget&&b.glow)?x:null; },'a glowing target during the reveal',1500,40).catch(()=>null);
    if(r) return r; assert(last&&last.reveal&&!last.bubbles.some(b=>b.isTarget),'a glowing target during the reveal'); return last; };
  const assertHearts=async(n,label)=>{ const s=await state(); const h=await hud(); assert(s.hearts===n,`${label}: hearts ${s.hearts}, expected ${n}`);
    assert(h.hp===3&&h.row2==='flex',`${label}: three hearts visible (${JSON.stringify(h)})`); assert(h.lost===3-n,`${label}: ${h.lost} lost hearts drawn, expected ${3-n}`); return s; };
  // a bubble the child would tap by mistake: not a target, not a bomb, well inside the screen and not overlapping anything
  // state() omits bubbles fading under the owl's pill, and the game still counts a tap on them (tap slop 12px), so a wrong
  // bubble must sit well below the pill and have nothing else within tap reach; otherwise a hidden target can take the tap
  let hudB=0;
  const pickWrong=s=>{ const c=s.bubbles.filter(b=>!b.isTarget&&!b.bomb&&visible(b)); const near=(b,o)=>o.id!==b.id&&Math.hypot(o.x-b.x,o.y-b.y)<o.r+b.r+14;
    const lone=b=>!s.bubbles.some(o=>near(b,o)), safe=b=>!s.bubbles.some(o=>near(b,o)&&(o.isTarget||o.bomb)), low=b=>b.y>hudB+b.r*2+20;   // a hidden bubble under the pill is out of reach
    return c.find(b=>lone(b)&&low(b)) || c.find(b=>safe(b)&&low(b)) || null; };
  const pickRight=s=>{ const c=s.bubbles.filter(b=>b.isTarget&&!b.bomb&&visible(b)).sort((a,b)=>b.y-a.y); const lone=b=>!s.bubbles.some(o=>o.id!==b.id&&Math.hypot(o.x-b.x,o.y-b.y)<(o.r+b.r)*0.95);
    return c.find(lone) || c[0]; };
  async function tapWrong(){ // tap a wrong bubble until the game counted it (a strike, a lost heart or a reveal); re-read the state before every try
    if(!hudB) hudB=await page.evaluate(()=>document.querySelector('#guide').getBoundingClientRect().bottom);
    for(let i=0;i<60;i++){ const s0=await state(); assert(!s0.reveal,'tapping while revealing'); const b=pickWrong(s0); if(!b){ await sleep(120); continue; }
      await tap(b.x,b.y);
      const s1=await waitFor(s=>(s.wrongTries!==s0.wrongTries||s.hearts!==s0.hearts||s.reveal||s.progress!==s0.progress)?s:null,'tap counted',700,40).catch(()=>null);
      if(!s1) continue;   // the bubble moved away or had just left: try another
      assert(s1.progress===s0.progress,`a wrong tap changed progress ${s0.progress}->${s1.progress}`);
      return s1; }
    throw new Error(`[${step}] no wrong bubble could be tapped`); }
  async function tapRight(){ for(let i=0;i<60;i++){ const s0=await state(); const b=pickRight(s0); if(!b){ await sleep(120); continue; }
      await tap(b.x,b.y); const s1=await waitFor(s=>s.progress===s0.progress+1?s:null,'right pop',700,40).catch(()=>null); if(s1) return s1;
      const s2=await state(); assert(s2.wrongTries===s0.wrongTries&&s2.hearts===s0.hearts,'a right tap was counted wrong'); }
    throw new Error(`[${step}] no target bubble could be tapped`); }
  const startRound=async(n)=>{ await page.evaluate(n=>window.__bps.startRound(n),n); await waitFor(s=>s.screen==='play'&&s.round===n&&s.bubbles.length>=3,'round '+n+' with bubbles',8000); await sleep(200); return state(); };
  const goHome=async()=>{ await tapEl('[data-testid="home"]'); await waitFor(s=>s.screen==='home','home',3000); };
  // the third miss: after the reveal the level is over and the game is back on the home screen (Play starts it again from zero)
  const failedHome=async()=>{ const s=await waitFor(x=>!x.reveal&&x.screen==='home'?x:null,'home after the failed level',5000); assert(s.hearts===0,'hearts were emptied'); return s; };
  try{
    step='1-home'; await page.goto(baseUrl+'/',{waitUntil:'load'}); await page.waitForFunction(()=>window.__bps&&window.__bps.state);
    await page.evaluate(()=>{ window.__bps.resetProgress(); window.__bps.setDifficulty('easy'); window.__bps.setMode('math'); }); await page.reload({waitUntil:'load'}); await page.waitForFunction(()=>window.__bps&&window.__bps.state);
    let s=await state(); assert(s.screen==='home'&&s.difficulty==='easy'&&s.mode==='math','easy math on home, got '+JSON.stringify({sc:s.screen,d:s.difficulty,m:s.mode}));
    assert(await page.evaluate(()=>document.querySelector('#row2').getClientRects().length===0),'no hearts on the home screen'); noErrors();

    // ---- easy math: every miss costs a heart, the bar is kept; the third miss fails the level: one reveal, then the home screen
    step='2-math'; s=await startRound(3); await assertHearts(3,'start'); await noGiveaway(s);
    s=await tapRight(); assert(s.progress===1,'one right pop'); assert(s.hearts===3,'right pop keeps hearts');
    const mt0=s.problem.text, ma0=s.problem.answer;
    for(let i=1;i<=2;i++){ s=await tapWrong(); assert(!s.reveal,'no reveal after miss '+i); await assertHearts(3-i,'after miss '+i);
      assert(s.progress===1&&s.problem.text===mt0,'same question, bar kept'); await noGiveaway(s); }
    await page.screenshot({path:path.join(outDir,'lives-math-strikes.png')});
    s=await tapWrong(); assert(s.reveal===true,'the third miss reveals'); await assertHearts(0,'third miss');
    let txt=await say(); assert(txt===mt0.replace('?',String(ma0)),'reveal shows the equation with its answer: '+txt);
    await glowSoon(); await sleep(400); await page.screenshot({path:path.join(outDir,'lives-math-reveal.png')});
    s=await failedHome(); assert(JSON.stringify(s.best)==='{"easy":{},"hard":{},"expert":{}}','nothing recorded for the failed level');
    s=await startRound(3); await assertHearts(3,'the level again from zero'); assert(s.progress===0&&s.wrongTries===0&&s.problem&&Number.isInteger(s.problem.answer),'fresh attempt: '+JSON.stringify({p:s.progress,w:s.wrongTries}));
    await noGiveaway(s); noErrors(); await goHome();
    assert(await page.evaluate(()=>document.querySelectorAll('#book .slot .st img').length===0),'no stars shown in easy');

    // ---- easy animals: a miss costs a heart, a right pop does not give one back; the lost round shows the goal with the right bubbles glowing
    step='3-animals'; await page.evaluate(()=>window.__bps.setMode('safari')); s=await startRound(1); await assertHearts(3,'start'); await noGiveaway(s);
    const goalTxt=await say(); assert(/^Pop \d+ /.test(goalTxt),'goal text: '+goalTxt);
    s=await tapWrong(); assert(!s.reveal,'no reveal after a miss'); await assertHearts(2,'first miss');
    s=await tapRight(); assert(s.progress===1,'right pop'); await assertHearts(2,'a right pop gives no heart back');
    s=await tapWrong(); assert(!s.reveal,'no reveal after the second miss'); await assertHearts(1,'second miss'); await noGiveaway(s);
    s=await tapWrong(); assert(s.reveal===true,'the third miss reveals'); await assertHearts(0,'third miss');
    s=await glowSoon(); assert(s.bubbles.every(b=>b.isTarget||!b.glow),'only targets glow');
    txt=await say(); assert(txt===goalTxt,'the owl shows the goal during the reveal: '+txt);
    assert(await page.evaluate(()=>!!document.querySelector('#speech .icons .gb.big')),'the goal bubble is shown');
    await sleep(400); await page.screenshot({path:path.join(outDir,'lives-animals-reveal.png')});
    s=await failedHome();
    // Play starts the same level again from zero: no resume of the failed attempt
    await tapEl('[data-testid="play"]'); s=await waitFor(x=>x.screen==='play'&&x.bubbles.length>=3?x:null,'play again',8000); await sleep(200);
    await assertHearts(3,'the level again'); assert(s.round===1&&s.progress===0&&s.wrongTries===0,'fresh attempt: '+JSON.stringify({r:s.round,p:s.progress,w:s.wrongTries}));
    assert(s.bubbles.every(b=>!b.glow),'no glow on the fresh attempt'); txt=await say(); assert(txt===goalTxt,'goal back: '+txt); noErrors(); await goHome();

    // ---- easy words: nothing given away while playing; the third miss shows the answer exactly once, then the same round restarts with nothing recorded
    step='4-words'; await page.evaluate(()=>{ window.__bps.setMode('words'); window.__bps.setLanguage('fr'); }); s=await startRound(1); await assertHearts(3,'start');
    assert(s.problem&&s.problem.kind==='pic','picture round '+JSON.stringify(s.problem)); const best0=JSON.stringify(s.best); await noGiveaway(s);
    const k0=s.problem.key, w0=s.problem.word;
    for(let i=1;i<=2;i++){ s=await tapWrong(); assert(!s.reveal,'no reveal after miss '+i); await assertHearts(3-i,'miss '+i); assert(s.problem.key===k0,'same word'); await noGiveaway(s); }
    { const s0=await state(); const b=pickWrong(s0); assert(b,'a wrong bubble for the last miss'); await tap(b.x,b.y);
      let reveals=0, was=false, glowed=false, sawZero=false, fin=null; const t0=Date.now();
      while(Date.now()-t0<5000){ const x=await state(); if(x.reveal&&!was){ reveals++; if(reveals===1){ const h=await hud(); assert(h.lost===3,'all hearts drawn lost during the reveal: '+JSON.stringify(h)); txt=await say(); assert(txt===w0,'the reveal shows the failed word: '+txt);
            assert(await page.evaluate(()=>!!document.querySelector('#speech .en')),'reveal shows the english word'); await sleep(300); await page.screenshot({path:path.join(outDir,'lives-words-reveal.png')}); } }
        if(x.reveal){ assert(x.bubbles.every(b=>b.isTarget||!b.glow),'only targets glow'); if(x.bubbles.some(b=>b.isTarget&&b.glow)||!x.bubbles.some(b=>b.isTarget)) glowed=true; }
        was=x.reveal; if(x.hearts===0) sawZero=true; if(reveals>0&&!x.reveal&&x.screen==='home'){ fin=x; break; } await sleep(50); }
      assert(reveals===1,'exactly one reveal on the last heart, got '+reveals); assert(sawZero,'hearts reached 0'); assert(glowed,'targets glow during the reveal');
      assert(fin,'home within 5 s of the third miss'); assert(JSON.stringify(fin.best)===best0,'nothing recorded for the failed level');
      assert(await page.evaluate(()=>document.querySelector('#row2').getClientRects().length===0),'no hearts on the home screen');
      await sleep(600); await page.screenshot({path:path.join(outDir,'lives-words-failed.png')});
      await tapEl('[data-testid="play"]'); s=await waitFor(x=>x.screen==='play'&&x.bubbles.length>=3?x:null,'play again',8000); await sleep(200);
      await assertHearts(3,'the level again'); assert(s.round===1&&s.progress===0&&s.wrongTries===0&&s.problem&&s.problem.kind==='pic','fresh attempt from zero: '+JSON.stringify({r:s.round,p:s.progress,w:s.wrongTries}));
      await noGiveaway(s); assert(s.reveal===false,'hearts never stick at zero'); }
    noErrors(); await goHome(); s=await state(); assert(JSON.stringify(s.best)===best0,'sticker book untouched');
    assert(await page.evaluate(()=>document.querySelectorAll('#book .slot .st img').length===0),'no stars shown in easy');

    // ---- hard: the same three hearts, a single wrong tap costs one
    step='5-hard'; await page.evaluate(()=>{ window.__bps.setDifficulty('hard'); window.__bps.setMode('safari'); }); s=await startRound(1); await assertHearts(3,'hard start');
    s=await tapWrong(); assert(s.hearts===2&&!s.reveal,'one wrong tap costs a heart in hard: '+JSON.stringify({h:s.hearts,r:s.reveal})); await assertHearts(2,'hard after a wrong tap');
    noErrors(); await goHome(); await page.evaluate(()=>window.__bps.setDifficulty('easy'));
    console.log('PASS'); await browser.close(); process.exit(0);
  }catch(e){ console.log('FAIL '+e.message); if(errors.length) console.log(errors.join('\n')); try{ await page.screenshot({path:path.join(outDir,'fail.png')}); }catch(_){} await browser.close(); process.exit(1); }
})();
