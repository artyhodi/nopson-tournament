import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm';

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

const rounds = { 1: [2, 3, 4], 2: [1, 4, 3], 3: [4, 1, 2], 4: [3, 2, 1] };
let matches = [];
let hasSubscribed = false;
let lastReconciledAt = 0;

const SCORE_COLUMNS = [
  'match_id', 'stage', 'round_number', 'team_1', 'team_2', 'court',
  'team_1_set_1', 'team_2_set_1', 'team_1_set_2', 'team_2_set_2',
  'team_1_tiebreak', 'team_2_tiebreak', 'status', 'winner', 'sort_order', 'updated_at',
].join(',');

function scorePair(match, side, suffix) {
  const own = match[`team_${side + 1}_${suffix}`];
  const other = match[`team_${side === 0 ? 2 : 1}_${suffix}`];
  return [own, other];
}

function render(rows) {
  matches = rows;
  const byId = new Map(rows.map((match) => [match.match_id, match]));
  for (const row of document.querySelectorAll('#results tbody tr')) {
    const slot = row.querySelector('.slot-badge').textContent.trim();
    const group = slot[0], number = Number(slot[1]);
    let won = 0, lost = 0, gamesFor = 0, gamesAgainst = 0;
    const entries = rounds[number].map((opponent) => {
      const id = `${group}${Math.min(number, opponent)}-${group}${Math.max(number, opponent)}`;
      const match = byId.get(id);
      if (!match) return null;
      const side = number < opponent ? 0 : 1;
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

  for (const card of document.querySelectorAll('.playoff-card')) {
    const title = card.querySelector('h4').firstChild.textContent.trim();
    const id = { 'Semifinal 1': 'SF1', 'Semifinal 2': 'SF2', Final: 'FINAL', 'Third-place match': 'THIRD' }[title];
    const match = byId.get(id);
    if (!match) continue;
    const sides = [...card.children].filter((element) => element.tagName === 'DIV');
    sides.forEach((element, side) => {
      const set1 = scorePair(match, side, 'set_1')[0];
      const set2 = scorePair(match, side, 'set_2')[0];
      const tiebreak = scorePair(match, side, 'tiebreak')[0];
      element.textContent = `${side === 0 ? match.team_1 : match.team_2} — ${set1} / ${set2} / TB ${tiebreak}`;
      element.style.fontWeight = match.status === 'Completed' && match.winner === side + 1 ? '800' : '500';
    });
    card.setAttribute('aria-label', `${title}: ${match.status}`);
  }

  const tag = document.querySelector('#results .tag');
  tag.textContent = rows.some((match) => match.status === 'Live')
    ? 'LIVE'
    : rows.every((match) => match.status === 'Completed')
      ? 'COMPLETED'
      : rows.some((match) => match.status === 'Completed') ? 'IN PROGRESS' : 'NOT STARTED';

  const latest = rows.reduce((date, match) => Math.max(date, Date.parse(match.updated_at)), 0);
  notice.textContent = `Live scores connected · Last change ${new Date(latest).toLocaleString('en-GB', { timeZone: 'Asia/Seoul' })} KST`;
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

