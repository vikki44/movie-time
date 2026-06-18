import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Smile, Heart, Gift, MessageSquare, AlertCircle } from 'lucide-react';

const QUICK_EMOJIS = ['🩷', '🎀', '😂', '🌚', '🌝', '✨', '🍿', '💕', '🥺', '😭', '🌙', '⭐', '💌', '🌷', '🍓', '🧸'];

const KAOMOJIS = [
  '૮ ˶ᵔ ᵕ ᵔ˶ ა',
  '(｡♥‿♥｡)',
  '(づ｡◕‿‿◕｡)づ',
  '૮₍ ˃ ⤙ ˂ ₎ა',
  '૮꒰ ˶• ༝ •˶꒱ა ♡',
  '(╥﹏╥)'
];

const STICKERS = [
  { id: 'hug_teddy', emoji: '🐧🐰🤗', label: 'Huggie' },
  { id: 'kiss_heart', emoji: '🫂💖', label: 'Sweet Hug' },
  { id: 'popcorn_party', emoji: '🍿✨', label: 'Movie Time' },
  { id: 'crying_cat', emoji: '🐱😭', label: 'Sad Pookie' },
  { id: 'bonk_hammer', emoji: '🔨💥', label: 'Get Bonked' },
  { id: 'dance_rabbit', emoji: '🐰💃', label: 'Dancing Bunny' }
];

