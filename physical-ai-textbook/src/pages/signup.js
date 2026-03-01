import React, { useState } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import styles from './auth.module.css';

function set(form, setForm, key) {
  return (e) => setForm({ ...form, [key]: e.target.value });
}

// Options may be plain strings OR objects { value, label }
function RadioGroup({ name, legend, options, value, onChange }) {
  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>{legend}</legend>
      {options.map((opt) => {
        const val = typeof opt === 'object' ? opt.value : opt;
        const lbl = typeof opt === 'object' ? opt.label : opt;
        return (
          <label key={val} className={styles.radio}>
            <input
              type="radio"
              name={name}
              value={val}
              checked={value === val}
              onChange={onChange}
            />
            {lbl}
          </label>
        );
      })}
    </fieldset>
  );
}

// T033: Validate email format
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function Signup() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    programmingExp: '',
    hasGPU: '',
    rosExperience: '',   // T030: replaces usedROS boolean (now "none"/"some"/"expert")
    learningStyle: '',
  });
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const update = (key) => set(form, setForm, key);

  // T033: Email format + password length validation
  const handleAccountNext = (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      setError('All fields are required.');
      return;
    }
    if (!isValidEmail(form.email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError('');
    setStep(1);
  };

  // T034: All 4 questions must be answered before submission
  const onboardingComplete =
    form.programmingExp && form.hasGPU && form.rosExperience && form.learningStyle;

  const handleSignup = (e) => {
    e.preventDefault();
    if (!onboardingComplete) {
      setError('Please answer all questions.');
      return;
    }
    // T030: Store rosExperience (enum) instead of usedROS (boolean)
    const user = {
      name: form.name,
      email: form.email,
      password: form.password,
      profile: {
        programmingExp: form.programmingExp,
        hasGPU: form.hasGPU,
        rosExperience: form.rosExperience,
        learningStyle: form.learningStyle,
      },
    };
    localStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem('auth_session', JSON.stringify({ email: form.email, name: form.name }));
    setDone(true);
    // T035: Redirect after showing welcome message
    setTimeout(() => { window.location.href = '/Hackathon-One-Physical-AI-Humanoid-Robotics-Course-/'; }, 2000);
  };

  if (done) {
    return (
      <Layout title="Sign Up">
        <div className={styles.container}>
          <div className={styles.card}>
            <div className={styles.success}>
              <h2>Welcome, {form.name}! 🎉</h2>
              <p>Your personalized learning path is ready. Redirecting…</p>
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
              {/* T029: 3-level ROS experience (replaces Yes/No boolean) */}
              <RadioGroup
                name="rosExperience"
                legend="ROS experience level"
                options={[
                  { value: 'none', label: "None — I've never used ROS" },
                  { value: 'some', label: "Some — I've dabbled with ROS 1 or ROS 2" },
                  { value: 'expert', label: "Expert — I'm proficient with ROS 2" },
                ]}
                value={form.rosExperience}
                onChange={update('rosExperience')}
              />
              <RadioGroup
                name="learningStyle"
                legend="Preferred learning style"
                options={['Visual', 'Reading', 'Hands-on']}
                value={form.learningStyle}
                onChange={update('learningStyle')}
              />

              {/* T034: Visual indicator when not all questions answered */}
              {!onboardingComplete && (
                <p className={styles.stepLabel} style={{ color: '#888', fontSize: '0.85rem' }}>
                  ↑ Please answer all questions above to continue
                </p>
              )}

              {error && <p className={styles.error}>{error}</p>}

              <div className={styles.buttonRow}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => { setError(''); setStep(0); }}
                >
                  ← Back
                </button>
                {/* T034: Button disabled until all 4 questions are answered */}
                <button
                  className={styles.btn}
                  type="submit"
                  disabled={!onboardingComplete}
                  style={{ opacity: onboardingComplete ? 1 : 0.5, cursor: onboardingComplete ? 'pointer' : 'not-allowed' }}
                >
                  Complete Setup
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
}
