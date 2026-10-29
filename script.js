// Always open on the hero: no restoring the last scroll spot on reload/back,
// and no jumping to an old #section left in the address
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
if (location.hash) history.replaceState(null, '', location.pathname + location.search);
window.scrollTo(0, 0);
// once images and the Education layout have settled, make sure snapping hasn't moved us
// (unless the visitor already started scrolling on a slow connection)
let visitorScrolled = false;
['wheel', 'touchstart', 'keydown'].forEach((type) =>
  window.addEventListener(type, () => { visitorScrolled = true; }, { once: true, passive: true }));
window.addEventListener('load', () => { if (!visitorScrolled) window.scrollTo(0, 0); });

// Mobile menu: open/close the full-screen overlay
const menu = document.getElementById('menu');
const openBtn = document.querySelector('[data-menu-open]');

function setMenu(open) {
  menu.hidden = !open;
  openBtn.setAttribute('aria-expanded', String(open));
  document.body.classList.toggle('menu-open', open);
}

openBtn.addEventListener('click', () => setMenu(true));
menu.querySelectorAll('[data-menu-close]').forEach((el) => {
  el.addEventListener('click', () => setMenu(false));
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !menu.hidden) setMenu(false);
});
// Close the menu if the window grows to desktop width while it's open
window.matchMedia('(min-width: 768px)').addEventListener('change', (e) => {
  if (e.matches) setMenu(false);
});

// Underline the nav link for the section currently on screen.
// A section counts as current once its top passes 40% of the way down the window;
// the hero (before About) and Contact (after Projects) leave no link underlined.
const navSections = ['about', 'education', 'skills', 'projects', 'contact']
  .map((id) => document.getElementById(id));
const sectionLinks = document.querySelectorAll('.nav-links a, .menu-links a');

function updateActiveLink() {
  const line = window.innerHeight * 0.4;
  const current = navSections.filter((s) => s.getBoundingClientRect().top <= line).pop();
  const href = current ? `#${current.id}` : null;
  sectionLinks.forEach((a) => {
    a.classList.toggle('is-active', a.getAttribute('href') === href);
  });
}

window.addEventListener('scroll', updateActiveLink, { passive: true });
window.addEventListener('resize', updateActiveLink);
updateActiveLink();

// Project photo card: "View Project" opens a dialog with that project's photo, tag and title.
const projectModal = document.getElementById('project-modal');
const modalPhoto = projectModal.querySelector('.project-modal-photo img');

document.querySelectorAll('[data-project-open]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const { image, tag, title } = btn.dataset;
    modalPhoto.hidden = false;
    modalPhoto.src = image;
    modalPhoto.alt = `Screenshot of ${title}`;
    projectModal.querySelector('.project-tag').textContent = tag;
    projectModal.querySelector('.project-title').textContent = title;
    projectModal.showModal();
    document.body.classList.add('modal-open');
  });
});
// Clicking a project's picture opens the same card (the button stays the keyboard route)
document.querySelectorAll('.project .thumb').forEach((thumb) => {
  const btn = thumb.closest('.project').querySelector('[data-project-open]');
  thumb.addEventListener('click', () => btn.click());
});
// No photo added yet: hide the broken image so the grey placeholder shows instead
modalPhoto.addEventListener('error', () => { modalPhoto.hidden = true; });

projectModal.querySelector('[data-project-close]').addEventListener('click', () => projectModal.close());
// Clicking the dark backdrop (outside the card) also closes it; Esc is handled by the browser
projectModal.addEventListener('click', (e) => {
  if (e.target === projectModal) projectModal.close();
});
projectModal.addEventListener('close', () => document.body.classList.remove('modal-open'));

/* =========================================================
   ANIMATIONS
   Start states are set in styles.css (only under html.js and when the
   visitor hasn't asked for reduced motion), so nothing flashes on load.
   ========================================================= */
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const desktopLayout = window.matchMedia('(min-width: 768px)');

