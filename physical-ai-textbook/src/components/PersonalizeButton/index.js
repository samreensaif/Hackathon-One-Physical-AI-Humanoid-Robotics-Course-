import React, { useState, useEffect, useCallback } from 'react';
import Link from '@docusaurus/Link';
import styles from './PersonalizeButton.module.css';

export default function PersonalizeButton() {
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState(null); // null = not logged in
  const [state, setState] = useState('idle');    // idle | loading | done | error
  const [personalizedContent, setPersonalizedContent] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setMounted(true);
    const raw = localStorage.getItem('auth_user');
    if (raw) {
      try {
        const user = JSON.parse(raw);
        setProfile(user.profile || null);
      } catch { /* ignore */ }
    }
  }, []);

  const handlePersonalize = useCallback(async () => {
    if (!profile) return;
    setState('loading');

    const article = document.querySelector('article');
    const content = article ? article.innerText : document.body.innerText;

    const base = (typeof window !== 'undefined' && window.CHATBOT_API_URL)
      ? window.CHATBOT_API_URL
      : 'http://localhost:8000';

    try {
      const response = await fetch(`${base}/personalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          experience_level: profile.programmingExp || 'Beginner',
          has_gpu: profile.hasGPU === 'Yes',
          used_ros: profile.usedROS === 'Yes',
          learning_style: profile.learningStyle || 'Reading',
        }),
      });
      if (!response.ok) throw new Error(`Server error ${response.status}`);
      const data = await response.json();
      setPersonalizedContent(data.personalized_content);
      setState('done');
    } catch (err) {
      setErrorMsg(err.message);
      setState('error');
    }
  }, [profile]);

  const handleShowOriginal = useCallback(() => {
    setState('idle');
    setPersonalizedContent('');
    setErrorMsg('');
  }, []);

  // Avoid SSR mismatch
  if (!mounted) return null;

  // Not logged in
  if (!profile) {
    return (
      <div className={styles.container}>
        <span className={styles.loginPrompt}>
          ✨{' '}
          <Link to="/signin">Sign in</Link>{' '}
          to get content personalised to your experience level.
        </span>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {state === 'idle' && (
        <button className={styles.personalizeBtn} onClick={handlePersonalize}>
          ✨ Personalize for Me
        </button>
      )}

      {state === 'loading' && (
        <button className={styles.personalizeBtn} disabled>
          ⏳ Personalizing…
        </button>
      )}

      {state === 'error' && (
        <div className={styles.row}>
          <button className={styles.personalizeBtn} onClick={handlePersonalize}>
            ✨ Personalize for Me
          </button>
          <span className={styles.error}>Failed: {errorMsg}</span>
        </div>
      )}

      {state === 'done' && (
        <div>
          <div className={styles.row}>
            <span className={styles.badge}>
              ✨ Personalized for {profile.programmingExp} · {profile.learningStyle} learner
            </span>
            <button className={styles.showOriginalBtn} onClick={handleShowOriginal}>
              📄 Show Original
            </button>
          </div>
          <div className={styles.personalizedContent}>
            {personalizedContent}
          </div>
        </div>
      )}
    </div>
  );
}
