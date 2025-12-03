import React, { useState, useEffect } from 'react';
import './App.css';
import LoginPage from './pages/LoginPage';

import MenuPage from './pages/MenuPage';
import ProductsPage from './pages/ProductsPage';
import WarehousesPage from './pages/WarehousesPage';
import ShipmentsPage from './pages/ShipmentsPage';
import AdmintoolsPage from './pages/AdmintoolsPage';
import RegisterPage from './pages/RegisterPage';
import NewUserPendingPage from './pages/NewUserPendingPage';
import ChartsPage from './pages/ChartsPage';

function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [page, setPage] = useState(() => localStorage.getItem('page') || 'login');

  useEffect(() => {
    const savedToken = localStorage.getItem('authToken');
    if (savedToken) {
      setToken(savedToken);
    }
  }, []);

  const handleNavigate = (newPage) => {
    setPage(newPage);
    localStorage.setItem('page', newPage);
  };

  const handleLogin = (token, userObj) => {
    setToken(token);
    setUser(userObj); // Ei tarvitse muuntaa userId:tä
    setPage('menu');
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(userObj));
    localStorage.setItem('page', 'menu');
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setToken(null);
    setPage('login');
    localStorage.setItem('page', 'login');
  };

  useEffect(() => {
    localStorage.setItem('page', page);
  }, [page]);

  // Lue user localStoragesta refreshin jälkeen
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser)); // Ei tarvitse muuntaa userId:tä
    }
  }, []);

  if (!token) {
    if (page === 'register') {
      return <RegisterPage onBack={() => setPage('login')} />;
    }
    return <LoginPage onLogin={handleLogin} onNavigate={handleNavigate} />;
  }

  if (user && user.role === 'newuser') {
    return <NewUserPendingPage onLogout={handleLogout} />;
  }

  return (
    <div className="App">
      <header className="App-header">
        
      </header>
      {page === 'menu' && <MenuPage onNavigate={handleNavigate} onLogout={handleLogout} user={user} />}
      {page === 'products' && <ProductsPage token={token} onBack={() => setPage('menu')} />}
      {page === 'warehouses' && <WarehousesPage token={token} onBack={() => setPage('menu')} />}
      {page === 'shipments' && <ShipmentsPage token={token} userId={user?.userId} onBack={() => setPage('menu')} />}
      {page === 'charts' && <ChartsPage token={token} onBack={() => setPage('menu')} />}
      {page === 'admin' && (
        !user || user.role !== 'admin'
          ? (
              <div style={{ color: 'red', padding: 24 }}>
                Ei oikeuksia
                <br />
                <button
                  className="button-main"
                  style={{ marginTop: 16 }}
                  onClick={() => setPage('menu')}
                >
                  Takaisin
                </button>
              </div>
            )
          : <AdmintoolsPage token={token} onBack={() => setPage('menu')} />
      )}
    </div>
  );
}

export default App;
