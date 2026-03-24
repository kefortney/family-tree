/* Mobile navigation toggle — injected into every page */
(function () {
  const navInner = document.querySelector('.nav-inner');
  const navLinks = document.querySelector('.nav-links');
  if (!navInner || !navLinks) return;

  // Create hamburger button and append it to nav-inner
  const btn = document.createElement('button');
  btn.className = 'nav-toggle';
  btn.setAttribute('aria-label', 'Open navigation');
  btn.setAttribute('aria-expanded', 'false');
  btn.textContent = '☰';
  navInner.appendChild(btn);

  function openMenu() {
    navLinks.classList.add('nav-open');
    btn.textContent = '✕';
    btn.setAttribute('aria-expanded', 'true');
    btn.setAttribute('aria-label', 'Close navigation');
  }

  function closeMenu() {
    navLinks.classList.remove('nav-open');
    btn.textContent = '☰';
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Open navigation');
  }

  btn.addEventListener('click', e => {
    e.stopPropagation();
    navLinks.classList.contains('nav-open') ? closeMenu() : openMenu();
  });

  // Close when a nav link is clicked (single-page navigation)
  navLinks.addEventListener('click', e => {
    if (e.target.tagName === 'A') closeMenu();
  });

  // Close when clicking outside the nav
  document.addEventListener('click', e => {
    if (navLinks.classList.contains('nav-open') && !navInner.contains(e.target)) {
      closeMenu();
    }
  });

  // Close on Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMenu();
  });
})();
