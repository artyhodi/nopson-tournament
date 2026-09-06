(()=>{
const endpoint='https://raw.githubusercontent.com/artyhodi/nopson-tournament/main/scores.json';
const notice=document.createElement('p');notice.className='section-intro';notice.setAttribute('role','status');notice.textContent='Checking score sync…';document.querySelector('#results .section-heading').after(notice);
let lastGood=null;
const rounds={1:[2,3,4],2:[1,4,3],3:[4,1,2],4:[3,2,1]};
function render(data){
if(data.schema!==1||!Array.isArray(data.matches)||data.matches.length!==16)throw Error('Invalid score feed');
const byId=new Map(data.matches.map(m=>[m.id,m]));
for(const row of document.querySelectorAll('#results tbody tr')){
const slot=row.querySelector('.slot-badge').textContent.trim(),group=slot[0],n=Number(slot[1]);let won=0,lost=0,gf=0,ga=0;
const entries=rounds[n].map(opp=>{const id=group+Math.min(n,opp)+'-'+group+Math.max(n,opp),m=byId.get(id);if(!m)throw Error('Missing fixture');const side=n<opp?0:1;const scores=m.scores[0];if(m.status==='Completed'){const win=m.winner===`Team ${side+1}`;won+=Number(win);lost+=Number(!win);gf+=scores[side];ga+=scores[1-side];}return {m,side,scores};});
row.children[2].textContent=`${won} – ${lost}`;row.children[3].textContent=`${gf} – ${ga}`;
entries.forEach(({m,side,scores},i)=>{const badge=row.children[4+i].querySelector('.zero-score');badge.textContent=`${scores[side]}:${scores[1-side]}${m.status==='Live'?' · Live':''}`;badge.style.background=m.status==='Completed'?(m.winner===`Team ${side+1}`?'#d8edc8':'#f4dddd'):'#e9ece3';});
}
for(const card of document.querySelectorAll('.playoff-card')){
const title=card.querySelector('h4').firstChild.textContent.trim();const id={'Semifinal 1':'SF1','Semifinal 2':'SF2','Final':'FINAL','Third-place match':'THIRD'}[title];const m=byId.get(id);if(!m)continue;
const sides=[...card.children].filter(e=>e.tagName==='DIV');sides.forEach((e,i)=>{const score=m.scores.map((s,j)=>`${j===2?'TB ':''}${s[i]}`).join(' / ');e.textContent=`${i===0?m.team1:m.team2} — ${score}`;e.style.fontWeight=m.status==='Completed'&&m.winner===`Team ${i+1}`?'800':'500';});
card.setAttribute('aria-label',`${title}: ${m.status}`);
}
const tag=document.querySelector('#results .tag');tag.textContent=data.matches.some(m=>m.status==='Live')?'LIVE':data.matches.every(m=>m.status==='Completed')?'COMPLETED':data.matches.some(m=>m.status==='Completed')?'IN PROGRESS':'NOT STARTED';
const intro=document.querySelector('#results .section-intro:not([role])');if(intro)intro.textContent='Matches and game totals count completed group matches. Round scores show live progress. Table order follows team slots; it is not a ranking.';
const date=new Date(data.syncedAt);if(!Number.isFinite(date.getTime()))throw Error('Invalid timestamp');lastGood=date;
notice.textContent=`Last Notion sync: ${date.toLocaleString('en-GB',{timeZone:'Asia/Seoul'})} KST. Updates approximately every 5 minutes; delays are possible.${Date.now()-date>15*60*1000?' Scores may be out of date.':''}`;
}
async function refresh(){try{const response=await fetch(endpoint+'?t='+Math.floor(Date.now()/30000),{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('Unavailable');render(await response.json());}catch{notice.textContent=lastGood?'Score sync unavailable. Showing the last received scores.':'Automatic score sync is not connected yet. Displayed scores are starting values.';}}
refresh();setInterval(()=>{if(!document.hidden)refresh();},30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
})();
