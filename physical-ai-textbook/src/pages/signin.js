import React, { useState } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import styles from './auth.module.css';

export default function Signin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSignin = (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    const raw = localStorage.getItem('auth_user');
    if (!raw) {
      setError('No account found. Please sign up first.');
      return;
    }
    const user = JSON.parse(raw);
    if (user.email !== email || user.password !== password) {
      setError('Incorrect email or password.');
      return;
    }
    localStorage.setItem('auth_session', JSON.stringify({ email: user.email, name: user.name }));
    setDone(true);
    setTimeout(() => { window.location.href = '/Hackathon-One-Physical-AI-Humanoid-Robotics-Course-/'; }, 1000);
  };

  if (done) {
    return (
      <Layout title="Sign In">
        <div className={styles.container}>
          <div className={styles.card}>
            <div className={styles.success}>
              <h2>Signed in!</h2>
              <p>Redirecting to the homepage…</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Sign In – Physical AI Textbook">
      <div className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.title}>Sign in</h1>
          <form onSubmit={handleSignin}>
            <label className={styles.label}>Email</label>
            <input
              className={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
            <label className={styles.label}>Password</label>
            <input
              className={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              autoComplete="current-password"
            />
            {error && <p className={styles.error}>{error}</p>}
            <button className={styles.btn} type="submit">
              Sign In
            </button>
            <p className={styles.switchLink}>
              Don't have an account? <Link to="/signup">Sign up</Link>
            </p>
          </form>
        </div>
      </div>
    </Layout>
  );
}
