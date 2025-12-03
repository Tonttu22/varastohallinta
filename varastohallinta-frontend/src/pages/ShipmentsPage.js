import React, { useEffect, useState } from 'react';

function ShipmentsPage({ token, userId, onBack }) {
  const [slots, setSlots] = useState([]);
  const [productsBySlot, setProductsBySlot] = useState({});
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [addresses, setAddresses] = useState([
    { recipients_name: '', recipients_address: '', recipients_phone_number: '', items: [{ product_id: '', slot_id: '', quantity: 1 }] }
  ]);
  const [shipments, setShipments] = useState([]);
  const [shipmentDetails, setShipmentDetails] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [newVehicle, setNewVehicle] = useState({
    vehicle_plate: '', brand: '', model: '', max_weight_kg: '', max_volume_m3: '',
    inner_length_cm: '', inner_width_cm: '', inner_height_cm: '', notes: ''
  });
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [newDriver, setNewDriver] = useState({
    first_name: '', last_name: '', phone_number: '', company: ''
  });
  const [deliveryRuns, setDeliveryRuns] = useState([]);
  const [deliveryRunDetails, setDeliveryRunDetails] = useState(null);
  
  const [sortField, setSortField] = useState('');
  const [sortDir, setSortDir] = useState('asc');

  // Hae varastopaikat
  useEffect(() => {
    fetch('http://localhost:3000/api/warehouseslots', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(setSlots)
      .catch(() => setSlots([]));
  }, [token]);

  // Hae kaikki kuljetukset 
useEffect(() => {
  let cancelled = false;

  const toArray = (data) =>
    Array.isArray(data)
      ? data
      : (data?.rows || data?.results || data?.delivery_runs || data?.data || []);

  (async () => {
    try {
      const res = await fetch('http://localhost:3000/api/delivery-runs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (!cancelled) setDeliveryRuns(toArray(data));
    } catch (e) {
      console.warn('delivery-runs fetch failed:', e);
      if (!cancelled) {
        setDeliveryRuns([]); 
        if (String(e.message).includes('401') || String(e.message).includes('403')) {
          setError('Istunto vanhentunut – kirjaudu uudelleen.');
        }
      }
    }
  })();

  return () => { cancelled = true; };
}, [token]);

  // Näytä yksittäisen kuljetuksen tiedot
  const showDeliveryRunDetails = async (delivery_id) => {
    try {
      const res = await fetch(`http://localhost:3000/api/delivery-runs/${delivery_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Kuljetuksen haku epäonnistui');
      const data = await res.json();
      setDeliveryRunDetails(data);
    } catch (err) {
      setError(err.message);
    }
  };


  // Hae tuotteet sloteittain
  const fetchProducts = async () => {
    let result = {};
    for (const slot of slots) {
      try {
        const res = await fetch(`http://localhost:3000/api/product_slots/with-products`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) continue;
        const data = await res.json();
        result[slot.slot_id] = data.filter(ps => ps.slot_id === slot.slot_id && ps.quantity_in_slot > 0);
      } catch {
        result[slot.slot_id] = [];
      }
    }
    setProductsBySlot(result);
  };

  useEffect(() => {
    if (slots.length > 0) fetchProducts();
    
  }, [slots, token]);

  // Hae kuljettajat
  useEffect(() => {
    fetch('http://localhost:3000/api/drivers')
      .then(res => res.json())
      .then(setDrivers)
      .catch(() => setDrivers([]));
  }, []);

  // Hae kaikki lähetykset
  useEffect(() => {
    fetch('http://localhost:3000/api/shipments', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(setShipments)
      .catch(() => setShipments([]));
  }, [token]);

  // Hae ajoneuvot
  useEffect(() => {
    fetch('http://localhost:3000/api/vehicles')
      .then(res => res.json())
      .then(setVehicles)
      .catch(() => setVehicles([]));
  }, []);

  // Lisää uusi toimitusosoite
  const addAddress = () => {
    setAddresses(prev => [
      ...prev,
      { recipients_name: '', recipients_address: '', recipients_phone_number: '', items: [{ product_id: '', slot_id: '', quantity: 1 }] }
    ]);
  };

  // Poista toimitusosoite
  const removeAddress = idx => {
    setAddresses(prev => prev.filter((_, i) => i !== idx));
  };

  // Päivitä osoitteen kenttä
  const updateAddressField = (idx, field, value) => {
    setAddresses(prev => prev.map((a, i) => i === idx ? { ...a, [field]: value } : a));
  };

  // Lisää tuote osoitteelle
  const addItem = addrIdx => {
    setAddresses(prev => prev.map((a, i) => i === addrIdx ? { ...a, items: [...a.items, { product_id: '', slot_id: '', quantity: 1 }] } : a));
  };

  // Poista tuote osoitteelta
  const removeItem = (addrIdx, itemIdx) => {
    setAddresses(prev => prev.map((a, i) => i === addrIdx ? { ...a, items: a.items.filter((_, j) => j !== itemIdx) } : a));
  };

  // Päivitä tuotteen kenttä
  const updateItem = (addrIdx, itemIdx, field, value) => {
    setAddresses(prev => prev.map((a, i) => {
      if (i !== addrIdx) return a;
      const items = a.items.map((it, j) => j === itemIdx ? { ...it, [field]: value } : it);
      return { ...a, items };
    }));
  };

  // Luo lähetykset (yksi shipment per osoite, sama kuljettaja)
  const createShipments = async () => {

    let deliveryRunId = null;

// Luodaan yksi delivery_run ennen loopia
const runRes = await fetch('http://localhost:3000/api/delivery-runs', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  },
  body: JSON.stringify({
    driver_id: selectedDriver || null,
    vehicle_id: selectedVehicle || null // <-- lisää tämä!
  })
});

    const runData = await runRes.json();
    deliveryRunId = runData.delivery_run_id;



    setError('');
    setLoading(true);
    try {
      for (const addr of addresses) {
        if (!addr.recipients_name || !addr.recipients_address) {
          throw new Error('Täytä vastaanottajan nimi ja osoite kaikille toimituksille.');
        }
        const items = addr.items.map(it => ({
          product_id: Number(it.product_id) || null,
          slot_id: it.slot_id || null, // slot_id pitää olla oikea!
          quantity: Number(it.quantity) || 1
        })).filter(it => it.product_id && it.slot_id);

        const body = {
          created_by_user: userId,
          type: 'outgoing',
          recipients_name: addr.recipients_name,
          recipients_address: addr.recipients_address,
          recipients_phone_number: addr.recipients_phone_number,
          items,
          driver_id: selectedDriver || null,
          delivery_run_id: deliveryRunId,
          vehicle_id: selectedVehicle || null,
        };

        const res = await fetch('http://localhost:3000/api/shipments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify(body)
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Shipment creation failed');
        }
      }
      // Päivitä lista ja tyhjennä lomake
      const newListRes = await fetch('http://localhost:3000/api/shipments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const updated = await newListRes.json();
      setShipments(updated);
      setAddresses([{ recipients_name: '', recipients_address: '', recipients_phone_number: '', items: [{ product_id: '', slot_id: '', quantity: 1 }] }]);
      setSelectedDriver('');
      await fetchProducts();
    } catch (err) {
      setError(err.message || 'Virhe luotaessa lähetyksiä');
    } finally {
      setLoading(false);
    }
  };

  // Näytä yksittäisen lähetyksen rivit
  const showShipmentDetails = async (shipment_id) => {
    try {
      const res = await fetch(`http://localhost:3000/api/shipments/${shipment_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Lähetyksen haku epäonnistui');
      const data = await res.json();
      setShipmentDetails(data);
    } catch (err) {
      setError(err.message);
    }
  };

  // Palauttaa kaikki jo valitut {product_id, slot_id} parit (paitsi tämän rivin)
const getUsedProductSlotPairs = (excludeAddrIdx, excludeItemIdx) => {
  const pairs = [];
  addresses.forEach((addr, ai) => {
    addr.items.forEach((it, ii) => {
      if (!(ai === excludeAddrIdx && ii === excludeItemIdx) && it.product_id && it.slot_id) {
        pairs.push({ product_id: String(it.product_id), slot_id: String(it.slot_id) });
      }
    });
  });
  return pairs;
};

// Laske kuinka monta tuotetta tästä slotista on jo valittu muihin osoitteisiin
const getReservedCount = (productID, slotID, excludeAddrIdx, excludeItemIdx) => {
  let count = 0;
  addresses.forEach((addr, ai) => {
    addr.items.forEach((it, ii) => {
      if (
        ai === excludeAddrIdx && ii === excludeItemIdx
      ) return;
      if (
        String(it.product_id) === String(productID) &&
        String(it.slot_id) === String(slotID)
      ) {
        count += Number(it.quantity) || 0;
      }
    });
  });
  return count;
};

// Laske tilavuus m³ kaikille tuotteille
const getTotalVolume = () => {
  let total = 0;
  addresses.forEach(addr => {
    addr.items.forEach(it => {
      // Etsi tuote productsBySlotista
      const prod = (productsBySlot[it.slot_id] || []).find(p => String(p.productID) === String(it.product_id));
      if (prod && prod.length_cm && prod.width_cm && prod.height_cm) {
        const vol = (prod.length_cm * prod.width_cm * prod.height_cm) / 1000000; // cm³ -> m³
        total += vol * (Number(it.quantity) || 1);
      }
    });
  });
  return total;
};

// Laske kokonaispaino
const getTotalWeight = () => {
  let total = 0;
  addresses.forEach(addr => {
    addr.items.forEach(it => {
      const prod = (productsBySlot[it.slot_id] || []).find(p => String(p.productID) === String(it.product_id));
      if (prod && prod.weight) {
        total += (Number(prod.weight) || 0) * (Number(it.quantity) || 1);
      }
    });
  });
  return total;
};

// Lisää nämä funktiot komponentin alkuun muiden funktioiden joukkoon:
const deleteDriver = async (driver_id) => {
  if (!window.confirm('Poistetaanko kuljettaja?')) return;
  await fetch(`http://localhost:3000/api/drivers/${driver_id}`, { method: 'DELETE' });
  fetch('http://localhost:3000/api/drivers')
    .then(res => res.json())
    .then(setDrivers);
};

const deleteVehicle = async (vehicle_id) => {
  if (!window.confirm('Poistetaanko auto?')) return;
  await fetch(`http://localhost:3000/api/vehicles/${vehicle_id}`, { method: 'DELETE' });
  fetch('http://localhost:3000/api/vehicles')
    .then(res => res.json())
    .then(setVehicles);
};

  // ...lisää komponentin alkuun:
  function handleSort(field) {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  // Lisää funktio popupin alkuun:
const updateShipmentStatus = async (shipment_id, newStatus) => {
  if (newStatus === 'failed') {
    setConfirmCancelShipmentId(shipment_id);
    return;
  }
  try {
    const res = await fetch(`http://localhost:3000/api/shipments/${shipment_id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus })
    });
    if (!res.ok) throw new Error('Päivitys epäonnistui');
    // Päivitä popupin tiedot
    showDeliveryRunDetails(deliveryRunDetails.delivery_id);
    // Päivitä kaikki lähetykset
    fetch('http://localhost:3000/api/shipments', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(setShipments);
  } catch (err) {
    setError(err.message);
  }
};

// Lisää nämä statet komponentin alkuun:
const [confirmCancelShipmentId, setConfirmCancelShipmentId] = useState(null);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      <h2>Luo kuljetus</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ background: '#222', borderRadius: 12, padding: 24, marginBottom: 32 }}>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', marginBottom: 8, color: '#fff' }}>Valitse kuljettaja</label>
          <select value={selectedDriver} onChange={e => setSelectedDriver(e.target.value)} style={{ width: '50%', padding: 8, marginBottom: 8 }}>
            <option value=''>-- Ei valittu --</option>
            {drivers.map(d => (
              <option key={d.driver_id} value={d.driver_id}>
                {d.first_name} {d.last_name}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => setShowAddDriver(true)} style={{ marginLeft: 12 }}>
            Lisää uusi kuljettaja
          </button>
        </div>
        {showAddDriver && (
          <div style={{ background: '#333', padding: 16, borderRadius: 8, marginBottom: 16 }}>
            <h4 style={{ color: '#fff' }}>Lisää kuljettaja</h4>
            <input placeholder="Etunimi" value={newDriver.first_name} onChange={e => setNewDriver(d => ({ ...d, first_name: e.target.value }))} style={{ marginBottom: 8, width: '48%' }} />
            <input placeholder="Sukunimi" value={newDriver.last_name} onChange={e => setNewDriver(d => ({ ...d, last_name: e.target.value }))} style={{ marginBottom: 8, width: '48%' }} />
            <input placeholder="Puhelin" value={newDriver.phone_number} onChange={e => setNewDriver(d => ({ ...d, phone_number: e.target.value }))} style={{ marginBottom: 8, width: '48%' }} />
            <input placeholder="Yritys" value={newDriver.company} onChange={e => setNewDriver(d => ({ ...d, company: e.target.value }))} style={{ marginBottom: 8, width: '48%' }} />
            <div>
              <button
                type="button"
                onClick={async () => {
                  await fetch('http://localhost:3000/api/drivers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newDriver)
                  });
                  setShowAddDriver(false);
                  setNewDriver({ first_name: '', last_name: '', phone_number: '', company: '' });
                  // Päivitä kuljettajat
                  fetch('http://localhost:3000/api/drivers')
                    .then(res => res.json())
                    .then(setDrivers);
                }}
                style={{ marginTop: 8 }}
              >
                Tallenna kuljettaja
              </button>
              <button type="button" onClick={() => setShowAddDriver(false)} style={{ marginLeft: 8 }}>Peruuta</button>
            </div>
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', marginBottom: 8, color: '#fff' }}>Valitse auto</label>
          <select value={selectedVehicle} onChange={e => setSelectedVehicle(e.target.value)} style={{ width: '50%', padding: 8, marginBottom: 8 }}>
            <option value=''>-- Ei valittu --</option>
            {vehicles.map(v => (
              <option key={v.vehicle_id} value={v.vehicle_id}>
                {v.vehicle_plate} {v.brand} {v.model}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => setShowAddVehicle(true)} style={{ marginLeft: 12 }}>
            Lisää uusi auto
          </button>
        </div>
        {showAddVehicle && (
          <div style={{ background: '#333', padding: 16, borderRadius: 8, marginBottom: 16 }}>
            <h4 style={{ color: '#fff' }}>Lisää auto</h4>
            <input placeholder="Rekisterinumero *" value={newVehicle.vehicle_plate} onChange={e => setNewVehicle(v => ({ ...v, vehicle_plate: e.target.value }))} style={{ marginBottom: 8, width: '48%', border: newVehicle.vehicle_plate === '' ? '2px solid red' : undefined }} />
            <input placeholder="Merkki *" value={newVehicle.brand} onChange={e => setNewVehicle(v => ({ ...v, brand: e.target.value }))} style={{ marginBottom: 8, width: '48%', border: newVehicle.brand === '' ? '2px solid red' : undefined }} />
            <input placeholder="Malli *" value={newVehicle.model} onChange={e => setNewVehicle(v => ({ ...v, model: e.target.value }))} style={{ marginBottom: 8, width: '48%', border: newVehicle.model === '' ? '2px solid red' : undefined }} />
            <input
      placeholder="Max. paino (kg) *"
      type="number"
      value={newVehicle.max_weight_kg}
      onChange={e => setNewVehicle(v => ({ ...v, max_weight_kg: e.target.value }))
      }
      style={{ marginBottom: 8, width: '48%', border: newVehicle.max_weight_kg === '' ? '2px solid red' : undefined }}
    />
    <input
      placeholder="Max. tilavuus (m³) *"
      type="number"
      value={newVehicle.max_volume_m3}
      onChange={e => setNewVehicle(v => ({ ...v, max_volume_m3: e.target.value }))
      }
      style={{ marginBottom: 8, width: '48%', border: newVehicle.max_volume_m3 === '' ? '2px solid red' : undefined }}
    />
    <input placeholder="Sisäpituus (cm)" type="number" value={newVehicle.inner_length_cm} onChange={e => setNewVehicle(v => ({ ...v, inner_length_cm: e.target.value }))} style={{ marginBottom: 8, width: '48%' }} />
    <input placeholder="Sisäleveys (cm)" type="number" value={newVehicle.inner_width_cm} onChange={e => setNewVehicle(v => ({ ...v, inner_width_cm: e.target.value }))} style={{ marginBottom: 8, width: '48%' }} />
    <input placeholder="Sisäkorkeus (cm)" type="number" value={newVehicle.inner_height_cm} onChange={e => setNewVehicle(v => ({ ...v, inner_height_cm: e.target.value }))} style={{ marginBottom: 8, width: '48%' }} />
    <input placeholder="Muistiinpanot" value={newVehicle.notes} onChange={e => setNewVehicle(v => ({ ...v, notes: e.target.value }))} style={{ marginBottom: 8, width: '98%' }} />
    <div>
      <button
        type="button"
        onClick={async () => {
          if (
            newVehicle.vehicle_plate === '' ||
            newVehicle.brand === '' ||
            newVehicle.model === '' ||
            newVehicle.max_weight_kg === '' ||
            newVehicle.max_volume_m3 === ''
          ) {
            alert('Täytä kaikki tähdellä (*) merkityt kentät!');
            return;
          }
          const cleanVehicle = {
            ...newVehicle,
            max_weight_kg: newVehicle.max_weight_kg === '' ? null : newVehicle.max_weight_kg,
            max_volume_m3: newVehicle.max_volume_m3 === '' ? null : newVehicle.max_volume_m3,
            inner_length_cm: newVehicle.inner_length_cm === '' ? null : newVehicle.inner_length_cm,
            inner_width_cm: newVehicle.inner_width_cm === '' ? null : newVehicle.inner_width_cm,
            inner_height_cm: newVehicle.inner_height_cm === '' ? null : newVehicle.inner_height_cm,
            notes: newVehicle.notes === '' ? null : newVehicle.notes
          };
          await fetch('http://localhost:3000/api/vehicles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cleanVehicle)
          });
          setShowAddVehicle(false);
          setNewVehicle({
            vehicle_plate: '', brand: '', model: '', max_weight_kg: '', max_volume_m3: '',
            inner_length_cm: '', inner_width_cm: '', inner_height_cm: '', notes: ''
          });
          fetch('http://localhost:3000/api/vehicles')
            .then(res => res.json())
            .then(setVehicles);
        }}
        style={{ marginTop: 8 }}
      >
        Tallenna auto
      </button>
      <button type="button" onClick={() => setShowAddVehicle(false)} style={{ marginLeft: 8 }}>Peruuta</button>
    </div>
    <div style={{ color: '#fff', marginTop: 8 }}><small>* Pakollinen kenttä</small></div>
  </div>
)}

        <div style={{ marginBottom: 12 }}>
          <label style={{ color: '#fff' }}>Poista kuljettaja:</label>
          <select onChange={e => { if (e.target.value) deleteDriver(e.target.value); e.target.value = ''; }} style={{ marginLeft: 8 }}>
            <option value="">Valitse poistettava...</option>
            {drivers.map(d => (
              <option key={d.driver_id} value={d.driver_id}>
                {d.first_name} {d.last_name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ color: '#fff' }}>Poista auto:</label>
          <select onChange={e => { if (e.target.value) deleteVehicle(e.target.value); e.target.value = ''; }} style={{ marginLeft: 8 }}>
            <option value="">Valitse poistettava...</option>
            {vehicles.map(v => (
              <option key={v.vehicle_id} value={v.vehicle_id}>
                {v.vehicle_plate} {v.brand} {v.model}
              </option>
            ))}
          </select>
        </div>

        {selectedVehicle && (() => {
  const vehicle = vehicles.find(v => String(v.vehicle_id) === String(selectedVehicle));
  const totalVolume = getTotalVolume();
  const totalWeight = getTotalWeight();
  const percentVolume = vehicle.max_volume_m3 ? Math.min(100, (totalVolume / vehicle.max_volume_m3) * 100) : 0;
  const percentWeight = vehicle.max_weight_kg ? Math.min(100, (totalWeight / vehicle.max_weight_kg) * 100) : 0;
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ color: '#fff', fontWeight: 'bold' }}>
        Kuljetuksen tilavuus: {totalVolume.toFixed(3)} m³ / {vehicle.max_volume_m3} m³
      </label>
      <div style={{
        background: '#444',
        borderRadius: 6,
        height: 24,
        width: 300,
        marginTop: 6,
        marginBottom: 12,
        position: 'relative'
      }}>
        <div style={{
          background: percentVolume < 100 ? '#0f0' : '#f00',
          width: `${percentVolume}%`,
          height: '100%',
          borderRadius: 6,
          transition: 'width 0.2s'
        }} />
        <span style={{
          position: 'absolute',
          left: 8,
          top: 2,
          color: '#fff',
          fontWeight: 'bold'
        }}>
          {percentVolume.toFixed(1)} %
        </span>
      </div>
      {percentVolume >= 100 && (
        <div style={{ color: '#f00', fontWeight: 'bold', marginBottom: 8 }}>
          Tilavuus täynnä! Poista tuotteita tai valitse isompi auto.
        </div>
      )}

      <label style={{ color: '#fff', fontWeight: 'bold' }}>
        Kuljetuksen paino: {totalWeight.toFixed(2)} kg / {vehicle.max_weight_kg} kg
      </label>
      <div style={{
        background: '#444',
        borderRadius: 6,
        height: 24,
        width: 300,
        marginTop: 6,
        marginBottom: 12,
        position: 'relative'
      }}>
        <div style={{
          background: percentWeight < 100 ? '#0f0' : '#f00',
          width: `${percentWeight}%`,
          height: '100%',
          borderRadius: 6,
          transition: 'width 0.2s'
        }} />
        <span style={{
          position: 'absolute',
          left: 8,
          top: 2,
          color: '#fff',
          fontWeight: 'bold'
        }}>
          {percentWeight.toFixed(1)} %
        </span>
      </div>
      {percentWeight >= 100 && (
        <div style={{ color: '#f00', fontWeight: 'bold' }}>
          Paino täynnä! Poista tuotteita tai valitse isompi auto.
        </div>
      )}
    </div>
);})()}

        {addresses.map((addr, ai) => (
          <div key={ai} style={{ background: '#333', padding: 16, borderRadius: 8, marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ color: '#fff' }}>Toimitusosoite #{ai + 1}</strong>
              <div>
                <button type="button" onClick={() => addItem(ai)} style={{ marginRight: 8 }}>Lisää tuote</button>
                {addresses.length > 1 && <button type="button" onClick={() => removeAddress(ai)}>Poista osoite</button>}
              </div>
            </div>
            <div style={{ marginTop: 8 }}>
              <input placeholder="Vastaanottajan nimi" value={addr.recipients_name} onChange={e => updateAddressField(ai, 'recipients_name', e.target.value)} style={{ width: '48%', marginRight: 8, padding: 6 }} />
              <input placeholder="Puhelin" value={addr.recipients_phone_number} onChange={e => updateAddressField(ai, 'recipients_phone_number', e.target.value)} style={{ width: '24%', marginRight: 8, padding: 6 }} />
              <input placeholder="Osoite" value={addr.recipients_address} onChange={e => updateAddressField(ai, 'recipients_address', e.target.value)} style={{ width: '24%', padding: 6 }} />
            </div>
            <div style={{ marginTop: 12 }}>
              {addr.items.map((it, ii) => (
                <div key={ii} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <select
  value={it.product_id && it.slot_id ? `${it.product_id}-${it.slot_id}` : ''}
  onChange={e => {
    const [prodId, slotId] = e.target.value.split('-');
    updateItem(ai, ii, 'product_id', prodId);
    updateItem(ai, ii, 'slot_id', slotId);
    
  }}
  style={{ padding: 6, width: '40%' }}
>
  <option value=''>Valitse tuote...</option>
  {Object.entries(productsBySlot).flatMap(([slotId, products]) =>
    products
      .filter(p => p.status !== 'departed')
      .map(p => {
        const reserved = getReservedCount(p.productID, slotId, ai, ii);
        const available = (p.quantity_in_slot || 0) - reserved;
        return (
          <option
            key={p.productID + '-' + slotId}
            value={`${p.productID}-${slotId}`}
            disabled={available <= 0}
          >
            {p.productname} {p.productnumber ? `(${p.productnumber})` : ''} — Paikka: {slots.find(s => String(s.slot_id) === String(slotId))?.slot_code || slotId} — Jäljellä: {available}
            {available <= 0 ? ' (ei jäljellä)' : ''}
          </option>
        );
      })
  )}
</select>

<input
  type="number"
  min="1"
  max={(() => {
    if (!it.product_id || !it.slot_id) return undefined;
    const p = (productsBySlot[it.slot_id] || []).find(prod => String(prod.productID) === String(it.product_id));
    if (!p) return undefined;
    const reserved = getReservedCount(it.product_id, it.slot_id, ai, ii);
    return Math.max((p.quantity_in_slot || 0) - reserved, 1);
  })()}
  value={it.quantity}
  onChange={e => updateItem(ai, ii, 'quantity', e.target.value)}
  style={{ width: '10%', padding: 6 }}
/>
                  <button type="button" onClick={() => removeItem(ai, ii)}>Poista</button>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div style={{ marginBottom: 18 }}>
          <button type="button" onClick={addAddress} style={{ marginRight: 12 }}>Lisää toimitusosoite</button>
          <button type="button" onClick={createShipments} disabled={loading}>{loading ? 'Lähetetään...' : 'Luo lähetys'}</button>
        </div>
      </div>


        <h3>Kaikki kuljetukset</h3>
<div style={{
  background: '#222',
  borderRadius: 8,
  padding: 16,
  marginBottom: 24,
  maxHeight: 540,
  overflowY: 'auto',
  position: 'relative'
}}>
  <table style={{ width: '100%', borderCollapse: 'collapse', color: '#fff' }}>
    <thead>
      <tr>
        <th>ID</th>
        <th>Kuljettaja</th>
        <th>Auto</th>
        <th>Luotu</th>
        <th>Lisätiedot</th>
      </tr>
    </thead>
    <tbody>
      {(Array.isArray(deliveryRuns) ? deliveryRuns : []).map(run => (
        <tr key={run.delivery_id}>
          <td>{run.delivery_id}</td>
          <td>
            {run.driver_first_name
              ? `${run.driver_first_name} ${run.driver_last_name}`
              : <span style={{ color: '#888' }}>-</span>}
          </td>
          <td>
            {run.vehicle_plate
              ? `${run.vehicle_plate} ${run.brand || ''} ${run.model || ''}`
              : <span style={{ color: '#888' }}>-</span>}
          </td>
          <td>{run.created_at ? new Date(run.created_at).toLocaleString('fi-FI') : '-'}</td>
          <td>
            <button onClick={() => showDeliveryRunDetails(run.delivery_id)}>
              Näytä lisätiedot
            </button>
          </td>
        </tr>
      ))}
      {Array.isArray(deliveryRuns) && deliveryRuns.length === 0 && (
    <tr><td colSpan={5} style={{ color:'#888', textAlign:'center' }}>Ei kuljetuksia</td></tr>
  )}
    </tbody>
  </table>
</div>


      <h3>Kaikki lähetykset</h3>
      <div style={{
  background: '#222',
  borderRadius: 8,
  padding: 16,
  marginBottom: 24,
  maxHeight: 540,
  overflowY: 'auto',
  position: 'relative'
}}>
  
  <div style={{
    position: 'sticky',
    top: 0,
    background: '#222',
    zIndex: 3,
    paddingBottom: 8
  }}>
    <input
      type="text"
      placeholder="Hae lähetyksistä (ID, tyyppi, vastaanottaja, osoite, luonut...)"
      value={search}
      onChange={e => setSearch(e.target.value)}
      style={{
        marginBottom: 12,
        padding: 8,
        width: '60%',
        borderRadius: 4,
        border: '1px solid #888',
        fontSize: 16,
        background: '#222',
        color: '#fff',
        position: 'sticky',
        top: 0,
        zIndex: 4
      }}
    />
  </div>
  <table style={{ width: '100%', borderCollapse: 'collapse', color: '#fff' }}>
    <thead style={{ position: 'sticky', top: 52, background: '#222', zIndex: 3 }}>
      <tr>
        <th style={{ cursor: 'pointer' }} onClick={() => handleSort('shipment_id')}>ID</th>
        <th style={{ cursor: 'pointer' }} onClick={() => handleSort('type')}>Tyyppi</th>
        <th style={{ cursor: 'pointer' }} onClick={() => handleSort('created_at')}>Lähetetty</th>
        <th style={{ cursor: 'pointer' }} onClick={() => handleSort('created_by')}>Luonut</th>
        <th style={{ cursor: 'pointer' }} onClick={() => handleSort('recipients_name')}>Vastaanottaja</th>
        <th style={{ cursor: 'pointer' }} onClick={() => handleSort('recipients_address')}>Vastaanottajan osoite</th>
        <th>Kuljettaja</th>
        <th>Lisätiedot</th>
      </tr>
    </thead>
    <tbody>
      {shipments
        .filter(s => {
          const q = search.trim().toLowerCase();
          if (!q) return true;
          return (
            String(s.shipment_id).includes(q) ||
            (s.type || '').toLowerCase().includes(q) ||
            (s.recipients_name || '').toLowerCase().includes(q) ||
            (s.recipients_address || '').toLowerCase().includes(q) ||
            (s.created_by || '').toLowerCase().includes(q)
          );
        })
        .sort((a, b) => {
          if (!sortField) return 0;
          let va = a[sortField], vb = b[sortField];
          if (sortField === 'created_at') {
            va = new Date(va).getTime();
            vb = new Date(vb).getTime();
          }
          if (va === undefined || va === null) va = '';
          if (vb === undefined || vb === null) vb = '';
          if (typeof va === 'string') va = va.toLowerCase();
          if (typeof vb === 'string') vb = vb.toLowerCase();
          if (va < vb) return sortDir === 'asc' ? -1 : 1;
          if (va > vb) return sortDir === 'asc' ? 1 : -1;
          return 0;
        })
        .slice(0, 20)
        .map(s => (
          <tr key={s.shipment_id}>
            <td>{s.shipment_id}</td>
            <td>{s.type}</td>
            <td>{new Date(s.created_at).toLocaleString('fi-FI')}</td>
            <td>{s.created_by}</td>
            <td>{s.recipients_name || '-'}</td>
            <td>{s.recipients_address || '-'}</td>
            <td>
              {s.driver_first_name
                ? `${s.driver_first_name} ${s.driver_last_name}`
                : <span style={{ color: '#888' }}>-</span>}
              {s.vehicle_plate
                ? <> <br /><span style={{ color: '#ccc' }}>{s.vehicle_plate} {s.brand} {s.model}</span></>
                : null}
            </td>
            <td>
              <button onClick={() => showShipmentDetails(s.shipment_id)}>
                Näytä lisätiedot
              </button>
            </td>
          </tr>
        ))}
    </tbody>
  </table>
</div>

      {shipmentDetails && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            background: '#333',
            borderRadius: 12,
            padding: 32,
            minWidth: 400,
            maxWidth: 600,
            boxShadow: '0 4px 24px #000',
            color: '#fff',
            position: 'relative'
          }}>
            <h4>Lähetyksen {shipmentDetails.shipment_id} lisätiedot</h4>
            <div style={{ marginBottom: 16 }}>
              <strong>Tilaaja:</strong> {shipmentDetails.recipients_name || '-'}<br />
              <strong>Osoite:</strong> {shipmentDetails.recipients_address || '-'}<br />
              <strong>Puhelin:</strong> {shipmentDetails.recipients_phone_number || '-'}<br />
              <strong>Lähetysajankohta:</strong> {shipmentDetails.created_at ? new Date(shipmentDetails.created_at).toLocaleString('fi-FI') : '-'}
            </div>
            {/* Kuljettaja */}
            <div style={{ marginBottom: 16 }}>
              <strong>Kuljettaja:</strong>{' '}
              {shipmentDetails.first_name
                ? `${shipmentDetails.first_name} ${shipmentDetails.last_name}`
                : <span style={{ color: '#888' }}>Ei kuljettajaa</span>}
              {shipmentDetails.company && <span> – {shipmentDetails.company}</span>}
              {shipmentDetails.phone_number && <div>Puhelin: {shipmentDetails.phone_number}</div>}
              <br />
              <strong>Auto:</strong>{' '}
              {shipmentDetails.vehicle_plate
                ? `${shipmentDetails.vehicle_plate} ${shipmentDetails.brand || ''} ${shipmentDetails.model || ''}`
                : <span style={{ color: '#888' }}>Ei autoa</span>}
            </div>
            <table style={{ width: '100%', color: '#fff', borderCollapse: 'collapse', marginBottom: 16 }}>
              <thead>
                <tr>
                  <th>Tuotenimi</th>
                  <th>Tuotenro</th>
                  <th>Määrä</th>
                  <th>Paino (kg)</th>
                  <th>Tilavuus (m³)</th>
                  <th>Status ennen</th>
                  <th>Status jälkeen</th>
                </tr>
              </thead>
              <tbody>
                {shipmentDetails.items.map(item => {
                  const weight = (item.weight || 0) * item.quantity;
                  const volume = item.length_cm && item.width_cm && item.height_cm
                    ? ((item.length_cm * item.width_cm * item.height_cm) / 1000000) * item.quantity
                    : 0;
                  return (
                    <tr key={item.id}>
                      <td>{item.productname}</td>
                      <td>{item.productnumber}</td>
                      <td>{item.quantity}</td>
                      <td>{weight.toFixed(2)}</td>
                      <td>{volume.toFixed(3)}</td>
                      <td>{item.product_status_before}</td>
                      <td>{item.product_status_after}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {/* Kokonaispaino ja tilavuus */}
            {(() => {
              let totalWeight = 0, totalVolume = 0;
              shipmentDetails.items.forEach(item => {
                totalWeight += (item.weight || 0) * item.quantity;
                totalVolume += item.length_cm && item.width_cm && item.height_cm
                  ? ((item.length_cm * item.width_cm * item.height_cm) / 1000000) * item.quantity
                  : 0;
              });
              return (
                <div style={{ marginBottom: 16 }}>
                  <strong>Kokonaispaino:</strong> {totalWeight.toFixed(2)} kg<br />
                  <strong>Kokonaistilavuus:</strong> {totalVolume.toFixed(3)} m³
                </div>
              );
            })()}
            <button
              onClick={() => setShipmentDetails(null)}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'none',
                color: '#ffffffff',
                border: 'none',
                borderRadius: 4,
                padding: '6px 18px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              <h2>×</h2>
            </button>
          </div>
        </div>
      )}

      {deliveryRunDetails && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            background: '#333',
            borderRadius: 12,
            padding: 32,
            minWidth: 400,
            maxWidth: 700,
            boxShadow: '0 4px 24px #000',
            color: '#fff',
            position: 'relative'
          }}>
            <h4>Kuljetuksen {deliveryRunDetails.delivery_id} tiedot</h4>
            <div style={{ marginBottom: 16 }}>
              <strong>Kuljettaja:</strong> {deliveryRunDetails.driver_first_name
                ? `${deliveryRunDetails.driver_first_name} ${deliveryRunDetails.driver_last_name}`
                : <span style={{ color: '#888' }}>Ei kuljettajaa</span>}<br />
              <strong>Auto:</strong> {deliveryRunDetails.vehicle_plate
                ? `${deliveryRunDetails.vehicle_plate} ${deliveryRunDetails.brand || ''} ${deliveryRunDetails.model || ''}`
                : <span style={{ color: '#888' }}>Ei autoa</span>}<br />
              <strong>Luotu:</strong> {deliveryRunDetails.created_at ? new Date(deliveryRunDetails.created_at).toLocaleString('fi-FI') : '-'}<br />
              <strong>Muistiinpanot:</strong> {deliveryRunDetails.notes || '-'}
            </div>
            <h5>Toimitusosoitteet ja tuotteet</h5>
            {deliveryRunDetails.shipments && deliveryRunDetails.shipments.length > 0 ? (
              deliveryRunDetails.shipments.map(sh => (
                <div key={sh.shipment_id} style={{ marginBottom: 12, padding: 8, background: '#222', borderRadius: 6 }}>
                  <strong>Osoite:</strong> {sh.recipients_address}<br />
                  <strong>Vastaanottaja:</strong> {sh.recipients_name}<br />
                  <strong>Puhelin:</strong> {sh.recipients_phone_number}<br />
                  <strong>Muistiinpanot:</strong> {sh.notes || '-'}<br />
                  <strong>Status:</strong> {sh.status}<br />
                  <strong>Lähetyksen tuotteet:</strong>
                  
                  
                  <ul>
                    {sh.items && sh.items.map(item => (
                      <li key={item.id}>
                        {item.productname} ({item.productnumber}) x {item.quantity}
                      </li>
                    ))}
                  </ul>
                  {/* Status-päivitysnapit */}
                  <div style={{ marginTop: 8 }}>
                    {sh.status === 'in_delivery' && (
                      <>
                        <button
                          style={{ marginRight: 8, background: '#0a0', color: '#fff', borderRadius: 4, padding: '4px 12px', border: 'none' }}
                          onClick={() => updateShipmentStatus(sh.shipment_id, 'delivered')}
                        >
                          Merkitse toimitetuksi
                        </button>
                        <button
                          style={{ background: '#a00', color: '#fff', borderRadius: 4, padding: '4px 12px', border: 'none' }}
                          onClick={() => updateShipmentStatus(sh.shipment_id, 'failed')}
                        >
                          Peru lähetys
                        </button>
                      </>
                    )}
                    {sh.status === 'delivered' && (
                      <span style={{ color: '#0a0', fontWeight: 'bold' }}>Toimitettu</span>
                    )}
                    {sh.status === 'failed' && (
                      <span style={{ color: '#a00', fontWeight: 'bold' }}>Peruttu</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: '#888' }}>Ei lähetyksiä tässä kuljetuksessa.</div>
            )}
            <button
              onClick={() => setDeliveryRunDetails(null)}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'none',
                color: '#ffffffff',
                border: 'none',
                borderRadius: 4,
                padding: '6px 18px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              <h2>×</h2>
            </button>
          </div>
        </div>
      )}

      {confirmCancelShipmentId && (
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
      <h3>Peruuta lähetys?</h3>
      <p>
        Lähetyksen peruuttamista ei voi peruuttaa!<br />
        Lähetyksen tuotteet lisätään takaisin saapuneet tuotteet listaan.
      </p>
      <div style={{ display: 'flex', gap: 16, marginTop: 24 }}>
        <button
          style={{ background: '#a00', color: '#fff', borderRadius: 4, padding: '8px 18px', border: 'none', fontWeight: 'bold' }}
          onClick={async () => {
            // Tee peruutus
            await fetch(`http://localhost:3000/api/shipments/${confirmCancelShipmentId}/status`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ status: 'failed' })
            });
            setConfirmCancelShipmentId(null);
            showDeliveryRunDetails(deliveryRunDetails.delivery_id);
            fetch('http://localhost:3000/api/shipments', {
              headers: { Authorization: `Bearer ${token}` },
            })
              .then(res => res.json())
              .then(setShipments);
          }}
        >
          Peruuta tilaus
        </button>
        <button
          style={{ background: '#222', color: '#fff', borderRadius: 4, padding: '8px 18px', border: 'none', fontWeight: 'bold' }}
          onClick={() => setConfirmCancelShipmentId(null)}
        >
          Jatka
        </button>
      </div>
    </div>
  </div>
)}

      {onBack && (
        <button onClick={onBack} style={{ marginLeft: 16, padding: '10px 24px', borderRadius: 4 }}>
          Takaisin
        </button>
      )}
    </div>
  );
}

export default ShipmentsPage;