import React, { useState } from 'react';

function parseJwt(token) {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return null;
    }
}

function ProductForm({ token, onAdd, setError }) {
    const [form, setForm] = useState({
        productnumber: '',
        productname: '',
        weight: '',
        length_cm: '',
        width_cm: '',
        height_cm: '',
        batch_number: '',
        quantity: 1,
    });

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const user = parseJwt(token);
            const product = { 
                ...form, 
                added_by_user: user?.id || user?.userId,
                quantity: parseInt(form.quantity, 10) || 1
            };

            const response = await fetch('http://localhost:3000/api/products', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(product),
            });
            if (!response.ok) {
                throw new Error('Tuotteen lisääminen epäonnistui');
            }
            const newProduct = await response.json();
            onAdd(newProduct);
            setForm({
                productnumber: '',
                productname: '',
                weight: '',
                length_cm: '',
                width_cm: '',
                height_cm: '',
                batch_number: '',
                quantity: 1,
            });
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <form onSubmit={handleAdd} style={{ marginBottom: 20 }}>
            <h3>Lisää tuote</h3>
            <input name="productnumber" placeholder="Tuotenumero" value={form.productnumber} onChange={handleChange} required />
            <br />
            <input name="productname" placeholder="Nimi" value={form.productname} onChange={handleChange} required />
            <br />
            <input name="weight" placeholder="Paino (kg)" value={form.weight} onChange={handleChange} required />
            <br />
            <input name="length_cm" placeholder="Pituus (cm)" value={form.length_cm} onChange={handleChange} />
            <br />
            <input name="width_cm" placeholder="Leveys (cm)" value={form.width_cm} onChange={handleChange} />
            <br />
            <input name="height_cm" placeholder="Korkeus (cm)" value={form.height_cm} onChange={handleChange} />
            <br />
            <input name="batch_number" placeholder="Eränumero" value={form.batch_number} onChange={handleChange} />
            <br />
            <input name="quantity" type="number" min="1" value={form.quantity} onChange={handleChange} required />
            <br />
            <button type="submit">Lisää tuote</button>
        </form>
    );
}

export default ProductForm;