import React from 'react';
import { useAuth } from './contexts/AuthContext';
import AuthPage from './components/auth/AuthPage';
import AirfoilGarage from './components/AirfoilGarage';

function App() {
  const { currentUser } = useAuth();

  return (
    <>
      {currentUser ? <AirfoilGarage /> : <AuthPage />}
    </>
  );
}

export default App;