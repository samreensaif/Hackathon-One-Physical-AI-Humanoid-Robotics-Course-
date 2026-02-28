import React, { useState } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import styles from './auth.module.css';

function set(form, setForm, key) {
  return (e) => setForm({ ...form, [key]: e.target.value });
}

function RadioGroup({ name, legend, options, value, onChange }) {
  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>{legend}</legend>
      {options.map((opt) => (
        <label key={opt} className={styles.radio}>
          <input
            type="radio"
            name={name}
            value={opt}
            checked={value === opt}
            onChange={onChange}
          />
          {opt}
        </label>
      ))}
    </fieldset>
  );
}

export default function Signup() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    programmingExp: '',
    hasGPU: '',
    usedROS: '',
    learningStyle: '',
  });
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const update = (key) => set(form, setForm, key);

  const handleAccountNext = (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      setError('All fields are required.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError('');
    setStep(1);
  };

  const handleSignup = (e) => {
    e.preventDefault();
    if (!form.programmingExp || !form.hasGPU || !form.usedROS || !form.learningStyle) {
      setError('Please answer all questions.');
      return;
    }
    const user = {
      name: form.name,
      email: form.email,
      password: form.password,
      profile: {
        programmingExp: form.programmingExp,
        hasGPU: form.hasGPU,
        usedROS: form.usedROS,
        learningStyle: form.learningStyle,
      },
    };
    localStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem('auth_session', JSON.stringify({ email: form.email, name: form.name }));
    setDone(true);
    setTimeout(() => { window.location.href = '/'; }, 1500);
  };

  if (done) {
    return (
      <Layout title="Sign Up">
        <div className={styles.container}>
          <div className={styles.card}>
            <div className={styles.success}>
              <h2>Welcome, {form.name}!</h2>
              <p>Your account has been created. Redirecting…</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Sign Up – Physical AI Textbook">
      <div className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.title}>
            {step === 0 ? 'Create your account' : 'Tell us about yourself'}
          </h1>

          {step === 0 && (
            <form onSubmit={handleAccountNext}>
              <label className={styles.label}>Full Name</label>
              <input
                className={styles.input}
                type="text"
                value={form.name}
                onChange={update('name')}
                placeholder="Your name"
                autoComplete="name"
              />
              <label className={styles.label}>Email</label>
              <input
                className={styles.input}
                type="email"
                value={form.email}
                onChange={update('email')}
                placeholder="you@example.com"
                autoComplete="email"
              />
              <label className={styles.label}>Password</label>
              <input
                className={styles.input}
                type="password"
                value={form.password}
                onChange={update('password')}
                placeholder="Min. 6 characters"
                autoComplete="new-password"
              />
              {error && <p className={styles.error}>{error}</p>}
              <button className={styles.btn} type="submit">
                Continue →
              </button>
              <p className={styles.switchLink}>
                Already have an account? <Link to="/signin">Sign in</Link>
              </p>
            </form>
          )}

          {step === 1 && (
            <form onSubmit={handleSignup}>
              <p className={styles.stepLabel}>Step 2 of 2 — Help us personalise your experience</p>

              <RadioGroup
                name="programmingExp"
                legend="Programming experience"
                options={['Beginner', 'Intermediate', 'Advanced']}
                value={form.programmingExp}
                onChange={update('programmingExp')}
              />
              <RadioGroup
                name="hasGPU"
                legend="Do you have an NVIDIA GPU?"
                options={['Yes', 'No']}
                value={form.hasGPU}
                onChange={update('hasGPU')}
              />
              <RadioGroup
                name="usedROS"
                legend="Have you used ROS before?"
                options={['Yes', 'No']}
                value={form.usedROS}
                onChange={update('usedROS')}
              />
              <RadioGroup
                name="learningStyle"
                legend="Preferred learning style"
                options={['Visual', 'Reading', 'Hands-on']}
                value={form.learningStyle}
                onChange={update('learningStyle')}
              />

              {error && <p className={styles.error}>{error}</p>}

              <div className={styles.buttonRow}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => { setError(''); setStep(0); }}
                >
                  ← Back
                </button>
                <button className={styles.btn} type="submit">
                  Create Account
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
}
