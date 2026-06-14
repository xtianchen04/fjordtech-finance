/* FjordTech Finance — main.js */

// Navbar scroll effect
const navbar = document.getElementById('navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  });
}

// Mobile burger menu
const burger = document.querySelector('.nav-burger');
const navLinks = document.querySelector('.nav-links');
if (burger && navLinks) {
  burger.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    burger.classList.toggle('open');
  });
  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      navLinks.classList.remove('open');
      burger.classList.remove('open');
    });
  });
}

// Active nav link
const currentPage = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-links a').forEach(a => {
  const href = a.getAttribute('href');
  if (href === currentPage || (currentPage === '' && href === 'index.html')) {
    a.classList.add('active');
  }
});

// AOS — Animate On Scroll (lightweight custom)
function initAOS() {
  const elements = document.querySelectorAll('[data-aos]');
  if (!elements.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        const delay = entry.target.dataset.aosDelay || 0;
        setTimeout(() => entry.target.classList.add('aos-visible'), parseInt(delay));
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  elements.forEach(el => observer.observe(el));
}

// Hero bar animation
function animateBars() {
  const bars = document.querySelectorAll('.hero-bar');
  const heights = [40, 55, 70, 45, 85, 60, 90, 75];
  bars.forEach((bar, i) => {
    bar.style.height = (heights[i] || 60) + '%';
    bar.style.animationDelay = (i * 0.08) + 's';
  });
}

// Counter animation
function animateCounters() {
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = parseInt(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    let current = 0;
    const step = target / 60;
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = Math.floor(current) + suffix;
      if (current >= target) clearInterval(timer);
    }, 20);
  });
}

// Contact form
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const btn = this.querySelector('[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Envoi en cours…';

    // Simulate sending
    setTimeout(() => {
      btn.textContent = 'Message envoyé ✓';
      showToast('Votre message a bien été envoyé. Nous vous répondrons sous 24h.');
      this.reset();
      setTimeout(() => {
        btn.disabled = false;
        btn.textContent = 'Envoyer le message';
      }, 3000);
    }, 1400);
  });
}

// Toast
function showToast(message) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 4200);
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();
  initAOS();
  animateBars();

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { animateCounters(); observer.disconnect(); } });
  }, { threshold: 0.3 });

  const statsEl = document.querySelector('.hero-stats');
  if (statsEl) observer.observe(statsEl);
});
