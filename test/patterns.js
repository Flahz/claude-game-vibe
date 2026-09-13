// Usage: NODE_PATH=/opt/node22/lib/node_modules node patterns.js <baseUrl> <outDir>
// Plays the Patterns mode: repeating rows of colours (ab) and animals (ab), three-part rows (abc), the uneven aab, counting
// up (count) and counting down (back), then a mixed round. Checks that the owl shows the row and a bare "?" and never the
// answer, that the answer is revealed only after a failure (three misses in easy, a lost round in hard), that patterns
// progress is kept apart from the other three modes, and one expert round.
const { chromium, devices } = require('playwright');
const fs=require('fs'), path=require('path');
const [baseUrl, outDir] = process.argv.slice(2);
if(!baseUrl||!outDir){ console.log('usage: patterns.js <baseUrl> <outDir>'); process.exit(1); }
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
  const wrongBubble=()=>waitFor(x=>x.bubbles.find(b=>!b.isTarget&&!b.bomb&&visible(b)),'wrong bubble');
  // the owl's row, as the DOM has it: one slot per item plus the last one, which is the "?" until the reveal fills it
  const row=()=>page.evaluate(()=>{
    const r=document.querySelector('#speech .seq.pat'); if(!r) return null;
    const gb=[...r.querySelectorAll('.gb')];
    return { slots:gb.length, height:Math.round(r.getBoundingClientRect().height), width:Math.round(r.getBoundingClientRect().width),
      last:{ q:gb[gb.length-1].querySelector('.q')?.textContent ?? null, n:gb[gb.length-1].querySelector('.n')?.textContent ?? null,
             ans:gb[gb.length-1].classList.contains('ans'), bg:gb[gb.length-1].getAttribute('style')||'', art:!!gb[gb.length-1].querySelector('img') },
      nums:gb.map(e=>e.querySelector('.n')?.textContent ?? null) };
  });

  // every bubble's target flag agrees with the question, and the row itself really does follow the rule it claims
  const check=(s, kind)=>{
    const p=s.problem; assert(p && p.text==='What comes next?', 'bad problem '+JSON.stringify(p));
    if(kind!=='mix') assert(p.kind===kind, 'kind '+p.kind+' expected '+kind);
    assert(Array.isArray(p.seq)&&p.seq.length>=3,'a row to continue: '+JSON.stringify(p.seq));
    for(const b of s.bubbles){ if(b.bomb) continue;
      assert(b.isTarget===(String(b.pkey)===p.key), `target flag wrong for ${JSON.stringify(b)} vs key ${p.key}`); }
    const k=p.kind, seq=p.seq;
    if(k==='count'||k==='back'){
      const st=seq[1]-seq[0]; assert(st!==0 && (k==='count'?st>0:st<0),'step goes the right way: '+JSON.stringify(seq));
      for(let i=2;i<seq.length;i++) assert(seq[i]-seq[i-1]===st,'even steps: '+JSON.stringify(seq));
      assert(Number(p.key)===seq[seq.length-1]+st,'the answer continues the count: '+JSON.stringify(seq)+' -> '+p.key);
      assert(Number(p.key)>=0,'no negative answer: '+p.key);
      assert(!seq.includes(Number(p.key)),'a counting row never already contains its answer: '+JSON.stringify(seq)+' -> '+p.key);
    } else {
      const per = k==='ab' ? 2 : 3;                       // ab repeats every two, abc and aab every three
      const full = seq.concat([p.key]);
      for(let i=per;i<full.length;i++) assert(String(full[i])===String(full[i-per]),`${k} repeats every ${per}: ${JSON.stringify(full)}`);
      if(k==='aab') assert(String(seq[0])===String(seq[1]) && String(seq[1])!==String(seq[2]),'aab is two the same then one different: '+JSON.stringify(seq));
      if(k==='ab') assert(String(seq[0])!==String(seq[1]),'ab alternates: '+JSON.stringify(seq));
      assert(p.type==='color'||p.type==='animal','a colour or animal row, got '+p.type);
    }
  };
  // the learning rule while the child is still trying: the row is the question, the last slot is a bare "?" and nothing
  // anywhere names the answer or points at a bubble
  const noGiveaway=async(s)=>{
    assert(!s.reveal,'not revealing');
    const p=s.problem, r=await row();
    assert((await say())==='What comes next?','the owl asks the question and nothing else: '+(await say()));
    assert(r,'the owl shows the row');
    assert(r.slots===p.seq.length+1,'one slot per item plus the gap: '+r.slots+' for '+JSON.stringify(p.seq));
    assert(r.last.q==='?' && !r.last.ans,'the last slot is a bare "?": '+JSON.stringify(r.last));
    assert(!r.last.art && !r.last.n && !/background/.test(r.last.bg),'the gap shows no colour, animal or number: '+JSON.stringify(r.last));
    assert(r.slots<=6,'at most six slots so the row fits a small phone: '+r.slots);
    assert(r.height<=44,'the row stays on one line so the play area does not move: '+r.height+'px');
    if(p.type==='num') assert(!r.nums.includes(p.key),'the answer number is not in the row: '+JSON.stringify(r.nums)+' key '+p.key);
    assert(await page.evaluate(()=>!document.querySelector('#speech .en')),'no explanation while playing');
    for(const b of s.bubbles){ if(b.bomb) continue; assert(!b.glow,'no glowing bubble while playing'); }
  };
  // after a failure the same row comes back with the gap filled in and ringed, which is the only time the answer is on screen
  const revealShowsAnswer=async(key,type)=>{
    const r=await row(); assert(r,'the reveal shows the row');
    assert(r.last.ans,'the last slot is marked as the answer: '+JSON.stringify(r.last));
    assert(r.last.q===null,'the "?" is gone: '+JSON.stringify(r.last));
    if(type==='num') assert(r.last.n===key,'the answer number is filled in: '+JSON.stringify(r.last)+' key '+key);
    else if(type==='animal') assert(r.last.art,'the answer animal is filled in: '+JSON.stringify(r.last));
    else assert(/background/.test(r.last.bg),'the answer colour is filled in: '+JSON.stringify(r.last));
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
    await tapEl('[data-testid="mode-patterns"]'); await sleep(300); s=await state(); assert(s.mode==='patterns','mode patterns');
    assert(await page.evaluate(()=>document.querySelector('[data-testid="mode-patterns"]').classList.contains('on')),'patterns btn on');
    await page.reload({waitUntil:'load'}); await page.waitForFunction(()=>window.__bps&&window.__bps.state); s=await state(); assert(s.mode==='patterns','mode persisted');
    assert(await page.evaluate(()=>{ const h=document.querySelector('#home'); return h.scrollHeight<=h.clientHeight+1; }),'home screen does not scroll with four game buttons');
    await sleep(500); await page.screenshot({path:path.join(outDir,'patterns-home.png')}); noErrors();

    // ---- round 1 in easy: a repeating colour row, a wrong tap costs a heart and no progress, then the whole round
    step='2-round1-ab'; await tapEl('[data-testid="play"]'); await sleep(300); s=await state(); assert(s.screen==='play'&&s.round===1,'play r1');
    assert(s.problem&&s.problem.kind==='ab'&&s.problem.type==='color','colour ab round: '+JSON.stringify(s.problem));
    assert(s.goal===5,'goal 5 (a question mode never gets an ordered goal)'); assert(s.hearts===3,'three hearts');
    await noGiveaway(s); check(s,'ab');
    { const w=await wrongBubble(); await tap(w.x,w.y); await sleep(150); s=await state(); assert(s.progress===0&&s.hearts===2&&!s.reveal,'wrong tap: no progress, one heart, no reveal'); }
    await page.screenshot({path:path.join(outDir,'patterns-round1.png')});
    let ch=await playRound(1,'ab'); assert(ch>=2,'the row changes after right pops: '+ch); s=await state(); assert(s.best.easy[1]===3,'r1 done');
    await sleep(900); await page.screenshot({path:path.join(outDir,'patterns-celebrate.png')}); await home();

    // ---- round 2: the same rule with animals, so the bubbles carry a sprite instead of a colour
    step='3-round2-animals'; s=await startRound(2); assert(s.problem.kind==='ab'&&s.problem.type==='animal','animal ab round: '+JSON.stringify(s.problem));
    await noGiveaway(s);
    { const t=await waitFor(x=>x.bubbles.find(b=>b.isTarget&&!b.bomb),'a target'); assert(t.animal===s.problem.key,'an animal bubble carries the animal: '+JSON.stringify(t)); }
    await playRound(2,'ab','patterns-animals.png'); await home();

    // ---- the third miss in easy, on a counting row: the owl fills the gap in, once, then the level is over with nothing recorded
    step='4-reveal'; s=await startRound(5); assert(s.problem.kind==='count','counting round: '+JSON.stringify(s.problem));
    const key0=s.problem.key; await noGiveaway(s); check(s,'count');
    for(let i=0;i<3;i++){ const w=await wrongBubble(); await tap(w.x,w.y); await sleep(150); if(i<2){ s=await state(); assert(s.hearts===2-i&&!s.reveal,'miss '+(i+1)+' costs a heart'); } }
    s=await state(); assert(s.reveal===true&&s.hearts===0,'the third miss reveals');
    await revealShowsAnswer(key0,'num');
    assert((await say())==='What comes next?','the reveal keeps the question above the filled row');
    await page.screenshot({path:path.join(outDir,'patterns-reveal.png')});
    s=await waitFor(x=>!x.reveal&&x.screen==='home'?x:null,'home after the failed level',6000); assert(!s.best.easy[5],'nothing recorded for the failed level');
    s=await startRound(5); assert(s.hearts===3&&s.progress===0,'the level starts again from zero');
    assert(s.problem.key===key0,'the row it just showed the answer to comes back first');   // the come-back rule, now that patterns is a question mode
    await playRound(5,'count','patterns-count.png'); await home();

    // ---- the remaining kinds in easy
    step='5-abc'; s=await startRound(3); assert(s.problem.kind==='abc','abc round'); await noGiveaway(s); await playRound(3,'abc','patterns-abc.png'); await home();
    step='6-aab'; s=await startRound(7); assert(s.problem.kind==='aab','aab round'); await noGiveaway(s); await playRound(7,'aab','patterns-aab.png'); await home();
    step='7-back'; s=await startRound(9); assert(s.problem.kind==='back','counting-down round'); await noGiveaway(s); await playRound(9,'back','patterns-back.png'); await home();
    step='8-mix'; s=await startRound(10); assert(['ab','abc','aab','count','back'].includes(s.problem.kind),'mix deals a real kind: '+s.problem.kind);
    await noGiveaway(s); await playRound(10,'mix'); await home();

    // ---- progress is the mode's own
    step='9-separate'; s=await state(); assert([1,2,3,5,7,9,10].every(n=>s.unlocked.includes(n)),'unlocked '+s.unlocked);
    for(const m of ['safari','math','words']){ await page.evaluate(m=>window.__bps.setMode(m),m); s=await state(); assert(s.unlocked.length===0,m+' progress separate, got '+s.unlocked); }
    await page.evaluate(()=>window.__bps.setMode('patterns'));

    // ---- hard: hearts, a lost round reveals, bombs appear, stars are recorded
    step='10-hard'; await page.evaluate(()=>window.__bps.setDifficulty('hard')); s=await startRound(3); assert(s.hearts===3,'hearts in hard'); assert(s.goal===5,'no ordered goal in hard');
    await noGiveaway(s); const hkey=s.problem.key, htype=s.problem.type;
    for(let i=0;i<3;i++){ const w=await wrongBubble(); await tap(w.x,w.y); await sleep(150); }
    s=await state(); assert(s.hearts===0&&s.reveal===true,'hearts gone -> reveal'); await revealShowsAnswer(hkey,htype);
    s=await waitFor(x=>!x.reveal&&x.screen==='home'?x:null,'home after the failed level',6000); assert(!s.best.hard[3],'nothing recorded');
    s=await startRound(3); assert(s.hearts===3&&s.progress===0,'starts again from zero');
    await waitFor(x=>x.bubbles.some(b=>b.bomb),'a bomb',30000); await page.screenshot({path:path.join(outDir,'patterns-hard.png')});
    await playRound(3,'abc'); s=await state(); assert(s.best.hard[3]>=1,'hard stars'); await home();

    // ---- expert: the hardest content of the ladder
    step='11-expert'; await page.evaluate(()=>window.__bps.setDifficulty('expert')); s=await startRound(10);
    await noGiveaway(s); await playRound(10, 'mix', 'patterns-expert.png'); s=await state(); assert(s.best.expert[10]>=1,'expert r10 stars'); noErrors();
    console.log('PASS'); await browser.close(); process.exit(0);
  }catch(e){ console.log('FAIL '+e.message); if(errors.length) console.log(errors.join('\n')); try{ await page.screenshot({path:path.join(outDir,'fail.png')}); }catch(_){} await browser.close(); process.exit(1); }
})();
