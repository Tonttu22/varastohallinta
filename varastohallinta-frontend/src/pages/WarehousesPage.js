import React from 'react';
import WarehouseSlots from '../components/warehouseslots';

function WarehousesPage({ token, onBack }) {
    return (
        <div style={{
            minHeight: '100vh',
            background: '#111',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <div style={{
                width: '100%',
                maxWidth: 900,
                minWidth: 700,
            }}>
                <h2 style={{
                    color: '#fff',
                    marginBottom: 24,
                    fontWeight: 'bold'
                }}>
                    Varastojen hallinta
                </h2>
                <div style={{
                    background: '#222',
                    padding: '32px 32px 24px 32px',
                    borderRadius: 10,
                    boxShadow: '0 2px 16px #0008',
                    width: '100%',
                    marginBottom: 32
                }}>
                    <WarehouseSlots token={token} />
                </div>
                {onBack && (
                <button onClick={onBack} style={{ marginLeft: 16, padding: '10px 24px', borderRadius: 4 }}>
                    Takaisin
                </button>
            )}
            </div>
        </div>
    );
}

export default WarehousesPage;