const flagData = {
  ID: ['🇮🇩', 'Indonesia', '1f1ee-1f1e9'],
  KR: ['🇰🇷', 'South Korea', '1f1f0-1f1f7'],
  MX: ['🇲🇽', 'Mexico', '1f1f2-1f1fd'],
  AE: ['🇦🇪', 'United Arab Emirates', '1f1e6-1f1ea'],
  FR: ['🇫🇷', 'France', '1f1eb-1f1f7'],
  US: ['🇺🇸', 'United States', '1f1fa-1f1f8'],
  UA: ['🇺🇦', 'Ukraine', '1f1fa-1f1e6'],
  PA: ['🇵🇦', 'Panama', '1f1f5-1f1e6'],
  TH: ['🇹🇭', 'Thailand', '1f1f9-1f1ed'],
};

export const teams = [
  { slot: 'A1', name: 'NOPSON TEAM', members: [{ name: 'Lia', country: 'ID' }, { name: 'Sony', country: 'ID' }] },
  { slot: 'A2', name: 'SO LUCKY JO TEAM', members: [{ name: 'Sowoon', country: 'KR' }, { name: 'Jaehwan', country: 'KR' }] },
  { slot: 'A3', name: 'EUNA JAESUN TEAM', members: [{ name: 'Euna Ryu', country: 'KR' }, { name: 'Jaesun Lee', country: 'KR' }] },
  { slot: 'A4', name: 'LOOFAH 🧽', members: [{ name: 'Lucas', country: 'FR' }, { name: 'Fati', country: 'KR' }] },
  { slot: 'A5', name: 'MaFia TEAM', members: [{ name: 'Matt', country: 'US' }, { name: 'Sofia', country: 'UA' }] },
  { slot: 'B1', name: 'KILLER TEAM', members: [{ name: 'Joe', country: 'KR' }, { name: 'Anna', country: 'KR' }] },
  { slot: 'B2', name: 'RAWRR TEAM', members: [{ name: 'Susana', country: 'MX' }, { name: 'Jumma', country: 'AE' }] },
  { slot: 'B3', name: 'TITI & DIEGO', members: [{ name: 'Titi', country: 'PA' }, { name: 'Diego', country: 'PA' }] },
  { slot: 'B4', name: 'JS TEAM', members: [{ name: 'Jay', country: 'KR' }, { name: 'Sharon', country: 'KR' }] },
  { slot: 'B5', name: 'RALLÉ TEAM', members: [{ name: 'Little', country: 'TH' }, { name: 'Fond', country: 'TH' }] },
];

export const groups = {
  A: teams.filter((team) => team.slot.startsWith('A')),
  B: teams.filter((team) => team.slot.startsWith('B')),
};

const pairOrder = [
  { round: 1, slots: [2, 5] },
  { round: 1, slots: [3, 4] },
  { round: 2, slots: [1, 5] },
  { round: 2, slots: [2, 3] },
  { round: 3, slots: [1, 4] },
  { round: 3, slots: [3, 5] },
  { round: 4, slots: [2, 4] },
  { round: 4, slots: [1, 3] },
  { round: 5, slots: [4, 5] },
  { round: 5, slots: [1, 2] },
];

export const groupFixtures = Object.fromEntries(Object.keys(groups).map((groupCode) => [
  groupCode,
  pairOrder.map(({ round, slots }, index) => {
    const [first, second] = slots;
    return {
      id: `${groupCode}${Math.min(first, second)}-${groupCode}${Math.max(first, second)}`,
      round,
      startMinutes: 11 * 60 + index * 20,
      endMinutes: 11 * 60 + (index + 1) * 20,
      team1: groups[groupCode][first - 1],
      team2: groups[groupCode][second - 1],
    };
  }),
]));

export const teamMembersByName = Object.fromEntries(teams.map((team) => [
  team.name,
  team.members.map((member) => `${member.name}${member.country ? ` ${flagData[member.country][0]}` : ''}`).join(' · '),
]));

function flagMarkup(country) {
  if (!country) return '';
  const [emoji, title, path] = flagData[country];
  return ` <img class="flag-emoji" src="https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${path}.svg" alt="${emoji}" title="${title}" width="18" height="18">`;
}

function membersMarkup(team) {
  return team.members.map((member) => `${member.name}${flagMarkup(member.country)}`).join(' &amp; ');
}

function formatTime(totalMinutes) {
  const hour = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
}

