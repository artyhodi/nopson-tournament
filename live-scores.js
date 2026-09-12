import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm';
import { groupFixtures, renderTournamentContent, teamMembersByName } from './tournament-data.js?v=20260912-group-swap';

renderTournamentContent();

const supabaseUrl = 'https://btqoyjaaurkwyojudyei.supabase.co';
const supabaseKey = 'sb_publishable_v70fZigwPbN_XlcTGywLgg_oHT8PkjN';
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const notice = document.createElement('p');
notice.className = 'section-intro';
notice.setAttribute('role', 'status');
notice.textContent = 'Connecting to live scores…';
document.querySelector('#results .section-heading').after(notice);

let matches = [];
let hasSubscribed = false;
let lastReconciledAt = 0;

const SCORE_COLUMNS = [
  'match_id', 'stage', 'round_number', 'team_1', 'team_2', 'court',
  'team_1_set_1', 'team_2_set_1', 'team_1_set_2', 'team_2_set_2',
  'team_1_set_3', 'team_2_set_3', 'team_1_tiebreak', 'team_2_tiebreak',
  'status', 'winner', 'sort_order', 'updated_at',
].join(',');

function scorePair(match, side, suffix) {
  const own = match[`team_${side + 1}_${suffix}`];
  const other = match[`team_${side === 0 ? 2 : 1}_${suffix}`];
  return [own, other];
}

function fallbackTieCompare(a, b) {
  const aTotal = a.gamesFor + a.gamesAgainst;
  const bTotal = b.gamesFor + b.gamesAgainst;
  const aWinPct = aTotal ? a.gamesFor / aTotal : 0;
  const bWinPct = bTotal ? b.gamesFor / bTotal : 0;
  return bWinPct - aWinPct
    || (b.gamesFor - b.gamesAgainst) - (a.gamesFor - a.gamesAgainst)
    || b.gamesFor - a.gamesFor
    || a.slotNumber - b.slotNumber;
}

function finalTieEqual(a, b) {
  const aTotal = a.gamesFor + a.gamesAgainst;
  const bTotal = b.gamesFor + b.gamesAgainst;
  const aWinPct = aTotal ? a.gamesFor / aTotal : 0;
  const bWinPct = bTotal ? b.gamesFor / bTotal : 0;
  return aWinPct === bWinPct
    && a.gamesFor - a.gamesAgainst === b.gamesFor - b.gamesAgainst
    && a.gamesFor === b.gamesFor;
}

function rankGroup(groupCode, teams, byId) {
  const byWins = new Map();
  teams.forEach((team) => {
    if (!byWins.has(team.won)) byWins.set(team.won, []);
    byWins.get(team.won).push(team);
  });

  const ranked = [];
  let randomDrawRequired = false;
  [...byWins.keys()].sort((a, b) => b - a).forEach((wins) => {
    const tied = byWins.get(wins);
    if (tied.length === 2) {
      const [first, second] = tied;
      const id = `${groupCode}${Math.min(first.slotNumber, second.slotNumber)}-${groupCode}${Math.max(first.slotNumber, second.slotNumber)}`;
      const headToHead = byId.get(id);
      if (headToHead?.status === 'Completed' && headToHead.winner) {
        const winningSlot = headToHead.winner === 1
          ? Number(headToHead.match_id[1])
          : Number(headToHead.match_id[4]);
        tied.sort((a, b) => Number(b.slotNumber === winningSlot) - Number(a.slotNumber === winningSlot));
      } else {
        tied.sort(fallbackTieCompare);
      }
    } else if (tied.length >= 3) {
      tied.sort(fallbackTieCompare);
      randomDrawRequired ||= tied.some((team, index) => index > 0 && finalTieEqual(tied[index - 1], team));
    }
    ranked.push(...tied);
  });

  return { ranked, randomDrawRequired };
}

function renderKnockoutTeam(element, teamName, scores, scoreLabels, isWinner) {
  element.className = `knockout-score-row${isWinner ? ' is-winner' : ''}`;
  element.textContent = '';
  const team = document.createElement('span');
  team.className = 'knockout-team-info';
  const name = document.createElement('strong');
  name.className = 'knockout-team-name';
  name.textContent = teamName;
  team.append(name);
  if (teamMembersByName[teamName]) {
    const members = document.createElement('small');
    members.textContent = teamMembersByName[teamName];
    team.append(members);
  }
  element.append(team);
  scores.forEach((score, index) => {
    const value = document.createElement('strong');
    value.className = 'knockout-set-score';
    value.setAttribute('aria-label', `${scoreLabels[index]}: ${score}`);
    value.textContent = score;
    element.append(value);
  });
}

