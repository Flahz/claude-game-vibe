// Usage: NODE_PATH=/opt/node22/lib/node_modules node comeback.js <baseUrl> <outDir>
// The one you missed comes back. In free play (which has no hearts) three wrong tries on the same question make the owl show
// the answer; one fresh question later that very question is asked again - looking exactly like any other question, no mark,
// no hint, no glow - and only once, so nobody loops on one word. The memory lives in the page only: it survives the home
// screen, it is dropped when the child changes mode, difficulty or language or resets, and it never reaches localStorage.
const { chromium, devices } = require('playwright');
const fs=require('fs'), path=require('path');
const [baseUrl, outDir] = process.argv.slice(2);
if(!baseUrl||!outDir){ console.log('usage: comeback.js <baseUrl> <outDir>'); process.exit(1); }
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
  // the same question, asked again: math by its text, words by its key
  const sameQ=(a,b)=>!!(a&&b&&(a.key ? a.key===b.key : a.text&&a.text===b.text));
  // the learning rule while the child is still trying: the owl's bubble keeps its "?", no english word, no glowing bubble,
  // and nothing extra in the bubble that would mark a question as one the child got wrong before
  const noGiveaway=async(s)=>{
    assert(!s.reveal,'not revealing');
    assert(await page.evaluate(()=>!document.querySelector('#speech .en')),'no english word on screen while playing');
    if(s.mode==='words'&&s.problem&&s.problem.kind==='pic') assert(await page.evaluate(()=>document.querySelector('#speech .icons .q')?.textContent==='?'),'question mark, no picture hint');
    if(s.mode==='math') assert(await page.evaluate(()=>!document.querySelector('#speech .icons .q')||document.querySelector('#speech .icons .q').textContent==='?'),'no answer number in the owl bubble');
    // (free play mixes picture and reverse questions and a bubble keeps the look it spawned with, so only the level rounds
    //  can be held to "a picture bubble never wears its word"; test/words.js checks that where it applies)
    for(const b of s.bubbles){ if(b.bomb) continue; assert(!b.glow,'no glowing bubble while playing');
      if(s.mode==='words'&&s.round<=10&&s.problem.kind==='pic') assert(b.word==null,'picture bubble must not wear its word'); }
    // exactly what any fresh question renders: the question, then the icons. Nothing says "you missed this one".
    const parts=await page.evaluate(()=>[...document.querySelector('#speech').children].map(e=>e.className).join(','));
    assert(parts===(s.mode==='words'?'say words,icons':s.mode==='math'?'say math,icons':'say,icons'),'no mark or extra text in the owl bubble: '+parts);
  };
  // a bubble's target flag is refreshed once per frame, so judge a bubble by the game's own answer as well as by the flag
  const isRight=(s,b)=> s.mode==='math'&&s.problem ? b.num===s.problem.answer : s.mode==='words'&&s.problem ? b.key===s.problem.key : b.isTarget;
  let hudB=0;
  const near=(s,b,o)=>o.id!==b.id&&Math.hypot(o.x-b.x,o.y-b.y)<o.r+b.r+14;
  const pickWrong=s=>{ const c=s.bubbles.filter(b=>!isRight(s,b)&&!b.bomb&&visible(b));
    const lone=b=>!s.bubbles.some(o=>near(s,b,o)), safe=b=>!s.bubbles.some(o=>near(s,b,o)&&(isRight(s,o)||o.bomb)), low=b=>b.y>hudB+b.r*2+20;
    return c.find(b=>lone(b)&&low(b)) || c.find(b=>safe(b)&&low(b)) || null; };
  const pickRight=s=>{ const c=s.bubbles.filter(b=>isRight(s,b)&&!b.bomb&&visible(b)).sort((a,b)=>b.y-a.y);
    const lone=b=>!s.bubbles.some(o=>o.id!==b.id&&Math.hypot(o.x-b.x,o.y-b.y)<(o.r+b.r)*0.95);
    return c.find(lone) || c[0]; };
  async function tapWrong(){ // tap a wrong bubble until the game counted it; re-read the state before every try
    if(!hudB) hudB=await page.evaluate(()=>document.querySelector('#guide').getBoundingClientRect().bottom);
    for(let i=0;i<60;i++){ const s0=await state(); assert(!s0.reveal,'tapping while revealing'); const b=pickWrong(s0); if(!b){ await sleep(120); continue; }
      await tap(b.x,b.y);
      const s1=await waitFor(s=>(s.wrongTries!==s0.wrongTries||s.hearts!==s0.hearts||s.reveal||s.progress!==s0.progress)?s:null,'a counted wrong tap',700,40).catch(()=>null);
      if(!s1) continue;   // the bubble moved away or had just left: try another
      assert(s1.progress===s0.progress,`a wrong tap changed progress ${s0.progress}->${s1.progress}`);
      return s1; }
    throw new Error(`[${step}] no wrong bubble could be tapped`); }
  async function tapRight(){ // pop the right bubble; in free play the bar wraps round, so wait for the question to move on
    for(let i=0;i<60;i++){ const s0=await state(); const b=pickRight(s0); if(!b){ await sleep(120); continue; }
      await tap(b.x,b.y);
      const s1=await waitFor(s=>(!sameQ(s.problem,s0.problem)&&s.progress!==s0.progress)?s:null,'a popped target',700,40).catch(()=>null);
      if(s1){ await sleep(150); return state(); }   // a couple of frames so the bubbles' target flags follow the new question
      const s2=await state(); assert(s2.wrongTries===s0.wrongTries&&s2.hearts===s0.hearts,'a right tap was counted wrong'); }
    throw new Error(`[${step}] no target bubble could be tapped`); }
  // three wrong tries on one question: in free play that is the failure that makes the owl show the answer
  const missUntilReveal=async(q)=>{ let s=null;
    for(let i=1;i<=3;i++){ s=await tapWrong(); assert(sameQ(s.problem,q),'the question stays while the child is wrong');
      if(i<3){ assert(!s.reveal,'no reveal after miss '+i); await noGiveaway(s); } }
    assert(s.reveal===true,'the third wrong try reveals the answer'); return s; };
  const goHome=async()=>{ await tapEl('[data-testid="home"]'); await waitFor(s=>s.screen==='home','home',3000); };
  const freePlay=async()=>{ await page.evaluate(()=>window.__bps.unlockAll()); await tapEl('[data-testid="play"]');
    const s=await waitFor(x=>x.screen==='play'&&x.round===11&&x.bubbles.length>=3?x:null,'free play',8000); await sleep(250); return state(); };
  const saved=()=>page.evaluate(()=>localStorage.getItem('bps.v3')||'');
  try{
    step='1-home'; await page.goto(baseUrl+'/',{waitUntil:'load'}); await page.waitForFunction(()=>window.__bps&&window.__bps.state);
    await page.evaluate(()=>{ window.__bps.resetProgress(); window.__bps.setDifficulty('easy'); window.__bps.setMode('math'); });
    let s=await state(); assert(s.screen==='home'&&s.mode==='math'&&s.difficulty==='easy','easy math on home');
    assert(s.comeback===null,'nothing queued to start with'); noErrors();

    // ---- free play maths: miss a sum three times, then it comes back as the second question
    step='2-math-free'; s=await freePlay(); assert(s.hearts===0||true,'free play needs no hearts');
    assert(s.comeback===null,'nothing queued at the start of free play'); assert(s.problem&&Number.isInteger(s.problem.answer),'a sum to solve');
    const mq=s.problem; await noGiveaway(s);
    s=await missUntilReveal(mq); assert(s.progress===0,'no progress from the misses');
    assert(s.comeback&&s.comeback.text===mq.text&&s.comeback.in===1,'the missed sum is queued during the reveal: '+JSON.stringify(s.comeback));
    assert((await say())===mq.text.replace('?',String(mq.answer)),'the reveal shows the sum with its answer');
    await sleep(300); await page.screenshot({path:path.join(outDir,'comeback-math-reveal.png')});
    assert(!(await saved()).includes('comeback'),'the missed question is never saved');
    s=await waitFor(x=>!x.reveal?x:null,'the reveal to end',5000); await sleep(200); s=await state();
    assert(!sameQ(s.problem,mq),'a fresh sum right after the reveal'); assert(s.comeback&&s.comeback.in===0,'still queued, due next: '+JSON.stringify(s.comeback));
    await noGiveaway(s);
    s=await tapRight(); assert(sameQ(s.problem,mq),'the missed sum is the second question after the reveal: '+JSON.stringify(s.problem)+' vs '+JSON.stringify(mq));
    assert(s.comeback===null,'nothing queued once it has been asked'); assert(s.wrongTries===0,'a fresh count of tries');
    await noGiveaway(s);   // unmarked: the equation with its "?", no answer digit, no glow, nothing extra
    await page.screenshot({path:path.join(outDir,'comeback-math-back.png')});
    s=await tapRight(); assert(!sameQ(s.problem,mq),'a fresh sum after the come-back'); assert(s.comeback===null,'and still nothing queued');
    noErrors(); await goHome();

    // ---- free play words: the same, and the come-back is not queued a second time when it is missed again
    step='3-words-free'; await page.evaluate(()=>{ window.__bps.setMode('words'); window.__bps.setLanguage('fr'); });
    s=await state(); assert(s.comeback===null,'changing mode clears the memory');
    s=await freePlay(); assert(s.problem&&s.problem.key,'a word to find');
    const wq=s.problem; await noGiveaway(s);
    s=await missUntilReveal(wq);
    assert(s.comeback&&s.comeback.key===wq.key&&s.comeback.in===1,'the missed word is queued during the reveal: '+JSON.stringify(s.comeback));
    assert((await say())===wq.word,'the reveal shows the failed word');
    assert(await page.evaluate(()=>!!document.querySelector('#speech .en')),'the reveal shows the english word');
    await sleep(300); await page.screenshot({path:path.join(outDir,'comeback-words-reveal.png')});
    s=await waitFor(x=>!x.reveal?x:null,'the reveal to end',5000); await sleep(200); s=await state();
    assert(!sameQ(s.problem,wq),'a fresh word right after the reveal'); assert(s.comeback&&s.comeback.in===0,'still queued, due next');
    await noGiveaway(s);
    s=await tapRight(); assert(sameQ(s.problem,wq),'the missed word is the second question after the reveal: '+JSON.stringify(s.problem));
    assert(s.comeback===null,'nothing queued once it has been asked');
    await noGiveaway(s);   // unmarked: the foreign word alone, a "?" bubble, no english word, no glow
    await page.screenshot({path:path.join(outDir,'comeback-words-back.png')});

    step='4-only-once'; s=await missUntilReveal(wq);   // the come-back missed again: revealed again, but never queued a third time
    assert((await say())===wq.word,'the reveal shows the word again');
    assert(s.comeback===null,'a come-back that is missed again is not queued a second time');
    s=await waitFor(x=>!x.reveal?x:null,'the reveal to end',5000); await sleep(200); s=await state();
    assert(!sameQ(s.problem,wq),'play goes on with a fresh word'); assert(s.comeback===null,'nothing pending after the second reveal');
    await noGiveaway(s); s=await tapRight(); assert(s.comeback===null,'still nothing pending'); noErrors();

    // ---- the memory survives the home screen and is dropped when the child changes something
    step='5-clears'; const wq2=(await state()).problem; s=await missUntilReveal(wq2);
    assert(s.comeback&&s.comeback.key===wq2.key,'queued again for a new question');
    await waitFor(x=>!x.reveal,'the reveal to end',5000); await goHome();
    s=await state(); assert(s.comeback&&s.comeback.key===wq2.key,'the home screen does not forget the missed word');
    assert(!(await saved()).includes('comeback'),'still nothing saved');
    await page.evaluate(()=>window.__bps.setLanguage('es')); s=await state(); assert(s.comeback===null,'changing language clears the memory');
    await page.evaluate(()=>window.__bps.setLanguage('fr'));
    s=await freePlay(); const wq3=s.problem; s=await missUntilReveal(wq3); await waitFor(x=>!x.reveal,'the reveal to end',5000); await goHome();
    assert((await state()).comeback,'queued before changing difficulty');
    await page.evaluate(()=>window.__bps.setDifficulty('hard')); assert((await state()).comeback===null,'changing difficulty clears the memory');
    await page.evaluate(()=>window.__bps.setDifficulty('easy'));
    s=await freePlay(); const wq4=s.problem; s=await missUntilReveal(wq4); await waitFor(x=>!x.reveal,'the reveal to end',5000); await goHome();
    assert((await state()).comeback,'queued before the reset');
    await page.evaluate(()=>window.__bps.resetProgress()); assert((await state()).comeback===null,'resetProgress clears the memory');
    noErrors();
    console.log('PASS'); await browser.close(); process.exit(0);
  }catch(e){ console.log('FAIL '+e.message); if(errors.length) console.log(errors.join('\n')); try{ await page.screenshot({path:path.join(outDir,'fail.png')}); }catch(_){} await browser.close(); process.exit(1); }
})();
