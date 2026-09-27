/**
 * Priyanshu Astwal - Short & Clean Portfolio JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Typewriter Effect
    const typewriterText = document.getElementById('typewriterText');
    const roles = [
        'Full-Stack Web Developer',
        'Modern UI/UX Designer',
        'Problem Solver & Builder',
        'React & Node Specialist'
    ];
    let roleIdx = 0;
    let charIdx = 0;
    let isDeleting = false;

    function type() {
        if (!typewriterText) return;
        const current = roles[roleIdx];

        if (isDeleting) {
            typewriterText.textContent = current.substring(0, charIdx - 1);
            charIdx--;
        } else {
            typewriterText.textContent = current.substring(0, charIdx + 1);
            charIdx++;
        }

        let speed = isDeleting ? 40 : 90;

        if (!isDeleting && charIdx === current.length) {
            isDeleting = true;
            speed = 1800; // Pause when complete
        } else if (isDeleting && charIdx === 0) {
            isDeleting = false;
            roleIdx = (roleIdx + 1) % roles.length;
            speed = 400; // Pause before new word
        }

        setTimeout(type, speed);
    }
    type();

    // 2. Active Nav Link on Scroll
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('section[id]');

    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY + 120;

        sections.forEach(sec => {
            const top = sec.offsetTop;
            const height = sec.offsetHeight;
            const id = sec.getAttribute('id');

            if (scrollY >= top && scrollY < top + height) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${id}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    });

    // 3. Mobile Navigation Drawer
    const mobileToggle = document.getElementById('mobileToggle');
    const navMenu = document.getElementById('navMenu');

    if (mobileToggle && navMenu) {
        mobileToggle.addEventListener('click', () => {
            navMenu.classList.toggle('open');
        });

        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('open');
            });
        });
    }

    // 4. Toast Notification
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');

    function showToast(message) {
        if (!toast || !toastMsg) return;
        toastMsg.textContent = message;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 4000);
    }

    // 5. Resume Download Action
    const cvDownloadBtn = document.getElementById('cvDownloadBtn');
    if (cvDownloadBtn) {
        cvDownloadBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showToast('Preparing Priyanshu Astwal\'s Resume for download!');
            setTimeout(() => {
                document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
            }, 500);
        });
    }

    // 6. Contact Form Submission
    const contactForm = document.getElementById('contactForm');
    const submitBtn = document.getElementById('submitBtn');

    if (contactForm && submitBtn) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<span>Sending...</span> <i class="fa-solid fa-spinner fa-spin"></i>`;

            setTimeout(() => {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
                contactForm.reset();
                showToast('Thank you! Your message has been sent successfully.');
            }, 1000);
        });
    }

    // 7. Footer Dynamic Year
    const currentYear = document.getElementById('currentYear');
    if (currentYear) {
        currentYear.textContent = new Date().getFullYear();
    }
});
