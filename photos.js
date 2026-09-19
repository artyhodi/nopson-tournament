import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm';

const supabase = createClient(
  'https://btqoyjaaurkwyojudyei.supabase.co',
  'sb_publishable_v70fZigwPbN_XlcTGywLgg_oHT8PkjN'
);

const PHOTO_BUCKET = 'tournament-photos';
const gallery = document.querySelector('#photo-gallery');
const status = document.querySelector('#photo-gallery-status');
const categories = [
  { id: 'winners', title: 'Winners', label: 'CHAMPIONS' },
  { id: 'podium', title: 'Podium', label: 'TOP THREE' },
  { id: 'moments', title: 'Tournament moments', label: 'FROM THE COURT' },
];

function photoUrl(path) {
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}

function photoCard(photo, featured = false) {
  const figure = document.createElement('figure');
  figure.className = `photo-card${featured ? ' featured-photo' : ''}`;

  const image = document.createElement('img');
  image.src = photoUrl(photo.storage_path);
  image.alt = photo.caption || `${categories.find((item) => item.id === photo.category)?.title || 'Tournament'} photo`;
  image.loading = featured ? 'eager' : 'lazy';
  image.decoding = 'async';
  figure.append(image);

  if (photo.caption) {
    const caption = document.createElement('figcaption');
    caption.textContent = photo.caption;
    figure.append(caption);
  }
  return figure;
}

function renderPhotos(photos) {
  gallery.replaceChildren();
  if (!photos.length) {
    const empty = document.createElement('div');
    empty.className = 'photo-gallery-empty';
    empty.innerHTML = '<span class="big-number">COMING SOON</span><h3>Photos after the final.</h3><p>Winner portraits, podium photos and tournament moments will appear here.</p>';
    gallery.append(empty);
    status.textContent = '';
    return;
  }

  for (const category of categories) {
    const categoryPhotos = photos.filter((photo) => photo.category === category.id);
    if (!categoryPhotos.length) continue;

    const section = document.createElement('section');
    section.className = `gallery-group gallery-${category.id}`;
    const heading = document.createElement('div');
    heading.className = 'gallery-group-heading';
    heading.innerHTML = `<span class="label">${category.label}</span><h3>${category.title}</h3>`;
    const grid = document.createElement('div');
    grid.className = 'photo-grid';
    categoryPhotos.forEach((photo, index) => grid.append(photoCard(photo, category.id === 'winners' && index === 0)));
    section.append(heading, grid);
    gallery.append(section);
  }
  status.textContent = `${photos.length} photo${photos.length === 1 ? '' : 's'}`;
}

async function loadPhotos() {
  const { data, error } = await supabase
    .from('tournament_photos')
    .select('id, storage_path, category, caption, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    status.textContent = 'Photos are temporarily unavailable.';
    gallery.replaceChildren();
    return;
  }
  renderPhotos(data || []);
}

loadPhotos();

const channel = supabase
  .channel('tournament-photo-changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_photos' }, loadPhotos)
  .subscribe();

window.addEventListener('beforeunload', () => supabase.removeChannel(channel));
