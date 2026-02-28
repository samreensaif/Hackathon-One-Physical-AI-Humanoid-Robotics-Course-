import React, { useState, useCallback } from 'react';
import styles from './TranslateButton.module.css';

export default function TranslateButton() {
  const [state, setState] = useState('idle'); // idle | loading | translated | error
  const [translatedText, setTranslatedText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleTranslate = useCallback(async () => {
    setState('loading');

    // Grab visible chapter text from the article element
    const article = document.querySelector('article');
    const text = article ? article.innerText : document.body.innerText;

    const base = (typeof window !== 'undefined' && window.CHATBOT_API_URL)
      ? window.CHATBOT_API_URL
      : 'http://localhost:8000';

    try {
      const response = await fetch(`${base}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, target_language: 'urdu' }),
      });
      if (!response.ok) throw new Error(`Server error ${response.status}`);
      const data = await response.json();
      setTranslatedText(data.translated_text);
      setState('translated');
    } catch (err) {
      setErrorMsg(err.message);
      setState('error');
    }
  }, []);

  const handleShowOriginal = useCallback(() => {
    setState('idle');
    setTranslatedText('');
    setErrorMsg('');
  }, []);

  return (
    <div className={styles.container}>
      {(state === 'idle' || state === 'error') && (
        <div className={styles.row}>
          <button className={styles.translateBtn} onClick={handleTranslate}>
            🌐 Translate to Urdu
          </button>
          {state === 'error' && (
            <span className={styles.error}>Translation failed: {errorMsg}</span>
          )}
        </div>
      )}

      {state === 'loading' && (
        <button className={styles.translateBtn} disabled>
          ⏳ Translating…
        </button>
      )}

      {state === 'translated' && (
        <div>
          <button className={styles.showOriginalBtn} onClick={handleShowOriginal}>
            📖 Show Original English
          </button>
          <div className={styles.translatedContent} dir="rtl" lang="ur">
            {translatedText}
          </div>
        </div>
      )}
    </div>
  );
}
