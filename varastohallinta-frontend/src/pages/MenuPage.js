import React from 'react';

function MenuPage({ onNavigate, onLogout, user }) {
    console.log('user:', user);

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
                minWidth: 320,
                textAlign: 'center'
            }}>
                <h2 style={{ marginBottom: 24 }}>Tervetuloa varastonhallintaan!</h2>
                <button
                    onClick={() => onNavigate('products')}
                    style={{
                        width: '100%',
                        padding: 12,
                        borderRadius: 4,
                        background: '#333',
                        color: '#fff',
                        border: 'none',
                        fontWeight: 'bold',
                        fontSize: 16,
                        cursor: 'pointer',
                        marginBottom: 16,
                        transition: 'background 0.2s'
                    }}
                >
                    Tuotteiden hallinta
                </button>
                <button
                    onClick={() => onNavigate('warehouses')}
                    style={{
                        width: '100%',
                        padding: 12,
                        borderRadius: 4,
                        background: '#333',
                        color: '#fff',
                        border: 'none',
                        fontWeight: 'bold',
                        fontSize: 16,
                        cursor: 'pointer',
                        marginBottom: 24,
                        transition: 'background 0.2s'
                    }}
                >
                    Varastojen hallinta
                </button>
                <button onClick={() => onNavigate('shipments')}
                    style={{
                        width: '100%',
                        padding: 12,
                        borderRadius: 4,
                        background: '#333',
                        color: '#fff',
                        border: 'none',
                        fontWeight: 'bold',
                        fontSize: 16,
                        cursor: 'pointer',
                        marginBottom: 24,
                        transition: 'background 0.2s'
                    }}
                >
                    Lähetysten hallinta
                </button>
                <button onClick={() => onNavigate('charts')}
                    style={{
                        width: '100%',
                        padding: 12,
                        borderRadius: 4,
                        background: '#333',
                        color: '#fff',
                        border: 'none',
                        fontWeight: 'bold',
                        fontSize: 16,
                        cursor: 'pointer',
                        marginBottom: 24,
                        transition: 'background 0.2s'
                    }}
                >
                    Kaaviot ja tilastot
                </button>

                {user && user.role === 'admin' && (
                    <button onClick={() => onNavigate('admin')}
                        style={{
                            width: '100%',
                            padding: 12,
                            borderRadius: 4,
                            background: '#333',
                            color: '#fff',
                            border: 'none',
                            fontWeight: 'bold',
                            fontSize: 16,
                            cursor: 'pointer',
                            marginBottom: 24,
                            transition: 'background 0.2s'
                        }}
                    >
                        Käyttäjähallinta
                    </button>
                )}

                <button onClick={onLogout}
                    style={{
                        width: '100%',
                        padding: 10,
                        borderRadius: 4,
                        background: '#a33',
                        color: '#fff',
                        border: 'none',
                        fontWeight: 'bold',
                        fontSize: 15,
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                    }}
                >
                    Kirjaudu ulos
                </button>
            </div>
        </div>
    );
}

export default MenuPage;