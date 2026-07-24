// Animation Manager using GSAP

export class AnimationManager {
  constructor() {
    this.timeline = null;
  }

  animateElement(element, duration = 0.5, options = {}) {
    if (!element) return;
    
    const defaultOptions = {
      duration,
      opacity: 1,
      y: 0,
      x: 0,
      scale: 1,
      ...options
    };

    return gsap.to(element, defaultOptions);
  }

  animateHeartBeat(element) {
    return gsap.to(element, {
      duration: 0.1,
      scale: 1.2,
      yoyo: true,
      repeat: 10,
      ease: "power2.inOut"
    });
  }

  animateSlideIn(element, direction = 'up') {
    const startPosition = {
      up: { y: 30, opacity: 0 },
      down: { y: -30, opacity: 0 },
      left: { x: -30, opacity: 0 },
      right: { x: 30, opacity: 0 }
    };

    gsap.set(element, startPosition[direction]);
    return gsap.to(element, {
      duration: 0.5,
      y: 0,
      x: 0,
      opacity: 1,
      ease: "power2.out"
    });
  }

  animatePulse(element, duration = 1) {
    return gsap.to(element, {
      duration: duration / 2,
      scale: 1.1,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut"
    });
  }

  animateFloat(element, distance = 20) {
    return gsap.to(element, {
      duration: 3,
      y: -distance,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut"
    });
  }

  animateShake(element, intensity = 10) {
    return gsap.to(element, {
      duration: 0.1,
      x: intensity,
      yoyo: true,
      repeat: 5,
      ease: "power2.inOut"
    });
  }

  animateCountUp(element, start = 0, end = 100, duration = 1) {
    const obj = { value: start };
    return gsap.to(obj, {
      duration,
      value: end,
      onUpdate: () => {
        element.textContent = Math.floor(obj.value);
      }
    });
  }

  staggerElements(elements, duration = 0.5, stagger = 0.1, options = {}) {
    return gsap.to(elements, {
      duration,
      opacity: 1,
      y: 0,
      stagger,
      ease: "power2.out",
      ...options
    });
  }
}

export default AnimationManager;