function renderDraws() {
  const groupCards = Object.entries(groups).map(([groupCode, groupTeams]) => `
    <article class="group-card">
      <div class="group-title"><h3>Group ${groupCode}</h3><span>COURT ${groupCode === 'A' ? 2 : 4} · TOP 2 ADVANCE</span></div>
      <div class="team-head"><span>TEAM SLOT</span><span>TEAM / MEMBERS</span></div>
      ${groupTeams.map((team) => `<div class="team-row"><strong>${team.slot}</strong><span><b>${team.name}</b><small>${membersMarkup(team)}</small></span></div>`).join('')}
    </article>`).join('');

  document.querySelector('#draws').innerHTML = `
    <div class="section-heading"><h2>Group Stage Groups</h2><span class="tag neutral">10 TEAMS</span></div>
    <p class="section-intro">Two groups of five · Round robin · First to 4 games · Top 2 from each group advance</p>
    <p class="section-intro">Team slots are identifiers, not seeds or rankings.</p>
    <div class="group-grid">${groupCards}</div>`;
}

function renderScheduleGroup(groupCode) {
  const fixtures = groupFixtures[groupCode];
  return `<section class="group-agenda" aria-label="Group ${groupCode} schedule">
    <div class="group-title"><h3>Group ${groupCode}</h3><span>COURT ${groupCode === 'A' ? 2 : 4}</span></div>
    <p class="agenda-format">First to 4 games · All times estimated, KST</p>
    <ol class="fixture-list">${fixtures.map((fixture) => `<li class="agenda-fixture">
      <div class="agenda-time"><strong>${formatTime(fixture.startMinutes)}</strong><small>to ${formatTime(fixture.endMinutes)}</small></div>
      <div class="agenda-match"><span class="label">Round ${fixture.round}</span><h4>${fixture.team1.name} vs ${fixture.team2.name}</h4><p>${fixture.team1.slot} · ${membersMarkup(fixture.team1)} / ${fixture.team2.slot} · ${membersMarkup(fixture.team2)}</p></div>
    </li>`).join('')}</ol>
  </section>`;
}

function renderOrderOfPlay() {
  document.querySelector('#order-of-play').innerHTML = `
    <div class="section-heading"><h2>Order of play</h2><span class="tag neutral">MATCH SCHEDULE</span></div>
    <div class="schedule-banner"><strong>Saturday, 19 September 2026</strong><span>11:00 AM–5:15 PM KST · Estimated</span></div>
    <div class="group-schedules">${renderScheduleGroup('A')}${renderScheduleGroup('B')}</div>
    <h3 class="stage-title">Knockout matches</h3>
    <div class="group-schedules knockout-schedules">
      <section class="group-agenda" aria-label="Semifinal schedule"><div class="group-title"><h3>Semifinals</h3><span>2:40 PM</span></div><p class="agenda-format">One set · Golden Point · Times in KST</p><ol class="fixture-list">
        <li class="agenda-fixture"><div class="agenda-time"><strong>2:40 PM</strong><small>to 3:40 PM</small></div><div class="agenda-match" data-match-id="SF1"><span class="label">Semifinal 1 · Court 2</span><h4>Group A Rank 1 vs Group B Rank 2</h4><p>Winner advances to the final · Loser plays for third place</p></div></li>
        <li class="agenda-fixture"><div class="agenda-time"><strong>2:40 PM</strong><small>to 3:40 PM</small></div><div class="agenda-match" data-match-id="SF2"><span class="label">Semifinal 2 · Court 4</span><h4>Group B Rank 1 vs Group A Rank 2</h4><p>Winner advances to the final · Loser plays for third place</p></div></li>
      </ol></section>
      <section class="group-agenda" aria-label="Final and third-place schedule"><div class="group-title"><h3>Final &amp; Third Place</h3><span>4:00 PM</span></div><p class="agenda-format">Final: best of 3 sets · Third place: 1 set · Golden Point · Times in KST</p><ol class="fixture-list">
        <li class="agenda-fixture"><div class="agenda-time"><strong>4:00 PM</strong><small>to 5:15 PM</small></div><div class="agenda-match" data-match-id="FINAL"><span class="label">Final · Court 2</span><h4>Semifinal 1 Winner vs Semifinal 2 Winner</h4><p>Championship match</p></div></li>
        <li class="agenda-fixture"><div class="agenda-time"><strong>4:00 PM</strong><small>to 5:15 PM</small></div><div class="agenda-match" data-match-id="THIRD"><span class="label">Third-Place Match · Court 4</span><h4>Semifinal 1 Loser vs Semifinal 2 Loser</h4><p>Third-place match</p></div></li>
      </ol></section>
    </div>
    <div class="timing-note"><h3>Timing &amp; breaks</h3><p>Group matches run simultaneously on Court 2 and Court 4. Allow 20 minutes per group-stage match, including warm-up and changeover; 60 minutes for each semifinal; and 75 minutes for the final and third-place match.</p><p>Group stage: 11:00 AM–2:20 PM. Standings confirmation and player rest: 2:20–2:40 PM. Break before the final and third-place match: 3:40–4:00 PM.</p><p><strong>Target finish: 5:15 PM, with buffer until 6:00 PM.</strong> Times are estimates, not match time limits. Later matches may shift if play runs long.</p></div>
    <p class="section-intro">A1–A5 and B1–B5 are team slots. Group standings determine the semifinal places. Semifinals and third place use one set; the Final is best of three.</p>`;
}

