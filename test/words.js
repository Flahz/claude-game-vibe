// Usage: NODE_PATH=/opt/node22/lib/node_modules node words.js <baseUrl> <outDir>
// Plays words mode: picking a language, picture rounds (foreign word -> pop the thing), colour rounds, reverse rounds
// (picture + English -> pop the foreign word), no answer on screen while playing, the answer revealed only after a failure, separate progress.
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
  const say=()=>page.evaluate(()=>document.querySelector('#speech .say').textContent);
  const check=(s, kind)=>{ // target flags agree with the question, and nothing on a bubble gives the answer away
    const p=s.problem; assert(p && p.word && p.key && p.kind===kind, 'bad problem '+JSON.stringify(p));
    for(const b of s.bubbles){ if(b.bomb) continue; assert(b.isTarget===(b.key===p.key), `target flag wrong for ${b.key} vs ${p.key}`);
      if(kind==='pic'){ assert(b.word==null,'picture bubble must not wear its word'); if(b.key.startsWith('animal:')) assert(b.animal===b.key.slice(7),'picture bubble shows its animal'); else assert(b.color===b.key.slice(6),'picture bubble shows its colour'); }
      else { assert(typeof b.word==='string' && b.word.length>1,'reverse bubble without word'); assert(!b.animal,'reverse bubble hides the animal'); if(b.key.startsWith('color:')) assert(b.color==='cloud','reverse colour bubble is neutral'); } }
  };
  async function playRound(expected, kind, shot){
    let guard=0, changes=0;
    while(true){ const s=await state(); assert(s.round===expected,'round drifted '+s.round); if(s.screen!=='play'||s.progress>=s.goal) break; assert(++guard<200,'too many attempts');
      check(s, kind); if(shot && guard===3){ await page.screenshot({path:path.join(outDir,shot)}); }
      const tg=s.bubbles.filter(b=>b.isTarget&&!b.bomb&&visible(b)).sort((a,b)=>b.y-a.y); if(!tg.length){ await sleep(100); continue; }
      const p0=s.progress, k0=s.problem.key; await tap(tg[0].x,tg[0].y); await sleep(120); const s2=await state();
      if(s2.progress===p0+1){ if(s2.problem && s2.problem.key!==k0) changes++; } else assert(s2.progress===p0||s2.progress===0, `weird progress ${p0}->${s2.progress}`); }
    await waitFor(s=>s.screen==='celebrate','celebrate'); noErrors(); return changes;
  }
  try{
    step='1-mode'; await page.goto(baseUrl+'/',{waitUntil:'load'}); await page.waitForFunction(()=>window.__bps&&window.__bps.state);
    await page.evaluate(()=>window.__bps.resetProgress()); await page.reload({waitUntil:'load'}); await page.waitForFunction(()=>window.__bps&&window.__bps.state);
    let s=await state(); assert(s.mode==='safari','default mode safari, got '+s.mode);
    assert(!(await page.locator('#langs').isVisible()),'language row hidden outside words mode');
    await tapEl('[data-testid="mode-words"]'); await sleep(300); s=await state(); assert(s.mode==='words','mode words'); assert(s.language==='fr','default language french, got '+s.language);
    assert(await page.locator('#langs').isVisible(),'language row shown in words mode');
    await tapEl('[data-testid="lang-es"]'); await sleep(300); s=await state(); assert(s.language==='es','language spanish');
    assert(await page.evaluate(()=>document.querySelector('[data-testid="lang-es"]').classList.contains('on')),'es btn on');
    await page.reload({waitUntil:'load'}); await page.waitForFunction(()=>window.__bps&&window.__bps.state); s=await state(); assert(s.mode==='words'&&s.language==='es','mode and language persisted');
    await sleep(500); await page.screenshot({path:path.join(outDir,'words-home.png')}); noErrors();

    step='2-pic'; await tapEl('[data-testid="play"]'); await sleep(300); s=await state(); assert(s.screen==='play'&&s.round===1,'play r1'); assert(s.problem&&s.problem.kind==='pic','pic kind '+JSON.stringify(s.problem));
    assert(s.goal===5,'goal 5');
    let txt=await say(); assert(txt===s.problem.word,'owl shows the foreign word: '+txt+' vs '+s.problem.word);
    assert(await page.evaluate(()=>!document.querySelector('#speech .en')),'no english word while playing');
    assert(await page.evaluate(()=>document.querySelector('#speech .icons .q')?.textContent==='?'),'question mark, no picture hint');
    assert(['LEÓN','MONO','RANA','ELEFANTE'].includes(s.problem.word),'spanish animal word '+s.problem.word);
    // every wrong tap costs a heart; the third loses the round: the answer is revealed (a learning moment), then the round restarts with a new word
    assert(s.hearts===3,'easy starts with 3 hearts, got '+s.hearts);
    const k0=s.problem.key;
    for(let i=0;i<2;i++){ const w=await waitFor(x=>x.bubbles.find(b=>!b.isTarget&&!b.bomb&&visible(b)),'wrong bubble'); await tap(w.x,w.y); await sleep(150); s=await state(); assert(s.progress===0&&!s.reveal&&s.hearts===2-i,'wrong tap '+(i+1)+': no progress, no reveal, one heart down'); }
    await page.screenshot({path:path.join(outDir,'words-pic.png')});
    const w3=await waitFor(x=>x.bubbles.find(b=>!b.isTarget&&!b.bomb&&visible(b)),'wrong bubble'); await tap(w3.x,w3.y); await sleep(150); s=await state();
    assert(s.reveal===true,'third wrong tap reveals'); assert(s.hearts===0,'the third miss empties the hearts, hearts='+s.hearts); txt=await say(); assert(txt===s.problem.word,'reveal shows the word');
    const en=await page.evaluate(()=>document.querySelector('#speech .en').textContent); assert(en===s.problem.en.toUpperCase(),'reveal shows the english word: '+en);
    assert(await page.evaluate(()=>!!document.querySelector('#speech .icons .gb img')),'reveal shows the picture');
    assert(s.bubbles.some(b=>b.isTarget&&b.glow),'right bubbles glow during the reveal');
    await page.screenshot({path:path.join(outDir,'words-reveal.png')});
    await waitFor(x=>!x.reveal,'reveal over',5000); s=await state(); assert(s.problem.key!==k0,'new word after the reveal'); assert(s.progress===0,'no progress from the reveal'); assert(s.hearts===3,'round restarted with three hearts');
    let ch=await playRound(1,'pic'); assert(ch>=2,'word changes after correct pops: '+ch); s=await state(); assert(s.best.easy[1]===3,'r1 done');
    await sleep(900); await page.screenshot({path:path.join(outDir,'words-celebrate.png')}); await tapEl('[data-testid="home"]'); await sleep(200);

    step='3-colors'; await page.evaluate(()=>window.__bps.setLanguage('fr')); await page.evaluate(()=>window.__bps.startRound(3)); await sleep(300); s=await state();
    assert(s.problem.kind==='pic' && s.problem.key.startsWith('color:'),'colour round '+JSON.stringify(s.problem)); assert(['ROUGE','BLEU','VERT','JAUNE'].includes(s.problem.word),'french colour '+s.problem.word);
    ch=await playRound(3,'pic','words-colors.png'); assert(ch>=2,'colour changes '+ch); await tapEl('[data-testid="home"]'); await sleep(200);
    step='4-long'; await page.evaluate(()=>window.__bps.startRound(4)); await sleep(300); s=await state(); await playRound(4,'pic','words-long.png'); await tapEl('[data-testid="home"]'); await sleep(200);

    step='5-rev'; await page.evaluate(()=>window.__bps.startRound(8)); await sleep(300); s=await state(); assert(s.problem.kind==='rev','rev kind');
    txt=await say(); assert(txt===s.problem.en.toUpperCase(),'owl shows the english word: '+txt);
    assert(await page.evaluate(()=>!!document.querySelector('#speech .icons .gb img')),'picture shown in the reverse round');
    // a wrong tap does not reveal anything
    const wb=await waitFor(x=>x.bubbles.find(b=>!b.isTarget&&!b.bomb&&visible(b)),'wrong bubble'); assert(!wb.animal,'hidden before the tap');
    await tap(wb.x,wb.y); await sleep(150); s=await state(); const rb=s.bubbles.find(b=>b.id===wb.id); assert(!rb || !rb.animal,'wrong bubble stays hidden: '+JSON.stringify(rb));
    assert(s.progress===0,'no progress on a wrong tap');
    await page.screenshot({path:path.join(outDir,'words-reverse.png')});
    await playRound(8,'rev'); await tapEl('[data-testid="home"]'); await sleep(200);
    step='6-revcolors'; await page.evaluate(()=>window.__bps.startRound(9)); await sleep(300); s=await state(); assert(s.problem.kind==='rev' && s.problem.key.startsWith('color:'),'reverse colours');
    const cb=await waitFor(x=>x.bubbles.find(b=>!b.isTarget&&!b.bomb&&visible(b)),'wrong colour bubble'); assert(cb.color==='cloud','neutral before the tap');
    await tap(cb.x,cb.y); await sleep(150); s=await state(); const rc=s.bubbles.find(b=>b.id===cb.id); assert(!rc || rc.color==='cloud','wrong bubble stays neutral: '+JSON.stringify(rc));
    await playRound(9,'rev','words-reverse-colors.png'); await tapEl('[data-testid="home"]'); await sleep(200);
    s=await state(); assert([1,3,4,8,9].every(n=>s.unlocked.includes(n)),'unlocked '+s.unlocked);
    // other modes untouched
    await page.evaluate(()=>window.__bps.setMode('safari')); s=await state(); assert(s.unlocked.length===0,'safari progress separate, got '+s.unlocked);
    await page.evaluate(()=>window.__bps.setMode('math')); s=await state(); assert(s.unlocked.length===0,'math progress separate, got '+s.unlocked);
    await page.evaluate(()=>window.__bps.setMode('words'));

    step='7-hard'; await page.evaluate(()=>window.__bps.setDifficulty('hard')); await page.evaluate(()=>window.__bps.setLanguage('de')); await page.evaluate(()=>window.__bps.startRound(2)); await sleep(400); s=await state();
    assert(s.hearts===3,'hearts in hard words'); assert(await page.evaluate(()=>document.querySelector('#speech .icons .q')?.textContent==='?'),'question mark, never a picture hint');
    assert(['PANDA','TIGER','KOALA','ZEBRA'].includes(s.problem.word),'german word '+s.problem.word);
    await page.screenshot({path:path.join(outDir,'words-hard.png')});
    const hb=await waitFor(x=>x.bubbles.find(b=>!b.isTarget&&!b.bomb&&visible(b)),'wrong bubble'); await tap(hb.x,hb.y); await sleep(150); s=await state(); assert(s.hearts===2,'heart lost on wrong word');
    assert(await page.evaluate(()=>document.querySelector('#speech .icons .q')?.textContent==='?'),'still no hint after a mistake');
    // losing the round reveals the answer, then the round restarts with full hearts
    const wordBefore=s.problem.word;
    for(let i=0;i<2;i++){ const wb2=await waitFor(x=>x.bubbles.find(b=>!b.isTarget&&!b.bomb&&visible(b)),'wrong bubble'); await tap(wb2.x,wb2.y); await sleep(150); }
    s=await state(); assert(s.hearts===0&&s.reveal===true,'hearts gone -> reveal, got '+JSON.stringify({h:s.hearts,r:s.reveal}));
    txt=await say(); assert(txt===wordBefore,'reveal shows the failed word'); await page.screenshot({path:path.join(outDir,'words-lost.png')});
    await waitFor(x=>x.hearts===3&&!x.reveal,'round restarted',6000); s=await state(); assert(s.progress===0,'restart from zero');
    await playRound(2,'pic'); s=await state(); assert(s.best.hard[2]>=1,'hard r2 stars'); await tapEl('[data-testid="home"]'); await sleep(200);

    step='8-expert'; await page.evaluate(()=>window.__bps.setDifficulty('expert')); await page.evaluate(()=>window.__bps.startRound(10)); await sleep(400); s=await state();
    assert(s.problem.kind==='rev','expert r10 reverse mix'); await playRound(10,'rev','words-expert.png'); s=await state(); assert(s.best.expert[10]>=1,'expert r10 stars'); noErrors();
    console.log('PASS'); await browser.close(); process.exit(0);
  }catch(e){ console.log('FAIL '+e.message); if(errors.length) console.log(errors.join('\n')); try{ await page.screenshot({path:path.join(outDir,'fail.png')}); }catch(_){} await browser.close(); process.exit(1); }
})();