export default function ChatPanel({
  messages,
  userName,
  typingStatus,
  onSendMessage,
  onSendTyping,
  onTriggerAction,
  isMobile
}) {
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingStatus]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
    onSendTyping(false);
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    onSendTyping(e.target.value.length > 0);
  };

  const handleInputBlur = () => {
    onSendTyping(false);
  };

  const addEmoji = (emoji) => {
    setInputText((prev) => prev + emoji);
  };

  const handleSendSticker = (stickerEmoji) => {
    onSendMessage(`✨ Sticker: ${stickerEmoji}`);
    setShowStickers(false);
  };

  const handleSendCuteNoteBtn = () => {
    const note = prompt("Type a sweet secret note for your pookie: 💕");
    if (note && note.trim()) {
      onSendMessage(`💌 ${note.trim()}`);
    }
  };

  // Helper to check who sent the message and apply style class
  const getMessageStyle = (msg) => {
    if (msg.sender === 'System') {
      return styles.systemMsg;
    }
    if (msg.text.startsWith('💌 ')) {
      return styles.cuteNoteMsg;
    }
    if (msg.sender === userName) {
      return styles.myMsg;
    }
    return styles.theirMsg;
  };

  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  const renderMessageContent = (msg) => {
    if (msg.sender === 'System') {
      // Custom formatting for join/leave/reactions
      let isJoin = msg.text.includes('arrived');
      let isLeave = msg.text.includes('void');
      return (
        <span style={{
          color: isJoin ? '#FF69B4' : (isLeave ? '#C8A2FF' : 'var(--pookie-text-light)'),
          fontStyle: 'italic',
          fontWeight: 'bold'
        }}>
          {msg.text}
        </span>
      );
    }

    if (msg.text.startsWith('💌 ')) {
      const actualNote = msg.text.substring(2);
      return (
        <div style={styles.cuteNoteContent}>
          <div style={styles.cuteNoteHeader}>
            <span>💌 Special Note from {msg.sender}</span>
          </div>
          <p style={styles.cuteNoteText}>"{actualNote}"</p>
          <span style={styles.cuteNoteTimestamp}>{formatTime(msg.timestamp)}</span>
        </div>
      );
    }

    if (msg.text.startsWith('✨ Sticker: ')) {
      const stickerEmoji = msg.text.replace('✨ Sticker: ', '');
      return (
        <div>
          {msg.sender !== userName && (
            <span style={styles.senderLabel}>{msg.sender}</span>
          )}
          <div style={styles.stickerBubble}>{stickerEmoji}</div>
          <span style={styles.timestamp}>{formatTime(msg.timestamp)}</span>
        </div>
      );
    }

    return (
      <div>
        {msg.sender !== userName && (
          <span style={styles.senderLabel}>{msg.sender}</span>
        )}
        <p style={styles.bubbleText}>{msg.text}</p>
        <span style={styles.timestamp}>{formatTime(msg.timestamp)}</span>
      </div>
    );
  };

  return (
    <div style={isMobile ? styles.mobileContainer : styles.desktopContainer} className="glass-panel">
      {/* Lobby / Stream Header Actions */}
      <div style={styles.interactionHeader}>
        <span style={styles.sectionTitle}>Pookie Interactions ✨</span>
        <div style={styles.actionGrid}>
          <button onClick={() => onTriggerAction('popcorn')} style={styles.actionBtn} title="Send Popcorn">
            🍿 Popcorn
          </button>
          <button onClick={() => onTriggerAction('heart-burst')} style={styles.actionBtn} title="Heart Burst">
            💕 Love
          </button>
          <button onClick={() => onTriggerAction('hug')} style={styles.actionBtn} title="Virtual Hug">
            🤗 Hug
          </button>
          <button onClick={() => onTriggerAction('bonk')} style={styles.actionBtn} title="Bonk Pookie">
            🔨 Bonk
          </button>
          <button onClick={() => onTriggerAction('wakeup')} style={styles.actionBtn} title="Wake Up Pookie">
            ⏰ Wake Up
          </button>
          <button onClick={handleSendCuteNoteBtn} style={{ ...styles.actionBtn, borderColor: '#C8A2FF', color: '#C8A2FF' }} title="Send Secret Cute Note">
            💌 Cute Note
          </button>
        </div>
      </div>

      {/* Messages Window */}
      <div style={styles.messageList}>
        <AnimatePresence initial={false}>
          {messages.map((msg, index) => (
            <motion.div
              key={msg._id || index}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              style={{
                ...styles.messageWrapper,
                justifyContent: msg.sender === 'System' ? 'center' : (msg.sender === userName ? 'flex-end' : 'flex-start')
              }}
            >
              <div style={getMessageStyle(msg)}>
                {renderMessageContent(msg)}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {typingStatus && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={styles.typingWrapper}
          >
            <div className="typing-indicator" style={styles.typingIndicator}>
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
              <span style={{ marginLeft: '4px', fontFamily: 'var(--font-headers)', fontWeight: 600 }}>Pookie is typing... 🎀</span>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Stickers Panel Drawer */}
      <AnimatePresence>
        {showStickers && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={styles.stickersPanel}
          >
            <div style={styles.stickersHeader}>
              <span>Pookie Stickers 🧸🎨</span>
              <button onClick={() => setShowStickers(false)} style={styles.closePanelBtn}>✕</button>
            </div>
            <div style={styles.stickersGrid}>
              {STICKERS.map((st) => (
                <div key={st.id} onClick={() => handleSendSticker(st.emoji)} style={styles.stickerCard}>
                  <span style={styles.stickerEmoji}>{st.emoji}</span>
                  <span style={styles.stickerLabel}>{st.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Emoji Keyboard Selector & Quick access bar */}
      <div style={styles.quickEmojiBar}>
        <div style={styles.emojiRow}>
          {QUICK_EMOJIS.map((emo) => (
            <button key={emo} onClick={() => addEmoji(emo)} style={styles.quickEmojiBtn}>
              {emo}
            </button>
          ))}
        </div>
        <div style={styles.kaomojiRow}>
          {KAOMOJIS.map((kao) => (
            <button key={kao} onClick={() => addEmoji(` ${kao} `)} style={styles.kaomojiBtn}>
              {kao}
            </button>
          ))}
        </div>
      </div>

      {/* Input chat tray */}
      <form onSubmit={handleSend} style={styles.inputForm}>
        <div style={styles.inputContainer}>
          <button
            type="button"
            onClick={() => setShowStickers(!showStickers)}
            style={{ ...styles.utilityBtn, color: showStickers ? '#FF69B4' : '#C8A2FF' }}
            title="Stickers & Gifts"
          >
            <Gift size={20} />
          </button>
          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            placeholder="Type a cute message, pookie..."
            className="glass-input"
            style={styles.chatInput}
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="btn-primary"
            style={styles.sendButton}
          >
            <Send size={15} />
          </button>
        </div>
      </form>
    </div>
  );
}

const styles = {
  desktopContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    maxHeight: 'calc(100vh - 40px)',
    overflow: 'hidden',
    border: '1px solid rgba(255, 105, 180, 0.25)',
    backgroundColor: 'rgba(16, 16, 16, 0.65)',
    boxShadow: 'var(--glass-shadow)',
  },
  mobileContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    overflow: 'hidden',
    border: 'none',
    boxShadow: 'none',
    backgroundColor: 'transparent',
  },
  interactionHeader: {
    padding: '14px',
    borderBottom: '1px solid rgba(255, 105, 180, 0.15)',
    backgroundColor: 'rgba(37, 21, 61, 0.35)',
  },
  sectionTitle: {
    fontSize: '0.8rem',
    fontWeight: '700',
    color: '#FF69B4',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    display: 'block',
    marginBottom: '8px',
    fontFamily: 'var(--font-headers)',
  },
  actionGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  actionBtn: {
    padding: '6px 12px',
    borderRadius: '20px',
    border: '1px solid rgba(255, 105, 180, 0.25)',
    backgroundColor: 'rgba(5, 5, 5, 0.4)',
    fontSize: '0.78rem',
    fontWeight: '600',
    color: 'var(--pookie-text)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
  },
  messageList: {
    flex: 1,
    overflowY: 'auto',
    padding: '18px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    backgroundColor: 'rgba(5, 5, 5, 0.25)',
  },
  messageWrapper: {
    display: 'flex',
    width: '100%',
  },
  myMsg: {
    backgroundColor: '#FF69B4',
    color: '#ffffff',
    padding: '10px 15px',
    borderRadius: '18px 18px 2px 18px',
    maxWidth: '80%',
    boxShadow: '0 4px 15px rgba(255, 105, 180, 0.25)',
    position: 'relative',
    wordBreak: 'break-word',
  },
  theirMsg: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    color: 'var(--pookie-text)',
    padding: '10px 15px',
    borderRadius: '18px 18px 18px 2px',
    maxWidth: '80%',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4)',
    border: '1px solid rgba(200, 162, 255, 0.18)',
    position: 'relative',
    wordBreak: 'break-word',
  },
  systemMsg: {
    backgroundColor: 'rgba(37, 21, 61, 0.5)',
    color: '#C8A2FF',
    padding: '6px 16px',
    borderRadius: '20px',
    fontSize: '0.85rem',
    maxWidth: '90%',
    textAlign: 'center',
    border: '1px solid rgba(200, 162, 255, 0.25)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
  },
  cuteNoteMsg: {
    backgroundColor: 'rgba(255, 105, 180, 0.15)',
    border: '2px solid rgba(255, 105, 180, 0.45)',
    color: '#FFE5E9',
    padding: '14px 18px',
    borderRadius: '20px',
    maxWidth: '85%',
    boxShadow: '0 8px 24px rgba(255, 105, 180, 0.18)',
    position: 'relative',
    wordBreak: 'break-word',
  },
  cuteNoteContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  cuteNoteHeader: {
    fontSize: '0.78rem',
    fontWeight: 'bold',
    color: '#FF69B4',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  cuteNoteText: {
    fontSize: '1rem',
    fontStyle: 'italic',
    lineHeight: '1.4',
    fontFamily: 'var(--font-headers)',
  },
  cuteNoteTimestamp: {
    fontSize: '0.65rem',
    color: '#C8A2FF',
    textAlign: 'right',
  },
  stickerBubble: {
    fontSize: '44px',
    padding: '4px',
  },
  bubbleText: {
    fontSize: '0.96rem',
    lineHeight: '1.45',
    fontFamily: 'var(--font-body)',
  },
  senderLabel: {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: '700',
    color: '#FF69B4',
    marginBottom: '4px',
    fontFamily: 'var(--font-headers)',
  },
  timestamp: {
    display: 'block',
    fontSize: '0.7rem',
    textAlign: 'right',
    marginTop: '4px',
    opacity: 0.7,
  },
  typingWrapper: {
    display: 'flex',
    width: '100%',
    justifyContent: 'flex-start',
    marginTop: '4px',
  },
  typingIndicator: {
    backgroundColor: 'rgba(37, 21, 61, 0.6)',
    border: '1.5px solid rgba(255, 105, 180, 0.25)',
    padding: '8px 16px',
    borderRadius: '16px',
  },
  quickEmojiBar: {
    padding: '10px 14px',
    backgroundColor: 'rgba(5, 5, 5, 0.6)',
    borderTop: '1px solid rgba(255, 105, 180, 0.15)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  emojiRow: {
    display: 'flex',
    overflowX: 'auto',
    gap: '10px',
    paddingBottom: '2px',
  },
  quickEmojiBtn: {
    fontSize: '1.35rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px',
    transition: 'transform 0.15s ease',
  },
  kaomojiRow: {
    display: 'flex',
    overflowX: 'auto',
    gap: '8px',
    paddingBottom: '2px',
  },
  kaomojiBtn: {
    fontSize: '0.78rem',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(200, 162, 255, 0.2)',
    borderRadius: '12px',
    padding: '5px 10px',
    color: '#C8A2FF',
    fontWeight: '600',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    transition: 'var(--transition-smooth)',
  },
  inputForm: {
    padding: '14px',
    backgroundColor: 'rgba(16, 16, 16, 0.85)',
    borderTop: '1px solid rgba(255, 105, 180, 0.2)',
  },
  inputContainer: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  },
  utilityBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.2s ease',
  },
  chatInput: {
    flex: 1,
    padding: '10px 18px',
    borderRadius: '24px',
    fontSize: '0.92rem',
    backgroundColor: 'rgba(5, 5, 5, 0.6)',
    border: '1.5px solid rgba(200, 162, 255, 0.25)',
    color: '#ffffff',
  },
  sendButton: {
    padding: '10px',
    borderRadius: '50%',
    width: '38px',
    height: '38px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    background: 'linear-gradient(135deg, #FF69B4 0%, #C8A2FF 100%)',
    boxShadow: '0 4px 10px rgba(255, 105, 180, 0.2)',
    border: 'none',
  },
  stickersPanel: {
    backgroundColor: 'rgba(16, 16, 16, 0.95)',
    borderTop: '1px solid rgba(255, 105, 180, 0.25)',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  stickersHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.85rem',
    color: '#C8A2FF',
    fontFamily: 'var(--font-headers)',
    fontWeight: 'bold',
  },
  closePanelBtn: {
    background: 'none',
    border: 'none',
    color: '#FF69B4',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  stickersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },
  stickerCard: {
    backgroundColor: 'rgba(5, 5, 5, 0.4)',
    border: '1px solid rgba(200, 162, 255, 0.15)',
    borderRadius: '12px',
    padding: '10px 6px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
    transition: 'transform 0.15s ease',
  },
  stickerEmoji: {
    fontSize: '32px',
  },
  stickerLabel: {
    fontSize: '0.72rem',
    color: 'var(--pookie-text-light)',
    fontWeight: '600',
  }
};
