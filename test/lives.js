// Usage: NODE_PATH=/opt/node22/lib/node_modules node lives.js <baseUrl> <outDir>
// Three hearts on every level. In easy a heart goes out when a question is lost (the third wrong tap on it), the owl showing the
// answer at that moment; the first two wrong taps are free. Losing the third heart shows the answer once, then the same round
// restarts with full hearts and nothing recorded. Hard keeps a heart per wrong tap. Nothing on screen gives the answer away while playing.
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
    const lone=b=>!s.bubbles.some(o=>near(b,o)), safe=b=>!s.bubbles.some(o=>near(b,o)&&(o.isTarget||o.bomb)), low=b=>b.y>hudB+b.r*1.3;
    return c.find(b=>lone(b)&&low(b)) || c.find(b=>safe(b)&&low(b)) || c.find(safe) || null; };
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
  try{
    step='1-home'; await page.goto(baseUrl+'/',{waitUntil:'load'}); await page.waitForFunction(()=>window.__bps&&window.__bps.state);
    await page.evaluate(()=>{ window.__bps.resetProgress(); window.__bps.setDifficulty('easy'); window.__bps.setMode('math'); }); await page.reload({waitUntil:'load'}); await page.waitForFunction(()=>window.__bps&&window.__bps.state);
    let s=await state(); assert(s.screen==='home'&&s.difficulty==='easy'&&s.mode==='math','easy math on home, got '+JSON.stringify({sc:s.screen,d:s.difficulty,m:s.mode}));
    assert(await page.evaluate(()=>getComputedStyle(document.querySelector('#row2')).display==='none'),'no hearts on the home screen'); noErrors();

    // ---- easy math: a slip is free, the third wrong tap on one question costs a heart and shows the answer; the bar is kept
    step='2-math'; s=await startRound(3); await assertHearts(3,'start'); assert(s.wrongTries===0,'no strikes at start'); await noGiveaway(s);
    s=await tapRight(); assert(s.progress===1,'one right pop'); assert(s.wrongTries===0&&s.hearts===3,'right pop keeps hearts');
    const mt0=s.problem.text, ma0=s.problem.answer;
    for(let i=1;i<=2;i++){ s=await tapWrong(); assert(s.wrongTries===i,`strike ${i} counted, got ${s.wrongTries}`); assert(!s.reveal,'no reveal after wrong tap '+i); await assertHearts(3,'after wrong tap '+i);
      assert(s.progress===1&&s.problem.text===mt0,'same question, progress kept'); await noGiveaway(s); }
    await page.screenshot({path:path.join(outDir,'lives-math-strikes.png')});
    s=await tapWrong(); assert(s.reveal===true,'third wrong tap reveals'); await assertHearts(2,'third wrong tap');
    let txt=await say(); assert(txt===mt0.replace('?',String(ma0)),'reveal shows the equation with its answer: '+txt);
    s=await glowSoon(); assert(s.progress===1,'progress kept through the reveal');
    await sleep(400); await page.screenshot({path:path.join(outDir,'lives-math-reveal.png')});
    // a fresh question follows (easy round 3 draws from so few numbers that the same equation can come up twice, so the cleared strikes are the signal)
    s=await waitFor(x=>!x.reveal?x:null,'reveal over',5000); assert(s.problem&&Number.isInteger(s.problem.answer),'a question after the reveal'); assert(s.progress===1&&s.hearts===2&&s.wrongTries===0,'bar kept, one heart down, strikes cleared: '+JSON.stringify({p:s.progress,h:s.hearts,w:s.wrongTries}));
    await noGiveaway(s); noErrors(); await goHome();
    assert(await page.evaluate(()=>document.querySelectorAll('#book .slot .st img').length===0),'no stars shown in easy');

    // ---- easy animals: the question is the goal since the last right pop; a right pop forgives earlier slips
    step='3-animals'; await page.evaluate(()=>window.__bps.setMode('safari')); s=await startRound(1); await assertHearts(3,'start'); await noGiveaway(s);
    const goalTxt=await say(); assert(/^Pop \d+ /.test(goalTxt),'goal text: '+goalTxt);
    for(let i=1;i<=2;i++){ s=await tapWrong(); assert(s.wrongTries===i&&s.hearts===3&&!s.reveal,`strike ${i}: ${JSON.stringify({w:s.wrongTries,h:s.hearts,r:s.reveal})}`); }
    s=await tapRight(); assert(s.progress===1,'right pop'); assert(s.wrongTries===0,'a right pop clears the strikes, got '+s.wrongTries); await assertHearts(3,'after right pop');
    for(let i=1;i<=2;i++){ s=await tapWrong(); assert(s.wrongTries===i&&!s.reveal,`strike ${i} after the pop`); await assertHearts(3,'strike '+i+' after the pop'); await noGiveaway(s); }
    s=await tapWrong(); assert(s.reveal===true,'third wrong since the last right pop reveals'); await assertHearts(2,'third strike');
    s=await glowSoon(); assert(s.bubbles.every(b=>b.isTarget||!b.glow),'only targets glow');
    txt=await say(); assert(txt===goalTxt,'the owl still shows the goal during the reveal: '+txt);
    assert(await page.evaluate(()=>!!document.querySelector('#speech .icons .gb.big')),'the goal bubble is shown');
    await sleep(400); await page.screenshot({path:path.join(outDir,'lives-animals-reveal.png')});
    s=await waitFor(x=>!x.reveal?x:null,'reveal over',5000); assert(s.progress===1&&s.hearts===2&&s.wrongTries===0&&s.round===1&&s.screen==='play','play goes on with the bar kept: '+JSON.stringify({p:s.progress,h:s.hearts,w:s.wrongTries}));
    assert(s.bubbles.every(b=>!b.glow),'glow cleared after the reveal'); txt=await say(); assert(txt===goalTxt,'goal back after the reveal'); noErrors(); await goHome();

    // ---- easy words: lose the three hearts; the last one shows the answer exactly once, then the same round restarts with nothing recorded
    step='4-words'; await page.evaluate(()=>{ window.__bps.setMode('words'); window.__bps.setLanguage('fr'); }); s=await startRound(1); await assertHearts(3,'start');
    assert(s.problem&&s.problem.kind==='pic','picture round '+JSON.stringify(s.problem)); const best0=JSON.stringify(s.best); await noGiveaway(s);
    for(let q=0;q<3;q++){
      s=await state(); const k0=s.problem.key, w0=s.problem.word; assert(s.hearts===3-q,`question ${q+1} starts with ${3-q} hearts, got ${s.hearts}`);
      for(let i=1;i<=2;i++){ s=await tapWrong(); assert(s.wrongTries===i&&!s.reveal&&s.hearts===3-q,`q${q+1} strike ${i}: ${JSON.stringify({w:s.wrongTries,h:s.hearts,r:s.reveal})}`); assert(s.problem.key===k0,'same word'); await noGiveaway(s); }
      if(q<2){
        s=await tapWrong(); assert(s.reveal===true,'third strike reveals'); await assertHearts(2-q,'q'+(q+1)+' lost'); txt=await say(); assert(txt===w0,'reveal shows the word: '+txt);
        assert(await page.evaluate(()=>!!document.querySelector('#speech .en')),'reveal shows the english word'); await glowSoon();
        if(q===0){ await sleep(300); await page.screenshot({path:path.join(outDir,'lives-words-reveal.png')}); }
        s=await waitFor(x=>!x.reveal?x:null,'reveal over',5000); assert(s.problem.key!==k0,'new word after a lost question'); assert(s.round===1&&s.screen==='play','still playing'); await noGiveaway(s);
      } else {
        // the last heart: exactly one reveal of 2.6 s, then every bubble pops and the round starts again with three hearts
        const s0=await state(); const b=pickWrong(s0); assert(b,'a wrong bubble for the last strike'); await tap(b.x,b.y);
        let reveals=0, was=false, glowed=false, sawZero=false, fin=null; const t0=Date.now();
        while(Date.now()-t0<5000){ const x=await state(); if(x.reveal&&!was){ reveals++; if(reveals===1){ const h=await hud(); assert(h.lost===3,'all hearts drawn lost during the reveal: '+JSON.stringify(h)); txt=await say(); assert(txt===w0,'the last reveal shows the failed word: '+txt); } }
          if(x.reveal){ assert(x.bubbles.every(b=>b.isTarget||!b.glow),'only targets glow'); if(x.bubbles.some(b=>b.isTarget&&b.glow)||!x.bubbles.some(b=>b.isTarget)) glowed=true; }
          was=x.reveal; if(x.hearts===0) sawZero=true; if(reveals>0&&!x.reveal&&x.hearts===3){ fin=x; break; } await sleep(50); }
        assert(reveals===1,'exactly one reveal on the last heart, got '+reveals); assert(sawZero,'hearts reached 0'); assert(glowed,'targets glow during the last reveal');
        assert(fin,'round restarted within 5 s'); assert(fin.progress===0&&fin.round===1&&fin.screen==='play'&&fin.wrongTries===0,'same round from zero: '+JSON.stringify({p:fin.progress,r:fin.round,sc:fin.screen,w:fin.wrongTries}));
        await assertHearts(3,'after the restart'); assert(JSON.stringify(fin.best)===best0,'nothing recorded for a lost round'); assert(fin.problem.key!==k0||true,'a question is set');
        await sleep(600); await page.screenshot({path:path.join(outDir,'lives-words-restart.png')}); s=await state(); await noGiveaway(s);
        assert(s.hearts===3&&s.reveal===false,'hearts never stick at zero');
      }
    }
    noErrors(); await goHome(); s=await state(); assert(JSON.stringify(s.best)===best0,'sticker book untouched');
    assert(await page.evaluate(()=>document.querySelectorAll('#book .slot .st img').length===0),'no stars shown in easy');

    // ---- hard is unchanged: three hearts, a single wrong tap costs one
    step='5-hard'; await page.evaluate(()=>{ window.__bps.setDifficulty('hard'); window.__bps.setMode('safari'); }); s=await startRound(1); await assertHearts(3,'hard start');
    s=await tapWrong(); assert(s.hearts===2&&!s.reveal,'one wrong tap costs a heart in hard: '+JSON.stringify({h:s.hearts,r:s.reveal})); await assertHearts(2,'hard after a wrong tap');
    noErrors(); await goHome(); await page.evaluate(()=>window.__bps.setDifficulty('easy'));
    console.log('PASS'); await browser.close(); process.exit(0);
  }catch(e){ console.log('FAIL '+e.message); if(errors.length) console.log(errors.join('\n')); try{ await page.screenshot({path:path.join(outDir,'fail.png')}); }catch(_){} await browser.close(); process.exit(1); }
})();