function render(rows) {
  matches = rows;
  const byId = new Map(rows.map((match) => [match.match_id, match]));
  const standingsByGroup = { A: [], B: [] };
  for (const row of document.querySelectorAll('#results tbody tr')) {
    const slot = row.querySelector('.slot-badge').textContent.trim();
    const group = slot[0], number = Number(slot[1]);
    let won = 0, lost = 0, gamesFor = 0, gamesAgainst = 0;
    const entries = groupFixtures[group]
      .filter((fixture) => fixture.team1.slot === slot || fixture.team2.slot === slot)
      .map((fixture) => {
      const match = byId.get(fixture.id);
      if (!match) return null;
      const side = fixture.team1.slot === slot ? 0 : 1;
      const scores = scorePair(match, side, 'set_1');
      if (match.status === 'Completed') {
        const isWinner = match.winner === side + 1;
        won += Number(isWinner);
        lost += Number(!isWinner);
        gamesFor += scores[0];
        gamesAgainst += scores[1];
      }
      return { match, side, scores };
    });
    row.children[2].textContent = `${won} – ${lost}`;
    row.children[3].textContent = `${gamesFor} – ${gamesAgainst}`;
    standingsByGroup[group].push({ row, won, gamesFor, gamesAgainst, slotNumber: number });
    entries.forEach((entry, index) => {
      if (!entry) return;
      const { match, side, scores } = entry;
      const badge = row.children[4 + index].querySelector('.zero-score');
      badge.textContent = `${scores[0]}:${scores[1]}${match.status === 'Live' ? ' · Live' : ''}`;
      badge.style.background = match.status === 'Completed'
        ? (match.winner === side + 1 ? '#d8edc8' : '#f4dddd')
        : '#e9ece3';
    });
  }

  const randomDrawGroups = [];
  for (const [groupCode, group] of Object.entries(standingsByGroup)) {
    const result = rankGroup(groupCode, group, byId);
    result.ranked.forEach(({ row }) => row.parentElement.append(row));
    const groupComplete = groupFixtures[groupCode].every(
      (fixture) => byId.get(fixture.id)?.status === 'Completed'
    );
    if (groupComplete && result.randomDrawRequired) randomDrawGroups.push(`Group ${groupCode}`);
  }

  for (const card of document.querySelectorAll('.playoff-card')) {
    const title = card.querySelector('h4').firstChild.textContent.trim();
    const id = { 'Semifinal 1': 'SF1', 'Semifinal 2': 'SF2', Final: 'FINAL', 'Third-place match': 'THIRD' }[title];
    const match = byId.get(id);
    if (!match) continue;

    const scoreLabels = id === 'FINAL' ? ['Set 1', 'Set 2', 'Set 3'] : ['Set 1'];
    const scoreSuffixes = id === 'FINAL' ? ['set_1', 'set_2', 'set_3'] : ['set_1'];
    card.style.setProperty('--score-columns', scoreLabels.length);

    let scoreHead = card.querySelector('.knockout-score-head');
    if (!scoreHead) {
      scoreHead = document.createElement('div');
      scoreHead.className = 'knockout-score-head';
      const firstSide = [...card.children].find((element) => element.tagName === 'DIV');
      card.insertBefore(scoreHead, firstSide);
    }
    scoreHead.innerHTML = `<span>Team / players</span>${scoreLabels.map((label) => `<span>${label}</span>`).join('')}`;

    const sides = [...card.children].filter(
      (element) => element.tagName === 'DIV' && !element.classList.contains('knockout-score-head')
    );
    sides.forEach((element, side) => {
      const scores = scoreSuffixes.map((suffix) => scorePair(match, side, suffix)[0]);
      renderKnockoutTeam(
        element,
        side === 0 ? match.team_1 : match.team_2,
        scores,
        scoreLabels,
        match.status === 'Completed' && match.winner === side + 1
      );
    });
    card.setAttribute('aria-label', `${title}: ${match.status}`);
  }

  for (const agenda of document.querySelectorAll('#order-of-play [data-match-id]')) {
    const match = byId.get(agenda.dataset.matchId);
    if (!match) continue;
    const title = agenda.querySelector('h4');
    title.textContent = `${match.team_1} vs ${match.team_2}`;
  }

  const tag = document.querySelector('#results .tag');
  tag.textContent = rows.some((match) => match.status === 'Live')
    ? 'LIVE'
    : rows.every((match) => match.status === 'Completed')
      ? 'COMPLETED'
      : rows.some((match) => match.status === 'Completed') ? 'IN PROGRESS' : 'NOT STARTED';

  const latest = rows.reduce((date, match) => Math.max(date, Date.parse(match.updated_at)), 0);
  const drawNotice = randomDrawGroups.length
    ? ` · Organizer-supervised random draw required: ${randomDrawGroups.join(', ')}`
    : '';
  notice.textContent = `Live scores connected · Last change ${new Date(latest).toLocaleString('en-GB', { timeZone: 'Asia/Seoul' })} KST${drawNotice}`;
}

async function loadScores() {
  const { data, error } = await supabase
    .from('tournament_matches')
    .select(SCORE_COLUMNS)
    .order('sort_order');
  if (error) throw error;
  lastReconciledAt = Date.now();
  render(data);
}

function applyRealtimeChange(payload) {
  if (payload.eventType === 'DELETE') {
    matches = matches.filter((match) => match.match_id !== payload.old.match_id);
  } else {
    const changed = payload.new;
    const index = matches.findIndex((match) => match.match_id === changed.match_id);
    if (index === -1) matches.push(changed);
    else matches[index] = { ...matches[index], ...changed };
  }
  matches.sort((a, b) => a.sort_order - b.sort_order);
  render(matches);
}

loadScores().catch(() => {
  notice.textContent = 'Live score connection is temporarily unavailable. Displayed scores are starting values.';
});

supabase
  .channel('tournament-score-changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_matches' }, applyRealtimeChange)
  .subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      if (hasSubscribed) loadScores().catch(() => {});
      hasSubscribed = true;
      return;
    }
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      notice.textContent = 'Reconnecting to live scores…';
    }
  });

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && Date.now() - lastReconciledAt > 15000) {
    loadScores().catch(() => {});
  }
});
