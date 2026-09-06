import {writeFile,rename} from 'node:fs/promises';
const token=process.env.NOTION_TOKEN;
if(!token)throw Error('Add NOTION_TOKEN to repository Actions secrets and grant the integration access to the score database.');
const source='743208eb-b007-47f9-b2f2-6918a68e13cd';
const text=p=>(p?.title??p?.rich_text??[]).map(x=>x.plain_text??x.text?.content??'').join('');
const num=p=>{const n=p?.number??0;if(!Number.isInteger(n)||n<0||n>999)throw Error('Scores must be whole numbers from 0 to 999.');return n;};
export function normalize(page){const p=page.properties;const id=text(p['Match ID']);if(!/^(A[1-4]-A[1-4]|B[1-4]-B[1-4]|SF1|SF2|FINAL|THIRD)$/.test(id))throw Error('Unexpected Match ID');const status=p.Status?.select?.name;if(!['Scheduled','Live','Completed'].includes(status))throw Error('Invalid match status');const winner=p.Winner?.select?.name;if(!['Not decided','Team 1','Team 2'].includes(winner))throw Error('Invalid winner');if(status==='Completed'&&winner==='Not decided')throw Error('A completed match needs a winner');return {id,status,winner,team1:text(p['Team 1']),team2:text(p['Team 2']),scores:[[num(p['S1 Team 1']),num(p['S1 Team 2'])],[num(p['S2 Team 1']),num(p['S2 Team 2'])],[num(p['TB Team 1']),num(p['TB Team 2'])]]};}
let pages=[],cursor;
do{const response=await fetch(`https://api.notion.com/v1/data_sources/${source}/query`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Notion-Version':'2025-09-03','Content-Type':'application/json'},body:JSON.stringify({page_size:100,...(cursor?{start_cursor:cursor}:{})}),signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error(`Notion query failed (${response.status}). Check integration access and token; existing scores are preserved.`);const data=await response.json();pages.push(...data.results);cursor=data.has_more?data.next_cursor:null;}while(cursor);
const matches=pages.filter(p=>!p.archived&&!p.in_trash).map(normalize).sort((a,b)=>a.id.localeCompare(b.id));
const expected=['A1-A2','A3-A4','A1-A3','A2-A4','A1-A4','A2-A3','B1-B2','B3-B4','B1-B3','B2-B4','B1-B4','B2-B3','SF1','SF2','FINAL','THIRD'];
if(matches.length!==16||new Set(matches.map(m=>m.id)).size!==16||expected.some(id=>!matches.some(m=>m.id===id)))throw Error('Expected exactly the 16 tournament Match IDs. Existing scores preserved.');
await writeFile('scores.json.tmp',JSON.stringify({schema:1,syncedAt:new Date().toISOString(),matches},null,2)+'\n');await rename('scores.json.tmp','scores.json');console.log('Exported 16 matches. Only public team names, status and scores were included.');
