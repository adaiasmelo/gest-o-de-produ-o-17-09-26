import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Polyfill/monkeypatch to prevent html2canvas oklch color parsing crash
// Tailwind v4 uses oklch colors by default, which throws an error in html2canvas.
// By intercepting window.getComputedStyle, we can dynamically translate any computed oklch color into sRGB rgb/rgba.

function oklchToRgb(l: number, c: number, h: number, a: number = 1): string {
  // 1. Convert h from degrees to radians
  const hRad = (h * Math.PI) / 180;
  
  // 2. OKLCH to OKLAB
  const L = l;
  const a_ = c * Math.cos(hRad);
  const b_ = c * Math.sin(hRad);

  // 3. OKLAB to LMS
  const l_ = L + 0.3963377774 * a_ + 0.2158037573 * b_;
  const m_ = L - 0.1055613458 * a_ - 0.0638541728 * b_;
  const s_ = L - 0.0894841775 * a_ - 1.291485548 * b_;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  // 4. LMS to Linear RGB
  const rL = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const gL = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const bL = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;

  // 5. Linear RGB to sRGB gamma compression
  const f = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
  const r = Math.round(Math.max(0, Math.min(1, f(rL))) * 255);
  const g = Math.round(Math.max(0, Math.min(1, f(gL))) * 255);
  const b = Math.round(Math.max(0, Math.min(1, f(bL))) * 255);

  if (a < 1) {
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  return `rgb(${r}, ${g}, ${b})`;
}

function replaceOklchWithRgb(str: string): string {
  if (!str || typeof str !== 'string' || !str.includes('oklch')) return str;
  
  return str.replace(/oklch\(([^)]+)\)/g, (match, p1) => {
    try {
      const parts = p1.trim().split(/[\s,/]+/);
      if (parts.length < 3) return match;
      
      let l = parseFloat(parts[0]);
      if (parts[0].includes('%')) l = l / 100;
      
      let c = parseFloat(parts[1]);
      if (parts[1].includes('%')) c = c / 100;
      
      let h = parseFloat(parts[2]);
      
      let a = 1;
      if (parts.length >= 4) {
        a = parseFloat(parts[3]);
        if (parts[3].includes('%')) a = a / 100;
      }
      
      if (isNaN(l) || isNaN(c) || isNaN(h)) return match;
      
      return oklchToRgb(l, c, h, isNaN(a) ? 1 : a);
    } catch (e) {
      return match;
    }
  });
}

const originalGetComputedStyle = window.getComputedStyle;
(window as any).getComputedStyle = function (elt: Element, pseudoElt?: string | null) {
  if (!elt) return null;
  const ownerWindow = elt?.ownerDocument?.defaultView || window;
  const style = originalGetComputedStyle.call(ownerWindow, elt, pseudoElt);
  if (!style) return style;
  
  return new Proxy(style, {
    get(target, prop) {
      if (prop === 'getPropertyValue') {
        return function(propertyName: string) {
          const val = target.getPropertyValue(propertyName);
          return typeof val === 'string' ? replaceOklchWithRgb(val) : val;
        };
      }
      
      const value = (target as any)[prop];
      
      if (typeof value === 'function') {
        return value.bind(target);
      }
      
      if (typeof value === 'string') {
        return replaceOklchWithRgb(value);
      }
      
      return value;
    }
  });
};

const updateSW = registerSW({
  onNeedRefresh() {
    console.log('PWA: Nova versão detectada');
    (window as any).refreshAppVersion = () => {
      updateSW(true);
    };
    window.dispatchEvent(new CustomEvent('pwa-update-available'));
  },
  onOfflineReady() {
    console.log('PWA: App pronto para uso offline');
  },
  onRegistered(r) {
    console.log('PWA: Service Worker registrado com sucesso:', r);
  },
  onRegisterError(error) {
    console.log('PWA: Erro ao registrar Service Worker:', error);
  }
});

const isCalculatorRoute = () => {
  if (typeof window === 'undefined') return false;
  try {
    const href = (window.location.href || '').toLowerCase();
    const search = (window.location.search || '').toLowerCase();
    const hash = (window.location.hash || '').toLowerCase();
    const pathname = (window.location.pathname || '').toLowerCase();

    return (
      search.includes('page=calculadora') ||
      search.includes('calculadora') ||
      search.includes('cast1') ||
      search.includes('cash1') ||
      search.includes('calc') ||
      hash.includes('calculadora') ||
      hash.includes('cast1') ||
      hash.includes('cash1') ||
      pathname.includes('calculadora') ||
      pathname.includes('cast1') ||
      pathname.includes('cash1') ||
      href.includes('calculadora') ||
      href.includes('cast1') ||
      href.includes('cash1')
    );
  } catch (e) {
    return false;
  }
};

import { Cast1CalculatorStandalone } from './components/Cast1CalculatorStandalone';

const RootApp: React.FC = () => {
  const [isCalculator, setIsCalculator] = React.useState(() => isCalculatorRoute());

  React.useEffect(() => {
    const handleUrlChange = () => {
      setIsCalculator(isCalculatorRoute());
    };
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  if (isCalculator) {
    return (
      <Cast1CalculatorStandalone
        systemLogo="https://static.wixstatic.com/media/765089_472b535780514937a09c07be49495392~mv2.png"
        onNavigateToApp={() => {
          try {
            window.history.pushState({}, '', '/');
          } catch {}
          setIsCalculator(false);
        }}
      />
    );
  }

  return <App />;
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>
);