/* ---------- 1. Hero: type the name, then fade up the subtitle and buttons ---------- */
function initHeroTyping() {
  if (reduceMotion) return; // CSS shows the full name and everything in place

  const type = document.querySelector('.type');
  const live = type.querySelector('.type-live');
  const name = type.querySelector('.type-ghost').textContent;
  const intro = document.querySelector('.intro');
  let typed = 0;

  function typeNext() {
    typed += 1;
    live.textContent = name.slice(0, typed);
    if (typed < name.length) {
      setTimeout(typeNext, 80);
    } else {
      intro.classList.add('is-in');                              // subtitle + buttons fade up
      setTimeout(() => type.classList.add('is-done'), 1500);     // caret fades out
    }
  }
  setTimeout(typeNext, 400);
}

/* ---------- 2. About, Skills, Projects, Contact: reveal on the way in, hide again once fully out of view ---------- */
function initReveals() {
  // Stagger the cards in each group, and the chips / language dots inside each card
  document.querySelectorAll('[data-reveal-group]').forEach((group) => {
    group.querySelectorAll('[data-reveal-card]').forEach((card, i) => {
      const delay = 150 + i * 100;
      card.style.setProperty('--delay', `${delay}ms`);
      card.querySelectorAll('[data-reveal="fade"]').forEach((el, j) => {
        el.style.setProperty('--delay', `${delay + 250 + j * 40}ms`);
      });
    });
  });

  if (reduceMotion) return;

  // shows once its top is 12% up from the bottom of the screen; hides again when it has left the
  // screen completely, so it plays again (out of sight) the next time you scroll to it
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => entry.target.classList.toggle('is-in', entry.isIntersecting));
  }, { rootMargin: '0px 0px -12% 0px' });

  document.querySelectorAll('[data-reveal-group]').forEach((group) => observer.observe(group));
}

/* ---------- Phones: fade out blocks that are cut off at the top or bottom of the screen ----------
   A block shows while almost all of it (or half the screen, for very tall ones) is in view
   below the navbar, so a title cut off at the bottom stays hidden until you scroll to it.
   Skill cards and projects always stay visible, since those sections scroll freely through them. */
function initEdgeFade() {
  const phone = window.matchMedia('(max-width: 767px)');
  const blocks = document.querySelectorAll(
    '.hero .intro, .polaroid-wrap, .section-title, .passport-wrap, .about-text p, ' +
    '.edu-stop, .contact-panel'
  );
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const shown = entry.intersectionRatio >= 0.9 ||
        entry.intersectionRect.height >= entry.rootBounds.height * 0.5;
      entry.target.classList.toggle('is-off', phone.matches && !shown);
    });
  }, { rootMargin: '-64px 0px 0px 0px', threshold: [0, 0.25, 0.5, 0.75, 0.9, 1] });
  blocks.forEach((block) => observer.observe(block));
  // leaving phone width: show everything again
  phone.addEventListener('change', () => {
    if (!phone.matches) blocks.forEach((block) => block.classList.remove('is-off'));
  });
}

