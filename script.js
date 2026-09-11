/* All enhancements are optional; the HTML remains readable without JavaScript. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.documentElement.classList.add('js');

  // Reveal once, then stop observing. Older browsers get the full visible page.
  if ('IntersectionObserver' in window) {
    const reveals = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach((element) => reveals.observe(element));
    const distanceObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        $('distance').classList.add(entry.target.id === 'distance-trigger' ? 'is-close' : 'in-view');
        distanceObserver.unobserve(entry.target);
      });
    }, { threshold: 0.65 });
    distanceObserver.observe(document.querySelector('.distance-graphic'));
    distanceObserver.observe($('distance-trigger'));
  } else {
    document.querySelectorAll('.reveal').forEach((element) => element.classList.add('visible'));
    $('distance').classList.add('in-view', 'is-close');
  }

  // Attach the optional source only after entering; never autoplay on page load.
  const audio = $('background-music');
  const musicButton = $('music-toggle');
  const musicVolume = 0.3;
  let musicUnavailable = false;
  let musicRequested = false;
  let fadeFrame = 0;
  let playbackRequest = 0;
  audio.volume = musicVolume;
  function stopMusicFade() {
    window.cancelAnimationFrame(fadeFrame);
    fadeFrame = 0;
  }
  function updateMusic() {
    const playing = musicRequested && !musicUnavailable;
    musicButton.setAttribute('aria-pressed', String(playing));
    musicButton.setAttribute('aria-label', musicUnavailable ? 'No background music added' : playing ? 'Pause background music' : 'Play background music');
    $('music-label').textContent = musicUnavailable ? 'Quiet mode' : playing ? 'Music on' : 'Music off';
  }
  function fadeMusicIn(delay) {
    stopMusicFade();
    const start = performance.now() + delay;
    function step(now) {
      if (!musicRequested || audio.paused || musicUnavailable) return;
      const progress = Math.min(1, Math.max(0, (now - start) / 1800));
      audio.volume = musicVolume * progress * progress * (3 - 2 * progress);
      if (progress < 1) fadeFrame = window.requestAnimationFrame(step);
      else fadeFrame = 0;
    }
    fadeFrame = window.requestAnimationFrame(step);
  }
  audio.addEventListener('error', () => {
    musicUnavailable = true;
    musicRequested = false;
    playbackRequest++;
    stopMusicFade();
    musicButton.disabled = true;
    updateMusic();
  });
  audio.addEventListener('pause', () => {
    stopMusicFade();
    musicRequested = false;
    updateMusic();
  });
  async function playMusic(delay = 0) {
    if (!entered || musicUnavailable) return;
    const request = ++playbackRequest;
    musicRequested = true;
    stopMusicFade();
    audio.volume = 0;
    if (!audio.getAttribute('src')) audio.src = 'assets/audio/music.mp3';
    updateMusic();
    try {
      // Call play directly in the click handler to retain browser user activation.
      await audio.play();
      if (request !== playbackRequest || !musicRequested) return;
      fadeMusicIn(delay);
    } catch (error) {
      // Missing media and blocked playback never interrupt the website.
      if (request !== playbackRequest) return;
      musicRequested = false;
      stopMusicFade();
      updateMusic();
    }
  }
  musicButton.addEventListener('click', () => {
    if (!musicRequested) void playMusic();
    else {
      playbackRequest++;
      musicRequested = false;
      stopMusicFade();
      audio.pause();
      updateMusic();
    }
  });
  let entered = false;
  $('enter-button').addEventListener('click', (event) => {
    event.preventDefault();
    if (entered) return;
    entered = true;
    document.body.classList.add('entered');
    document.querySelector('.music-control').hidden = false;
    void playMusic(reducedMotion.matches ? 0 : 650);
    $('intro').classList.add('departing');
    window.setTimeout(() => {
      $('intro').hidden = true;
      $('birthday-title').setAttribute('tabindex', '-1');
      $('birthday-title').focus({ preventScroll: true });
      $('birthday').scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    }, reducedMotion.matches ? 0 : 650);
  });

  // Viewer-local September 12. After the date, no countdown is shown.
  const pad = (value) => String(value).padStart(2, '0');
  function updateCountdown(now = new Date()) {
    const birthday = new Date(now.getFullYear(), 8, 12);
    const followingDay = new Date(now.getFullYear(), 8, 13);
    if (now >= followingDay) {
      $('countdown-wrap').hidden = true;
      return;
    }
    $('countdown-wrap').hidden = false;
    if (now >= birthday) {
      $('countdown-heading').textContent = "It's your day, Mumma ♡";
      $('countdown').hidden = true;
      return;
    }
    $('countdown-heading').textContent = 'Bas thoda sa aur...';
    $('countdown').hidden = false;
    const remaining = Math.max(0, Math.floor((birthday - now) / 1000));
    $('days').textContent = pad(Math.floor(remaining / 86400));
    $('hours').textContent = pad(Math.floor(remaining / 3600) % 24);
    $('minutes').textContent = pad(Math.floor(remaining / 60) % 60);
    $('seconds').textContent = pad(remaining % 60);
  }
  updateCountdown();
  // A decorative call, not a real connection. No live announcements every second.
  const startedAt = Date.now();
  function updateClock() {
    if (document.hidden) return;
    updateCountdown();
    if (reducedMotion.matches) return;
    const seconds = 6 * 3600 + 12 * 60 + 47 + Math.floor((Date.now() - startedAt) / 1000);
    $('call-timer').textContent = `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor(seconds / 60) % 60)}:${pad(seconds % 60)}`;
  }
  window.setInterval(updateClock, 1000);
  document.addEventListener('visibilitychange', updateClock);

  // Only successfully loaded photographs enter the layout.
  const photoDialog = $('photo-dialog');
  const lightboxImage = $('lightbox-image');
  let photoOpener = null;
  document.querySelectorAll('.photo-open img[data-src]').forEach((img) => {
    const memory = img.closest('.photo-memory');
    const button = img.closest('button');
    img.addEventListener('load', () => {
      memory.hidden = false;
      $('photos').hidden = false;
    }, { once: true });
    img.addEventListener('error', () => { memory.hidden = true; }, { once: true });
    img.src = img.dataset.src;
    button.addEventListener('click', () => {
      if (!img.complete || !img.naturalWidth) return;
      photoOpener = button;
      lightboxImage.hidden = true;
      lightboxImage.alt = img.alt;
      lightboxImage.src = img.currentSrc || img.src;
      $('lightbox-caption').textContent = memory.querySelector('figcaption').textContent;
      if (typeof photoDialog.showModal === 'function') {
        photoDialog.showModal();
        document.body.classList.add('modal-open');
      } else {
        photoDialog.setAttribute('open', '');
        photoDialog.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth' });
      }
      $('close-photo').focus({ preventScroll: true });
    });
  });
  lightboxImage.addEventListener('load', () => { lightboxImage.hidden = false; });
  lightboxImage.addEventListener('error', () => {
    lightboxImage.hidden = true;
    closePhoto();
  });
  function finishPhotoClose() {
    document.body.classList.remove('modal-open');
    photoOpener?.focus({ preventScroll: true });
  }
  function closePhoto() {
    if (typeof photoDialog.close === 'function') photoDialog.close();
    else { photoDialog.removeAttribute('open'); finishPhotoClose(); }
  }
  $('close-photo').addEventListener('click', closePhoto);
  photoDialog.addEventListener('close', finishPhotoClose);
  photoDialog.addEventListener('click', (event) => {
    const rect = photoDialog.getBoundingClientRect();
    if (event.target === photoDialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) closePhoto();
  });

  // Native dialog supplies focus containment and Escape. Return focus on close.
  const dialog = $('letter-dialog');
  const envelope = $('open-letter');
  let openingLetter = false;
  let letterFocusTarget = envelope;
  function closeLetter() {
    if (typeof dialog.close === 'function') dialog.close();
    else { dialog.removeAttribute('open'); finishClose(); }
  }
  function finishClose() {
    document.body.classList.remove('modal-open');
    envelope.classList.remove('open');
    openingLetter = false;
    letterFocusTarget.focus({ preventScroll: true });
  }
  envelope.addEventListener('click', () => {
    if (openingLetter) return;
    openingLetter = true;
    letterFocusTarget = envelope;
    envelope.classList.add('open');
    window.setTimeout(() => {
      if (typeof dialog.showModal === 'function') {
        dialog.showModal();
        document.body.classList.add('modal-open');
      } else {
        dialog.setAttribute('open', '');
        dialog.scrollIntoView({ behavior: 'smooth' });
      }
      dialog.scrollTop = 0;
      $('close-letter').focus({ preventScroll: true });
    }, reducedMotion.matches ? 0 : 450);
  });
  $('close-letter').addEventListener('click', closeLetter);
  dialog.addEventListener('close', finishClose);
  dialog.addEventListener('click', (event) => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) closeLetter();
  });
  $('continue-letter').addEventListener('click', () => {
    letterFocusTarget = $('ending-button').hidden ? $('ending-title') : $('ending-button');
    letterFocusTarget.setAttribute('tabindex', '-1');
    closeLetter();
    $('ending').scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  });
  $('final-message').hidden = true;
  $('ending-button').addEventListener('click', () => {
    $('ending-button').setAttribute('aria-expanded', 'true');
    $('ending-button').hidden = true;
    $('ending-invitation').hidden = true;
    $('final-message').hidden = false;
    $('ending').classList.add('revealed');
    $('ending-title').setAttribute('tabindex', '-1');
    $('ending-title').focus({ preventScroll: true });
    $('final-message').scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start' });
  });
})();
