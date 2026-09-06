import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm';

const supabase = createClient(
  'https://btqoyjaaurkwyojudyei.supabase.co',
  'sb_publishable_v70fZigwPbN_XlcTGywLgg_oHT8PkjN'
);

const authPanel = document.querySelector('#auth-panel');
const editorPanel = document.querySelector('#editor-panel');
const authMessage = document.querySelector('#auth-message');
const editorMessage = document.querySelector('#editor-message');
const matchList = document.querySelector('#match-list');
let matches = [];
let activeStage = 'all';

function setMessage(element, message, error = false) {
  element.textContent = message;
  element.classList.toggle('error', error);
}

function matchVisible(match) {
  if (activeStage === 'all') return true;
  if (activeStage === 'knockout') return !match.stage.startsWith('Group');
  return match.stage === activeStage;
}

function scoreInput(match, field, label) {
  return `<label>${label}<input inputmode="numeric" type="number" min="0" max="999" name="${field}" value="${match[field]}" required></label>`;
}

function renderMatches() {
  matchList.innerHTML = matches.filter(matchVisible).map((match) => {
    const knockout = !match.stage.startsWith('Group');
    return `<form class="admin-match" data-match-id="${match.match_id}">
      <div class="admin-match-heading">
        <div><span class="label">${match.stage}${match.round_number ? ` · ROUND ${match.round_number}` : ''}</span><h2>${match.team_1}<small>vs</small>${match.team_2}</h2></div>
        <span class="court-pill">Court ${match.court}</span>
      </div>
      <div class="score-grid">
        ${scoreInput(match, 'team_1_set_1', knockout ? 'Team 1 · Set 1' : 'Team 1')}
        ${scoreInput(match, 'team_2_set_1', knockout ? 'Team 2 · Set 1' : 'Team 2')}
        ${knockout ? scoreInput(match, 'team_1_set_2', 'Team 1 · Set 2') + scoreInput(match, 'team_2_set_2', 'Team 2 · Set 2') + scoreInput(match, 'team_1_tiebreak', 'Team 1 · TB') + scoreInput(match, 'team_2_tiebreak', 'Team 2 · TB') : ''}
      </div>
      <div class="match-controls">
        <label>Status<select name="status">
          ${['Not started','Live','Completed'].map(status => `<option ${match.status === status ? 'selected' : ''}>${status}</option>`).join('')}
        </select></label>
        <label>Winner<select name="winner">
          <option value="" ${match.winner == null ? 'selected' : ''}>Not decided</option>
          <option value="1" ${match.winner === 1 ? 'selected' : ''}>Team 1</option>
          <option value="2" ${match.winner === 2 ? 'selected' : ''}>Team 2</option>
        </select></label>
        <button type="submit">Save score</button>
      </div>
      <p class="save-state" role="status"></p>
    </form>`;
  }).join('');

  for (const form of matchList.querySelectorAll('form')) form.addEventListener('submit', saveMatch);
}

async function loadMatches() {
  setMessage(editorMessage, 'Loading matches…');
  const { data, error } = await supabase.from('tournament_matches').select('*').order('sort_order');
  if (error) {
    setMessage(editorMessage, error.message.includes('permission') ? 'This email is not approved as a scorekeeper.' : error.message, true);
    return;
  }
  matches = data;
  renderMatches();
  setMessage(editorMessage, 'Scores are live. Save only after checking both teams.');
}

async function saveMatch(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const state = form.querySelector('.save-state');
  const values = Object.fromEntries(new FormData(form));
  const number = (field) => Number.parseInt(values[field], 10);
  const status = values.status;
  const winner = values.winner ? Number(values.winner) : null;
  if (status === 'Completed' && !winner) {
    setMessage(state, 'Choose a winner before completing the match.', true);
    return;
  }
  const update = {
    team_1_set_1: number('team_1_set_1'),
    team_2_set_1: number('team_2_set_1'),
    team_1_set_2: values.team_1_set_2 == null ? 0 : number('team_1_set_2'),
    team_2_set_2: values.team_2_set_2 == null ? 0 : number('team_2_set_2'),
    team_1_tiebreak: values.team_1_tiebreak == null ? 0 : number('team_1_tiebreak'),
    team_2_tiebreak: values.team_2_tiebreak == null ? 0 : number('team_2_tiebreak'),
    status,
    winner: status === 'Completed' ? winner : null,
  };
  setMessage(state, 'Saving…');
  const { data, error } = await supabase.from('tournament_matches').update(update).eq('match_id', form.dataset.matchId).select().single();
  if (error) {
    setMessage(state, error.message.includes('0 rows') || error.code === 'PGRST116' ? 'This account is not approved to edit scores.' : error.message, true);
    return;
  }
  matches = matches.map(match => match.match_id === data.match_id ? data : match);
  setMessage(state, `Saved at ${new Date(data.updated_at).toLocaleTimeString('en-GB', { timeZone: 'Asia/Seoul' })} KST`);
}

async function showSession(session) {
  authPanel.hidden = Boolean(session);
  editorPanel.hidden = !session;
  if (session) {
    document.querySelector('#signed-in-email').textContent = session.user.email;
    await loadMatches();
  }
}

document.querySelector('#auth-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage(authMessage, 'Signing in…');
  const email = document.querySelector('#email').value.trim().toLowerCase();
  const password = document.querySelector('#password').value;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) setMessage(authMessage, error.message, true);
});

document.querySelector('#sign-up').addEventListener('click', async () => {
  const email = document.querySelector('#email').value.trim().toLowerCase();
  const password = document.querySelector('#password').value;
  if (!email || password.length < 8) {
    setMessage(authMessage, 'Enter your email and a password of at least 8 characters.', true);
    return;
  }
  setMessage(authMessage, 'Creating account…');
  const { error } = await supabase.auth.signUp({ email, password });
  setMessage(authMessage, error ? error.message : 'Account created. Check your email if confirmation is required.', Boolean(error));
});

document.querySelector('#sign-out').addEventListener('click', () => supabase.auth.signOut());
document.querySelectorAll('.filter-button').forEach(button => button.addEventListener('click', () => {
  activeStage = button.dataset.stage;
  document.querySelectorAll('.filter-button').forEach(item => item.classList.toggle('active', item === button));
  renderMatches();
}));

supabase.auth.onAuthStateChange((_event, session) => showSession(session));
const { data: { session } } = await supabase.auth.getSession();
await showSession(session);

