import React, { useEffect, useState } from 'react';
import Link from '@docusaurus/Link';
import styles from './AuthButtons.module.css';

export default function AuthButtons({ mobile }) {
  const [session, setSession] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const raw = localStorage.getItem('auth_session');
    if (raw) {
      try { setSession(JSON.parse(raw)); } catch { /* ignore */ }
    }
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('auth_session');
    window.location.href = '/Hackathon-One-Physical-AI-Humanoid-Robotics-Course-/';
  };

  // Avoid SSR mismatch — render nothing until mounted on client
  if (!mounted) return null;

  if (session) {
    return (
      <div className={mobile ? styles.mobileWrap : styles.wrap}>
        <span className={styles.greeting}>
          👤 {session.name || session.email}
        </span>
        <button className={styles.signOutBtn} onClick={handleSignOut}>
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className={mobile ? styles.mobileWrap : styles.wrap}>
      <Link className={styles.signInLink} to="/signin">
        Sign In
      </Link>
      <Link className={styles.signUpBtn} to="/signup">
        Sign Up
      </Link>
    </div>
  );
}
