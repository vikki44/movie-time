import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import PasswordScreen from './components/PasswordScreen';
import WelcomeScreen from './components/WelcomeScreen';
import WatchRoom from './components/WatchRoom';
import ThreeDBackground from './components/ThreeDBackground';

const SERVER_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
  ? 'http://localhost:3001' 
  : window.location.origin;

export default function App() {
  const [page, setPage] = useState('password'); // 'password', 'welcome', 'room'
  const [roomName, setRoomName] = useState('default-room');
  const [password, setPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [role, setRole] = useState('viewer'); // 'host' or 'viewer'

  const handlePasswordVerified = ({ roomName: verifiedRoom, password: verifiedPassword }) => {
    setRoomName(verifiedRoom);
    setPassword(verifiedPassword);
    setPage('welcome');
  };

  const handleStartMovieNight = ({ userName: chosenName, role: chosenRole }) => {
    setUserName(chosenName);
    setRole(chosenRole);
    setPage('room');
  };

  const handleBackToPassword = () => {
    setPage('password');
    setPassword('');
  };

  const handleLeaveRoom = () => {
    setPage('welcome');
  };

  return (
    <div style={{ position: 'relative', width: '100vw', minHeight: '100vh', overflow: 'hidden' }}>
      {/* 3D Floating Moon, Hearts, Stars and Particle Background */}
      <ThreeDBackground />

      <AnimatePresence mode="wait">
        {page === 'password' && (
          <PasswordScreen
            key="password"
            onVerified={handlePasswordVerified}
            serverUrl={SERVER_URL}
          />
        )}

        {page === 'welcome' && (
          <WelcomeScreen
            key="welcome"
            roomName={roomName}
            onStart={handleStartMovieNight}
            onBack={handleBackToPassword}
          />
        )}

        {page === 'room' && (
          <WatchRoom
            key="room"
            connectionDetails={{ roomName, password, userName, role }}
            serverUrl={SERVER_URL}
            onLeave={handleLeaveRoom}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
