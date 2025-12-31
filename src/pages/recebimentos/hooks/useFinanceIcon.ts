import { useState, useEffect } from 'react';

export function useFinanceIcon() {
  const [iconHtml, setIconHtml] = useState<string>('');

  useEffect(() => {
    const linkId = 'finance-icon-css';
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = '/images/Extrato_bancario/finance-styles.css';
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/images/Extrato_bancario/finance-not-css.svg')
      .then((r) => r.text())
      .then((text) => {
        if (!active) return;
        setIconHtml(text);
      })
      .catch(() => {
        setIconHtml('');
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const emptySvg = document.querySelector('.empty-icon #freepik_stories-finance') as SVGElement | null;
    if (emptySvg) {
      emptySvg.setAttribute('width', '100%');
      emptySvg.removeAttribute('height');
      emptySvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    }
  }, [iconHtml]);

  return iconHtml;
}