function renderStandings(groupCode) {
  const groupTeams = groups[groupCode];
  const fixtures = groupFixtures[groupCode];
  const rows = groupTeams.map((team) => {
    const opponents = fixtures
      .filter((fixture) => fixture.team1.slot === team.slot || fixture.team2.slot === team.slot)
      .map((fixture) => fixture.team1.slot === team.slot ? fixture.team2 : fixture.team1);
    return `<tr><td><span class="slot-badge">${team.slot}</span></td><th scope="row">${team.name}<small>${membersMarkup(team)}</small></th><td><strong>0 – 0</strong></td><td>0 – 0</td>${opponents.map((opponent) => `<td><span class="zero-score">0:0</span><small>vs ${opponent.name}</small></td>`).join('')}</tr>`;
  }).join('');
  return `<h3 class="stage-title">Group ${groupCode} <span class="result-court">Court ${groupCode === 'A' ? 2 : 4}</span></h3><div class="standings-scroll" tabindex="0" role="region" aria-label="Group ${groupCode} standings"><table class="standings"><thead><tr><th scope="col">Slot</th><th scope="col">Participant</th><th scope="col">Matches<small>Won – lost</small></th><th scope="col">Games<small>Won – lost</small></th><th scope="col">Match 1</th><th scope="col">Match 2</th><th scope="col">Match 3</th><th scope="col">Match 4</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function renderResults() {
  document.querySelector('#results').innerHTML = `
    <div class="section-heading"><h2>Results &amp; standings</h2><span class="tag neutral">NOT STARTED</span></div>
    <p class="section-intro">Live scores update automatically. The top two teams from each group advance after all group matches are completed.</p>
    ${renderStandings('A')}${renderStandings('B')}
    <p class="section-intro">Each team plays four group matches. The top two teams per group advance to the semifinals.</p>
    <h3 class="stage-title">Knockout bracket</h3><p class="section-intro">Semifinal, final and third-place results update live as matches are completed.</p>
    <div class="playoff-view"><div class="upper-labels"><h4>Semifinals</h4><h4>Final</h4></div><div class="upper-playoff"><div class="semi-stack">
      <article class="playoff-card"><h4>Semifinal 1<span>Court 2</span></h4><p>2:40–3:40 PM KST · Estimated</p><div>Group A · Rank 1</div><div>Group B · Rank 2</div></article>
      <article class="playoff-card"><h4>Semifinal 2<span>Court 4</span></h4><p>2:40–3:40 PM KST · Estimated</p><div>Group B · Rank 1</div><div>Group A · Rank 2</div></article>
    </div><div class="winner-lines" aria-hidden="true"><span></span></div><div class="final-slot"><article class="playoff-card"><h4>Final<span>Court 2</span></h4><p>4:00–5:15 PM KST · Estimated</p><div>Winner · Semifinal 1</div><div>Winner · Semifinal 2</div></article></div></div>
    <div class="lower-playoff"><h4>Lower bracket · Third place</h4><div class="lower-route"><p>Loser · Semifinal 1<br><span>+</span><br>Loser · Semifinal 2</p><div class="lower-arrow" aria-hidden="true"></div><article class="playoff-card"><h4>Third-place match<span>Court 4</span></h4><p>4:00–5:15 PM KST · Estimated</p><div>Loser · Semifinal 1</div><div>Loser · Semifinal 2</div></article></div></div></div>`;
}

export function renderTournamentContent() {
  renderDraws();
  renderOrderOfPlay();
  renderResults();
}
