import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Users, X, Info, Video, VideoOff, Mic, MicOff } from 'lucide-react';
import { createPeerConnection, monitorConnectionStats, iceServers } from '../utils/webrtc';
import VideoPlayer from './VideoPlayer';
import ChatPanel from './ChatPanel';

// Helper component to bind webcam stream to a video element
const WebcamFeed = ({ stream, isMuted = false }) => {
  const videoRef = useRef(null);

  const handleRef = (el) => {
    videoRef.current = el;
    if (el) {
      const currentSrc = el.srcObject;
      if (stream) {
        if (!currentSrc || currentSrc.id !== stream.id) {
          el.srcObject = stream;
          el.play().catch(err => console.warn("Webcam autoplay blocked:", err));
        }
      } else {
        if (currentSrc !== null) {
          el.srcObject = null;
        }
      }
    }
  };

  useEffect(() => {
    if (videoRef.current) {
      const currentSrc = videoRef.current.srcObject;
      if (stream) {
        if (!currentSrc || currentSrc.id !== stream.id) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(err => console.warn("Webcam stream change blocked:", err));
        }
      } else {
        if (currentSrc !== null) {
          videoRef.current.srcObject = null;
        }
      }
    }
  }, [stream]);

  return (
    <video
      ref={handleRef}
      autoPlay
      playsInline
      muted={isMuted}
      className="webcam-feed"
    />
  );
};

