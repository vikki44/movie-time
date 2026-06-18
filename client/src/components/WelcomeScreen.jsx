import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Tv, MonitorPlay, Sparkles, User } from 'lucide-react';

const QUOTES = [
  "Every movie is better when watched with your favorite person. 💖",
  "Pookies who watch together, stay together! 🎀",
  "Grab the popcorn and snuggle up, movie night is starting! 🍿",
  "You, me, and a really good movie. What more could I ask for? 💕",
  "You are the butter to my popcorn and the cherry to my shake! 🍒🥤"
];

export default function WelcomeScreen({ roomName, onStart, onBack }) {
  const [userName, setUserName] = useState('');
  const [role, setRole] = useState('viewer'); // 'host' or 'viewer'
  const [quote, setQuote] = useState('');

  useEffect(() => {
    const randomQuote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    setQuote(randomQuote);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!userName.trim()) return;
    onStart({ userName: userName.trim(), role });
  };

  return (
    <div style={styles.container}>
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -40, scale: 0.95 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="glass-panel"
        style={styles.card}
      >
        <span style={styles.roomBadge}>Private Link</span>

        {/* Cute Quote Section */}
        <div style={styles.quoteCard}>
          <p style={styles.quoteText}>{quote}</p>
        </div>

        <h3 style={styles.title}>Identify Yourself, Pookie 🧸</h3>
        <p style={styles.subtitle}>Configure your movie night details</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Your Cute Nickname</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="glass-input"
                placeholder="Honey Bunny, Sweetie, Pookie..."
                required
                maxLength={15}
                style={styles.input}
              />
              <User size={18} color="#C8A2FF" style={styles.inputIcon} />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Your Role Tonight</label>
            <div style={styles.roleGrid}>
              {/* Host option */}
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setRole('host')}
                style={{
                  ...styles.roleCard,
                  borderColor: role === 'host' ? '#FF69B4' : 'rgba(255, 105, 180, 0.15)',
                  backgroundColor: role === 'host' ? 'rgba(255, 105, 180, 0.12)' : 'rgba(16, 16, 16, 0.5)',
                  boxShadow: role === 'host' ? '0 0 15px rgba(255, 105, 180, 0.25)' : 'none',
                }}
              >
                <MonitorPlay size={34} color={role === 'host' ? '#FF69B4' : '#C8A2FF'} />
                <span style={{ ...styles.roleTitle, color: role === 'host' ? '#FF69B4' : '#FFE5E9' }}>Host (Stream)</span>
                <span style={styles.roleDesc}>You stream the movie window or screen.</span>
              </motion.div>

              {/* Viewer option */}
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setRole('viewer')}
                style={{
                  ...styles.roleCard,
                  borderColor: role === 'viewer' ? '#FF69B4' : 'rgba(255, 105, 180, 0.15)',
                  backgroundColor: role === 'viewer' ? 'rgba(255, 105, 180, 0.12)' : 'rgba(16, 16, 16, 0.5)',
                  boxShadow: role === 'viewer' ? '0 0 15px rgba(255, 105, 180, 0.25)' : 'none',
                }}
              >
                <Tv size={34} color={role === 'viewer' ? '#FF69B4' : '#C8A2FF'} />
                <span style={{ ...styles.roleTitle, color: role === 'viewer' ? '#FF69B4' : '#FFE5E9' }}>Viewer (Watch)</span>
                <span style={styles.roleDesc}>Sit back, eat popcorn, and watch screen.</span>
              </motion.div>
            </div>
          </div>

          <div style={styles.actions}>
            <button
              type="button"
              onClick={onBack}
              className="btn-secondary"
              style={styles.backBtn}
            >
              Go Back
            </button>
            <button
              type="submit"
              disabled={!userName.trim()}
              className="btn-primary"
              style={styles.submitBtn}
            >
              Start Waiting <Sparkles size={16} />
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    width: '100vw',
    padding: '20px',
    position: 'relative',
    zIndex: 1,
  },
  card: {
    width: '100%',
    maxWidth: '560px',
    padding: '45px 35px',
    position: 'relative',
    backgroundColor: 'rgba(16, 16, 16, 0.75)',
    border: '1px solid rgba(255, 105, 180, 0.25)',
    boxShadow: '0 24px 50px rgba(0, 0, 0, 0.8), 0 0 35px rgba(255, 105, 180, 0.06)',
  },
  roomBadge: {
    position: 'absolute',
    top: '18px',
    right: '20px',
    backgroundColor: 'rgba(255, 105, 180, 0.15)',
    border: '1.5px solid rgba(255, 105, 180, 0.4)',
    color: '#FF69B4',
    padding: '4px 14px',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontFamily: 'var(--font-headers)',
  },
  quoteCard: {
    backgroundColor: 'rgba(37, 21, 61, 0.35)',
    borderRadius: '18px',
    padding: '18px 24px',
    border: '1.5px dashed rgba(200, 162, 255, 0.35)',
    marginBottom: '30px',
    marginTop: '10px',
  },
  quoteText: {
    fontFamily: 'var(--font-headers)',
    fontSize: '1.05rem',
    color: '#C8A2FF',
    textAlign: 'center',
    lineHeight: '1.45',
  },
  title: {
    fontSize: '1.85rem',
    background: 'linear-gradient(to right, #FF69B4, #C8A2FF)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textAlign: 'center',
    marginBottom: '6px',
    fontWeight: '700',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#FFE5E9',
    textAlign: 'center',
    marginBottom: '30px',
    opacity: 0.8,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  label: {
    fontSize: '0.92rem',
    fontWeight: 700,
    color: '#C8A2FF',
    fontFamily: 'var(--font-headers)',
    paddingLeft: '4px',
    letterSpacing: '0.5px',
  },
  input: {
    paddingLeft: '44px',
    backgroundColor: 'rgba(5, 5, 5, 0.8)',
    border: '2px solid rgba(200, 162, 255, 0.2)',
    borderRadius: '16px',
    color: '#ffffff',
  },
  inputIcon: {
    position: 'absolute',
    left: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
  },
  roleGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  roleCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px 14px',
    borderRadius: '20px',
    border: '2px solid transparent',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
  },
  roleTitle: {
    fontFamily: 'var(--font-headers)',
    fontSize: '1.05rem',
    fontWeight: '600',
    marginTop: '12px',
    marginBottom: '6px',
  },
  roleDesc: {
    fontSize: '0.78rem',
    color: '#FFE5E9',
    lineHeight: '1.4',
    opacity: 0.75,
  },
  actions: {
    display: 'flex',
    gap: '14px',
    marginTop: '10px',
  },
  backBtn: {
    flex: 1,
    borderRadius: '16px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 105, 180, 0.25)',
    color: '#FF69B4',
  },
  submitBtn: {
    flex: 2.2,
    borderRadius: '16px',
    background: 'linear-gradient(135deg, #FF69B4 0%, #C8A2FF 100%)',
    boxShadow: '0 4px 20px rgba(255, 105, 180, 0.35)',
  },
};
