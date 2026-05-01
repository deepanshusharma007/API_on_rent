// Shared Framer Motion variants used across all pages

// Shared Framer Motion variants — tuned for polished, subtle feel
const EASE = [0.22, 1, 0.36, 1]; // custom ease-out expo

export const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
};

export const fadeLeft = {
  hidden: { opacity: 0, x: -24 },
  show:   { opacity: 1, x: 0, transition: { duration: 0.5, ease: EASE } },
};

export const fadeRight = {
  hidden: { opacity: 0, x: 24 },
  show:   { opacity: 1, x: 0, transition: { duration: 0.5, ease: EASE } },
};

export const staggerContainer = (staggerChildren = 0.08, delayChildren = 0) => ({
  hidden: {},
  show:   { transition: { staggerChildren, delayChildren } },
});

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  show:   { opacity: 1, scale: 1, transition: { duration: 0.45, ease: EASE } },
};

export const viewport = { once: true, margin: '-48px' };
