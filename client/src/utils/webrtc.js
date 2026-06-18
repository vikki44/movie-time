export const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' }
];

export const createPeerConnection = (onIceCandidate, onTrack, onConnectionStateChange) => {
  const pc = new RTCPeerConnection({ iceServers });

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      onIceCandidate(event.candidate);
    }
  };

  pc.ontrack = (event) => {
    if (onTrack) {
      if (event.streams && event.streams[0]) {
        onTrack(event.streams[0]);
      } else {
        const fallbackStream = new MediaStream([event.track]);
        onTrack(fallbackStream);
      }
    }
  };

  pc.onconnectionstatechange = () => {
    if (onConnectionStateChange) {
      onConnectionStateChange(pc.connectionState);
    }
  };

  return pc;
};

// Monitor connection stats and compute a quality rating and latency approximation
export const monitorConnectionStats = (pc, onStats) => {
  if (!pc) return null;

  const intervalId = setInterval(async () => {
    try {
      if (pc.signalingState === 'closed' || pc.connectionState === 'closed') {
        clearInterval(intervalId);
        return;
      }
      
      const stats = await pc.getStats();
      let rtt = null;
      let packetLoss = 0;
      let jitter = 0;
      let bytesReceived = 0;
      let bytesSent = 0;

      stats.forEach((report) => {
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          rtt = report.currentRoundTripTime * 1000; // Convert to ms
        }
        if (report.type === 'inbound-rtp' && (report.kind === 'video' || report.kind === 'audio')) {
          const lost = report.packetsLost || 0;
          const received = report.packetsReceived || 1;
          packetLoss = (lost / (lost + received)) * 100;
          jitter = report.jitter * 1000 || 0; // ms
          bytesReceived = report.bytesReceived || 0;
        }
        if (report.type === 'outbound-rtp' && (report.kind === 'video' || report.kind === 'audio')) {
          bytesSent = report.bytesSent || 0;
        }
      });

      // Calculate quality level
      let quality = 'good';
      if (rtt > 250 || packetLoss > 5 || jitter > 30) {
        quality = 'poor';
      } else if (rtt > 100 || packetLoss > 2 || jitter > 15) {
        quality = 'fair';
      }

      onStats({
        rtt: rtt !== null ? Math.round(rtt) : null,
        packetLoss: Math.round(packetLoss * 100) / 100,
        jitter: Math.round(jitter * 10) / 10,
        bytesReceived,
        bytesSent,
        quality
      });
    } catch (err) {
      console.warn('Error reading WebRTC stats:', err);
    }
  }, 2000);

  return () => clearInterval(intervalId);
};
