import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm';

const supabase = createClient(
  'https://btqoyjaaurkwyojudyei.supabase.co',
  'sb_publishable_v70fZigwPbN_XlcTGywLgg_oHT8PkjN'
);

const authPanel = document.querySelector('#auth-panel');
const recoveryPanel = document.querySelector('#recovery-panel');
const editorPanel = document.querySelector('#editor-panel');
const authMessage = document.querySelector('#auth-message');
const recoveryMessage = document.querySelector('#recovery-message');
const editorMessage = document.querySelector('#editor-message');
const matchList = document.querySelector('#match-list');
const retryLoadButton = document.querySelector('#retry-load');
const photoUploadForm = document.querySelector('#photo-upload-form');
const photoFiles = document.querySelector('#photo-files');
const photoCategory = document.querySelector('#photo-category');
const photoCaption = document.querySelector('#photo-caption');
const photoUploadMessage = document.querySelector('#photo-upload-message');
const photoAdminList = document.querySelector('#photo-admin-list');
const MATCH_CACHE_KEY = 'nopson-scorekeeper-matches-v3';
const PHOTO_BUCKET = 'tournament-photos';
const MAX_PHOTO_BYTES = 12 * 1024 * 1024;
const PHOTO_EXTENSIONS = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);
const PHOTO_CATEGORY_LABELS = { winners: 'Winners', podium: 'Podium', moments: 'From the Court' };
let matches = [];
let photos = [];
let activeStage = 'all';
let shownSession = 'unknown';
let recoveringPassword = false;

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
    const final = match.stage === 'Final';
    return `<form class="admin-match" data-match-id="${match.match_id}">
      <div class="admin-match-heading">
        <div><span class="label">${match.stage}${match.round_number ? ` · ROUND ${match.round_number}` : ''}</span><h2>${match.team_1}<small>vs</small>${match.team_2}</h2></div>
        <span class="court-pill">Court ${match.court}</span>
      </div>
      <div class="score-grid">
        ${scoreInput(match, 'team_1_set_1', final ? 'Team 1 · Set 1' : 'Team 1')}
        ${scoreInput(match, 'team_2_set_1', final ? 'Team 2 · Set 1' : 'Team 2')}
        ${final ? scoreInput(match, 'team_1_set_2', 'Team 1 · Set 2') + scoreInput(match, 'team_2_set_2', 'Team 2 · Set 2') + scoreInput(match, 'team_1_set_3', 'Team 1 · Set 3') + scoreInput(match, 'team_2_set_3', 'Team 2 · Set 3') : ''}
      </div>
      <div class="match-controls score-only">
        <span class="auto-outcome">Winner calculated automatically</span>
        <button type="submit">Save score</button>
      </div>
      <p class="save-state" role="status"></p>
    </form>`;
  }).join('');

  for (const form of matchList.querySelectorAll('form')) form.addEventListener('submit', saveMatch);
}

function readCachedMatches() {
  try {
    const cached = JSON.parse(localStorage.getItem(MATCH_CACHE_KEY));
    return Array.isArray(cached) ? cached : [];
  } catch {
    return [];
  }
}

function cacheMatches() {
  try {
    localStorage.setItem(MATCH_CACHE_KEY, JSON.stringify(matches));
  } catch {
    // Storage may be unavailable in private browsing; live loading still works.
  }
}

async function fetchMatches(timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await supabase
      .from('tournament_matches')
      .select('*')
      .order('sort_order')
      .abortSignal(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}

async function loadMatches() {
  retryLoadButton.hidden = true;
  setMessage(editorMessage, matches.length ? 'Refreshing matches…' : 'Loading matches…');

  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const { data, error } = await fetchMatches();
      if (error) throw error;
      matches = data;
      renderMatches();
      cacheMatches();
      setMessage(editorMessage, 'Scores are live. Save only after checking both teams.');
      return;
    } catch (error) {
      lastError = error;
      if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 700));
    }
  }

  const permissionError = lastError?.message?.includes('permission');
  setMessage(
    editorMessage,
    permissionError
      ? 'This email is not approved as a scorekeeper.'
      : matches.length
        ? 'Connection is slow. Showing the last loaded scores.'
        : 'Could not load matches. Check the connection and try again.',
    true
  );
  retryLoadButton.hidden = permissionError;
}

function publicPhotoUrl(path) {
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}

