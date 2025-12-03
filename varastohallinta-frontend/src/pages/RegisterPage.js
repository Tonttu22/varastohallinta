import React, { useState } from 'react';

function RegisterPage({ onBack }) {
    const [form, setForm] = useState({
        fname: '',
        lname: '',
        phone: '',
        email: '',
        login: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleChange = e => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async e => {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            const response = await fetch('http://localhost:3000/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Rekisteröinti epäonnistui');
            }
            setSuccess('Rekisteröinti onnistui!');
            setForm({
                fname: '',
                lname: '',
                phone: '',
                email: '',
                login: '',
                password: ''
            });
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="page-container" style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#121212'
        }}>
            <div className="box" style={{
                maxWidth: 400,
                width: '100%',
                margin: '0 auto',
                background: '#232323',
                borderRadius: 10,
                boxShadow: '0 2px 16px #000a',
                padding: 32
            }}>
                <h2 className="section-title" style={{
                    color: '#fff',
                    textAlign: 'center',
                    marginBottom: 24,
                    fontWeight: 700,
                    letterSpacing: 1
                }}>
                    Rekisteröidy
                </h2>
                <form onSubmit={handleSubmit}>
                    <label style={{ color: '#fff', fontWeight: 500 }}>
                        Etunimi
                        <input
                            type="text"
                            name="fname"
                            value={form.fname}
                            onChange={handleChange}
                            required
                            style={{
                                width: '100%',
                                marginBottom: 14,
                                marginTop: 4,
                                padding: 8,
                                borderRadius: 4,
                                border: '1px solid #444',
                                background: '#181818',
                                color: '#fff'
                            }}
                        />
                    </label>
                    <label style={{ color: '#fff', fontWeight: 500 }}>
                        Sukunimi
                        <input
                            type="text"
                            name="lname"
                            value={form.lname}
                            onChange={handleChange}
                            required
                            style={{
                                width: '100%',
                                marginBottom: 14,
                                marginTop: 4,
                                padding: 8,
                                borderRadius: 4,
                                border: '1px solid #444',
                                background: '#181818',
                                color: '#fff'
                            }}
                        />
                    </label>
                    <label style={{ color: '#fff', fontWeight: 500 }}>
                        Puhelin
                        <input
                            type="text"
                            name="phone"
                            value={form.phone}
                            onChange={handleChange}
                            required
                            style={{
                                width: '100%',
                                marginBottom: 14,
                                marginTop: 4,
                                padding: 8,
                                borderRadius: 4,
                                border: '1px solid #444',
                                background: '#181818',
                                color: '#fff'
                            }}
                        />
                    </label>
                    <label style={{ color: '#fff', fontWeight: 500 }}>
                        Sähköposti
                        <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            required
                            style={{
                                width: '100%',
                                marginBottom: 14,
                                marginTop: 4,
                                padding: 8,
                                borderRadius: 4,
                                border: '1px solid #444',
                                background: '#181818',
                                color: '#fff'
                            }}
                        />
                    </label>
                    <label style={{ color: '#fff', fontWeight: 500 }}>
                        Käyttäjätunnus
                        <input
                            type="text"
                            name="login"
                            value={form.login}
                            onChange={handleChange}
                            required
                            style={{
                                width: '100%',
                                marginBottom: 14,
                                marginTop: 4,
                                padding: 8,
                                borderRadius: 4,
                                border: '1px solid #444',
                                background: '#181818',
                                color: '#fff'
                            }}
                        />
                    </label>
                    <label style={{ color: '#fff', fontWeight: 500 }}>
                        Salasana
                        <input
                            type="password"
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            required
                            style={{
                                width: '100%',
                                marginBottom: 18,
                                marginTop: 4,
                                padding: 8,
                                borderRadius: 4,
                                border: '1px solid #444',
                                background: '#181818',
                                color: '#fff'
                            }}
                        />
                    </label>
                    {error && <div className="error-text" style={{ marginBottom: 12, color: '#f44336', textAlign: 'center' }}>{error}</div>}
                    {success && <div style={{ color: '#4caf50', marginBottom: 12, textAlign: 'center' }}>{success}</div>}
                    <button type="submit" className="button-main" style={{
                        width: '100%',
                        padding: '10px 0',
                        background: '#4fc3f7',
                        color: '#232323',
                        border: 'none',
                        borderRadius: 4,
                        fontWeight: 600,
                        fontSize: 16,
                        cursor: 'pointer',
                        marginBottom: 8
                    }}>
                        Rekisteröidy
                    </button>
                </form>
                {onBack && (
                    <button onClick={onBack} className="button-main" style={{
                        width: '100%',
                        padding: '10px 0',
                        background: '#232323',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        fontWeight: 600,
                        fontSize: 16,
                        cursor: 'pointer',
                        marginTop: 8
                    }}>
                        Takaisin
                    </button>
                )}
            </div>
        </div>
    );
}

export default RegisterPage;