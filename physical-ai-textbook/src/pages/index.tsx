import type {ReactNode} from 'react';
import {useState, useEffect} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';

import styles from './index.module.css';

// ── Chapter data for recommendations ─────────────────────────────────────────

type Chapter = {
  id: string;
  title: string;
  module: string;
  path: string;
  gpuRequired?: boolean;
};

const ALL_CHAPTERS: Chapter[] = [
  // Module 1 – ROS 2 Fundamentals
  { id: 'm1c1', title: 'Introduction to ROS 2', module: 'Module 1: ROS 2', path: '/docs/module1-ros2/chapter1' },
  { id: 'm1c2', title: 'ROS 2 Nodes & Topics', module: 'Module 1: ROS 2', path: '/docs/module1-ros2/chapter2' },
  { id: 'm1c3', title: 'Services & Actions', module: 'Module 1: ROS 2', path: '/docs/module1-ros2/chapter3' },
  { id: 'm1c4', title: 'ROS 2 Packages & Launch', module: 'Module 1: ROS 2', path: '/docs/module1-ros2/chapter4' },
  // Module 2 – Simulation
  { id: 'm2c1', title: 'Intro to Gazebo & Unity', module: 'Module 2: Simulation', path: '/docs/module2-simulation/chapter1' },
  { id: 'm2c2', title: 'Building Robot Models', module: 'Module 2: Simulation', path: '/docs/module2-simulation/chapter2' },
  { id: 'm2c3', title: 'GPU-Accelerated Simulation', module: 'Module 2: Simulation', path: '/docs/module2-simulation/chapter3', gpuRequired: true },
  { id: 'm2c4', title: 'Sensor Simulation & ROS Bridge', module: 'Module 2: Simulation', path: '/docs/module2-simulation/chapter4', gpuRequired: true },
  // Module 3 – NVIDIA Isaac
  { id: 'm3c1', title: 'Isaac Sim Overview', module: 'Module 3: NVIDIA Isaac', path: '/docs/module3-isaac/chapter1', gpuRequired: true },
  { id: 'm3c2', title: 'Isaac + Nav2 Integration', module: 'Module 3: NVIDIA Isaac', path: '/docs/module3-isaac/chapter2', gpuRequired: true },
  { id: 'm3c3', title: 'Perception Pipelines', module: 'Module 3: NVIDIA Isaac', path: '/docs/module3-isaac/chapter3', gpuRequired: true },
  { id: 'm3c4', title: 'Isaac SDK & Deployment', module: 'Module 3: NVIDIA Isaac', path: '/docs/module3-isaac/chapter4', gpuRequired: true },
  // Module 4 – VLA Models
  { id: 'm4c1', title: 'Vision-Language-Action Models', module: 'Module 4: VLA', path: '/docs/module4-vla/chapter1' },
  { id: 'm4c2', title: 'Training VLA Models', module: 'Module 4: VLA', path: '/docs/module4-vla/chapter2' },
  { id: 'm4c3', title: 'Deploying VLA on Robots', module: 'Module 4: VLA', path: '/docs/module4-vla/chapter3' },
  { id: 'm4c4', title: 'Capstone: End-to-End Physical AI', module: 'Module 4: VLA', path: '/docs/module4-vla/chapter4' },
];

// T037: Map experience level to recommended chapter IDs
function getRecommendedChapters(profile: {
  programmingExp: string;
  hasGPU: string;
  rosExperience: string;
  learningStyle: string;
}): Chapter[] {
  const exp = profile.programmingExp || 'Beginner';
  let ids: string[];
  if (exp === 'Beginner') {
    ids = ['m1c1', 'm1c2', 'm2c1', 'm2c2'];
  } else if (exp === 'Intermediate') {
    ids = ['m1c3', 'm1c4', 'm2c1', 'm2c2', 'm2c3'];
  } else {
    // Advanced
    ids = ['m3c1', 'm3c2', 'm3c3', 'm3c4', 'm4c1', 'm4c2'];
  }
  return ALL_CHAPTERS.filter((c) => ids.includes(c.id));
}

// ── Personalized recommendations section ─────────────────────────────────────

type UserProfile = {
  programmingExp: string;
  hasGPU: string;
  rosExperience: string;
  learningStyle: string;
} | null;

function PersonalizedSection({ userProfile }: { userProfile: UserProfile }) {
  // T041: Unauthenticated → sign-up CTA
  if (!userProfile) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'var(--ifm-color-emphasis-100)', margin: '2rem 0', borderRadius: '8px' }}>
        <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
          🎯 Get chapter recommendations tailored to your background
        </p>
        <Link className="button button--primary button--lg" to="/signup">
          Sign Up for Personalized Path →
        </Link>
      </div>
    );
  }

  const recommended = getRecommendedChapters(userProfile);
  const hasGpu = userProfile.hasGPU === 'Yes';

  return (
    <section style={{ padding: '2rem 0' }}>
      <div className="container">
        <Heading as="h2">Recommended for You</Heading>
        <p style={{ color: 'var(--ifm-color-emphasis-600)', marginBottom: '1rem' }}>
          Based on your <strong>{userProfile.programmingExp}</strong> experience level
          {userProfile.rosExperience !== 'none' ? ` and ${userProfile.rosExperience} ROS experience` : ''}.
        </p>

        {/* T038: GPU notice for users without GPU */}
        {!hasGpu && (
          <div style={{
            background: 'var(--ifm-color-warning-contrast-background)',
            border: '1px solid var(--ifm-color-warning)',
            borderRadius: '6px',
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            fontSize: '0.9rem',
          }}>
            💡 Some chapters use GPU simulation — marked with 🖥️. Skip these or use cloud GPU alternatives (Google Colab, Lambda Labs).
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
          {recommended.map((chapter) => (
            <Link
              key={chapter.id}
              to={chapter.path}
              style={{ textDecoration: 'none' }}
            >
              <div style={{
                border: '1px solid var(--ifm-color-emphasis-300)',
                borderRadius: '8px',
                padding: '1rem',
                height: '100%',
                transition: 'box-shadow 0.2s',
              }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
              >
                <div style={{ fontSize: '0.75rem', color: 'var(--ifm-color-emphasis-600)', marginBottom: '0.25rem' }}>
                  {chapter.module}
                  {chapter.gpuRequired && !hasGpu && (
                    <span style={{ marginLeft: '0.5rem' }} title="GPU recommended">🖥️</span>
                  )}
                </div>
                <div style={{ fontWeight: 600, color: 'var(--ifm-color-content)' }}>
                  {chapter.title}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Header ────────────────────────────────────────────────────────────────────

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/module1-ros2/chapter1">
            Start Reading →
          </Link>
        </div>
      </div>
    </header>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  // T036: Read user profile from localStorage on mount
  const [userProfile, setUserProfile] = useState<UserProfile>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('auth_user');
      if (raw) {
        const user = JSON.parse(raw);
        if (user?.profile) setUserProfile(user.profile);
      }
    } catch {
      // localStorage unavailable or malformed — use default (null = unauthenticated)
    }
  }, []);

  return (
    <Layout
      title={`${siteConfig.title}`}
      description="AI-native textbook covering Physical AI and Humanoid Robotics — ROS 2, Simulation, NVIDIA Isaac, and VLA Models.">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
        {/* T036-T041: Personalized section — recommendations or sign-up CTA */}
        <PersonalizedSection userProfile={userProfile} />
      </main>
    </Layout>
  );
}