function renderAdminPhotos() {
  photoAdminList.replaceChildren();
  if (!photos.length) {
    const empty = document.createElement('p');
    empty.className = 'photo-admin-empty';
    empty.textContent = 'No photos uploaded yet.';
    photoAdminList.append(empty);
    return;
  }

  for (const photo of photos) {
    const card = document.createElement('article');
    card.className = 'photo-admin-card';
    const image = document.createElement('img');
    image.src = publicPhotoUrl(photo.storage_path);
    image.alt = photo.caption || `${PHOTO_CATEGORY_LABELS[photo.category]} photo`;
    image.loading = 'lazy';
    const body = document.createElement('div');
    body.className = 'photo-admin-card-body';
    const category = document.createElement('strong');
    category.textContent = PHOTO_CATEGORY_LABELS[photo.category];
    const caption = document.createElement('small');
    caption.textContent = photo.caption || 'No caption';
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remove-photo';
    remove.dataset.photoId = photo.id;
    remove.textContent = 'Remove photo';
    body.append(category, caption, remove);
    card.append(image, body);
    photoAdminList.append(card);
  }
}

async function loadAdminPhotos() {
  const { data, error } = await supabase
    .from('tournament_photos')
    .select('id, storage_path, category, caption, created_at')
    .order('created_at', { ascending: false });
  if (error) {
    setMessage(photoUploadMessage, 'Could not load the photo gallery.', true);
    return;
  }
  photos = data || [];
  renderAdminPhotos();
}

