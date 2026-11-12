// Liquid Glass initialization for Yuujin Circle
// Applies glass morphism to elements with .liquid-gl class

// Initialize liquidGL after DOM is ready
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    initLiquidGL();
  });
}

function initLiquidGL() {
  const liquidGL = (window as any).liquidGL;
  if (!liquidGL) return;

  // Apply glass to designated target elements
  const targets = document.querySelectorAll('.liquid-gl');

  targets.forEach((target, index) => {
    try {
      const lens = liquidGL({
        target: target,
        snapshot: 'body',
        resolution: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--glass-resolution') || '2.0'),
        refraction: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--glass-refraction') || '0.01'),
        aberration: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--glass-aberration') || '0'),
        bevelDepth: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--glass-bevel-depth') || '0.08'),
        bevelWidth: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--glass-bevel-width') || '0.15'),
        frost: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--glass-frost') || '0'),
        shadow: getComputedStyle(document.documentElement).getPropertyValue('--glass-shadow') === 'true',
        specular: getComputedStyle(document.documentElement).getPropertyValue('--glass-specular') !== 'false',
        tint: getComputedStyle(document.documentElement).getPropertyValue('--glass-tint') || 'null',
        zIndex: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--glass-z-index') || '90'),
        engine: 'auto',
      });

      // Store lens reference for potential cleanup
      (target as any).__liquidGLLens = lens;
    } catch (e) {
      // If liquidGL fails on an element, skip it silently
      console.warn('liquidGL skipped for element:', target, e);
    }
  });
}

// Export for manual cleanup if needed
export function cleanupLiquidGL() {
  const targets = document.querySelectorAll('.liquid-gl');
  targets.forEach((target) => {
    const lens = (target as any).__liquidGLLens;
    if (lens && typeof lens.destroy === 'function') {
      lens.destroy();
    }
  });
}