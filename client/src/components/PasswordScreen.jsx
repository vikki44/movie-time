import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Heart } from 'lucide-react';

export default function PasswordScreen({ onVerified, serverUrl }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isWrong, setIsWrong] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Enter our code pookie! 🥺🎀');
      return;
    }

    setLoading(true);
    setError('');
    setIsWrong(false);

    try {
      // We use a default private room name 'pookie-den' for our private 2-person watch experience
      const roomName = 'pookie-den';
      const response = await fetch(`${serverUrl}/api/verify-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roomName, password }),
      });

      const data = await response.json();

      if (data.success) {
        onVerified({ roomName, password });
      } else {
        setError('Wrong password pookie 😭🩷');
        setIsWrong(true);
        setTimeout(() => setIsWrong(false), 500); // clear shake
      }
    } catch (err) {
      console.error(err);
      setError('Cannot reach server... Is it awake? 🔌');
      setIsWrong(true);
      setTimeout(() => setIsWrong(false), 500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -40, scale: 0.95 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className={`glass-panel ${isWrong ? 'shake-animation' : ''}`}
        style={styles.card}
      >
        {/* Glowing Hearts Header */}
        <div style={styles.logoWrapper}>
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              filter: ['drop-shadow(0 0 4px #FF69B4)', 'drop-shadow(0 0 15px #FF69B4)', 'drop-shadow(0 0 4px #FF69B4)']
            }}
            transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
            style={styles.heartContainer}
          >
            <Heart size={44} color="#FF69B4" fill="#FF69B4" />
          </motion.div>
        </div>

        <h2 style={styles.title}>Welcome Back Pookie 💕</h2>
        <p style={styles.subtitle}>Our little movie world, just for us.</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Enter Secret Passcode 🔐</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="glass-input"
                placeholder="Our special password..."
                required
                disabled={loading}
                style={styles.input}
              />
              <Lock size={18} color="#C8A2FF" style={styles.inputIcon} />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                style={styles.errorText}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={styles.button}
          >
            {loading ? 'Opening portal... 🌌' : 'Enter Portal 🎀'}
          </button>
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
    maxWidth: '440px',
    padding: '45px 35px',
    textAlign: 'center',
    backgroundColor: 'rgba(16, 16, 16, 0.75)',
    border: '1px solid rgba(255, 105, 180, 0.25)',
    boxShadow: '0 24px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(255, 105, 180, 0.08)',
  },
  logoWrapper: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '25px',
  },
  heartContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: '2.1rem',
    background: 'linear-gradient(to right, #FF69B4, #C8A2FF)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    fontFamily: 'var(--font-headers)',
    marginBottom: '10px',
    fontWeight: '700',
  },
  subtitle: {
    fontSize: '1.05rem',
    color: '#FFE5E9',
    marginBottom: '35px',
    fontFamily: 'var(--font-body)',
    fontWeight: 500,
    opacity: 0.85,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '22px',
    textAlign: 'left',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  label: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#C8A2FF',
    paddingLeft: '4px',
    fontFamily: 'var(--font-headers)',
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
  errorText: {
    color: '#FF69B4',
    fontSize: '0.95rem',
    fontWeight: '700',
    textAlign: 'center',
    backgroundColor: 'rgba(255, 105, 180, 0.1)',
    padding: '10px 14px',
    borderRadius: '14px',
    border: '1px solid rgba(255, 105, 180, 0.35)',
    marginTop: '5px',
    fontFamily: 'var(--font-body)',
    boxShadow: '0 4px 12px rgba(255, 105, 180, 0.05)',
  },
  button: {
    marginTop: '10px',
    width: '100%',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, #FF69B4 0%, #C8A2FF 100%)',
    boxShadow: '0 4px 20px rgba(255, 105, 180, 0.35)',
  },
};