async function uploadPhotos(event) {
  event.preventDefault();
  const files = [...photoFiles.files];
  const invalidFile = files.find((file) => !PHOTO_EXTENSIONS.has(file.type) || file.size > MAX_PHOTO_BYTES);
  if (!files.length) {
    setMessage(photoUploadMessage, 'Choose at least one photo.', true);
    return;
  }
  if (invalidFile) {
    setMessage(photoUploadMessage, 'Use JPG, PNG or WebP photos up to 12 MB each.', true);
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    setMessage(photoUploadMessage, 'Sign in again before uploading photos.', true);
    return;
  }

  const submit = photoUploadForm.querySelector('button[type="submit"]');
  submit.disabled = true;
  try {
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      setMessage(photoUploadMessage, `Uploading ${index + 1} of ${files.length}…`);
      const uniquePart = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
      const path = `${session.user.id}/${Date.now()}-${uniquePart}.${PHOTO_EXTENSIONS.get(file.type)}`;
      const { error: uploadError } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(path, file, { cacheControl: '31536000', contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;

      const { error: metadataError } = await supabase.from('tournament_photos').insert({
        storage_path: path,
        category: photoCategory.value,
        caption: photoCaption.value.trim(),
      });
      if (metadataError) {
        await supabase.storage.from(PHOTO_BUCKET).remove([path]);
        throw metadataError;
      }
    }
    photoUploadForm.reset();
    await loadAdminPhotos();
    setMessage(photoUploadMessage, `${files.length} photo${files.length === 1 ? '' : 's'} uploaded.`);
  } catch (error) {
    setMessage(photoUploadMessage, error.message || 'Photo upload failed. Try again.', true);
  } finally {
    submit.disabled = false;
  }
}

async function removePhoto(event) {
  const button = event.target.closest('.remove-photo');
  if (!button) return;
  const photo = photos.find((item) => item.id === button.dataset.photoId);
  if (!photo || !window.confirm('Remove this photo from the tournament gallery?')) return;

  button.disabled = true;
  setMessage(photoUploadMessage, 'Removing photo…');
  const { error: metadataError } = await supabase.from('tournament_photos').delete().eq('id', photo.id);
  if (metadataError) {
    setMessage(photoUploadMessage, metadataError.message, true);
    button.disabled = false;
    return;
  }

  const { error: storageError } = await supabase.storage.from(PHOTO_BUCKET).remove([photo.storage_path]);
  await loadAdminPhotos();
  setMessage(
    photoUploadMessage,
    storageError ? 'Removed from the gallery, but the stored file needs cleanup.' : 'Photo removed.',
    Boolean(storageError)
  );
}

async function saveMatch(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const state = form.querySelector('.save-state');
  const values = Object.fromEntries(new FormData(form));
  const number = (field) => Number.parseInt(values[field], 10);
  const update = {
    team_1_set_1: number('team_1_set_1'),
    team_2_set_1: number('team_2_set_1'),
    team_1_set_2: values.team_1_set_2 == null ? 0 : number('team_1_set_2'),
    team_2_set_2: values.team_2_set_2 == null ? 0 : number('team_2_set_2'),
    team_1_set_3: values.team_1_set_3 == null ? 0 : number('team_1_set_3'),
    team_2_set_3: values.team_2_set_3 == null ? 0 : number('team_2_set_3'),
    team_1_tiebreak: 0,
    team_2_tiebreak: 0,
  };
  setMessage(state, 'Saving…');
  const { data, error } = await supabase.from('tournament_matches').update(update).eq('match_id', form.dataset.matchId).select().single();
  if (error) {
    setMessage(state, error.message.includes('0 rows') || error.code === 'PGRST116' ? 'This account is not approved to edit scores.' : error.message, true);
    return;
  }
  matches = matches.map(match => match.match_id === data.match_id ? data : match);
  cacheMatches();
  setMessage(state, `Saved at ${new Date(data.updated_at).toLocaleTimeString('en-GB', { timeZone: 'Asia/Seoul' })} KST`);

  if (data.match_id === 'SF1' || data.match_id === 'SF2') {
    const { data: refreshed, error: refreshError } = await fetchMatches();
    if (!refreshError) {
      matches = refreshed;
      renderMatches();
      cacheMatches();
      setMessage(editorMessage, 'Semifinal saved. Final and third-place teams updated automatically.');
    }
  }
}

async function showSession(session) {
  const sessionKey = session?.user?.id ?? 'signed-out';
  if (sessionKey === shownSession) return;
  shownSession = sessionKey;

  authPanel.hidden = Boolean(session);
  editorPanel.hidden = !session;
  if (session) {
    document.querySelector('#signed-in-email').textContent = session.user.email;
    const cached = readCachedMatches();
    if (cached.length) {
      matches = cached;
      renderMatches();
      setMessage(editorMessage, 'Showing saved matches while connecting…');
    }
    await Promise.all([loadMatches(), loadAdminPhotos()]);
  } else {
    matches = [];
    photos = [];
    matchList.innerHTML = '';
    photoAdminList.replaceChildren();
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

document.querySelector('#reset-password').addEventListener('click', async () => {
  const email = document.querySelector('#email').value.trim().toLowerCase();
  if (!email) {
    setMessage(authMessage, 'Enter your email first.', true);
    return;
  }
  setMessage(authMessage, 'Sending reset email…');
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://padel.nopsoncapital.com/score-admin.html',
  });
  setMessage(authMessage, error ? error.message : 'Password reset email sent. Check your inbox.', Boolean(error));
});

document.querySelector('#recovery-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const password = document.querySelector('#new-password').value;
  if (password.length < 8) {
    setMessage(recoveryMessage, 'Use at least eight characters.', true);
    return;
  }
  setMessage(recoveryMessage, 'Updating password…');
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    setMessage(recoveryMessage, error.message, true);
    return;
  }
  recoveringPassword = false;
  recoveryPanel.hidden = true;
  setMessage(recoveryMessage, '');
  shownSession = 'unknown';
  const { data: { session } } = await supabase.auth.getSession();
  await showSession(session);
  setMessage(editorMessage, 'Password updated. You are signed in.');
});

document.querySelector('#sign-out').addEventListener('click', () => supabase.auth.signOut());
document.querySelectorAll('.filter-button').forEach(button => button.addEventListener('click', () => {
  activeStage = button.dataset.stage;
  document.querySelectorAll('.filter-button').forEach(item => item.classList.toggle('active', item === button));
  renderMatches();
}));

retryLoadButton.addEventListener('click', () => loadMatches());
photoUploadForm.addEventListener('submit', uploadPhotos);
photoAdminList.addEventListener('click', removePhoto);

supabase.auth.onAuthStateChange((event, session) => {
  // Supabase calls inside this callback can deadlock the auth client.
  // Defer all database work until the callback has returned.
  setTimeout(() => {
    if (event === 'PASSWORD_RECOVERY') {
      recoveringPassword = true;
      authPanel.hidden = true;
      editorPanel.hidden = true;
      recoveryPanel.hidden = false;
      return;
    }
    if (recoveringPassword) return;
    showSession(session).catch(() => {
      setMessage(editorMessage, 'Could not initialize the scorekeeper. Try again.', true);
      retryLoadButton.hidden = false;
    });
  }, 0);
});
