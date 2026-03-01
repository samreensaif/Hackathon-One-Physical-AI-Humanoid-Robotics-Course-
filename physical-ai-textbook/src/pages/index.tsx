import type {ReactNode} from 'react';
import {useState, useEffect} from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import styles from './index.module.css';

type Chapter = {
  id: string; title: string; module: string; path: string; gpuRequired?: boolean;
};

const ALL_CHAPTERS: Chapter[] = [
  { id: 'm1c1', title: 'Introduction to ROS 2', module: 'Module 1: ROS 2', path: '/docs/module1-ros2/chapter1' },
  { id: 'm1c2', title: 'ROS 2 Nodes & Topics', module: 'Module 1: ROS 2', path: '/docs/module1-ros2/chapter2' },
  { id: 'm1c3', title: 'Services & Actions', module: 'Module 1: ROS 2', path: '/docs/module1-ros2/chapter3' },
  { id: 'm1c4', title: 'ROS 2 Packages & Launch', module: 'Module 1: ROS 2', path: '/docs/module1-ros2/chapter4' },
  { id: 'm2c1', title: 'Intro to Gazebo & Unity', module: 'Module 2: Simulation', path: '/docs/module2-simulation/chapter1' },
  { id: 'm2c2', title: 'Building Robot Models', module: 'Module 2: Simulation', path: '/docs/module2-simulation/chapter2' },
  { id: 'm2c3', title: 'GPU-Accelerated Simulation', module: 'Module 2: Simulation', path: '/docs/module2-simulation/chapter3', gpuRequired: true },
  { id: 'm2c4', title: 'Sensor Simulation & ROS Bridge', module: 'Module 2: Simulation', path: '/docs/module2-simulation/chapter4', gpuRequired: true },
  { id: 'm3c1', title: 'Isaac Sim Overview', module: 'Module 3: NVIDIA Isaac', path: '/docs/module3-isaac/chapter1', gpuRequired: true },
  { id: 'm3c2', title: 'Isaac + Nav2 Integration', module: 'Module 3: NVIDIA Isaac', path: '/docs/module3-isaac/chapter2', gpuRequired: true },
  { id: 'm3c3', title: 'Perception Pipelines', module: 'Module 3: NVIDIA Isaac', path: '/docs/module3-isaac/chapter3', gpuRequired: true },
  { id: 'm3c4', title: 'Isaac SDK & Deployment', module: 'Module 3: NVIDIA Isaac', path: '/docs/module3-isaac/chapter4', gpuRequired: true },
  { id: 'm4c1', title: 'Vision-Language-Action Models', module: 'Module 4: VLA', path: '/docs/module4-vla/chapter1' },
  { id: 'm4c2', title: 'Training VLA Models', module: 'Module 4: VLA', path: '/docs/module4-vla/chapter2' },
  { id: 'm4c3', title: 'Deploying VLA on Robots', module: 'Module 4: VLA', path: '/docs/module4-vla/chapter3' },
  { id: 'm4c4', title: 'Capstone: End-to-End Physical AI', module: 'Module 4: VLA', path: '/docs/module4-vla/chapter4' },
];

const MODULES = [
  { num: '01', icon: '🤖', title: 'ROS 2', subtitle: 'Robotic Nervous System', desc: 'Master the middleware that powers modern robotics.', topics: ['Nodes & Topics', 'Services', 'URDF', 'rclpy'], path: '/docs/module1-ros2/chapter1', accent: '#00d4ff' },
  { num: '02', icon: '🌐', title: 'Digital Twin', subtitle: 'Gazebo & Unity', desc: 'Simulate physics, sensors, and environments at scale.', topics: ['Gazebo', 'Unity', 'LiDAR', 'IMU'], path: '/docs/module2-simulation/chapter1', accent: '#7b2fff' },
  { num: '03', icon: '⚡', title: 'NVIDIA Isaac', subtitle: 'AI-Robot Brain', desc: 'Photorealistic simulation and hardware-accelerated AI.', topics: ['Isaac Sim', 'VSLAM', 'Nav2', 'Perception'], path: '/docs/module3-isaac/chapter1', accent: '#00ff88' },
  { num: '04', icon: '🧠', title: 'VLA Models', subtitle: 'Vision-Language-Action', desc: 'Bridge LLMs and physical robots with voice control.', topics: ['Whisper', 'LLM Planning', 'OpenAI', 'Capstone'], path: '/docs/module4-vla/chapter1', accent: '#ff6b00' },
];

function getRecommendedChapters(profile: any): Chapter[] {
  const exp = profile.programmingExp || 'Beginner';
  let ids: string[];
  if (exp === 'Beginner') ids = ['m1c1', 'm1c2', 'm2c1', 'm2c2'];
  else if (exp === 'Intermediate') ids = ['m1c3', 'm1c4', 'm2c1', 'm2c3'];
  else ids = ['m3c1', 'm3c2', 'm3c3', 'm4c1', 'm4c2'];
  return ALL_CHAPTERS.filter((c) => ids.includes(c.id));
}

