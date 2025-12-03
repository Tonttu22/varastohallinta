import React, { useState, useEffect } from 'react';
import Select from 'react-select';

function ProductList({ products, slots = [], productSlots = [], onDelete, onAssignSlot }) {
    const [error, setError] = useState('');

    // Laske sijoittamattomien määrä jokaiselle tuotteelle products-taulun perusteella
    const productsWithUnassigned = products.map(product => {
        const unassignedQty = Math.max((product.quantity || 0) - (product.slotted_quantity || 0), 0);
        return {
            ...product,
            unassignedQty
        };
    });

    // Näytä vain tuotteet, joilla on sijoittamattomia kappaleita
    const productsWithoutSlot = productsWithUnassigned.filter(p => p.unassignedQty > 0);

    // Järjestys ja hoverit
    const [sortField, setSortField] = useState('productname');
    const [sortAsc, setSortAsc] = useState(true);
    const [slotSortField, setSlotSortField] = useState('productname');
    const [slotSortAsc, setSlotSortAsc] = useState(true);
    const [hovered, setHovered] = useState(null);
    const [slotHovered, setSlotHovered] = useState(null);

    const [selectedSlots, setSelectedSlots] = useState({});
    const [selectedQty, setSelectedQty] = useState({});

    const handleSlotChange = (productID, slotID) => {
        setSelectedSlots({ ...selectedSlots, [productID]: slotID });
    };

    const handleQtyChange = (productID, qty) => {
        setSelectedQty({ ...selectedQty, [productID]: qty });
    };

    const handleAssign = (productID) => {
        const slotID = selectedSlots[productID];
        const qty = Number(selectedQty[productID]);
        if (onAssignSlot && slotID && qty > 0) {
            onAssignSlot(productID, slotID, qty)
                .then(() => {
                    setError('');
                })
                .catch(err => {
                    setError(err.message);
                });
            setSelectedSlots(prev => ({ ...prev, [productID]: '' }));
            setSelectedQty(prev => ({ ...prev, [productID]: '' }));
        }
    };

    const sortProducts = (arr, field, asc) => {
        return [...arr].sort((a, b) => {
            if (a[field] === undefined || b[field] === undefined) return 0;
            if (a[field] < b[field]) return asc ? -1 : 1;
            if (a[field] > b[field]) return asc ? 1 : -1;
            return 0;
        });
    };

    const getHeaderStyle = (hovered, name) => ({
        cursor: 'pointer',
        textAlign: 'left',
        borderBottom: '1px solid #444',
        padding: '6px',
        background: hovered === name ? '#181818' : undefined,
        transition: 'background 0.15s',
        userSelect: 'none'
    });

    // Laske jokaiselle slotille käytetty paino ja tilavuus
    const slotUsage = {};
    slots.forEach(slot => {
        const slotProducts = productSlots.filter(ps => ps.slot_id === slot.slot_id);
        const usedWeight = slotProducts.reduce((sum, ps) => sum + ((ps.weight || 0) * (ps.quantity_in_slot || 0)), 0);
        const usedVolume = slotProducts.reduce((sum, ps) =>
            sum + ((ps.length_cm || 0) * (ps.width_cm || 0) * (ps.height_cm || 0) / 1000000) * (ps.quantity_in_slot || 0), 0);
        slotUsage[slot.slot_id] = {
            usedWeight,
            usedVolume
        };
    });

    const getSlotOptions = () => slots.map(slot => {
        const usage = slotUsage[slot.slot_id] || { usedWeight: 0, usedVolume: 0 };
        return {
            value: slot.slot_id,
            label: `${slot.slot_code} – ${slot.location_description}`,
            tooltip: `Käytössä: ${usage.usedVolume.toFixed(3)} / ${slot.max_volume_m3} m³, ${usage.usedWeight} / ${slot.max_weight} kg`
        };
    });

    const CustomOption = (props) => (
        <div
            {...props.innerProps}
            style={{
                background: props.isFocused ? '#222' : '#181818',
                color: '#fff',
                padding: 8,
                position: 'relative'
            }}
        >
            {props.label}
            <span
                style={{
                    marginLeft: 8,
                    color: '#aaa',
                    fontSize: 12,
                    cursor: 'help'
                }}
                title={props.data.tooltip}
            >&#9432;</span>
        </div>
    );

    // Yhdistä productSlots-rivit, joissa sama productID ja slot_id
    const mergedSlots = {};
    productSlots.forEach(ps => {
        if (ps.quantity_in_slot > 0) {
            const key = `${ps.productID}-${ps.slot_id}`;
            if (!mergedSlots[key]) {
                mergedSlots[key] = { ...ps };
            } else {
                mergedSlots[key].quantity_in_slot += ps.quantity_in_slot;
            }
        }
    });
    const productsInSlots = Object.values(mergedSlots).map(ps => {
        const product = products.find(p => p.productID === ps.productID);
        const slot = slots.find(s => s.slot_id === ps.slot_id);
        return {
            ...ps,
            productname: product?.productname || `ID ${ps.productID}`,
            productnumber: product?.productnumber || '',
            batch_number: product?.batch_number || '',
            slot_code: slot?.slot_code || `ID ${ps.slot_id}`,
        };
    });
    console.log('productsInSlots', productsInSlots);

    return (
        <div>
            
            <h3>Saapuneet tuotteet (ei varastopaikkaa)</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', color: '#fff', marginBottom: 32 }}>
                <thead>
                    <tr>
                        <th
                            style={getHeaderStyle(hovered, 'productname')}
                            onClick={() => {
                                if (sortField === 'productname') setSortAsc(!sortAsc);
                                else { setSortField('productname'); setSortAsc(true); }
                            }}
                            onMouseEnter={() => setHovered('productname')}
                            onMouseLeave={() => setHovered(null)}
                        >
                            Tuotenimi {sortField === 'productname' ? (sortAsc ? '▲' : '▼') : ''}
                        </th>
                        <th
                            style={getHeaderStyle(hovered, 'productnumber')}
                            onClick={() => {
                                if (sortField === 'productnumber') setSortAsc(!sortAsc);
                                else { setSortField('productnumber'); setSortAsc(true); }
                            }}
                            onMouseEnter={() => setHovered('productnumber')}
                            onMouseLeave={() => setHovered(null)}
                        >
                            Tuotenro {sortField === 'productnumber' ? (sortAsc ? '▲' : '▼') : ''}
                        </th>
                        <th
                            style={getHeaderStyle(hovered, 'batch_number')}
                            onClick={() => {
                                if (sortField === 'batch_number') setSortAsc(!sortAsc);
                                else { setSortField('batch_number'); setSortAsc(true); }
                            }}
                            onMouseEnter={() => setHovered('batch_number')}
                            onMouseLeave={() => setHovered(null)}
                        >
                            Eränumero {sortField === 'batch_number' ? (sortAsc ? '▲' : '▼') : ''}
                        </th>
                        <th style={{ borderBottom: '1px solid #444', padding: '6px' }}>Määrä</th>
                        <th style={{ borderBottom: '1px solid #444', padding: '6px' }}>Paino (kg)</th>
                        <th style={{ borderBottom: '1px solid #444', padding: '6px' }}>Tilavuus (m³)</th>
                        <th style={{ borderBottom: '1px solid #444', padding: '6px' }}>Varastopaikka</th>
                        <th style={{ borderBottom: '1px solid #444', padding: '6px' }}>Toiminnot</th>
                        
                    </tr>
                </thead>
                <tbody>
                    {sortProducts(productsWithoutSlot, sortField, sortAsc).map(product => (
                        <tr key={product.productID}>
                            <td style={{ borderBottom: '1px solid #333', padding: '6px' }}>{product.productname}</td>
                            <td style={{ borderBottom: '1px solid #333', padding: '6px' }}>{product.productnumber}</td>
                            <td style={{ borderBottom: '1px solid #333', padding: '6px' }}>{product.batch_number || '-'}</td>
                            <td style={{ borderBottom: '1px solid #333', padding: '6px' }}>{product.unassignedQty}</td>
                            <td style={{ borderBottom: '1px solid #333', padding: '6px' }}>
                                {product.weight || '-'}
                            </td>
                            <td style={{ borderBottom: '1px solid #333', padding: '6px' }}>
                                {product.length_cm && product.width_cm && product.height_cm
                                    ? ((product.length_cm * product.width_cm * product.height_cm) / 1000000).toFixed(3)
                                    : '-'}
                            </td>
                            <td style={{ borderBottom: '1px solid #333', padding: '6px' }}>
                                <div style={{ minWidth: 220 }}>
                                    <Select
                                        options={getSlotOptions()}
                                        value={getSlotOptions().find(opt => opt.value === selectedSlots[product.productID]) || null}
                                        onChange={opt => handleSlotChange(product.productID, opt ? opt.value : '')}
                                        placeholder="Valitse varastopaikka"
                                        isClearable
                                        components={{ Option: CustomOption }}
                                        styles={{
                                            control: (base) => ({
                                                ...base,
                                                background: '#181818',
                                                color: '#fff',
                                                borderColor: '#444',
                                                minHeight: 32
                                            }),
                                            menu: (base) => ({
                                                ...base,
                                                background: '#181818',
                                                color: '#fff',
                                            }),
                                            singleValue: (base) => ({
                                                ...base,
                                                color: '#fff'
                                            }),
                                            option: (base, state) => ({
                                                ...base,
                                                background: state.isFocused ? '#222' : '#181818',
                                                color: '#fff',
                                            }),
                                        }}
                                    />
                                </div>
                                <input
                                    type="number"
                                    min="1"
                                    max={product.unassignedQty}
                                    value={selectedQty[product.productID] || ''}
                                    onChange={e => handleQtyChange(product.productID, e.target.value)}
                                    placeholder="Määrä"
                                    style={{ width: 60, marginLeft: 8 }}
                                />
                                <button
                                    onClick={() => handleAssign(product.productID)}
                                    disabled={
                                        !selectedSlots[product.productID] ||
                                        !selectedQty[product.productID] ||
                                        Number(selectedQty[product.productID]) < 1 ||
                                        Number(selectedQty[product.productID]) > product.unassignedQty
                                    }
                                    style={{
                                        marginLeft: 8,
                                        background: '#4fc3f7',
                                        color: '#111',
                                        border: 'none',
                                        borderRadius: 4,
                                        padding: '4px 10px',
                                        cursor: (selectedSlots[product.productID] && selectedQty[product.productID]) ? 'pointer' : 'not-allowed'
                                    }}
                                >
                                    Sijoita paikkaan
                                </button>
                            </td>
                            <td style={{ borderBottom: '1px solid #333', padding: '6px' }}>
                                <button
                                    onClick={() => onDelete(product.productID)}
                                    style={{
                                        background: '#a33',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: 4,
                                        padding: '4px 10px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Poista
                                </button>
                            </td>
                            
                        </tr>
                    ))}
                    {productsWithoutSlot.length === 0 && (
                        <tr>
                            <td colSpan={8} style={{ color: '#888', padding: '6px', textAlign: 'center' }}>Ei saapuneita tuotteita</td>
                        </tr>
                    )}
                </tbody>
            </table>

            <h3>Tuotteet varastopaikoissa</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', color: '#fff' }}>
                <thead>
                    <tr>
                        <th
                            style={getHeaderStyle(slotHovered, 'productname')}
                            onClick={() => {
                                if (slotSortField === 'productname') setSlotSortAsc(!slotSortAsc);
                                else { setSlotSortField('productname'); setSlotSortAsc(true); }
                            }}
                            onMouseEnter={() => setSlotHovered('productname')}
                            onMouseLeave={() => setSlotHovered(null)}
                        >
                            Tuotenimi {slotSortField === 'productname' ? (slotSortAsc ? '▲' : '▼') : ''}
                        </th>
                        <th
                            style={getHeaderStyle(slotHovered, 'productnumber')}
                            onClick={() => {
                                if (slotSortField === 'productnumber') setSlotSortAsc(!slotSortAsc);
                                else { setSlotSortField('productnumber'); setSlotSortAsc(true); }
                            }}
                            onMouseEnter={() => setSlotHovered('productnumber')}
                            onMouseLeave={() => setSlotHovered(null)}
                        >
                            Tuotenro {slotSortField === 'productnumber' ? (slotSortAsc ? '▲' : '▼') : ''}
                        </th>
                        <th
                            style={getHeaderStyle(slotHovered, 'batch_number')}
                            onClick={() => {
                                if (slotSortField === 'batch_number') setSlotSortAsc(!slotSortAsc);
                                else { setSlotSortField('batch_number'); setSlotSortAsc(true); }
                            }}
                            onMouseEnter={() => setSlotHovered('batch_number')}
                            onMouseLeave={() => setSlotHovered(null)}
                        >
                            Eränumero {slotSortField === 'batch_number' ? (slotSortAsc ? '▲' : '▼') : ''}
                        </th>
                        <th
                            style={getHeaderStyle(slotHovered, 'slot_code')}
                            onClick={() => {
                                if (slotSortField === 'slot_code') setSlotSortAsc(!slotSortAsc);
                                else { setSlotSortField('slot_code'); setSlotSortAsc(true); }
                            }}
                            onMouseEnter={() => setSlotHovered('slot_code')}
                            onMouseLeave={() => setSlotHovered(null)}
                        >
                            Varastopaikka {slotSortField === 'slot_code' ? (slotSortAsc ? '▲' : '▼') : ''}
                        </th>
                        <th
                            style={getHeaderStyle(slotHovered, 'quantity_in_slot')}
                            onClick={() => {
                                if (slotSortField === 'quantity_in_slot') setSlotSortAsc(!slotSortAsc);
                                else { setSlotSortField('quantity_in_slot'); setSlotSortAsc(true); }
                            }}
                            onMouseEnter={() => setSlotHovered('quantity_in_slot')}
                            onMouseLeave={() => setSlotHovered(null)}
                        >
                            Määrä paikassa {slotSortField === 'quantity_in_slot' ? (slotSortAsc ? '▲' : '▼') : ''}
                        </th>
                        <th style={{ borderBottom: '1px solid #444', padding: '6px' }}>Toiminnot</th>
                    </tr>
                </thead>
                <tbody>
                    {productsInSlots.length > 0 ? sortProducts(productsInSlots, slotSortField, slotSortAsc).map(item => (
                        <tr key={item.productID + '-' + item.slot_id}>
                            <td style={{ borderBottom: '1px solid #333', padding: '6px' }}>{item.productname}</td>
                            <td style={{ borderBottom: '1px solid #333', padding: '6px' }}>{item.productnumber}</td>
                            <td style={{ borderBottom: '1px solid #333', padding: '6px' }}>{item.batch_number || '-'}</td>
                            <td style={{ borderBottom: '1px solid #333', padding: '6px' }}>{item.slot_code || item.slot_id}</td>
                            <td style={{ borderBottom: '1px solid #333', padding: '6px' }}>{item.quantity_in_slot}</td>
                            <td style={{ borderBottom: '1px solid #333', padding: '6px' }}>
                                <button
                                    onClick={() => onDelete(item.productID)}
                                    style={{
                                        background: '#a33',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: 4,
                                        padding: '4px 10px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Poista
                                </button>
                            </td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan={6} style={{ color: '#888', padding: '6px', textAlign: 'center' }}>Ei tuotteita varastossa</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default ProductList;