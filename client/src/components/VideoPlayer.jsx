import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Maximize, Play, Square, Signal, SignalHigh, SignalMedium, Power, Tv } from 'lucide-react';

export default function VideoPlayer({
  role,
  stream,
  streamState,
  onStartShare,
  onStopShare,
  onEndSession,
  stats,
  localVolume,
  onVolumeChange,
  isLocalMuted,
  onToggleLocalMute,
  isHostMuted,
  onToggleHostMute
}) {
  const [autoplayBlocked, setAutoplayBlocked] = React.useState(false);
  const videoRef = useRef(null);

  // Callback ref to attach the stream immediately when the video element mounts in the DOM
  const handleVideoRef = (el) => {
    videoRef.current = el;
    if (el) {
      const currentSrc = el.srcObject;
      if (stream) {
        if (!currentSrc || currentSrc.id !== stream.id) {
          el.srcObject = stream;
          el.play()
            .then(() => {
              setAutoplayBlocked(false);
            })
            .catch((err) => {
              console.warn("Autoplay blocked on mount:", err);
              setAutoplayBlocked(true);
            });
        }
      } else {
        if (currentSrc !== null) {
          el.srcObject = null;
        }
      }
    }
  };

  // Re-run whenever the stream updates on an already mounted video
  useEffect(() => {
    if (videoRef.current) {
      const currentSrc = videoRef.current.srcObject;
      if (stream) {
        if (!currentSrc || currentSrc.id !== stream.id) {
          videoRef.current.srcObject = stream;
          videoRef.current.play()
            .then(() => {
              setAutoplayBlocked(false);
            })
            .catch((err) => {
              console.warn("Autoplay blocked on stream change:", err);
              setAutoplayBlocked(true);
            });
        }
      } else {
        if (currentSrc !== null) {
          videoRef.current.srcObject = null;
        }
        setAutoplayBlocked(false);
      }
    }
  }, [stream]);

  const handleManualPlay = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.play()
        .then(() => {
          setAutoplayBlocked(false);
        })
        .catch((err) => console.error("Manual play failed:", err));
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      } else if (videoRef.current.webkitRequestFullscreen) {
        videoRef.current.webkitRequestFullscreen();
      } else if (videoRef.current.msRequestFullscreen) {
        videoRef.current.msRequestFullscreen();
      }
    }
  };

  const renderSignalIcon = () => {
    if (!stats) {
      return (
        <div style={styles.statBadge} title="Waiting for data connection...">
          <SignalHigh size={16} color="#C8A2FF" />
          <span style={{ color: '#C8A2FF' }}>Stabilizing...</span>
        </div>
      );
    }
    
    switch (stats.quality) {
      case 'good':
        return (
          <div style={styles.statBadge} title={`Latency: ${stats.rtt}ms, Loss: ${stats.packetLoss}%`}>
            <SignalHigh size={16} color="#4caf50" />
            <span style={{ color: '#4caf50' }}>Connected ({stats.rtt || 0}ms)</span>
          </div>
        );
      case 'fair':
        return (
          <div style={styles.statBadge} title={`Latency: ${stats.rtt}ms, Loss: ${stats.packetLoss}%`}>
            <SignalMedium size={16} color="#ff9800" />
            <span style={{ color: '#ff9800' }}>Fair ({stats.rtt}ms)</span>
          </div>
        );
      case 'poor':
        return (
          <div style={styles.statBadge} title={`Latency: ${stats.rtt}ms, Loss: ${stats.packetLoss}%`}>
            <Signal size={16} color="#f44336" />
            <span style={{ color: '#f44336' }}>Low Quality ({stats.rtt}ms)</span>
          </div>
        );
      default:
        return (
          <div style={styles.statBadge}>
            <SignalHigh size={16} color="#4caf50" />
            <span>Connected</span>
          </div>
        );
    }
  };

  const isStreaming = role === 'host' ? !!stream : streamState.isStreaming;

  return (
    <div className="glass-panel" style={styles.container}>
      <div style={styles.playerArea}>
        <AnimatePresence mode="wait">
          {isStreaming && stream ? (
            <motion.div
              key="video"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ width: '100%', height: '100%', position: 'relative' }}
            >
              {role === 'host' ? (
                /* Host Broadcasting Dashboard to prevent infinite mirroring loop and blinking */
                <div style={styles.broadcastingDashboard}>
                  <div style={styles.broadcastingRingOuter}>
                    <div style={styles.broadcastingRingInner}>
                      <Tv size={48} color="#FF69B4" />
                    </div>
                  </div>
                  <h3 style={styles.broadcastingTitle}>Broadcasting Live 🍿</h3>
                  <p style={styles.broadcastingSubtitle}>
                    Your pookie is watching your screen in real-time!
                  </p>
                  <div style={styles.broadcastingPulseBadge}>
                    <span style={styles.liveDot}></span>
                    Streaming at Low Latency
                  </div>
                </div>
              ) : (
                <video
                  ref={handleVideoRef}
                  autoPlay
                  playsInline
                  muted={isLocalMuted || streamState.isMuted}
                  className="video-element"
                  style={styles.video}
                />
              )}
              
              {/* Autoplay overlay */}
              {autoplayBlocked && role !== 'host' && (
                <div onClick={handleManualPlay} style={styles.autoplayOverlay}>
                  <div className="pulse-heart" style={styles.autoplayCard}>
                    <span style={{ fontSize: '36px' }}>🍿</span>
                    <h4 style={styles.autoplayTitle}>Tune In, Pookie!</h4>
                    <p style={styles.autoplaySubtitle}>
                      Click anywhere on the screen to connect audio & video.
                    </p>
                  </div>
                </div>
              )}
              
              {/* Top info badge overlaid */}
              <div style={styles.topOverlay}>
                <div style={styles.liveBadge}>
                  <span style={styles.liveDot}></span>
                  MOVIE SCREEN
                </div>
                {renderSignalIcon()}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={styles.placeholder}
            >
              <motion.div
                animate={{ 
                  y: [0, -12, 0],
                  filter: ['drop-shadow(0 0 5px rgba(255, 105, 180, 0.2))', 'drop-shadow(0 0 20px rgba(255, 105, 180, 0.5))', 'drop-shadow(0 0 5px rgba(255, 105, 180, 0.2))']
                }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                style={styles.placeholderIcon}
              >
                <Tv size={72} color="#FF69B4" />
              </motion.div>
              <h3 style={styles.placeholderTitle}>
                {role === 'host' ? "Ready to start the show, Pookie? 🍿" : "Waiting for pookie to share... 🌸"}
              </h3>
              <p style={styles.placeholderSubtitle}>
                {role === 'host' 
                  ? "Click 'Start Screen Share' below. Select a tab or window and make sure to tick 'Share tab audio' or system audio to stream correctly!"
                  : "Cuddle up and grab some snacks. The movie stream will start as soon as pookie turns screen share on!"}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Control bar at bottom */}
      <div style={styles.controlBar}>
        {role === 'host' ? (
          // Host actions
          <div style={styles.controlsRow}>
            <div style={styles.controlsGroup}>
              {!stream ? (
                <button onClick={onStartShare} className="btn-primary" style={styles.ctrlBtn}>
                  <Play size={16} /> Start Screen Share
                </button>
              ) : (
                <button onClick={onStopShare} className="btn-secondary" style={{ ...styles.ctrlBtn, color: '#FF69B4', borderColor: '#FF69B4' }}>
                  <Square size={16} /> Stop Sharing
                </button>
              )}

              {stream && (
                <button 
                  onClick={onToggleHostMute} 
                  className="btn-secondary" 
                  style={styles.iconBtn}
                  title={isHostMuted ? "Unmute Stream Audio" : "Mute Stream Audio"}
                >
                  {isHostMuted ? <VolumeX size={18} color="#FF69B4" /> : <Volume2 size={18} color="#C8A2FF" />}
                </button>
              )}
            </div>

            <div style={styles.controlsGroup}>
              <button onClick={handleFullscreen} disabled={!stream} className="btn-secondary" style={styles.iconBtn}>
                <Maximize size={18} color="#C8A2FF" />
              </button>
              <button onClick={onEndSession} className="btn-secondary" style={{ ...styles.iconBtn, borderColor: 'rgba(255, 105, 180, 0.4)' }} title="End Movie Session">
                <Power size={18} color="#FF69B4" />
              </button>
            </div>
          </div>
        ) : (
          // Viewer actions
          <div style={styles.controlsRow}>
            <div style={styles.controlsGroup}>
              <button 
                onClick={onToggleLocalMute} 
                className="btn-secondary" 
                style={styles.iconBtn}
                disabled={!stream}
              >
                {isLocalMuted || streamState.isMuted ? <VolumeX size={18} color="#FF69B4" /> : <Volume2 size={18} color="#C8A2FF" />}
              </button>
              
              <div style={styles.volumeContainer}>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={localVolume}
                  onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                  style={styles.volumeSlider}
                  disabled={!stream || isLocalMuted || streamState.isMuted}
                />
              </div>
              
              {streamState.isMuted && (
                <span style={styles.mutedBanner}>Host Muted Stream Audio 🤐</span>
              )}
            </div>

            <div style={styles.controlsGroup}>
              <button onClick={handleFullscreen} disabled={!stream} className="btn-secondary" style={styles.iconBtn}>
                <Maximize size={18} color="#C8A2FF" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    backgroundColor: '#050505',
    border: '1px solid rgba(255, 105, 180, 0.25)',
    borderRadius: '24px',
    boxShadow: '0 24px 50px rgba(0,0,0,0.85)',
  },
  playerArea: {
    position: 'relative',
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    minHeight: '300px',
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  topOverlay: {
    position: 'absolute',
    top: '16px',
    left: '16px',
    right: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    pointerEvents: 'none',
    zIndex: 5,
  },
  liveBadge: {
    backgroundColor: '#FF69B4',
    color: '#ffffff',
    padding: '5px 12px',
    borderRadius: '12px',
    fontSize: '0.72rem',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontFamily: 'var(--font-headers)',
    letterSpacing: '0.5px',
    boxShadow: '0 0 10px rgba(255, 105, 180, 0.5)',
  },
  liveDot: {
    width: '6px',
    height: '6px',
    backgroundColor: '#fff',
    borderRadius: '50%',
    display: 'inline-block',
    animation: 'pulse-heart 1.5s infinite',
  },
  statBadge: {
    backgroundColor: 'rgba(16, 16, 16, 0.75)',
    color: '#FFE5E9',
    padding: '5px 12px',
    borderRadius: '12px',
    fontSize: '0.72rem',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(200, 162, 255, 0.2)',
    fontWeight: 'bold',
  },
  placeholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '40px 24px',
    color: '#FFE5E9',
  },
  placeholderIcon: {
    marginBottom: '20px',
  },
  placeholderTitle: {
    fontSize: '1.45rem',
    color: '#ffffff',
    marginBottom: '10px',
    fontFamily: 'var(--font-headers)',
    fontWeight: '700',
  },
  placeholderSubtitle: {
    fontSize: '0.88rem',
    color: '#c8a2ff',
    maxWidth: '460px',
    lineHeight: '1.5',
    opacity: 0.85,
  },
  controlBar: {
    backgroundColor: 'rgba(16, 16, 16, 0.9)',
    padding: '14px 20px',
    borderTop: '1px solid rgba(255, 105, 180, 0.15)',
  },
  controlsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  controlsGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  ctrlBtn: {
    padding: '10px 20px',
    fontSize: '0.9rem',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #FF69B4 0%, #C8A2FF 100%)',
    boxShadow: '0 4px 12px rgba(255, 105, 180, 0.25)',
    border: 'none',
  },
  iconBtn: {
    padding: '10px',
    backgroundColor: 'rgba(5, 5, 5, 0.5)',
    border: '1.5px solid rgba(200, 162, 255, 0.2)',
    color: '#FFE5E9',
    borderRadius: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'var(--transition-smooth)',
  },
  volumeContainer: {
    display: 'flex',
    alignItems: 'center',
    width: '90px',
  },
  volumeSlider: {
    width: '100%',
    accentColor: '#FF69B4',
    cursor: 'pointer',
  },
  mutedBanner: {
    fontSize: '0.8rem',
    color: '#FF69B4',
    fontWeight: '600',
    backgroundColor: 'rgba(255, 105, 180, 0.12)',
    padding: '5px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(255, 105, 180, 0.25)',
  },
  autoplayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(5, 5, 5, 0.88)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 20,
    padding: '20px',
  },
  autoplayCard: {
    backgroundColor: 'rgba(16, 16, 16, 0.75)',
    border: '2px solid rgba(255, 105, 180, 0.35)',
    borderRadius: '24px',
    padding: '25px 35px',
    textAlign: 'center',
    maxWidth: '300px',
    boxShadow: '0 12px 40px rgba(255, 105, 180, 0.25)',
  },
  autoplayTitle: {
    color: '#FF69B4',
    margin: '10px 0 6px 0',
    fontFamily: 'var(--font-headers)',
    fontSize: '1.25rem',
  },
  autoplaySubtitle: {
    fontSize: '0.85rem',
    color: '#c8a2ff',
    fontFamily: 'var(--font-body)',
    lineHeight: '1.4',
  },
  broadcastingDashboard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    padding: '40px 24px',
    background: 'radial-gradient(circle, rgba(255, 105, 180, 0.08) 0%, rgba(5, 5, 5, 0.95) 100%)',
    color: '#FFE5E9',
    textAlign: 'center',
  },
  broadcastingRingOuter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, rgba(255, 105, 180, 0.2) 0%, rgba(200, 162, 255, 0.2) 100%)',
    boxShadow: '0 0 30px rgba(255, 105, 180, 0.15)',
    marginBottom: '24px',
    animation: 'pulse-ring 2s infinite ease-in-out',
  },
  broadcastingRingInner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '88px',
    height: '88px',
    borderRadius: '50%',
    backgroundColor: 'rgba(16, 16, 16, 0.85)',
    border: '2px solid rgba(255, 105, 180, 0.45)',
    boxShadow: 'inset 0 0 15px rgba(255, 105, 180, 0.2)',
  },
  broadcastingTitle: {
    fontSize: '1.6rem',
    fontWeight: '700',
    fontFamily: 'var(--font-headers)',
    background: 'linear-gradient(135deg, #FF69B4 0%, #C8A2FF 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '10px',
  },
  broadcastingSubtitle: {
    fontSize: '0.95rem',
    color: '#c8a2ff',
    maxWidth: '380px',
    lineHeight: '1.5',
    opacity: 0.85,
    marginBottom: '20px',
  },
  broadcastingPulseBadge: {
    backgroundColor: 'rgba(255, 105, 180, 0.12)',
    color: '#FF69B4',
    padding: '6px 16px',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    border: '1px solid rgba(255, 105, 180, 0.25)',
  }
};
