import React, { useState } from 'react';

function LoginPage({ onLogin, onNavigate }) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await fetch('http://localhost:3000/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password }),
      });
      const data = await response.json();
      if (response.ok) {
        // Kun kirjautuminen onnistuu:
        localStorage.setItem('authToken', data.token);
        onLogin(data.token, data.user);
      } else {
        throw new Error('Väärä käyttäjätunnus tai salasana');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#111'
    }}>
      <div style={{
        background: '#222',
        padding: '32px 32px 24px 32px',
        borderRadius: 10,
        boxShadow: '0 2px 16px #0008',
        minWidth: 320
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: 24 }}>Kirjaudu sisään</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6 }}>Käyttäjätunnus</label>
            <input
                type="text"
                value={login}
                onChange={e => setLogin(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: 8,
                  borderRadius: 4,
                  border: '1px solid #444',
                  background: '#181818',
                  color: '#fff',
                  boxSizing: 'border-box' 
                }}
              />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6 }}>Salasana</label>
            <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: 8,
                  borderRadius: 4,
                  border: '1px solid #444',
                  background: '#181818',
                  color: '#fff',
                  boxSizing: 'border-box' 
                }}
/>
          </div>
          <button
              type="submit"
              style={{
                display: 'block',
                width: '100%',
                padding: 10,
                borderRadius: 4,
                background: '#474747ff',
                color: '#ffffffff',
                border: 'none',
                fontWeight: 'bold',
                fontSize: 16,
                cursor: 'pointer',
                boxSizing: 'border-box' 
              }}
            >
              Kirjaudu
            </button>
            <p>Ei tiliä? <a href="#" onClick={e => { e.preventDefault(); onNavigate('register'); }}>Rekisteröidy</a></p>
          {error && <p style={{ color: 'red', marginTop: 16, textAlign: 'center' }}>{error}</p>}
        </form>
      </div>
    </div>
  );
}

export default LoginPage;