/* ---------- 3. Education: plane flies along the dotted path as you scroll ---------- */
function initEducation() {
  if (reduceMotion) return; // CSS shows the full path, all stops and the plane at rest

  const section = document.getElementById('education');
  const stage = section.querySelector('.edu-stage');
  const motion = section.querySelector('.edu-motion');
  const trail = section.querySelector('.edu-trail');
  const plane = section.querySelector('.edu-plane');
  const stops = [...section.querySelectorAll('.edu-stop')];

  // Phones: the timeline is stacked, so each stop fades in as it scrolls into view (and out again once gone)
  const stopObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => entry.target.classList.toggle('is-in', entry.isIntersecting));
  }, { rootMargin: '0px 0px -12% 0px' });
  stops.forEach((stop) => stopObserver.observe(stop));

  // Desktop/tablet: everything below is in the SVG's 1280×748 Figma coordinates
  const PATH_OFFSET = { x: 7.8, y: 318.9 };          // where the dotted path sits in the artwork
  const PLANE_REST = { x: 1239.1, y: 278.8, angle: -8 }; // resting spot from the design
  const NOSE_ANGLE = Math.atan2(-30, 66) * 180 / Math.PI; // the drawing's nose points up-right
  const TRAVEL = 0.9;                                 // last 10% of the scroll glides to the rest spot
  const DOTS = { herts: { x: 609, y: 532.15 }, sun: { x: 1049, y: 402.15 } }; // dot centres

  const total = motion.getTotalLength();

  // Distance along the path at which the plane passes each dot
  function lengthNearest(target) {
    let best = 0;
    let bestDist = Infinity;
    for (let len = 0; len <= total; len += 2) {
      const pt = motion.getPointAtLength(len);
      const dist = Math.hypot(pt.x + PATH_OFFSET.x - target.x, pt.y + PATH_OFFSET.y - target.y);
      if (dist < bestDist) { bestDist = dist; best = len; }
    }
    return best;
  }
  const reachAt = {
    herts: lengthNearest(DOTS.herts),
    sun: lengthNearest(DOTS.sun),
  };

  const lerp = (a, b, t) => a + (b - a) * t;
  const lerpAngle = (a, b, t) => a + (((b - a + 540) % 360) - 180) * t;

  function update() {
    if (!desktopLayout.matches) return;

    // Scroll progress through the pinned stage, 0 → 1
    const rect = section.getBoundingClientRect();
    const stickyTop = parseFloat(getComputedStyle(stage).top) || 0;
    // The last half-screen of the track is a pause on the finished timeline (time to read)
    const hold = window.innerHeight * 0.5;
    const range = rect.height - stage.offsetHeight - hold;
    const progress = range > 0 ? Math.min(Math.max((stickyTop - rect.top) / range, 0), 1) : 1;

    // Position on the path, and the path's direction there
    const t = Math.min(progress / TRAVEL, 1);
    const len = t * total;
    const a = motion.getPointAtLength(Math.max(len - 1, 0));
    const b = motion.getPointAtLength(Math.min(len + 1, total));
    const pt = motion.getPointAtLength(len);
    let x = pt.x + PATH_OFFSET.x;
    let y = pt.y + PATH_OFFSET.y;
    let angle = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI - NOSE_ANGLE;

    // After the path ends, glide into the resting spot
    if (progress > TRAVEL) {
      const k = (progress - TRAVEL) / (1 - TRAVEL);
      x = lerp(x, PLANE_REST.x, k);
      y = lerp(y, PLANE_REST.y, k);
      angle = lerpAngle(angle, PLANE_REST.angle, k);
    }

    plane.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${angle.toFixed(1)})`);
    trail.style.strokeDashoffset = 1 - t;           // reveal the dotted line behind the plane

    // Pop each dot and its card in once the plane reaches it (reverses when scrolling back)
    stops.forEach((stop) => {
      const key = ['herts', 'sun'].find((k) => stop.classList.contains(k));
      if (key) stop.classList.toggle('is-reached', len >= reachAt[key]);
    });
  }

  section.classList.add('is-scrubbed'); // makes the section a scroll track with a pinned stage
  update();
  plane.classList.add('is-ready');
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  desktopLayout.addEventListener('change', update);
}

initHeroTyping();
initReveals();
initEducation();
initEdgeFade();

// No zooming: iPhone Safari ignores user-scalable=no in the viewport tag, so block its pinch gesture too
document.addEventListener('gesturestart', (e) => e.preventDefault());
// Desktop: block Ctrl/Cmd + scroll wheel (and trackpad pinch, which arrives as a ctrl+wheel) and Ctrl/Cmd + + / - / 0
document.addEventListener('wheel', (e) => { if (e.ctrlKey || e.metaKey) e.preventDefault(); }, { passive: false });
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && ['+', '=', '-', '_', '0'].includes(e.key)) e.preventDefault();
});

// Make the pictures harder to save: no right-click / long-press menu and no dragging them out
document.addEventListener('contextmenu', (e) => { if (e.target.closest('img, .thumb')) e.preventDefault(); });
document.addEventListener('dragstart', (e) => { if (e.target.tagName === 'IMG') e.preventDefault(); });

/* ---------- Skills: shrink the card grid so the whole section fits in one screen ----------
   Only for the two-column layout (1024px+); on narrower screens the cards stack and scroll. */
const skillsSection = document.getElementById('skills');
const skillCards = skillsSection.querySelector('.skill-cards');
const wideLayout = window.matchMedia('(min-width: 1024px)');

function fitSkills() {
  skillCards.style.zoom = '';
  skillCards.style.width = '';
  skillCards.style.maxWidth = '';
  if (!wideLayout.matches) return;

  const available = window.innerHeight - 64;          // screen height below the navbar
  const width = skillCards.getBoundingClientRect().width; // keep this width (same as the projects)
  let scale = 1;

  // Shrink the contents until the section fits; the grid is widened by 1/scale so it still
  // looks the same width as the project cards. A few passes, because wider cards reflow shorter.
  for (let pass = 0; pass < 4 && skillsSection.offsetHeight > available; pass++) {
    const overflow = skillsSection.offsetHeight - available;
    const height = skillCards.getBoundingClientRect().height;
    scale = Math.max(0.6, scale * (height - overflow) / height);
    skillCards.style.zoom = scale.toFixed(3);
    skillCards.style.width = `${(width / scale).toFixed(1)}px`;
    skillCards.style.maxWidth = 'none';
  }
}

fitSkills();
window.addEventListener('resize', fitSkills);
document.fonts.ready.then(fitSkills); // re-measure once the web fonts have loaded

/* ---------- Section links glide there (a little slower than the browser's built-in smooth scroll) ---------- */
const navOffset = 64; // height of the fixed navbar

function glideTo(targetY) {
  const root = document.documentElement;
  const startY = window.scrollY;
  const distance = targetY - startY;
  const duration = Math.min(1800, 500 + Math.abs(distance) * 0.25); // longer trips take a bit longer
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const start = performance.now();

  root.style.scrollSnapType = 'none'; // snapping would fight the glide; restored when it ends
  function step(now) {
    const t = Math.min((now - start) / duration, 1);
    window.scrollTo(0, startY + distance * easeInOut(t));
    if (t < 1) requestAnimationFrame(step);
    else root.style.scrollSnapType = '';
  }
  requestAnimationFrame(step);
}

document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href^="#"]');
  if (!link || reduceMotion) return;                  // reduced motion: let the browser jump there
  const target = document.querySelector(link.getAttribute('href'));
  if (!target) return;
  e.preventDefault();
  const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0; // e.g. Education's pin offset
  const targetY = target.id === 'top' ? 0 : target.getBoundingClientRect().top + window.scrollY - navOffset - margin;
  glideTo(Math.max(0, targetY)); // the address bar keeps no #section, so reopening starts at the top
});

/* ---------- Phones: Skills and Projects scroll freely; snapping comes back at their start and at the next section ---------- */
const phoneLayout = window.matchMedia('(max-width: 767px)');
const freeSections = [document.getElementById('skills'), document.getElementById('projects')];
let freeTicking = false;

function updateFreeScroll() {
  freeTicking = false;
  // free from the moment the section sits at its start (so a swipe from the title never switches
  // modes mid-gesture) until the next section fills over half the screen; snapping then takes over
  const inside = phoneLayout.matches && freeSections.some((section) => {
    const rect = section.getBoundingClientRect();
    return rect.top <= navOffset + 1 && rect.bottom > window.innerHeight * 0.5;
  });
  document.documentElement.classList.toggle('free-scroll', inside);
}
window.addEventListener('scroll', () => {
  if (!freeTicking) { freeTicking = true; requestAnimationFrame(updateFreeScroll); }
}, { passive: true });
phoneLayout.addEventListener('change', updateFreeScroll);
updateFreeScroll();
