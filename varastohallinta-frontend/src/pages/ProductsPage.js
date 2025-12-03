import React, { useState, useEffect } from 'react';
import ProductList from '../components/ProductList';
import ProductForm from '../components/ProductForm';

function ProductsPage({ token, onBack }) {
    const [products, setProducts] = useState([]);
    const [error, setError] = useState('');
    const [slots, setSlots] = useState([]);
    const [productSlots, setProductSlots] = useState([]);

    useEffect(() => {
        fetchSlots();
        fetchProducts();
        fetchProductSlots();
        
    }, [token]);

    const fetchProducts = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/products', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) {
                throw new Error('Virhe tuotteiden hakemisessa');
            }
            const data = await response.json();
            setProducts(data);
        } catch (err) {
            setError(err.message);
        }
    };

    const fetchSlots = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/warehouseslots', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) {
                throw new Error('Virhe varastopaikkojen hakemisessa');
            }
            const data = await response.json();
            setSlots(data);
        } catch (err) {
            setError(err.message);
        }
    };

    const fetchProductSlots = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/product_slots/with-products');
            if (!response.ok) throw new Error('Virhe product_slots-haussa');
            const data = await response.json();
            setProductSlots(data);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleAssignSlot = async (productID, slotID, quantity) => {
        setError('');
        try {
            const response = await fetch('http://localhost:3000/api/product_slots', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ productID, slot_id: slotID, quantity_in_slot: quantity }),
            });
            if (!response.ok) {
                
                let errorMsg = 'Varastopaikan asettaminen epäonnistui';
                try {
                    const errData = await response.json();
                    errorMsg = errData.error || errorMsg;
                } catch {
                    errorMsg = await response.text();
                }
                setError(errorMsg);
                throw new Error(errorMsg); 
            }
            await response.json();
            fetchProducts();
            fetchProductSlots(); 
        } catch (err) {
            setError(err.message);
            throw err; 
        }
    };

    const handleDelete = async (productID) => {
        try {
            const response = await fetch(`http://localhost:3000/api/products/${productID}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) {
                throw new Error('Tuotteen poistaminen epäonnistui');
            }
            setProducts(products.filter(product => product.productID !== productID));
        } catch (err) {
            setError(err.message);
        }
    };

    const handleAddProduct = (newProduct) => {
        setProducts([...products, newProduct]);
        fetchProducts();
    };

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
                marginBottom: 0
            }}>
                <h2 style={{
                    color: '#fff',
                    marginBottom: 24,
                    marginLeft: 0,
                    fontWeight: 'bold'
                }}>
                    Tuotteiden hallinta
                </h2>
                {error && <p style={{ color: 'red', marginLeft: 0 }}>{error}</p>}

                <div style={{ display: 'flex', gap: 32, marginBottom: 32 }}>
                    {/* Tuotteen lisäys -laatikko */}
                    <div style={{
                        background: '#222',
                        padding: '24px 32px',
                        borderRadius: 10,
                        boxShadow: '0 2px 16px #0008',
                        width: 180,
                        minWidth: 180,
                        height: 350,
                        flexShrink: 0
                    }}>
                        <ProductForm token={token} onAdd={handleAddProduct} setError={setError} />
                    </div>

                    {/* Tuotelista -laatikko */}
                    <div style={{
                        background: '#222',
                        padding: '24px 32px',
                        borderRadius: 10,
                        boxShadow: '0 2px 16px #0008',
                        flex: 1
                    }}>
                        <ProductList
                            products={products}
                            slots={slots}
                            productSlots={productSlots}
                            onDelete={handleDelete}
                            onAssignSlot={handleAssignSlot}
                        />
                    </div>
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

export default ProductsPage;