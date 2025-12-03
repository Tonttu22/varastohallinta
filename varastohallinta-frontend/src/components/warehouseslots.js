import React, { useState, useEffect } from 'react';

function WarehouseSlots({ token }) {
    const [slots, setSlots] = useState([]);
    const [productSlots, setProductSlots] = useState([]);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        slot_code: '',
        location_description: '',
        max_weight: '',
        max_volume_m3: ''
    });
    const [editSlot, setEditSlot] = useState(null);
    const [showConfirm, setShowConfirm] = useState({ show: false, slotId: null });
    const [sortField, setSortField] = useState('slot_code');
    const [sortAsc, setSortAsc] = useState(true);
    const [hoveredHeader, setHoveredHeader] = useState(null);
    const [moveProduct, setMoveProduct] = useState(null); // { productID, productname, productnumber, maxQty }
    const [moveQty, setMoveQty] = useState('');
    const [moveToSlot, setMoveToSlot] = useState('');
    const [productSortField, setProductSortField] = useState('productname');
    const [productSortAsc, setProductSortAsc] = useState(true);

    // Hae varastopaikat
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

    // Hae kaikki product_slots + tuotteet
    const fetchProductSlots = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/product_slots/with-products', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error('Tuotteiden haku epäonnistui');
            const data = await response.json();
            setProductSlots(data);
        } catch (err) {
            setProductSlots([]);
        }
    };

    useEffect(() => {
        fetchSlots();
        fetchProductSlots();
    }, [token]);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleAddSlot = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const slotData = {
                ...form,
                max_weight: form.max_weight !== '' ? parseFloat(form.max_weight) : null,
                max_volume_m3: form.max_volume_m3 !== '' ? parseFloat(form.max_volume_m3) : null
            };
            const response = await fetch('http://localhost:3000/api/warehouseslots', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(slotData),
            });
            if (!response.ok) {
                throw new Error('Varastopaikan lisäys epäonnistui');
            }
            const newSlot = await response.json();
            setSlots([...slots, newSlot]);
            setForm({
                slot_code: '',
                location_description: '',
                max_weight: '',
                max_volume_m3: ''
            });
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDeleteSlot = async (slotId) => {
        setError('');
        try {
            const response = await fetch(`http://localhost:3000/api/warehouseslots/${slotId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) {
                throw new Error('Varastopaikan poisto epäonnistui');
            }
            setSlots(slots.filter(slot => slot.slot_id !== slotId));
            setShowConfirm({ show: false, slotId: null });
            fetchProductSlots();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleEditClick = (slot) => {
        setEditSlot({ ...slot });
    };

    const handleEditChange = (e) => {
        setEditSlot({ ...editSlot, [e.target.name]: e.target.value });
    };

    const handleEditSave = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const slotData = {
                slot_code: editSlot.slot_code,
                location_description: editSlot.location_description,
                max_weight: editSlot.max_weight !== '' ? parseFloat(editSlot.max_weight) : null,
                max_volume_m3: editSlot.max_volume_m3 !== '' ? parseFloat(editSlot.max_volume_m3) : null
            };
            const response = await fetch(`http://localhost:3000/api/warehouseslots/${editSlot.slot_id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(slotData),
            });
            if (!response.ok) {
                throw new Error('Varastopaikan muokkaus epäonnistui');
            }
            await response.json();
            setEditSlot(null);
            fetchSlots();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleSort = (field) => {
        if (sortField === field) {
            setSortAsc(!sortAsc);
        } else {
            setSortField(field);
            setSortAsc(true);
        }
    };

    const getHeaderStyle = (name) => ({
        cursor: 'pointer',
        textAlign: 'left',
        borderBottom: '1px solid #444',
        padding: '6px',
        background: hoveredHeader === name ? '#181818' : undefined,
        transition: 'background 0.15s',
        userSelect: 'none'
    });

    const sortedSlots = [...slots].sort((a, b) => {
        if (a[sortField] === undefined || b[sortField] === undefined) return 0;
        if (a[sortField] < b[sortField]) return sortAsc ? -1 : 1;
        if (a[sortField] > b[sortField]) return sortAsc ? 1 : -1;
        return 0;
    });

    // Laske täyttöasteet product_slots-tietojen perusteella
    const getSlotFill = (slot) => {
        const slotProducts = productSlots.filter(ps => ps.slot_id === slot.slot_id);
        const usedWeight = slotProducts.reduce((sum, p) => sum + ((Number(p.weight) || 0) * (p.quantity_in_slot || 1)), 0);
        const usedVolume = slotProducts.reduce(
            (sum, p) =>
                sum +
                (((Number(p.length_cm) || 0) * (Number(p.width_cm) || 0) * (Number(p.height_cm) || 0)) / 1000000) * (p.quantity_in_slot || 1),
            0
        );
        return {
            usedWeight,
            usedVolume,
            weightPercent: slot.max_weight ? Math.round((usedWeight / slot.max_weight) * 100) : 0,
            volumePercent: slot.max_volume_m3 ? Math.round((usedVolume / slot.max_volume_m3) * 100) : 0,
        };
    };

    const getFillColor = (percent) => {
        if (percent <= 50) return '#4caf50';      // vihreä
        if (percent <= 75) return '#ffeb3b';      // keltainen
        if (percent <= 90) return '#ff9800';      // oranssi
        return '#f44336';                         // punainen
    };

    const handleMoveClick = (ps) => {
        setMoveProduct({
            productID: ps.productID,
            productname: ps.productname,
            productnumber: ps.productnumber,
            maxQty: ps.quantity_in_slot,
            fromSlotId: editSlot.slot_id,
            weight: ps.singleWeight, // YKSITTÄISEN tuotteen paino!
            length_cm: ps.length_cm,
            width_cm: ps.width_cm,
            height_cm: ps.height_cm
        });
        setMoveQty('');
        setMoveToSlot('');
    };

    const handleMoveSubmit = async (e) => {
        e.preventDefault();
        if (!moveProduct || !moveToSlot || !moveQty) return;
        setError('');
        try {
            const response = await fetch('http://localhost:3000/api/product_slots/move', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    productID: moveProduct.productID,
                    fromSlotId: moveProduct.fromSlotId,
                    toSlotId: moveToSlot,
                    qty: Number(moveQty)
                }),
            });
            if (!response.ok) throw new Error('Siirto epäonnistui');
            setMoveProduct(null);
            setMoveQty('');
            setMoveToSlot('');
            fetchProductSlots();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleProductSort = field => {
        if (productSortField === field) {
            setProductSortAsc(!productSortAsc);
        } else {
            setProductSortField(field);
            setProductSortAsc(true);
        }
    };

    const getProductSortArrow = field => {
        if (productSortField !== field) return '';
        return productSortAsc ? ' ▲' : ' ▼';
    };

    const sortedProductSlots = editSlot
    ? Object.values(
        productSlots
            .filter(ps => ps.slot_id === editSlot.slot_id)
            .reduce((acc, ps) => {
                if (!acc[ps.productID]) {
                    acc[ps.productID] = { ...ps };
                } else {
                    acc[ps.productID].quantity_in_slot += ps.quantity_in_slot;
                }
                return acc;
            }, {})
    )
    .sort((a, b) => {
        let va = a[productSortField], vb = b[productSortField];
        if (va == null) va = '';
        if (vb == null) vb = '';
        if (typeof va === 'string') va = va.toLowerCase();
        if (typeof vb === 'string') vb = vb.toLowerCase();
        if (va < vb) return productSortAsc ? -1 : 1;
        if (va > vb) return productSortAsc ? 1 : -1;
        return 0;
    })
    : [];

    return (
        <div>
            <h3>Varastopaikat</h3>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <table style={{ width: '100%', borderCollapse: 'collapse', color: '#fff', marginBottom: 32 }}>
                <thead>
                    <tr>
                        <th
                            style={getHeaderStyle('slot_code')}
                            onClick={() => handleSort('slot_code')}
                            onMouseEnter={() => setHoveredHeader('slot_code')}
                            onMouseLeave={() => setHoveredHeader(null)}
                        >
                            Paikkakoodi {sortField === 'slot_code' ? (sortAsc ? '▲' : '▼') : ''}
                        </th>
                        <th
                            style={getHeaderStyle('location_description')}
                            onClick={() => handleSort('location_description')}
                            onMouseEnter={() => setHoveredHeader('location_description')}
                            onMouseLeave={() => setHoveredHeader(null)}
                        >
                            Kuvaus {sortField === 'location_description' ? (sortAsc ? '▲' : '▼') : ''}
                        </th>
                        <th
                            style={getHeaderStyle('max_weight')}
                            onClick={() => handleSort('max_weight')}
                            onMouseEnter={() => setHoveredHeader('max_weight')}
                            onMouseLeave={() => setHoveredHeader(null)}
                        >
                            Maksimipaino {sortField === 'max_weight' ? (sortAsc ? '▲' : '▼') : ''}
                        </th>
                        <th
                            style={getHeaderStyle('max_volume_m3')}
                            onClick={() => handleSort('max_volume_m3')}
                            onMouseEnter={() => setHoveredHeader('max_volume_m3')}
                            onMouseLeave={() => setHoveredHeader(null)}
                        >
                            Maksimitilavuus {sortField === 'max_volume_m3' ? (sortAsc ? '▲' : '▼') : ''}
                        </th>
                        <th
                            style={getHeaderStyle('product_count')}
                            onClick={() => handleSort('product_count')}
                            onMouseEnter={() => setHoveredHeader('product_count')}
                            onMouseLeave={() => setHoveredHeader(null)}
                        >
                            Tuotemäärä {sortField === 'product_count' ? (sortAsc ? '▲' : '▼') : ''}
                        </th>
                        <th style={getHeaderStyle('fill')}>Täyttöaste</th>
                        <th style={{ borderBottom: '1px solid #444', padding: '6px' }}>Toiminnot</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedSlots.map(slot => {
                        const fill = getSlotFill(slot);
                        const slotProductCount = productSlots.filter(ps => ps.slot_id === slot.slot_id)
                            .reduce((sum, ps) => sum + (ps.quantity_in_slot || 0), 0);
                        return (
                            <tr key={slot.slot_id}>
                                <td style={{ borderBottom: '1px solid #333', padding: '6px' }}>{slot.slot_code}</td>
                                <td style={{ borderBottom: '1px solid #333', padding: '6px' }}>{slot.location_description}</td>
                                <td style={{ borderBottom: '1px solid #333', padding: '6px' }}>
                                    {slot.max_weight !== null ? slot.max_weight + " kg" : "-"}
                                </td>
                                <td style={{ borderBottom: '1px solid #333', padding: '6px' }}>
                                    {slot.max_volume_m3 !== null ? slot.max_volume_m3 + " m³" : "-"}
                                </td>
                                <td style={{ borderBottom: '1px solid #333', padding: '6px' }}>
                                    {slotProductCount}
                                </td>
                                <td style={{ borderBottom: '1px solid #333', padding: '6px' }}>
                                    <div>
                                        <span style={{ fontSize: '0.8em' }}>
                                            Tilavuus: {fill.usedVolume.toFixed(3)} / {slot.max_volume_m3 || '-'} m³
                                            {slot.max_volume_m3 ? (
                                                <> (
                                                    <span style={{ color: getFillColor(fill.volumePercent), fontWeight: 'bold' }}>
                                                        {fill.volumePercent}%
                                                    </span>
                                                )</>
                                            ) : ''}
                                        </span>
                                        <br />
                                        <span style={{ fontSize: '0.8em' }}>
                                            Paino: {fill.usedWeight} / {slot.max_weight || '-'} kg
                                            {slot.max_weight ? (
                                                <> (
                                                    <span style={{ color: getFillColor(fill.weightPercent), fontWeight: 'bold' }}>
                                                        {fill.weightPercent}%
                                                    </span>
                                                )</>
                                            ) : ''}
                                        </span>
                                    </div>
                                </td>
                                <td style={{ borderBottom: '1px solid #333', padding: '6px' }}>
                                    <button style={{ marginRight: 8 }} onClick={() => handleEditClick(slot)}>Muokkaa</button>
                                    <button style={{ color: 'red' }} onClick={() => setShowConfirm({ show: true, slotId: slot.slot_id })}>Poista</button>
                                </td>
                            </tr>
                        );
                    })}
                    {sortedSlots.length === 0 && (
                        <tr>
                            <td colSpan={7} style={{ color: '#888', padding: '6px', textAlign: 'center' }}>Ei varastopaikkoja</td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* Poiston varmistus */}
            {showConfirm.show && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{ background: '#222', padding: 30, borderRadius: 8 }}>
                        <p>Haluatko varmasti poistaa tämän varastopaikan?</p>
                        <button onClick={() => handleDeleteSlot(showConfirm.slotId)} style={{ color: 'red', marginRight: 10 }}>Poista</button>
                        <button onClick={() => setShowConfirm({ show: false, slotId: null })}>Peruuta</button>
                    </div>
                </div>
            )}

            {/* Muokkauslomake popup */}
            {editSlot && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{ background: '#222', padding: 30, borderRadius: 8, minWidth: 300, position: 'relative' }}>
                        {/* Sulkemisruksi oikeaan yläkulmaan */}
                        <button
                            onClick={() => setEditSlot(null)}
                            style={{
                                position: 'absolute',
                                top: 12,
                                right: 12,
                                background: 'transparent',
                                border: 'none',
                                fontSize: 28,
                                color: '#fff',
                                cursor: 'pointer',
                                lineHeight: 1
                            }}
                            aria-label="Sulje"
                            title="Sulje"
                        >
                            ×
                        </button>
                        <form onSubmit={handleEditSave}>
                            <h4>Muokkaa varastopaikkaa</h4>
                            <input
                                name="slot_code"
                                placeholder="Paikkakoodi"
                                value={editSlot.slot_code}
                                onChange={handleEditChange}
                                required
                            />
                            <input
                                name="location_description"
                                placeholder="Sijainnin kuvaus"
                                value={editSlot.location_description}
                                onChange={handleEditChange}
                                required
                            />
                            <input
                                name="max_weight"
                                placeholder="Maksimipaino (kg)"
                                value={editSlot.max_weight ?? ''}
                                onChange={handleEditChange}
                                type="number"
                                min="0"
                            />
                            <input
                                name="max_volume_m3"
                                placeholder="Maksimitilavuus (m³)"
                                value={editSlot ? (editSlot.max_volume_m3 ?? '') : ''}
                                onChange={handleEditChange}
                                type="number"
                                min="0"
                                step="0.000001"
                            />
                            <div style={{ marginTop: 10 }}>
                                <button type="submit">Tallenna</button>
                                <button type="button" onClick={() => setEditSlot(null)} style={{ marginLeft: 10 }}>Peruuta</button>
                            </div>
                        </form>
                        <h4 style={{ marginTop: 20 }}>Tuotteet varastopaikalla</h4>
                        <table style={{ width: '100%', color: '#fff', borderCollapse: 'collapse', marginTop: 10 }}>
                            <thead>
                                <tr>
                                    <th style={{ cursor: 'pointer', padding: '6px' }} onClick={() => handleProductSort('productname')}>
                                        Tuotenimi{getProductSortArrow('productname')}
                                    </th>
                                    <th style={{ cursor: 'pointer', padding: '6px' }} onClick={() => handleProductSort('productnumber')}>
                                        Tuotenro{getProductSortArrow('productnumber')}
                                    </th>
                                    <th style={{ cursor: 'pointer', padding: '6px' }} onClick={() => handleProductSort('quantity_in_slot')}>
                                        Määrä{getProductSortArrow('quantity_in_slot')}
                                    </th>
                                    <th style={{ cursor: 'pointer', padding: '6px' }} onClick={() => handleProductSort('weight')}>
                                        Paino (kg){getProductSortArrow('weight')}
                                    </th>
                                    <th style={{ cursor: 'pointer', padding: '6px' }} onClick={() => handleProductSort('volume')}>
                                        Tilavuus (m³){getProductSortArrow('volume')}
                                    </th>
                                    <th style={{ cursor: 'pointer', padding: '6px' }} onClick={() => handleProductSort('fill')}>
                                        Täyttöaste{getProductSortArrow('fill')}
                                    </th>
                                    <th style={{ padding: '6px' }}>Toiminnot</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedProductSlots.map(ps => {
                                    // Laske paino ja tilavuus
                                    const totalWeight = (Number(ps.weight) || 0) * (ps.quantity_in_slot || 1); // yhteispaino
                                    const singleWeight = Number(ps.weight) || 0; // yksittäisen tuotteen paino
                                    const volume = ps.length_cm && ps.width_cm && ps.height_cm
                                        ? ((Number(ps.length_cm) * Number(ps.width_cm) * Number(ps.height_cm)) / 1000000) * (ps.quantity_in_slot || 1)
                                        : 0;
                                    const singleVolume = ps.length_cm && ps.width_cm && ps.height_cm
                                        ? ((Number(ps.length_cm) * Number(ps.width_cm) * Number(ps.height_cm)) / 1000000)
                                        : 0;
                                    const weightPercent = editSlot.max_weight ? Math.round((totalWeight / editSlot.max_weight) * 100) : 0;
                                    const volumePercent = editSlot.max_volume_m3 ? Math.round((volume / editSlot.max_volume_m3) * 100) : 0;
                                    return {
                                        ...ps,
                                        totalWeight,         // yhteispaino
                                        singleWeight,        // yksittäisen tuotteen paino
                                        volume,              // yhteistilavuus
                                        singleVolume,        // yksittäisen tuotteen tilavuus
                                        fill: Math.max(weightPercent, volumePercent)
                                    };
                                })
                                .map(ps => (
                                    <tr key={ps.productID}>
                                        <td style={{ padding: '6px', borderBottom: '1px solid #333' }}>{ps.productname}</td>
                                        <td style={{ padding: '6px', borderBottom: '1px solid #333' }}>{ps.productnumber}</td>
                                        <td style={{ padding: '6px', borderBottom: '1px solid #333' }}>{ps.quantity_in_slot}</td>
                                        <td style={{ padding: '6px', borderBottom: '1px solid #333' }}>{ps.totalWeight.toFixed(2)}</td>
                                        <td style={{ padding: '6px', borderBottom: '1px solid #333' }}>{ps.volume.toFixed(3)}</td>
                                        <td style={{ padding: '6px', borderBottom: '1px solid #333' }}>
                                            {ps.fill}% <span style={{ color: ps.fill > 90 ? '#f44336' : ps.fill > 75 ? '#ff9800' : ps.fill > 50 ? '#ffeb3b' : '#4caf50', fontWeight: 'bold' }}>●</span>
                                        </td>
                                        <td style={{ padding: '6px', borderBottom: '1px solid #333' }}>
                                            <button style={{ marginLeft: 10 }} onClick={() => handleMoveClick(ps)}>
                                                Siirrä
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {productSlots.filter(ps => ps.slot_id === editSlot.slot_id).length === 0 && (
                                    <tr>
                                        <td colSpan={7} style={{ color: '#888', padding: '6px', textAlign: 'center' }}>Ei tuotteita tällä varastopaikalla.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        

                        {/* Siirtolomake popup */}
                        {moveProduct && (
                            <div style={{
                                position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                                background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100
                            }}>
                                <div style={{ background: '#222', padding: 24, borderRadius: 8, minWidth: 260, position: 'relative' }}>
                                    {/* Sulkemisruksi oikeaan yläkulmaan */}
                                    <button
                                        onClick={() => setMoveProduct(null)}
                                        style={{
                                            position: 'absolute',
                                            top: 8,
                                            right: 12,
                                            background: 'transparent',
                                            border: 'none',
                                            fontSize: 28,
                                            color: '#fff',
                                            cursor: 'pointer',
                                            lineHeight: 1
                                        }}
                                        aria-label="Sulje"
                                        title="Sulje"
                                    >
                                        ×
                                    </button>
                                    <h5>Siirrä tuote</h5>
                                    <div style={{ marginBottom: 8 }}>
                                        <strong>{moveProduct.productname} ({moveProduct.productnumber})</strong><br />
                                        Nykyinen paikka: {editSlot.slot_code}<br />
                                        Siirrettävissä: {moveProduct.maxQty} kpl<br />
                                        {/* Näytä yksittäisen tuotteen paino ja tilavuus */}
                                        Paino / kpl: {moveProduct.weight.toFixed(2)} kg<br />
                                        Tilavuus / kpl: {moveProduct.length_cm && moveProduct.width_cm && moveProduct.height_cm
                                            ? ((Number(moveProduct.length_cm) * Number(moveProduct.width_cm) * Number(moveProduct.height_cm)) / 1000000).toFixed(3)
                                            : '0.000'} m³
                                    </div>
                                    <form onSubmit={handleMoveSubmit}>
                                        <label>
                                            Uusi paikka:
                                            <select
                                                value={moveToSlot}
                                                onChange={e => setMoveToSlot(e.target.value)}
                                                required
                                            >
                                                <option value="">Valitse paikka</option>
                                                {slots
                                                    .filter(s => s.slot_id !== editSlot.slot_id)
                                                    .map(s => {
                                                        // Laske tämänhetkinen tilavuus kyseisessä slotissa
                                                        const slotProducts = productSlots.filter(ps => ps.slot_id === s.slot_id);
                                                        const usedVolume = slotProducts.reduce(
                                                            (sum, p) =>
                                                                sum +
                                                                (((Number(p.length_cm) || 0) * (Number(p.width_cm) || 0) * (Number(p.height_cm) || 0)) / 1000000) * (p.quantity_in_slot || 1),
                                                            0
                                                        );
                                                        return (
                                                            <option key={s.slot_id} value={s.slot_id}>
                                                                {s.slot_code} – {s.location_description} ({usedVolume.toFixed(3)} / {s.max_volume_m3 || '-'} m³)
                                                            </option>
                                                        );
                                                    })}
                                            </select>
                                        </label>
                                        <br />
                                        <label>
                                            Määrä:
                                            <input
                                                type="number"
                                                min="1"
                                                max={moveProduct.maxQty}
                                                value={moveQty}
                                                onChange={e => setMoveQty(e.target.value)}
                                                required
                                                style={{ width: 60, marginLeft: 8 }}
                                            />
                                        </label>
                                        <br />
                                        <div style={{ marginTop: 10 }}>
                                            <button type="submit" disabled={!moveToSlot || !moveQty || Number(moveQty) < 1 || Number(moveQty) > moveProduct.maxQty}>
                                                Siirrä
                                            </button>
                                            <button type="button" onClick={() => setMoveProduct(null)} style={{ marginLeft: 10 }}>
                                                Peruuta
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <h3>Varastopaikan lisäys</h3>
            <form onSubmit={handleAddSlot}>
                <input
                    name="slot_code"
                    placeholder="Paikkakoodi (esim. A1)"
                    value={form.slot_code}
                    onChange={handleChange}
                    required
                />
                <input
                    name="location_description"
                    placeholder="Sijainnin kuvaus"
                    value={form.location_description}
                    onChange={handleChange}
                    required
                />
                <input
                    name="max_weight"
                    placeholder="Maksimipaino (kg)"
                    value={form.max_weight}
                    onChange={handleChange}
                    type="number"
                    min="0"
                />
                <input
                    name="max_volume_m3"
                    placeholder="Maksimitilavuus (m³)"
                    value={form.max_volume_m3}
                    onChange={handleChange}
                    type="number"
                    min="0"
                />
                <button type="submit">Lisää varastopaikka</button>
            </form>
        </div>
    );
}

export default WarehouseSlots;