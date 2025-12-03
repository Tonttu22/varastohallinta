import React, { useEffect, useState } from 'react';

function AdmintoolsPage({ token, onBack }) {
    const [users, setUsers] = useState([]);
    const [error, setError] = useState('');
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await fetch('http://localhost:3000/api/users', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!response.ok) throw new Error('Käyttäjien haku epäonnistui');
                const data = await response.json();
                setUsers(data);
            } catch (err) {
                setError(err.message);
            }
        };
        fetchUsers();
    }, [token]);

    // Jaa käyttäjät kolmeen listaan
    const newUsers = users.filter(u => u.role === 'newuser' && u.active === 'yes');
    const otherUsers = users.filter(u => u.role !== 'newuser' && u.active === 'yes');
    const inactiveUsers = users.filter(u => u.active === 'no');

    // Soft delete käyttäjä (active = 'no')
    const deactivateUser = async (userId) => {
        try {
            await fetch(`http://localhost:3000/api/users/${userId}/deactivate`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(users.map(u => u.userId === userId ? { ...u, active: 'no' } : u));
            setConfirmDeleteId(null);
        } catch {
            alert('Käyttäjän poisto epäonnistui');
        }
    };

    // Lisää funktio roolin päivittämiseen
    const setUserRole = async (userId, role) => {
        try {
            await fetch(`http://localhost:3000/api/users/${userId}/role`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ role })
            });
            setUsers(users.map(u => u.userId === userId ? { ...u, role } : u));
        } catch {
            alert('Roolin päivitys epäonnistui');
        }
    };

    return (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
            <h2 style={{ color: '#fff', marginBottom: 24 }}>Käyttäjähallinta</h2>
            {error && <div style={{ color: '#f00', marginBottom: 12 }}>{error}</div>}

            {/* Uudet käyttäjät */}
            <div style={{
                background: '#222',
                borderRadius: 12,
                padding: 24,
                marginBottom: 32,
                boxShadow: '0 2px 16px #0004'
            }}>
                <h3 style={{ color: '#fff', marginTop: 0, marginBottom: 16 }}>Uudet käyttäjät</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', color: '#fff', marginBottom: 8 }}>
                    <thead>
                        <tr style={{ background: '#333' }}>
                            <th style={{ textAlign: 'left', padding: '8px' }}>Käyttäjätunnus</th>
                            <th style={{ textAlign: 'left', padding: '8px' }}>Nimi</th>
                            <th style={{ textAlign: 'left', padding: '8px' }}>Puhelin</th>
                            <th style={{ textAlign: 'left', padding: '8px' }}>Sähköposti</th>
                            <th style={{ textAlign: 'left', padding: '8px' }}>Toiminnot</th>
                        </tr>
                    </thead>
                    <tbody>
                        {newUsers.map(user => (
                            <tr key={user.userId} style={{ background: '#282828', borderBottom: '1px solid #444' }}>
                                <td style={{ padding: '8px' }}>{user.login}</td>
                                <td style={{ padding: '8px' }}>{user.fname || '-'} {user.lname || '-'}</td>
                                <td style={{ padding: '8px' }}>{user.phone || '-'}</td>
                                <td style={{ padding: '8px' }}>{user.email || '-'}</td>
                                <td style={{ padding: '8px' }}>
                                    <button
                                        style={{
                                            padding: '4px 14px',
                                            background: '#4caf50',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: 4,
                                            cursor: 'pointer',
                                            fontWeight: 'bold'
                                        }}
                                        onClick={() => setUserRole(user.userId, 'user')}
                                    >
                                        Hyväksy käyttäjä
                                    </button>
                                    <button
                                        style={{
                                            marginLeft: 8,
                                            padding: '4px 14px',
                                            background: '#a00',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: 4,
                                            cursor: 'pointer',
                                            fontWeight: 'bold'
                                        }}
                                        onClick={() => setConfirmDeleteId(user.userId)}
                                    >
                                        Poista
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {newUsers.length === 0 && (
                            <tr>
                                <td colSpan={5} style={{ color: '#888', padding: '8px', textAlign: 'center' }}>
                                    Ei uusia käyttäjiä
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Aktiiviset käyttäjät */}
            <div style={{
                background: '#222',
                borderRadius: 12,
                padding: 24,
                marginBottom: 32,
                boxShadow: '0 2px 16px #0004'
            }}>
                <h3 style={{ color: '#fff', marginTop: 0, marginBottom: 16 }}>Aktiiviset käyttäjät</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', color: '#fff' }}>
                    <thead>
                        <tr style={{ background: '#333' }}>
                            <th style={{ textAlign: 'left', padding: '8px' }}>Käyttäjätunnus</th>
                            <th style={{ textAlign: 'left', padding: '8px' }}>Nimi</th>
                            <th style={{ textAlign: 'left', padding: '8px' }}>Puhelin</th>
                            <th style={{ textAlign: 'left', padding: '8px' }}>Sähköposti</th>
                            <th style={{ textAlign: 'left', padding: '8px' }}>Rooli</th>
                            <th style={{ textAlign: 'left', padding: '8px' }}>Toiminnot</th>
                        </tr>
                    </thead>
                    <tbody>
                        {otherUsers.map(user => (
                            <tr key={user.userId} style={{ background: '#282828', borderBottom: '1px solid #444' }}>
                                <td style={{ padding: '8px' }}>{user.login}</td>
                                <td style={{ padding: '8px' }}>{user.fname || '-'} {user.lname || '-'}</td>
                                <td style={{ padding: '8px' }}>{user.phone || '-'}</td>
                                <td style={{ padding: '8px' }}>{user.email || '-'}</td>
                                <td style={{ padding: '8px' }}>{user.role || '-'}</td>
                                <td style={{ padding: '8px' }}>
                                    <button
                                        style={{
                                            padding: '4px 14px',
                                            background: '#a00',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: 4,
                                            cursor: 'pointer',
                                            fontWeight: 'bold'
                                        }}
                                        onClick={() => setConfirmDeleteId(user.userId)}
                                    >
                                        Poista
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {otherUsers.length === 0 && (
                            <tr>
                                <td colSpan={6} style={{ color: '#888', padding: '8px', textAlign: 'center' }}>
                                    Ei käyttäjiä
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Epäaktiiviset käyttäjät */}
            <div style={{
                background: '#222',
                borderRadius: 12,
                padding: 24,
                marginBottom: 32,
                boxShadow: '0 2px 16px #0004'
            }}>
                <h3 style={{ color: '#fff', marginTop: 0, marginBottom: 16 }}>Epäaktiiviset käyttäjät</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', color: '#fff' }}>
                    <thead>
                        <tr style={{ background: '#333' }}>
                            <th style={{ textAlign: 'left', padding: '8px' }}>Käyttäjätunnus</th>
                            <th style={{ textAlign: 'left', padding: '8px' }}>Nimi</th>
                            <th style={{ textAlign: 'left', padding: '8px' }}>Puhelin</th>
                            <th style={{ textAlign: 'left', padding: '8px' }}>Sähköposti</th>
                            <th style={{ textAlign: 'left', padding: '8px' }}>Rooli</th>
                        </tr>
                    </thead>
                    <tbody>
                        {inactiveUsers.map(user => (
                            <tr key={user.userId} style={{ background: '#282828', borderBottom: '1px solid #444' }}>
                                <td style={{ padding: '8px' }}>{user.login}</td>
                                <td style={{ padding: '8px' }}>{user.fname || '-'} {user.lname || '-'}</td>
                                <td style={{ padding: '8px' }}>{user.phone || '-'}</td>
                                <td style={{ padding: '8px' }}>{user.email || '-'}</td>
                                <td style={{ padding: '8px' }}>{user.role || '-'}</td>
                            </tr>
                        ))}
                        {inactiveUsers.length === 0 && (
                            <tr>
                                <td colSpan={5} style={{ color: '#888', padding: '8px', textAlign: 'center' }}>
                                    Ei epäaktiivisia käyttäjiä
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Poiston varmistus */}
            {confirmDeleteId && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    zIndex: 2000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <div style={{
                        background: '#333',
                        borderRadius: 12,
                        padding: 32,
                        minWidth: 320,
                        color: '#fff',
                        boxShadow: '0 4px 24px #000'
                    }}>
                        <h3>Poista käyttäjä?</h3>
                        <p>
                            Käyttäjä merkitään epäaktiiviseksi.<br />
                            Käyttäjä ei pääse enää kirjautumaan järjestelmään.
                        </p>
                        <div style={{ display: 'flex', gap: 16, marginTop: 24 }}>
                            <button
                                style={{ background: '#a00', color: '#fff', borderRadius: 4, padding: '8px 18px', border: 'none', fontWeight: 'bold' }}
                                onClick={() => deactivateUser(confirmDeleteId)}
                            >
                                Poista käyttäjä
                            </button>
                            <button
                                style={{ background: '#222', color: '#fff', borderRadius: 4, padding: '8px 18px', border: 'none', fontWeight: 'bold' }}
                                onClick={() => setConfirmDeleteId(null)}
                            >
                                Peruuta
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {onBack && (
                <button onClick={onBack} style={{
                    marginLeft: 0,
                    width: 220,
                    padding: '10px 24px',
                    borderRadius: 4,
                    background: '#333',
                    color: '#fff',
                    fontWeight: 'bold',
                    border: 'none',
                    marginTop: 16
                }}>
                    Takaisin
                </button>
            )}
        </div>
    );
}

export default AdmintoolsPage;