function PersonalizedSection({ userProfile }: { userProfile: any }) {
  if (!userProfile) {
    return (
      <section className={styles.personalizedSection}>
        <div className="container">
          <div className={styles.ctaCard}>
            <div className={styles.ctaTitle}>🎯 Get Your Personalized Learning Path</div>
            <p className={styles.ctaText}>
              Tell us your background — we'll recommend the right chapters for your skill level, hardware, and learning style.
            </p>
            <Link className={styles.btnPrimary} to="/signup">
              Create Free Account →
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const recommended = getRecommendedChapters(userProfile);
  const hasGpu = userProfile.hasGPU === 'Yes';

  return (
    <section className={styles.personalizedSection}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <div className={styles.sectionEyebrow}>// PERSONALIZED PATH</div>
          <div className={styles.sectionTitle}>Recommended for You</div>
          <p className={styles.sectionSub}>
            Based on your <strong style={{color: 'var(--neon-cyan)'}}>{userProfile.programmingExp}</strong> experience
            {userProfile.rosExperience !== 'none' ? ` · ${userProfile.rosExperience} ROS` : ''}
          </p>
        </div>
        {!hasGpu && (
          <div className={styles.gpuWarning}>
            ⚡ Some chapters require a GPU — marked with an orange badge. Use cloud alternatives like Google Colab or Lambda Labs.
          </div>
        )}
        <div className={styles.recommendGrid}>
          {recommended.map((chapter) => (
            <Link key={chapter.id} to={chapter.path} className={styles.recommendCard}>
              <div className={styles.recommendModule}>{chapter.module}</div>
              <div className={styles.recommendTitle}>
                {chapter.title}
                {chapter.gpuRequired && !hasGpu && <span className={styles.gpuBadge}>🖥️ GPU</span>}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('auth_user');
      if (raw) {
        const user = JSON.parse(raw);
        if (user?.profile) setUserProfile(user.profile);
      }
    } catch {}
  }, []);

  return (
    <Layout title={siteConfig.title} description="AI-native textbook covering Physical AI and Humanoid Robotics">
      {/* ── Hero ── */}
      <header className={styles.heroBanner}>
        <div className={styles.heroContent}>
          <div className={styles.heroEyebrow}>PANAVERSITY · PHYSICAL AI COURSE</div>
          <h1 className={styles.heroTitle}>
            Physical AI &<br /><span className={styles.heroTitleAccent}>Humanoid Robotics</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Bridge the digital brain and the physical body. Master ROS 2, simulation, NVIDIA Isaac, and VLA models to build intelligent robots.
          </p>
          <div className={styles.heroCta}>
            <Link className={styles.btnPrimary} to="/docs/module1-ros2/chapter1">
              Start Learning →
            </Link>
            <Link className={styles.btnSecondary} to="/signup">
              Get Personalized Path
            </Link>
          </div>
        </div>
      </header>

      {/* ── Stats ── */}
      <div className={styles.statsBar}>
        {[
          { num: '04', label: 'Modules' },
          { num: '16', label: 'Chapters' },
          { num: '13', label: 'Weeks' },
          { num: 'AI', label: 'Powered' },
        ].map(s => (
          <div key={s.label} className={styles.statItem}>
            <span className={styles.statNumber}>{s.num}</span>
            <span className={styles.statLabel}>{s.label}</span>
          </div>
        ))}
      </div>

      <main>
        {/* ── Modules ── */}
        <section className={styles.modulesSection}>
          <div className="container">
            <div className={styles.sectionHeader}>
              <div className={styles.sectionEyebrow}>// CURRICULUM</div>
              <div className={styles.sectionTitle}>Course Modules</div>
              <p className={styles.sectionSub}>From middleware to autonomous humanoid robots</p>
            </div>
            <div className={styles.moduleGrid}>
              {MODULES.map((m) => (
                <Link key={m.num} to={m.path} className={styles.moduleCard}
                  style={{'--card-accent': m.accent} as any}>
                  <div className={styles.moduleNumber}>MODULE {m.num}</div>
                  <span className={styles.moduleIcon}>{m.icon}</span>
                  <div className={styles.moduleTitle}>{m.title}</div>
                  <div className={styles.moduleDesc}>{m.desc}</div>
                  <div className={styles.moduleTopics}>
                    {m.topics.map(t => <span key={t} className={styles.moduleTopic}>{t}</span>)}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section className={styles.featuresSection}>
          <div className="container">
            <div className={styles.featureGrid}>
              {[
                { icon: '🤖', name: 'RAG Chatbot', desc: 'AI assistant trained on every chapter' },
                { icon: '🌐', name: 'Urdu Support', desc: 'Full RTL translation on every page' },
                { icon: '✨', name: 'Personalized', desc: 'Content adapted to your background' },
                { icon: '🔐', name: 'Free Account', desc: 'Track progress and get recommendations' },
              ].map(f => (
                <div key={f.name} className={styles.featureItem}>
                  <span className={styles.featureIcon}>{f.icon}</span>
                  <div className={styles.featureName}>{f.name}</div>
                  <div className={styles.featureDesc}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Personalized ── */}
        <PersonalizedSection userProfile={userProfile} />
      </main>
    </Layout>
  );
}
