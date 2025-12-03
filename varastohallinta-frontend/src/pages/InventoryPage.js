import React, { useState, useEffect } from 'react';
import WarehouseSlots from '../components/warehouseslots';
import ProductList from '../components/ProductList';
import ProductForm from '../components/ProductForm';

function InventoryPage({ token }) {
    const [products, setProducts] = useState([]);
    const [slots, setSlots] = useState([]); 
    const [error, setError] = useState('');

    useEffect(() => {
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

        fetchProducts();
        fetchSlots();
    }, [token]);

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

    const handleAdd = (newProduct) => {
        setProducts([...products, { ...newProduct, status: 'arrived' }]);
    };

    const handleAssignSlot = async (productID, slotID) => {
        setError('');
        try {
            const response = await fetch(`http://localhost:3000/api/products/${productID}`, {
                method: 'PUT', 
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ slot_id: slotID }),
            });
            if (!response.ok) {
                throw new Error('Varastopaikan asettaminen epäonnistui');
            }
            const updatedProduct = await response.json();
            setProducts(products =>
                products.map(product =>
                    product.productID === productID
                        ? updatedProduct
                        : product
                )
            );
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div>
            <h2>Varaston hallinta</h2>
            {error && <p style={{ color: 'red' }}>{error}</p>}

            <ProductForm token={token} onAdd={handleAdd} setError={setError} />
            <h3>Varastopaikat</h3>
            <WarehouseSlots token={token} />

            <h3>Tuotteet</h3>
            <p>Tuotteita yhteensä: {products.length}</p>
            <ProductList
                products={products}
                onDelete={handleDelete}
                slots={slots} 
                onAssignSlot={handleAssignSlot}
            />
        </div>
    );
}

export default InventoryPage;