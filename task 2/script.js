/* ================================================================
   NEXUS LANDING PAGE — script.js
   Author: Nexus Team
   Description: Vanilla JS for smooth scrolling, mobile nav toggle,
   scroll animations, modal popup, form validation, testimonial
   slider, scroll-to-top button, and footer year update.
================================================================ */

/* ----------------------------------------------------------------
   UTILITY: Wait for the DOM to be fully parsed before running JS
---------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {

  /* ==============================================================
     1. SMOOTH SCROLL NAVIGATION
        Intercepts clicks on all internal anchor links (#...) and
        smoothly scrolls the page to the target section instead of
        the default jump behaviour.
  ============================================================== */
  const allAnchorLinks = document.querySelectorAll('a[href^="#"]');

  allAnchorLinks.forEach(link => {
    link.addEventListener('click', function (e) {
      const href = this.getAttribute('href');

      // Ignore bare '#' links (used as placeholders)
      if (href === '#') return;

      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();

      // Smooth scroll to the section
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // Close the mobile menu if it was open
      closeMobileMenu();
    });
  });


  /* ==============================================================
     2. NAVBAR — Scroll effect + Active link highlighting
        Adds '.scrolled' class to the navbar when the user scrolls
        past a threshold, enabling the glassmorphism effect.
        Also updates the active nav link based on scroll position.
  ============================================================== */
  const navbar = document.getElementById('navbar');
  const navLinks = document.querySelectorAll('.nav-link[data-section]');
  const sections = document.querySelectorAll('section[id]');
  const SCROLL_THRESHOLD = 60; // px before navbar becomes opaque

  function handleNavbarScroll() {
    // Toggle frosted-glass effect
    if (window.scrollY > SCROLL_THRESHOLD) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    // Highlight the active nav link based on which section is in view
    let currentSection = '';
    sections.forEach(section => {
      // If the section top is within range of the viewport top, it's "active"
      if (window.scrollY >= section.offsetTop - 120) {
        currentSection = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.dataset.section === currentSection) {
        link.classList.add('active');
      }
    });
  }

  // Attach scroll listener with passive flag for performance
  window.addEventListener('scroll', handleNavbarScroll, { passive: true });
  handleNavbarScroll(); // Run once on page load


  /* ==============================================================
     3. MOBILE NAVIGATION TOGGLE (Hamburger Menu)
        Toggles the side-drawer mobile nav and the background
        overlay. Closes on overlay click or pressing Escape.
  ============================================================== */
  const hamburger     = document.getElementById('hamburger');
  const navLinksMenu  = document.getElementById('nav-links');
  const mobileOverlay = document.getElementById('mobile-overlay');

  /** Opens the mobile navigation drawer */
  function openMobileMenu() {
    hamburger.classList.add('open');
    navLinksMenu.classList.add('open');
    mobileOverlay.classList.add('visible');
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden'; // Prevent background scroll
  }

  /** Closes the mobile navigation drawer */
  function closeMobileMenu() {
    hamburger.classList.remove('open');
    navLinksMenu.classList.remove('open');
    mobileOverlay.classList.remove('visible');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = ''; // Restore scrolling
  }

  // Toggle on hamburger button click
  hamburger.addEventListener('click', () => {
    const isOpen = hamburger.classList.contains('open');
    isOpen ? closeMobileMenu() : openMobileMenu();
  });

  // Close when clicking the dark overlay
  mobileOverlay.addEventListener('click', closeMobileMenu);

  // Close on Escape key press (accessibility)
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeMobileMenu();
      closeModal();
    }
  });


  /* ==============================================================
     4. SCROLL-TRIGGERED ANIMATIONS (IntersectionObserver)
        Watches elements with the [data-animate] attribute.
        When they enter the viewport, the '.animated' class is
        added, triggering their CSS transition from hidden to visible.
  ============================================================== */
  const animatedElements = document.querySelectorAll('[data-animate]');

  const animationObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animated');
          // Stop observing once animated — no need to reset
          animationObserver.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.12,          // Trigger when 12% of element is visible
      rootMargin: '0px 0px -40px 0px' // Slight bottom offset so it triggers a bit earlier
    }
  );

  animatedElements.forEach(el => animationObserver.observe(el));


  /* ==============================================================
     5. MODAL POPUP
        Opens when the hero "Start Free Trial" button is clicked.
        Closes via the X button, overlay click, Escape key,
        "Maybe Later" button, or the "Create Free Account" CTA.
  ============================================================== */
  const modalOverlay = document.getElementById('modal-overlay');
  const modalClose   = document.getElementById('modal-close');
  const modalDismiss = document.getElementById('modal-dismiss');
  const modalCta     = document.getElementById('modal-cta');
  const ctaOpenModal = document.getElementById('cta-open-modal');

  /** Opens the modal dialog */
  function openModal() {
    modalOverlay.classList.add('open');
    modalOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    // Move focus to the modal close button for accessibility
    setTimeout(() => modalClose.focus(), 50);
  }

  /** Closes the modal dialog */
  function closeModal() {
    modalOverlay.classList.remove('open');
    modalOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    // Return focus to trigger button
    if (ctaOpenModal) ctaOpenModal.focus();
  }

  // Open when hero CTA is clicked
  if (ctaOpenModal) {
    ctaOpenModal.addEventListener('click', openModal);
  }

  // Close buttons
  if (modalClose)   modalClose.addEventListener('click', closeModal);
  if (modalDismiss) modalDismiss.addEventListener('click', closeModal);

  // Close when clicking the backdrop (outside modal box)
  modalOverlay.addEventListener('click', function (e) {
    if (e.target === modalOverlay) closeModal();
  });

  // "Create Free Account" in modal — close modal and scroll to contact form
  if (modalCta) {
    modalCta.addEventListener('click', function (e) {
      e.preventDefault();
      closeModal();
      const contactSection = document.getElementById('contact');
      if (contactSection) {
        setTimeout(() => contactSection.scrollIntoView({ behavior: 'smooth' }), 200);
      }
    });
  }


  /* ==============================================================
     6. CONTACT FORM — Validation & Submission
        Client-side validation with real-time feedback.
        Shows field-level error messages for missing/invalid inputs.
        On success, shows a toast notification.
  ============================================================== */
  const contactForm  = document.getElementById('contact-form');
  const submitBtn    = document.getElementById('form-submit');
  const toastEl      = document.getElementById('toast');

  /**
   * Validates a single form field.
   * @param {HTMLInputElement|HTMLTextAreaElement} input - The field to validate
   * @returns {boolean} True if valid
   */
  function validateField(input) {
    const groupId = `group-${input.name}`;
    const errorId = `error-${input.name}`;
    const group   = document.getElementById(groupId);
    const error   = document.getElementById(errorId);

    // No group/error elements exist for optional fields like company
    if (!group || !error) return true;

    let message = '';

    if (input.required && !input.value.trim()) {
      // Required field is empty
      message = `${input.labels?.[0]?.textContent?.replace(' *','')?.trim() || 'This field'} is required.`;
    } else if (input.type === 'email' && input.value.trim()) {
      // Simple email format check via regex
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(input.value.trim())) {
        message = 'Please enter a valid email address.';
      }
    } else if (input.name === 'message' && input.value.trim().length > 0 && input.value.trim().length < 10) {
      // Message too short
      message = 'Message should be at least 10 characters.';
    }

    if (message) {
      // Show error state
      group.classList.add('has-error');
      group.classList.remove('is-valid');
      error.textContent = message;
      return false;
    } else {
      // Show valid state
      group.classList.remove('has-error');
      if (input.value.trim()) group.classList.add('is-valid');
      error.textContent = '';
      return true;
    }
  }

  // Real-time validation: validate each field as the user types or leaves it
  if (contactForm) {
    const formInputs = contactForm.querySelectorAll('.form-input');
    formInputs.forEach(input => {
      // Validate on blur (when user leaves the field)
      input.addEventListener('blur', () => validateField(input));
      // Re-validate on input (clears error as user corrects it)
      input.addEventListener('input', () => {
        if (input.closest('.form-group')?.classList.contains('has-error')) {
          validateField(input);
        }
      });
    });

    // Handle form submission
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault(); // Prevent default page reload

      // Validate all required fields
      const requiredInputs = contactForm.querySelectorAll('.form-input[required]');
      let isFormValid = true;

      requiredInputs.forEach(input => {
        if (!validateField(input)) isFormValid = false;
      });

      if (!isFormValid) return; // Stop if any field is invalid

      // --- Simulate async form submission ---
      submitBtn.classList.add('loading');
      submitBtn.disabled = true;

      setTimeout(() => {
        // Reset loading state
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;

        // Reset the form fields and validation states
        contactForm.reset();
        contactForm.querySelectorAll('.form-group').forEach(g => {
          g.classList.remove('is-valid', 'has-error');
        });
        contactForm.querySelectorAll('.form-error').forEach(e => {
          e.textContent = '';
        });

        // Show success toast
        showToast();
      }, 1800); // Simulate 1.8s network delay
    });
  }

  /**
   * Shows the success toast notification for 4 seconds.
   */
  function showToast() {
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 4000);
  }


  /* ==============================================================
     7. TESTIMONIALS SLIDER
        Simple dot-based navigation for the testimonials.
        On mobile (≤768px), only one card is shown at a time.
        On desktop, all 3 cards are visible in a grid (no slide needed).
  ============================================================== */
  const dots = document.querySelectorAll('.slider-dots .dot');

  // Dot click handler — sets active dot (visual feedback only on desktop,
  // but drives actual card visibility on mobile)
  dots.forEach(dot => {
    dot.addEventListener('click', function () {
      dots.forEach(d => {
        d.classList.remove('active');
        d.setAttribute('aria-selected', 'false');
      });
      this.classList.add('active');
      this.setAttribute('aria-selected', 'true');
    });
  });

  // Auto-cycle the active dot every 4 seconds (subtle engagement cue)
  let currentDot = 0;
  function cycleTestimonials() {
    currentDot = (currentDot + 1) % dots.length;
    dots.forEach((d, i) => {
      d.classList.toggle('active', i === currentDot);
      d.setAttribute('aria-selected', i === currentDot ? 'true' : 'false');
    });
  }
  const testimonialTimer = setInterval(cycleTestimonials, 4000);

  // Pause auto-cycle when user hovers over the testimonials section
  const testimonialsSection = document.getElementById('testimonials');
  if (testimonialsSection) {
    testimonialsSection.addEventListener('mouseenter', () => clearInterval(testimonialTimer));
  }


  /* ==============================================================
     8. SCROLL-TO-TOP BUTTON
        Shows after scrolling 400px down; smooth scrolls to top
        when clicked.
  ============================================================== */
  const scrollTopBtn = document.getElementById('scroll-top');

  function handleScrollTopVisibility() {
    if (window.scrollY > 400) {
      scrollTopBtn.classList.add('visible');
    } else {
      scrollTopBtn.classList.remove('visible');
    }
  }

  window.addEventListener('scroll', handleScrollTopVisibility, { passive: true });

  scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });


  /* ==============================================================
     9. DYNAMIC FOOTER YEAR
        Updates the copyright year automatically so it never goes
        out of date.
  ============================================================== */
  const yearEl = document.getElementById('footer-year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }


  /* ==============================================================
     10. HERO CHART BAR TOOLTIP (Interactive Demo)
         Shows an animated tooltip when hovering the mini dashboard
         chart bars in the hero section.
  ============================================================== */
  const chartBars = document.querySelectorAll('.chart-bar');

  // Sample revenue data for each bar
  const chartData = {
    Jan: '$42K', Feb: '$58K', Mar: '$51K',
    Apr: '$74K', May: '$89K', Jun: '$65K'
  };

  chartBars.forEach(bar => {
    // Create a tooltip element for each bar
    const tooltip = document.createElement('div');
    tooltip.classList.add('chart-tooltip');
    tooltip.style.cssText = `
      position:absolute;
      bottom:calc(100% + 6px);
      left:50%;
      transform:translateX(-50%) scale(0.8);
      background:rgba(15,23,42,0.95);
      color:#fff;
      font-size:10px;
      font-weight:700;
      padding:3px 8px;
      border-radius:6px;
      white-space:nowrap;
      pointer-events:none;
      opacity:0;
      transition:opacity 0.2s ease, transform 0.2s ease;
      font-family: 'Poppins', sans-serif;
      border: 1px solid rgba(255,255,255,0.15);
      z-index:10;
    `;
    tooltip.textContent = chartData[bar.dataset.val] || '';
    bar.style.position = 'relative';
    bar.appendChild(tooltip);

    bar.addEventListener('mouseenter', () => {
      tooltip.style.opacity  = '1';
      tooltip.style.transform = 'translateX(-50%) scale(1)';
    });
    bar.addEventListener('mouseleave', () => {
      tooltip.style.opacity  = '0';
      tooltip.style.transform = 'translateX(-50%) scale(0.8)';
    });
  });


  /* ==============================================================
     11. NAVBAR ACTIVE LINK — Fix CSS var() reference in JS
         (The handleNavbarScroll above used a template literal with
         CSS var. This replaces it with the actual pixel value.)
  ============================================================== */
  // (Already fixed inline above — no separate action needed.)


  /* ==============================================================
     12. KEYBOARD TRAP IN MODAL (Accessibility)
         Keeps focus inside the modal dialog when it is open,
         cycling through focusable elements with Tab / Shift+Tab.
  ============================================================== */
  modalOverlay.addEventListener('keydown', function (e) {
    if (!modalOverlay.classList.contains('open')) return;
    if (e.key !== 'Tab') return;

    // Collect all focusable elements inside the modal
    const focusableSelectors = 'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])';
    const focusable = [...modalOverlay.querySelectorAll(focusableSelectors)];
    if (focusable.length === 0) return;

    const firstEl = focusable[0];
    const lastEl  = focusable[focusable.length - 1];

    if (e.shiftKey) {
      // Shift + Tab: if on first element, wrap to last
      if (document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      }
    } else {
      // Tab: if on last element, wrap to first
      if (document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }
  });


  /* ==============================================================
     13. LOGO PILL HOVER ANIMATION
         Adds a subtle bounce animation to the trust logo pills
         when they are clicked (just a fun touch).
  ============================================================== */
  const logoPills = document.querySelectorAll('.logo-pill');
  logoPills.forEach(pill => {
    pill.addEventListener('click', function () {
      this.style.transform = 'scale(0.9)';
      setTimeout(() => (this.style.transform = ''), 150);
    });
  });


  /* ==============================================================
     14. FEATURE CARDS — Stagger entrance animation on load
         If IntersectionObserver fired immediately (section already
         in viewport), ensure stagger delays still look good.
  ============================================================== */
  // This is handled by CSS [data-delay] + IntersectionObserver above.


  console.log('%c⬡ Nexus Landing Page loaded successfully!', 'color:#63B3ED; font-size:14px; font-weight:bold;');

}); // End DOMContentLoaded


/* ----------------------------------------------------------------
   HELPER: Fix the nav active highlight using JS instead of
   CSS var() string (CSS var can't be read in JS template literals).
   Overrides the inline function above with a clean version.
---------------------------------------------------------------- */
(function () {
  const NAV_HEIGHT_PX = 72; // Must match --nav-height in CSS

  window.addEventListener('scroll', function () {
    const sections  = document.querySelectorAll('section[id]');
    const navLinks  = document.querySelectorAll('.nav-link[data-section]');
    let currentId   = '';

    sections.forEach(section => {
      const top = section.getBoundingClientRect().top;
      if (top <= NAV_HEIGHT_PX + 60) {
        currentId = section.id;
      }
    });

    navLinks.forEach(link => {
      link.classList.toggle('active', link.dataset.section === currentId);
    });
  }, { passive: true });
})();