export default function WatchRoom({ connectionDetails, serverUrl, onLeave }) {
  const { roomName, password, userName, role } = connectionDetails;
  
  // Connection / Socket State
  const [socket, setSocket] = useState(null);
  const [activeUsers, setActiveUsers] = useState({ host: null, viewer: null });
  const [peerConnected, setPeerConnected] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Lobby States
  const [inLobby, setInLobby] = useState(true);
  const [roomNote, setRoomNote] = useState('');
  const [copied, setCopied] = useState(false);

  // WebRTC Screen Share States
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [streamState, setStreamState] = useState({ isStreaming: false, isMuted: false });
  const [stats, setStats] = useState(null);

  // WebRTC Two-Way Webcam States
  const [localWebcamStream, setLocalWebcamStream] = useState(null);
  const [remoteWebcamStream, setRemoteWebcamStream] = useState(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [peerWebcamState, setPeerWebcamState] = useState({ isCameraOn: false, isMicOn: false });

  // Local Screen Volume Controls
  const [localVolume, setLocalVolume] = useState(1);
  const [isLocalMuted, setIsLocalMuted] = useState(false);
  const [isHostMuted, setIsHostMuted] = useState(false);

  // Chat & Messaging
  const [messages, setMessages] = useState([]);
  const [otherUserTyping, setOtherUserTyping] = useState(false);

  // Interactive Action Effects Overlay States
  const [popcorns, setPopcorns] = useState([]);
  const [showBonk, setShowBonk] = useState(false);
  const [bonkSender, setBonkSender] = useState('');
  const [showHug, setShowHug] = useState(false);
  const [hugSender, setHugSender] = useState('');
  const [showWakeup, setShowWakeup] = useState(false);
  const [wakeupSender, setWakeupSender] = useState('');
  const [hearts, setHearts] = useState([]);

  // Mobile Drawer State
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // WebRTC Connection References
  const peerConnectionRef = useRef(null);
  const webcamPeerConnectionRef = useRef(null);
  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const localWebcamStreamRef = useRef(null);
  const screenCandidatesQueueRef = useRef([]);
  const webcamCandidatesQueueRef = useRef([]);

  // Handle window resize for mobile check
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 1. Set up Socket.IO Connection and event listeners
  useEffect(() => {
    const newSocket = io(serverUrl);
    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to socket server');
      newSocket.emit('join-room', { roomName, password, userName, role });
    });

    newSocket.on('join-error', (msg) => {
      setErrorMsg(msg);
      setTimeout(() => {
        onLeave();
      }, 3000);
    });

    newSocket.on('room-joined', ({ role: joinedRole, history, activeUsers: users, streamState: serverStreamState, note }) => {
      setMessages(history);
      setActiveUsers(users);
      setStreamState(serverStreamState);
      if (note !== undefined) {
        setRoomNote(note);
      }

      // Fix: If we just joined as a Viewer and the Host is already streaming, request the screen share connection immediately
      if (joinedRole === 'viewer' && serverStreamState.isStreaming) {
        console.log('Requesting screen stream from host on join');
        newSocket.emit('request-screen-stream');
      }
    });

    newSocket.on('peer-joined', ({ socketId, userName: peerName, role: peerRole }) => {
      console.log(`Peer joined: ${peerName} (${peerRole}). Cleaning up old connection and negotiating fresh...`);
      setActiveUsers((prev) => ({
        ...prev,
        [peerRole]: peerName
      }));
      setPeerConnected(true);

      // Clean up old connections if they exist to prevent stale connections and blinking/negotiation locks
      cleanupPeerConnection();
      cleanupWebcamPeerConnection();

      // If we are the Host and we have a local stream active, start WebRTC negotiation
      if (role === 'host' && localStreamRef.current) {
        initiateWebRTCConnection();
      }

      // Sync webcam state with the newly joined user
      if (isCameraOn || isMicOn) {
        newSocket.emit('update-webcam-state', { isCameraOn, isMicOn });
      }
    });

    newSocket.on('peer-left', ({ role: leftRole, userName: leftName }) => {
      setActiveUsers((prev) => ({
        ...prev,
        [leftRole]: null
      }));
      setPeerConnected(false);
      setPeerWebcamState({ isCameraOn: false, isMicOn: false });
      
      if (role === 'viewer') {
        setRemoteStream(null);
        setStreamState({ isStreaming: false, isMuted: false });
      }
      cleanupPeerConnection();
      cleanupWebcamPeerConnection();
    });

    // Screen Share WebRTC Signaling Relay
    newSocket.on('screen-signal', async ({ from, signal }) => {
      try {
        if (signal.type === 'offer') {
          await handleScreenOffer(signal);
        } else if (signal.type === 'answer') {
          if (peerConnectionRef.current) {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: signal.sdp }));
            // Process queued candidates
            while (screenCandidatesQueueRef.current.length > 0) {
              const cand = screenCandidatesQueueRef.current.shift();
              if (cand) {
                await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(cand));
              }
            }
          }
        } else if (signal.type === 'candidate') {
          if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } else {
            screenCandidatesQueueRef.current.push(signal.candidate);
          }
        }
      } catch (err) {
        console.error('Error handling screen WebRTC signal:', err);
      }
    });

    // Webcam WebRTC Signaling Relay
    newSocket.on('webcam-signal', async ({ from, signal }) => {
      try {
        if (signal.type === 'offer') {
          await handleWebcamOffer(signal);
        } else if (signal.type === 'answer') {
          if (webcamPeerConnectionRef.current) {
            await webcamPeerConnectionRef.current.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: signal.sdp }));
            // Process queued candidates
            while (webcamCandidatesQueueRef.current.length > 0) {
              const cand = webcamCandidatesQueueRef.current.shift();
              if (cand) {
                await webcamPeerConnectionRef.current.addIceCandidate(new RTCIceCandidate(cand));
              }
            }
          }
        } else if (signal.type === 'candidate') {
          if (webcamPeerConnectionRef.current && webcamPeerConnectionRef.current.remoteDescription) {
            await webcamPeerConnectionRef.current.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } else {
            webcamCandidatesQueueRef.current.push(signal.candidate);
          }
        }
      } catch (err) {
        console.error('Error handling webcam WebRTC signal:', err);
      }
    });

    // Handle Viewer request for screen share (Host side)
    newSocket.on('viewer-requests-screen', () => {
      console.log('Viewer requested screen stream. Initiating WebRTC...');
      if (role === 'host' && localStreamRef.current) {
        initiateWebRTCConnection();
      }
    });

    // Handle Webcam toggles from the other user
    newSocket.on('webcam-state-updated', ({ role: peerRole, isCameraOn: peerCam, isMicOn: peerMic }) => {
      setPeerWebcamState({ isCameraOn: peerCam, isMicOn: peerMic });
      
      // If we are Host, we initiate/re-negotiate the webcam connection to transmit/receive tracks
      if (role === 'host') {
        setTimeout(() => {
          initiateWebcamNegotiation();
        }, 500);
      }
    });

    // Chat Message
    newSocket.on('message-received', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    // Typing
    newSocket.on('user-typing', ({ userName: typingUser, isTyping }) => {
      if (typingUser !== userName) {
        setOtherUserTyping(isTyping);
      }
    });

    // Stream status update from Host
    newSocket.on('stream-state-updated', (state) => {
      setStreamState(state);
      // Fix: If stream just became active, request the connection
      if (role === 'viewer' && state.isStreaming) {
        console.log('Screen stream is active, requesting connection');
        newSocket.emit('request-screen-stream');
      }
    });

    // Handle lobby note updates
    newSocket.on('note-updated', ({ note: updatedNote }) => {
      setRoomNote(updatedNote);
    });

    // End session command from Host
    newSocket.on('session-ended', () => {
      alert('The Host has ended this movie night session. 🎀');
      onLeave();
    });

    // Interactive Action Effects Triggers
    newSocket.on('action-triggered', ({ actionType, senderName }) => {
      if (actionType === 'popcorn') {
        triggerPopcornEffect();
      } else if (actionType === 'heart-burst') {
        triggerHeartBurstEffect();
      } else if (actionType === 'bonk') {
        triggerBonkEffect(senderName);
      } else if (actionType === 'hug') {
        triggerHugEffect(senderName);
      } else if (actionType === 'wakeup') {
        triggerWakeupEffect(senderName);
      }
    });

    return () => {
      newSocket.close();
      cleanupPeerConnection();
      cleanupWebcamPeerConnection();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (localWebcamStreamRef.current) {
        localWebcamStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [roomName, password, role]);

  // Clean up WebRTC peer connection (Screen Share)
  const cleanupPeerConnection = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    screenCandidatesQueueRef.current = [];
    setStats(null);
  };

  // Clean up WebRTC peer connection (Webcam)
  const cleanupWebcamPeerConnection = () => {
    if (webcamPeerConnectionRef.current) {
      webcamPeerConnectionRef.current.close();
      webcamPeerConnectionRef.current = null;
    }
    webcamCandidatesQueueRef.current = [];
    setRemoteWebcamStream(null);
  };

  // 2. WebRTC Logic - Host initiates Screen Sharing
  const initiateWebRTCConnection = () => {
    if (peerConnectionRef.current && peerConnectionRef.current.signalingState !== 'closed') {
      console.log('Screen WebRTC peer connection is already active or negotiating. Skipping creation.');
      return;
    }

    cleanupPeerConnection();

    const pc = createPeerConnection(
      // onIceCandidate
      (candidate) => {
        socketRef.current.emit('screen-signal', { signal: { type: 'candidate', candidate } });
      },
      // onTrack (Host does not receive tracks for screen share)
      null,
      // onConnectionStateChange
      (state) => {
        console.log(`Screen connection state: ${state}`);
        if (state === 'connected') setPeerConnected(true);
        if (state === 'disconnected' || state === 'failed') setPeerConnected(false);
      }
    );

    peerConnectionRef.current = pc;

    // Add local screen share stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Create SDP Offer
    pc.createOffer()
      .then((offer) => pc.setLocalDescription(offer))
      .then(() => {
        socketRef.current.emit('screen-signal', {
          signal: { type: 'offer', sdp: pc.localDescription.sdp }
        });
      })
      .catch((err) => console.error('Failed to create screen share offer:', err));

    // Monitor statistics
    monitorConnectionStats(pc, (webrtcStats) => {
      setStats(webrtcStats);
    });
  };

  // 2b. WebRTC Logic - Viewer handles Screen Share offer
  const handleScreenOffer = async (signal) => {
    let pc = peerConnectionRef.current;

    // Only create a new peer connection if we do not have one, or if it is closed
    if (!pc || pc.signalingState === 'closed') {
      cleanupPeerConnection();
      pc = createPeerConnection(
        // onIceCandidate
        (candidate) => {
          socketRef.current.emit('screen-signal', { signal: { type: 'candidate', candidate } });
        },
        // onTrack
        (remoteStreamObj) => {
          setRemoteStream(remoteStreamObj);
        },
        // onConnectionStateChange
        (state) => {
          console.log(`Screen connection state: ${state}`);
          if (state === 'connected') setPeerConnected(true);
        }
      );
      peerConnectionRef.current = pc;
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: signal.sdp }));
      
      // Process queued candidates
      while (screenCandidatesQueueRef.current.length > 0) {
        const cand = screenCandidatesQueueRef.current.shift();
        if (cand) {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        }
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socketRef.current.emit('screen-signal', {
        signal: { type: 'answer', sdp: pc.localDescription.sdp }
      });
    } catch (err) {
      console.error('Error handling screen WebRTC offer:', err);
    }

    monitorConnectionStats(pc, (webrtcStats) => {
      setStats(webrtcStats);
    });
  };

  // 3. WebRTC Logic - Host initiates Webcam connection
  const initiateWebcamNegotiation = () => {
    if (webcamPeerConnectionRef.current && webcamPeerConnectionRef.current.signalingState !== 'closed') {
      console.log('Webcam WebRTC connection already active. Syncing tracks.');
      if (localWebcamStreamRef.current) {
        syncWebcamTracksToPeerConnection(localWebcamStreamRef.current);
      }
      return;
    }

    cleanupWebcamPeerConnection();

    // Only establish connection if someone has camera/mic active
    if (!localWebcamStreamRef.current && !peerWebcamState.isCameraOn && !peerWebcamState.isMicOn) {
      return;
    }

    const pc = new RTCPeerConnection({ iceServers });
    webcamPeerConnectionRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit('webcam-signal', { signal: { type: 'candidate', candidate: event.candidate } });
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteWebcamStream(event.streams[0]);
      }
    };

    // Add local tracks if webcam/mic is on
    if (localWebcamStreamRef.current) {
      localWebcamStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localWebcamStreamRef.current);
      });
    }

    pc.createOffer()
      .then((offer) => pc.setLocalDescription(offer))
      .then(() => {
        socketRef.current.emit('webcam-signal', {
          signal: { type: 'offer', sdp: pc.localDescription.sdp }
        });
      })
      .catch((err) => console.error('Failed to create webcam offer:', err));
  };

  // 3b. WebRTC Logic - Viewer handles Webcam offer
  const handleWebcamOffer = async (signal) => {
    let pc = webcamPeerConnectionRef.current;

    if (!pc || pc.signalingState === 'closed') {
      cleanupWebcamPeerConnection();
      pc = new RTCPeerConnection({ iceServers });
      webcamPeerConnectionRef.current = pc;

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current.emit('webcam-signal', { signal: { type: 'candidate', candidate: event.candidate } });
        }
      };

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteWebcamStream(event.streams[0]);
        }
      };

      // Add local tracks if webcam/mic is on
      if (localWebcamStreamRef.current) {
        localWebcamStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localWebcamStreamRef.current);
        });
      }
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: signal.sdp }));

      // Process queued candidates
      while (webcamCandidatesQueueRef.current.length > 0) {
        const cand = webcamCandidatesQueueRef.current.shift();
        if (cand) {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        }
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socketRef.current.emit('webcam-signal', {
        signal: { type: 'answer', sdp: pc.localDescription.sdp }
      });
    } catch (err) {
      console.error('Failed to handle webcam offer:', err);
    }
  };

  // 4. Toggle Local Webcam Stream (Camera/Mic) via Track Level Toggles
  const getOrCreateWebcamStream = async () => {
    if (localWebcamStreamRef.current) {
      return localWebcamStreamRef.current;
    }

    try {
      console.log('Acquiring local camera and mic tracks...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 320, frameRate: 15 },
        audio: true
      });
      localWebcamStreamRef.current = stream;
      setLocalWebcamStream(stream);

      // Disable tracks initially until toggled ON by user
      stream.getVideoTracks().forEach(track => {
        track.enabled = false;
      });
      stream.getAudioTracks().forEach(track => {
        track.enabled = false;
      });

      return stream;
    } catch (err) {
      console.warn('getUserMedia with dual tracks failed. Trying fallbacks...', err);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localWebcamStreamRef.current = stream;
        setLocalWebcamStream(stream);
        stream.getAudioTracks().forEach(track => {
          track.enabled = false;
        });
        return stream;
      } catch (audioErr) {
        console.warn('Audio-only getUserMedia failed. Trying video-only...', audioErr);
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 320, frameRate: 15 } });
          localWebcamStreamRef.current = stream;
          setLocalWebcamStream(stream);
          stream.getVideoTracks().forEach(track => {
            track.enabled = false;
          });
          return stream;
        } catch (videoErr) {
          console.error('All camera/microphone requests failed:', videoErr);
          throw videoErr;
        }
      }
    }
  };

  const syncWebcamTracksToPeerConnection = (stream) => {
    const pc = webcamPeerConnectionRef.current;
    if (pc) {
      stream.getTracks().forEach(track => {
        const sender = pc.getSenders().find(s => s.track === track);
        if (!sender) {
          pc.addTrack(track, stream);
        }
      });

      if (role === 'host') {
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer))
          .then(() => {
            socketRef.current.emit('webcam-signal', {
              signal: { type: 'offer', sdp: pc.localDescription.sdp }
            });
          })
          .catch(err => console.error('Error renegotiating tracks:', err));
      }
    } else if (role === 'host' && activeUsers.viewer) {
      initiateWebcamNegotiation();
    }
  };

  const toggleCamera = async () => {
    const nextState = !isCameraOn;
    setIsCameraOn(nextState);
    
    try {
      const stream = await getOrCreateWebcamStream();
      stream.getVideoTracks().forEach(track => {
        track.enabled = nextState;
      });
      
      if (socketRef.current) {
        socketRef.current.emit('update-webcam-state', { isCameraOn: nextState, isMicOn });
      }

      syncWebcamTracksToPeerConnection(stream);
    } catch (err) {
      console.error(err);
      alert('Could not access camera pookie! 🥺🎀');
      setIsCameraOn(false);
    }
  };

  const toggleMic = async () => {
    const nextState = !isMicOn;
    setIsMicOn(nextState);
    
    try {
      const stream = await getOrCreateWebcamStream();
      stream.getAudioTracks().forEach(track => {
        track.enabled = nextState;
      });
      
      if (socketRef.current) {
        socketRef.current.emit('update-webcam-state', { isCameraOn, isMicOn: nextState });
      }

      syncWebcamTracksToPeerConnection(stream);
    } catch (err) {
      console.error(err);
      alert('Could not access microphone pookie! 🥺🎀');
      setIsMicOn(false);
    }
  };

  // 5. Screen Sharing Trigger (Host)
  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      localStreamRef.current = stream;
      setLocalStream(stream);

      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      const newStreamState = { isStreaming: true, isMuted: isHostMuted };
      setStreamState(newStreamState);
      socketRef.current.emit('update-stream-state', newStreamState);

      // Force initiate connection right away if viewer is in room
      if (activeUsers.viewer) {
        initiateWebRTCConnection();
      }

    } catch (err) {
      console.error('Error starting screen share:', err);
    }
  };

  const stopScreenShare = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    cleanupPeerConnection();

    const newStreamState = { isStreaming: false, isMuted: false };
    setStreamState(newStreamState);
    if (socketRef.current) {
      socketRef.current.emit('update-stream-state', newStreamState);
    }
  };

  const toggleHostMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      const nextMuted = !isHostMuted;
      audioTracks.forEach(track => {
        track.enabled = !nextMuted;
      });
      setIsHostMuted(nextMuted);

      const nextState = { ...streamState, isMuted: nextMuted };
      setStreamState(nextState);
      socketRef.current.emit('update-stream-state', nextState);
    }
  };

  const toggleLocalMute = () => {
    setIsLocalMuted(!isLocalMuted);
  };

  const handleVolumeChange = (vol) => {
    setLocalVolume(vol);
    setIsLocalMuted(vol === 0);
    const video = document.querySelector('.video-element');
    if (video) {
      video.volume = vol;
    }
  };

  const handleEndSession = () => {
    if (window.confirm('Are you sure you want to end this movie night for everyone, pookie? 🥺')) {
      socketRef.current.emit('end-session');
      onLeave();
    }
  };

  // 6. Send Message & Typing Status
  const handleSendMessage = (text) => {
    if (socketRef.current) {
      socketRef.current.emit('send-message', { text });
    }
  };

  const handleSendTyping = (isTyping) => {
    if (socketRef.current) {
      socketRef.current.emit('typing', { isTyping });
    }
  };

  const handleTriggerAction = (actionType) => {
    if (socketRef.current) {
      socketRef.current.emit('trigger-action', { actionType });
    }
  };

  // 7. Interactive Animation Triggers
  const triggerPopcornEffect = () => {
    const newPopcorns = Array.from({ length: 15 }).map((_, i) => ({
      id: Math.random() + i,
      left: Math.random() * 85 + 5,
      delay: Math.random() * 0.8
    }));
    setPopcorns((prev) => [...prev, ...newPopcorns]);
    setTimeout(() => {
      setPopcorns((prev) => prev.slice(15));
    }, 4500);
  };

  const triggerHeartBurstEffect = () => {
    const newHearts = Array.from({ length: 12 }).map((_, i) => ({
      id: Math.random() + i,
      left: Math.random() * 90 + 5,
      delay: Math.random() * 0.5,
      size: Math.random() * 20 + 20
    }));
    setHearts((prev) => [...prev, ...newHearts]);
    setTimeout(() => {
      setHearts((prev) => prev.slice(12));
    }, 4500);
  };

  const triggerBonkEffect = (sender) => {
    setBonkSender(sender);
    setShowBonk(true);
    setTimeout(() => setShowBonk(false), 900);
  };

  const triggerHugEffect = (sender) => {
    setHugSender(sender);
    setShowHug(true);
    setTimeout(() => setShowHug(false), 2500);
  };

  const triggerWakeupEffect = (sender) => {
    setWakeupSender(sender);
    setShowWakeup(true);
    setTimeout(() => setShowWakeup(false), 2000);
  };

  const handleNoteChange = (text) => {
    setRoomNote(text);
    if (socketRef.current) {
      socketRef.current.emit('update-note', { note: text });
    }
  };

  const copyInviteLink = () => {
    const inviteUrl = `${window.location.origin}/?room=${roomName}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (errorMsg) {
    return (
      <div style={styles.errorContainer}>
        <div className="glass-panel" style={styles.errorCard}>
          <h2 style={{ color: 'var(--pookie-pink)' }}>Oops, sorry Pookie!</h2>
          <p style={{ marginTop: '10px' }}>{errorMsg}</p>
        </div>
      </div>
    );
  }

  if (inLobby) {
    return (
      <div style={{ ...styles.lobbyContainer, height: isMobile ? 'auto' : '100vh', overflowY: isMobile ? 'auto' : 'hidden' }}>
        {/* Interaction Overlays */}
        <div className="reaction-overlay">
          {popcorns.map((p) => (
            <span
              key={p.id}
              className="falling-popcorn"
              style={{
                left: `${p.left}%`,
                animationDelay: `${p.delay}s`
              }}
            >
              🍿
            </span>
          ))}

          {hearts.map((h) => (
            <span
              key={h.id}
              style={{
                position: 'fixed',
                left: `${h.left}%`,
                bottom: '-50px',
                fontSize: `${h.size}px`,
                opacity: 0,
                animationName: 'heartFloat',
                animationDuration: '3.5s',
                animationTimingFunction: 'ease-out',
                animationDelay: `${h.delay}s`,
                pointerEvents: 'none',
                zIndex: 999
              }}
            >
              💖
            </span>
          ))}

          {showBonk && (
            <div style={styles.bonkOverlay}>
              <div className="bonk-hammer">🔨💥</div>
              <div style={styles.actionLabel}>{bonkSender} bonked you!</div>
            </div>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="glass-panel"
          style={{ ...styles.lobbyCard, padding: isMobile ? '24px 16px' : '40px', maxWidth: isMobile ? '100%' : '920px' }}
        >
          <div style={styles.lobbyHeader}>
            <h1 style={styles.lobbyTitle}>Hey Pookie 🧸💞</h1>
            <p style={styles.lobbySubtitle}>Ready for movie night?</p>
          </div>

          <div style={{ ...styles.lobbyDetailsGrid, gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr', gap: isMobile ? '20px' : '30px' }}>
            {/* Left Column: Room Code & Status Info */}
            <div style={styles.lobbyStatusSection}>
              <div style={styles.roomCodeBox}>
                <span style={styles.roomCodeLabel}>Lobby Room Code</span>
                <div style={styles.roomCodeRow}>
                  <code style={styles.roomCode}>{roomName.toUpperCase()}</code>
                  <button onClick={copyInviteLink} className="btn-secondary" style={styles.inviteBtn}>
                    {copied ? 'Copied! 🎀' : 'Copy Invite Link 💌'}
                  </button>
                </div>
              </div>

              {/* Status Section */}
              <div style={styles.pookiesStatus}>
                <h3 style={styles.lobbySectionHeader}>Pookies Connected</h3>
                <div style={{ ...styles.avatarsRow, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '12px' : '20px' }}>
                  {/* Host Avatar Card */}
                  <div style={{...styles.lobbyAvatarCard, borderColor: activeUsers.host ? 'var(--pookie-pink)' : 'rgba(255, 255, 255, 0.05)'}}>
                    <div style={styles.avatarCircleWrapper}>
                      {activeUsers.host && isCameraOn && role === 'host' && localWebcamStream ? (
                        <WebcamFeed stream={localWebcamStream} isMuted={true} />
                      ) : activeUsers.host && peerWebcamState.isCameraOn && role === 'viewer' && remoteWebcamStream ? (
                        <WebcamFeed stream={remoteWebcamStream} isMuted={false} />
                      ) : (
                        <div style={styles.avatarPlaceholderCircle}>
                          <span style={{ fontSize: '36px' }}>🐱</span>
                        </div>
                      )}
                      <span style={{
                        ...styles.onlineIndicatorDot, 
                        backgroundColor: activeUsers.host ? '#4caf50' : '#f44336'
                      }} />
                    </div>
                    <span style={styles.avatarName}>{activeUsers.host || 'Waiting for Host...'}</span>
                    <span style={styles.avatarRoleLabel}>Host 👑</span>
                    <div style={styles.lobbyMediaIndicators}>
                      <span>{activeUsers.host ? (role === 'host' ? (isMicOn ? '🟢 Mic ON' : '🔴 Mic OFF') : (peerWebcamState.isMicOn ? '🟢 Mic ON' : '🔴 Mic OFF')) : '🚫 Offline'}</span>
                      <span>{activeUsers.host ? (role === 'host' ? (isCameraOn ? '📹 Cam ON' : '🚫 Cam OFF') : (peerWebcamState.isCameraOn ? '📹 Cam ON' : '🚫 Cam OFF')) : '🚫 Offline'}</span>
                    </div>
                  </div>

                  {/* Viewer Avatar Card */}
                  <div style={{...styles.lobbyAvatarCard, borderColor: activeUsers.viewer ? 'var(--pookie-lavender)' : 'rgba(255, 255, 255, 0.05)'}}>
                    <div style={styles.avatarCircleWrapper}>
                      {activeUsers.viewer && isCameraOn && role === 'viewer' && localWebcamStream ? (
                        <WebcamFeed stream={localWebcamStream} isMuted={true} />
                      ) : activeUsers.viewer && peerWebcamState.isCameraOn && role === 'host' && remoteWebcamStream ? (
                        <WebcamFeed stream={remoteWebcamStream} isMuted={false} />
                      ) : (
                        <div style={styles.avatarPlaceholderCircle}>
                          <span style={{ fontSize: '36px' }}>🐰</span>
                        </div>
                      )}
                      <span style={{
                        ...styles.onlineIndicatorDot, 
                        backgroundColor: activeUsers.viewer ? '#4caf50' : '#f44336'
                      }} />
                    </div>
                    <span style={styles.avatarName}>{activeUsers.viewer || 'Waiting for Viewer...'}</span>
                    <span style={styles.avatarRoleLabel}>Viewer 🍿</span>
                    <div style={styles.lobbyMediaIndicators}>
                      <span>{activeUsers.viewer ? (role === 'viewer' ? (isMicOn ? '🟢 Mic ON' : '🔴 Mic OFF') : (peerWebcamState.isMicOn ? '🟢 Mic ON' : '🔴 Mic OFF')) : '🚫 Offline'}</span>
                      <span>{activeUsers.viewer ? (role === 'viewer' ? (isCameraOn ? '📹 Cam ON' : '🚫 Cam OFF') : (peerWebcamState.isCameraOn ? '📹 Cam ON' : '🚫 Cam OFF')) : '🚫 Offline'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Lobby Notes Editor */}
            <div style={styles.lobbyNotesSection}>
              <h3 style={styles.lobbySectionHeader}>Notes for Pookie 🧸📝</h3>
              <p style={{fontSize: '0.78rem', color: 'var(--pookie-text-light)', marginBottom: '8px'}}>Leave a cute note here. It updates in real time for both pookies!</p>
              <textarea
                value={roomNote}
                onChange={(e) => handleNoteChange(e.target.value)}
                placeholder="Write a sweet letter, select movies to watch, or just say I love you..."
                style={styles.lobbyNotesTextarea}
                className="glass-input"
              />
              <div style={styles.lobbyNotesFooter}>
                <span style={{color: 'var(--pookie-pink)', fontWeight: 600, fontSize: '0.82rem'}}>
                  ✨ Real-time Synced Panel
                </span>
              </div>
            </div>
          </div>

          {/* Lobby Device Setup Bar */}
          <div style={styles.lobbySetupBar} className="glass-panel">
            <span style={{fontSize: '0.92rem', fontWeight: 'bold', color: 'var(--pookie-text)'}}>Lobby Device Test:</span>
            <div style={{display: 'flex', gap: '10px'}}>
              <button onClick={toggleCamera} className={isCameraOn ? "btn-primary" : "btn-secondary"} style={styles.lobbySetupBtn}>
                {isCameraOn ? '📹 Cam Active' : '🚫 Cam Muted'}
              </button>
              <button onClick={toggleMic} className={isMicOn ? "btn-primary" : "btn-secondary"} style={styles.lobbySetupBtn}>
                {isMicOn ? '🟢 Mic Active' : '🔴 Mic Muted'}
              </button>
            </div>
          </div>

          <div style={styles.lobbyActionsRow}>
            <button onClick={onLeave} className="btn-secondary" style={styles.leaveLobbyBtn}>
              Leave Room
            </button>
            <button onClick={() => setInLobby(false)} className="btn-primary" style={styles.enterRoomBtn}>
              Enter Watch Room 🍿
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ ...styles.container, height: isMobile ? 'auto' : '100vh', padding: isMobile ? '10px' : '20px', overflowY: isMobile ? 'auto' : 'hidden' }}>
      {/* Interaction Overlays */}
      <div className="reaction-overlay">
        {popcorns.map((p) => (
          <span
            key={p.id}
            className="falling-popcorn"
            style={{
              left: `${p.left}%`,
              animationDelay: `${p.delay}s`
            }}
          >
            🍿
          </span>
        ))}

        {hearts.map((h) => (
          <span
            key={h.id}
            style={{
              position: 'fixed',
              left: `${h.left}%`,
              bottom: '-50px',
              fontSize: `${h.size}px`,
              opacity: 0,
              animationName: 'heartFloat',
              animationDuration: '3.5s',
              animationTimingFunction: 'ease-out',
              animationDelay: `${h.delay}s`,
              pointerEvents: 'none',
              zIndex: 999
            }}
          >
            💖
          </span>
        ))}

        {showBonk && (
          <div style={styles.bonkOverlay}>
            <div className="bonk-hammer">🔨💥</div>
            <div style={styles.actionLabel}>{bonkSender} bonked you!</div>
          </div>
        )}

        {showHug && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1.1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            style={styles.actionOverlayBox}
          >
            <span style={{ fontSize: '72px' }}>🤗🧸💕</span>
            <div style={styles.actionLabel}>{hugSender} sent a giant warm hug!</div>
          </motion.div>
        )}

        {showWakeup && (
          <motion.div
            animate={{
              x: [-8, 8, -6, 6, -4, 4, 0],
              y: [-4, 4, -3, 3, -2, 2, 0]
            }}
            transition={{ repeat: 3, duration: 0.4 }}
            style={styles.actionOverlayBox}
          >
            <span style={{ fontSize: '72px' }}>😴⏰📢💥</span>
            <div style={styles.actionLabel}>{wakeupSender} is screaming: WAKE UP!</div>
          </motion.div>
        )}
      </div>

      {/* Main Room Layout */}
      <div style={{ ...styles.layoutGrid, flexDirection: isMobile ? 'column' : 'row', overflowY: isMobile ? 'auto' : 'hidden' }}>
        {/* Main Video Section */}
        <div style={{ ...styles.videoSection, flex: isMobile ? 'none' : 3, width: isMobile ? '100%' : 'auto' }}>
          <div style={styles.roomHeader}>
            <div style={styles.headerInfo}>
              <h2 style={{ ...styles.roomTitle, color: 'var(--pookie-pink)' }}>Watching Together 🎬✨</h2>
              <div style={styles.usersOnline}>
                <Users size={16} color="var(--pookie-pink)" />
                <span style={{ ...styles.userNames, color: 'var(--pookie-text-light)' }}>
                  {activeUsers.host ? `Host: ${activeUsers.host}` : 'No Host'} •{' '}
                  {activeUsers.viewer ? `Viewer: ${activeUsers.viewer}` : 'No Viewer'}
                </span>
              </div>
            </div>
            
            {isMobile && (
              <button
                onClick={() => setIsChatOpen(!isChatOpen)}
                className="btn-secondary"
                style={styles.mobileChatToggle}
              >
                <MessageSquare size={18} />
                Chat
              </button>
            )}
          </div>

          {/* Large Movie Screen */}
          <div style={styles.videoPlayerWrapper}>
            <VideoPlayer
              role={role}
              stream={role === 'host' ? localStream : remoteStream}
              streamState={streamState}
              onStartShare={startScreenShare}
              onStopShare={stopScreenShare}
              onEndSession={handleEndSession}
              stats={stats}
              localVolume={localVolume}
              onVolumeChange={handleVolumeChange}
              isLocalMuted={isLocalMuted}
              onToggleLocalMute={toggleLocalMute}
              isHostMuted={isHostMuted}
              onToggleHostMute={toggleHostMute}
            />
          </div>

          {/* Webcams and hardware toggles row */}
          <div className="glass-panel" style={{ ...styles.webcamsPanel, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', gap: isMobile ? '14px' : '20px' }}>
            <div style={styles.deviceControls}>
              <span style={styles.deviceTitle}>Face & Voice Chat 💖</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={toggleCamera}
                  className={isCameraOn ? "btn-primary" : "btn-secondary"}
                  style={styles.deviceBtn}
                  title="Toggle Camera"
                >
                  {isCameraOn ? <Video size={16} /> : <VideoOff size={16} />} Cam
                </button>
                <button
                  onClick={toggleMic}
                  className={isMicOn ? "btn-primary" : "btn-secondary"}
                  style={styles.deviceBtn}
                  title="Toggle Microphone"
                >
                  {isMicOn ? <Mic size={16} /> : <MicOff size={16} />} Mic
                </button>
              </div>
            </div>

            <div className="webcams-container" style={{ marginTop: 0 }}>
              {/* Local Feed */}
              <div 
                className="webcam-card" 
                style={{ 
                  ...styles.circularWebcamCard, 
                  borderColor: role === 'host' ? 'var(--pookie-pink)' : 'var(--pookie-lavender)',
                  boxShadow: role === 'host' ? '0 0 15px rgba(255, 105, 180, 0.4)' : '0 0 15px rgba(200, 162, 255, 0.4)'
                }}
              >
                {isCameraOn && localWebcamStream ? (
                  <WebcamFeed stream={localWebcamStream} isMuted={true} />
                ) : (
                  <div style={styles.webcamCardPlaceholder}>
                    <span style={{ fontSize: '24px' }}>{role === 'host' ? '🐱' : '🐰'}</span>
                    <span style={{ fontSize: '0.65rem', color: '#c8a2ff', fontWeight: 'bold' }}>{isCameraOn ? '📹 ON' : '🚫 OFF'}</span>
                  </div>
                )}
                {/* Indicators */}
                <div style={{...styles.webcamMicStatusDot, backgroundColor: isMicOn ? '#4caf50' : '#f44336'}} />
                <span className="webcam-label">You</span>
              </div>

              {/* Remote Feed */}
              <div 
                className="webcam-card" 
                style={{ 
                  ...styles.circularWebcamCard, 
                  borderColor: role === 'host' ? 'var(--pookie-lavender)' : 'var(--pookie-pink)',
                  boxShadow: role === 'host' ? '0 0 15px rgba(200, 162, 255, 0.4)' : '0 0 15px rgba(255, 105, 180, 0.4)'
                }}
              >
                {peerWebcamState.isCameraOn && remoteWebcamStream ? (
                  <WebcamFeed stream={remoteWebcamStream} isMuted={false} />
                ) : (
                  <div style={styles.webcamCardPlaceholder}>
                    <span style={{ fontSize: '24px' }}>{role === 'host' ? '🐰' : '🐱'}</span>
                    <span style={{ fontSize: '0.65rem', color: '#c8a2ff', fontWeight: 'bold' }}>{peerWebcamState.isCameraOn ? '📹 ON' : '🚫 OFF'}</span>
                  </div>
                )}
                {/* Indicators */}
                <div style={{...styles.webcamMicStatusDot, backgroundColor: peerWebcamState.isMicOn ? '#4caf50' : '#f44336'}} />
                <span className="webcam-label">Pookie</span>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Sidebar Chat Panel */}
        {!isMobile && (
          <div style={styles.chatSection}>
            <ChatPanel
              messages={messages}
              userName={userName}
              typingStatus={otherUserTyping}
              onSendMessage={handleSendMessage}
              onSendTyping={handleSendTyping}
              onTriggerAction={handleTriggerAction}
              isMobile={false}
            />
          </div>
        )}
      </div>

      {/* Mobile Drawer Chat Panel (Bottom Sheet) */}
      <AnimatePresence>
        {isMobile && isChatOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsChatOpen(false)}
              style={styles.mobileOverlay}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={styles.mobileDrawer}
            >
              <div style={styles.drawerHandleRow}>
                <div style={styles.drawerHandle} />
                <button
                  onClick={() => setIsChatOpen(false)}
                  style={styles.closeDrawerBtn}
                >
                  <X size={18} />
                </button>
              </div>
              <div style={styles.drawerChatContainer}>
                <ChatPanel
                  messages={messages}
                  userName={userName}
                  typingStatus={otherUserTyping}
                  onSendMessage={handleSendMessage}
                  onSendTyping={handleSendTyping}
                  onTriggerAction={handleTriggerAction}
                  isMobile={true}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

const styles = {
  container: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px',
    overflow: 'hidden',
  },
  errorContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    width: '100vw',
    padding: '20px',
  },
  errorCard: {
    padding: '40px',
    maxWidth: '400px',
    textAlign: 'center',
    border: '2px solid rgba(255, 143, 163, 0.3)',
  },
  layoutGrid: {
    display: 'flex',
    gap: '20px',
    width: '100%',
    height: '100%',
    flex: 1,
    overflow: 'hidden',
  },
  videoSection: {
    flex: 3,
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    height: '100%',
  },
  roomHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'var(--glass-bg)',
    padding: '12px 20px',
    borderRadius: '16px',
    border: '1px solid var(--glass-border)',
    boxShadow: 'var(--glass-shadow)',
  },
  headerInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  roomTitle: {
    fontSize: '1.25rem',
    fontFamily: 'var(--font-headers)',
  },
  usersOnline: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.85rem',
  },
  userNames: {
    fontWeight: '600',
  },
  mobileChatToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    fontSize: '0.85rem',
    borderRadius: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  videoPlayerWrapper: {
    flex: 1,
    minHeight: 0,
  },
  webcamsPanel: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 20px',
    backgroundColor: 'var(--glass-bg)',
    border: '1px solid var(--glass-border)',
    borderRadius: '16px',
    gap: '20px',
  },
  deviceControls: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  deviceTitle: {
    fontSize: '0.9rem',
    fontWeight: '700',
    color: 'var(--pookie-pink)',
    fontFamily: 'var(--font-headers)',
  },
  deviceBtn: {
    padding: '8px 14px',
    fontSize: '0.8rem',
    borderRadius: '10px',
  },
  chatSection: {
    flex: 1.1,
    minWidth: '320px',
    height: '100%',
  },
  bonkOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 77, 109, 0.15)',
    zIndex: 9999,
    pointerEvents: 'none',
  },
  actionOverlayBox: {
    position: 'fixed',
    top: '40%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'rgba(28, 14, 34, 0.95)',
    border: '2px solid var(--glass-border)',
    borderRadius: '24px',
    padding: '24px 40px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '15px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
    zIndex: 9999,
    pointerEvents: 'none',
  },
  actionLabel: {
    fontSize: '1.2rem',
    fontWeight: '700',
    color: 'var(--pookie-pink)',
    fontFamily: 'var(--font-headers)',
    textAlign: 'center',
  },
  mobileOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: '#000',
    zIndex: 100,
  },
  mobileDrawer: {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    height: '75vh',
    backgroundColor: '#160d1b',
    borderTopLeftRadius: '24px',
    borderTopRightRadius: '24px',
    boxShadow: '0 -8px 24px rgba(0,0,0,0.5)',
    zIndex: 101,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    borderTop: '2px solid var(--glass-border)',
  },
  drawerHandleRow: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '12px 16px',
    position: 'relative',
    borderBottom: '1px solid rgba(255, 143, 163, 0.1)',
  },
  drawerHandle: {
    width: '40px',
    height: '5px',
    borderRadius: '3px',
    backgroundColor: 'rgba(255, 143, 163, 0.3)',
  },
  closeDrawerBtn: {
    position: 'absolute',
    right: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: 'var(--pookie-text-light)',
    cursor: 'pointer',
  },
  drawerChatContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  lobbyContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    width: '100vw',
    padding: '20px',
    zIndex: 1,
    overflowY: 'auto',
    position: 'relative',
  },
  lobbyCard: {
    width: '100%',
    maxWidth: '920px',
    padding: '40px',
    backgroundColor: 'rgba(16, 16, 16, 0.75)',
    border: '1px solid rgba(255, 105, 180, 0.25)',
    boxShadow: '0 24px 50px rgba(0, 0, 0, 0.8), 0 0 35px rgba(255, 105, 180, 0.05)',
  },
  lobbyHeader: {
    textAlign: 'center',
    marginBottom: '35px',
  },
  lobbyTitle: {
    fontSize: '2.5rem',
    background: 'linear-gradient(to right, #FF69B4, #C8A2FF)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    fontFamily: 'var(--font-headers)',
    fontWeight: '700',
    marginBottom: '8px',
  },
  lobbySubtitle: {
    fontSize: '1.1rem',
    color: '#FFE5E9',
    opacity: 0.85,
  },
  lobbyDetailsGrid: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 1fr',
    gap: '30px',
    marginBottom: '30px',
  },
  lobbyStatusSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  roomCodeBox: {
    backgroundColor: 'rgba(5, 5, 5, 0.4)',
    border: '1px solid rgba(255, 105, 180, 0.15)',
    padding: '16px 20px',
    borderRadius: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  roomCodeLabel: {
    fontSize: '0.8rem',
    fontWeight: 'bold',
    color: '#C8A2FF',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  roomCodeRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
  },
  roomCode: {
    fontFamily: 'monospace',
    fontSize: '1.3rem',
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: '1px',
  },
  inviteBtn: {
    padding: '6px 14px',
    fontSize: '0.8rem',
    borderRadius: '10px',
    border: '1px solid rgba(255, 105, 180, 0.25)',
    color: '#FF69B4',
    backgroundColor: 'transparent',
    cursor: 'pointer',
  },
  pookiesStatus: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  lobbySectionHeader: {
    fontSize: '1.1rem',
    color: '#C8A2FF',
    fontFamily: 'var(--font-headers)',
    fontWeight: '600',
  },
  avatarsRow: {
    display: 'flex',
    gap: '20px',
  },
  lobbyAvatarCard: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px 16px',
    borderRadius: '20px',
    backgroundColor: 'rgba(5, 5, 5, 0.3)',
    border: '2px solid transparent',
    transition: 'all 0.3s ease',
  },
  avatarCircleWrapper: {
    position: 'relative',
    width: '90px',
    height: '90px',
    borderRadius: '50%',
    marginBottom: '12px',
  },
  avatarPlaceholderCircle: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 16, 16, 0.8)',
    border: '1.5px dashed rgba(200, 162, 255, 0.4)',
  },
  onlineIndicatorDot: {
    position: 'absolute',
    bottom: '4px',
    right: '4px',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    border: '2px solid #101010',
  },
  avatarName: {
    fontSize: '0.95rem',
    fontWeight: 'bold',
    color: '#FFE5E9',
    textAlign: 'center',
  },
  avatarRoleLabel: {
    fontSize: '0.75rem',
    color: '#C8A2FF',
    marginTop: '2px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  lobbyMediaIndicators: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    marginTop: '10px',
    fontSize: '0.7rem',
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600',
  },
  lobbyNotesSection: {
    display: 'flex',
    flexDirection: 'column',
  },
  lobbyNotesTextarea: {
    flex: 1,
    resize: 'none',
    minHeight: '180px',
    padding: '16px',
    fontSize: '0.95rem',
    backgroundColor: 'rgba(5, 5, 5, 0.5)',
    border: '2px solid rgba(200, 162, 255, 0.2)',
    borderRadius: '16px',
    color: '#ffffff',
    outline: 'none',
  },
  lobbyNotesFooter: {
    marginTop: '8px',
    textAlign: 'right',
  },
  lobbySetupBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    backgroundColor: 'rgba(37, 21, 61, 0.25)',
    borderRadius: '16px',
    border: '1.5px solid rgba(200, 162, 255, 0.15)',
    marginBottom: '30px',
  },
  lobbySetupBtn: {
    padding: '8px 14px',
    fontSize: '0.8rem',
    borderRadius: '10px',
  },
  lobbyActionsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '20px',
  },
  leaveLobbyBtn: {
    padding: '12px 24px',
    borderRadius: '14px',
    border: '1.5px solid #f44336',
    color: '#f44336',
    backgroundColor: 'transparent',
    cursor: 'pointer',
  },
  enterRoomBtn: {
    padding: '12px 36px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, #FF69B4 0%, #C8A2FF 100%)',
    boxShadow: '0 4px 20px rgba(255, 105, 180, 0.35)',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: '#ffffff',
    border: 'none',
    cursor: 'pointer',
  },
  circularWebcamCard: {
    width: '90px',
    height: '90px',
    borderRadius: '50%',
    overflow: 'hidden',
    border: '2.5px solid transparent',
    position: 'relative',
    transition: 'var(--transition-smooth)',
  },
  webcamCardPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(5, 5, 5, 0.85)',
    paddingTop: '6px',
  },
  webcamMicStatusDot: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    border: '1px solid #101010',
    zIndex: 10,
  },
};
