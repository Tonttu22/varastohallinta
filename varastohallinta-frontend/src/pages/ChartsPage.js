import { useState, useEffect } from 'react';
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  ArcElement,
  PointElement,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

Chart.register(CategoryScale, LinearScale, BarElement, LineElement, ArcElement, PointElement, Tooltip, Legend);

const today = new Date();
const pad = n => n.toString().padStart(2, '0');
const defaultEnd = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
const monthAgo = new Date(today);
monthAgo.setMonth(monthAgo.getMonth() - 1);
const defaultStart = `${monthAgo.getFullYear()}-${pad(monthAgo.getMonth() + 1)}-${pad(monthAgo.getDate())}`;

export default function ChartsPage({ onBack }) {
  const [shipmentData, setShipmentData] = useState([]);
  const [arrivalData, setArrivalData] = useState([]); // 🆕 uudet
  const [statusData, setStatusData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [topRange, setTopRange] = useState('month'); // 'day' | 'month' | '6months' | 'year'
  const [slotFill, setSlotFill] = useState([]);
  // Varastopaikkojen näkymä ja suodattimet
  const [slotView, setSlotView] = useState('grid'); // 'grid' | 'list'
  const [slotMetric, setSlotMetric] = useState('volume'); // 'volume' | 'weight'
  const [slotSearch, setSlotSearch] = useState('');
  const [slotMinPercent, setSlotMinPercent] = useState(0);
  const [slotSort, setSlotSort] = useState('percent_desc'); // 'percent_desc' | 'percent_asc' | 'code_asc'
  const [slotPage, setSlotPage] = useState(1);
  const [slotPageSize, setSlotPageSize] = useState(36);
  const [arrivedQty, setArrivedQty] = useState([]);
  const [shippedQty, setShippedQty] = useState([]);
  const [userShipments, setUserShipments] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userSort, setUserSort] = useState({ field: 'total_shipments', dir: 'desc' });
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]); // työntekijävalinta
  const [userTimeline, setUserTimeline] = useState([]); 


  const [groupBy, setGroupBy] = useState('month');
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [userMetric, setUserMetric] = useState('count');
  const [showMainDatasets, setShowMainDatasets] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [shipmentsRes, arrivalsRes, statusRes, slotRes] = await Promise.all([
          fetch(`http://localhost:3000/api/stats/summary?groupBy=${groupBy}${startDate ? `&start=${startDate}` : ''}${endDate ? `&end=${endDate}` : ''}`),
          fetch(`http://localhost:3000/api/stats/arrivals?groupBy=${groupBy}${startDate ? `&start=${startDate}` : ''}${endDate ? `&end=${endDate}` : ''}`),
          fetch(`http://localhost:3000/api/stats/product-status`),
          fetch(`http://localhost:3000/api/stats/slot-fill`)
        ]);

        setShipmentData(await shipmentsRes.json());
        setArrivalData(await arrivalsRes.json()); // 🆕 tallennetaan saapumiset
        setStatusData(await statusRes.json());
        setSlotFill(await slotRes.json());
      } catch (err) {
        console.error('Virhe datan haussa:', err);
      }
    };
    fetchAll();
  }, [groupBy, startDate, endDate]);

  // Top 5 tuotteet valitulta aikajänteeltä
  useEffect(() => {
    const computeStart = () => {
      const end = new Date(endDate);
      const d = new Date(end);
      if (topRange === 'day') {
        // 1 päivä: sama päivä
        return endDate;
      } else if (topRange === 'month') {
        d.setMonth(d.getMonth() - 1);
      } else if (topRange === '6months') {
        d.setMonth(d.getMonth() - 6);
      } else if (topRange === 'year') {
        d.setFullYear(d.getFullYear() - 1);
      }
      const pad = (n) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };
    const start = computeStart();
    const params = [`start=${start}`, `end=${endDate}`].join('&');
    fetch(`http://localhost:3000/api/stats/top-products-range?${params}`)
      .then(res => res.json())
      .then(rows => setTopProducts(Array.isArray(rows) ? rows : []))
      .catch(() => setTopProducts([]));
  }, [topRange, endDate]);

  useEffect(() => {
    const fetchQuantities = async () => {
      try {
        const [arrivedRes, shippedRes] = await Promise.all([
          fetch(`http://localhost:3000/api/stats/arrived-quantities?groupBy=${groupBy}${startDate ? `&start=${startDate}` : ''}${endDate ? `&end=${endDate}` : ''}&metric=${userMetric}`),
          fetch(`http://localhost:3000/api/stats/shipped-quantities?groupBy=${groupBy}${startDate ? `&start=${startDate}` : ''}${endDate ? `&end=${endDate}` : ''}&metric=${userMetric}`)
        ]);

        setArrivedQty(await arrivedRes.json());
        setShippedQty(await shippedRes.json());
      } catch (err) {
        console.error('Virhe määrien haussa:', err);
      }
    };
    fetchQuantities();
  }, [groupBy, startDate, endDate, userMetric]);


  useEffect(() => {
    const fetchUsers = async () => {
      const res = await fetch('http://localhost:3000/api/stats/shipments-by-user');
      const data = await res.json();
      setUsers(data);
    };
    fetchUsers();
  }, []);


  // Työntekijäkohtainen timeline
  useEffect(() => {
    const url = `http://localhost:3000/api/stats/user-shipments-timeline?groupBy=${groupBy}${
      startDate ? `&start=${startDate}` : ''
    }${endDate ? `&end=${endDate}` : ''}
    ${selectedUsers.length ? `&userIds=${selectedUsers.join(',')}` : ''}
&metric=${userMetric}`;

    fetch(url)
      .then(res => res.json())
      .then(setUserTimeline)
      .catch(() => setUserTimeline([]));
  }, [groupBy, startDate, endDate, selectedUsers, userMetric]);


  useEffect(() => {
    const fetchUserShipments = async () => {
      const params = [];
      if (startDate) params.push(`start=${startDate}`);
      if (endDate) params.push(`end=${endDate}`);
      if (userSearch) params.push(`search=${encodeURIComponent(userSearch)}`);
      const url = `http://localhost:3000/api/stats/user-shipments${params.length ? '?' + params.join('&') : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      setUserShipments(data);
    };
    fetchUserShipments();
  }, [startDate, endDate, userSearch]);


  const sortedUsers = [...userShipments].sort((a, b) => {
    const { field, dir } = userSort;
    const valA = a[field]?.toString().toLowerCase();
    const valB = b[field]?.toString().toLowerCase();
    if (valA < valB) return dir === 'asc' ? -1 : 1;
    if (valA > valB) return dir === 'asc' ? 1 : -1;
    return 0;
  });

  const toggleSort = (field) => {
    setUserSort((prev) => ({
      field,
      dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc'
    }));
  };


  const formatPeriod = (period) => {
    if (!period) return '';
    if (groupBy === 'day') {
      // Jos period on Date-objekti, muunna stringiksi
      if (typeof period === 'string' && period.length >= 10) return period.slice(0, 10);
      if (period instanceof Date) return period.toISOString().slice(0, 10);
      return period.toString();
    }
    if (groupBy === 'month') {
      if (typeof period === 'string' && period.length >= 7) return period.slice(0, 7);
      return period.toString();
    }
    if (groupBy === 'week') return period.toString();
    return period.toString();
  };

  // labels
  const allPeriods =
  groupBy === 'day'
    ? getDateRange(startDate, endDate)
    : groupBy === 'week'
      ? getWeekRange(startDate, endDate)
      : groupBy === 'month'
        ? getMonthRange(startDate, endDate)
        : Array.from(new Set([
            ...arrivedQty.map(i => formatPeriod(i.period)),
            ...shippedQty.map(i => formatPeriod(i.period)),
            ...userTimeline.map(i => formatPeriod(i.period))
          ])).sort();


  // datasets
  const userDatasets = selectedUsers.map(userId => {
    const user = users.find(u => u.userId === userId);
    return {
      label: user?.name || user?.user || `User ${userId}`,
      data: allPeriods.map(p => {
        const entry = userTimeline.find(i => formatPeriod(i.period) === p && i.created_by_user === userId);
        return entry ? Number(entry.value) : 0;
      }),
      borderColor: '#' + Math.floor(Math.random()*16777215).toString(16),
      borderWidth: 2,
      tension: 0.1,
      fill: false,
    };
  });

  const mainDatasets = [
    {
      label: userMetric === 'weight'
        ? 'Saapuneet tuotteet (kg)'
        : userMetric === 'volume'
          ? 'Saapuneet tuotteet (m³)'
          : userMetric === 'count'
            ? 'Saapuneet lähetykset (kpl)'
            : 'Saapuneet tuotteet (kpl)',
      data: allPeriods.map(p => arrivedQty.find(i => formatPeriod(i.period) === p)?.value || 0),
      borderColor: '#81c784',
      borderWidth: 2,
      tension: 0.1,
      fill: false,
    },
    {
      label: userMetric === 'weight'
        ? 'Lähetetyt tuotteet (kg)'
        : userMetric === 'volume'
          ? 'Lähetetyt tuotteet (m³)'
          : userMetric === 'count'
            ? 'Lähetykset (kpl)'
            : 'Lähetetyt tuotteet (kpl)',
      data: allPeriods.map(p => shippedQty.find(i => formatPeriod(i.period) === p)?.value || 0),
      borderColor: '#4fc3f7',
      borderWidth: 2,
      tension: 0.1,
      fill: false,
    }
  ];

  const combinedLineData = {
    labels: allPeriods,
    datasets: [
      ...(showMainDatasets ? mainDatasets : []),
      ...userDatasets
    ]
  };

  const barData = {
    labels: (topProducts || []).map(p => p.productname),
    datasets: [{
      label: `Top 5 tuotteet (${topRange})`,
      data: (topProducts || []).map(p => p.total_sent),
      backgroundColor: ['#4fc3f7', '#81c784', '#ffb74d', '#f44336', '#9575cd']
    }]
  };

  function getColor(percent) {
    if (percent < 50) return '#81c784';
    if (percent < 80) return '#ffb74d';
    return '#f44336';
  }

  // väriasteikko 0-100% (vihreä -> keltainen -> punainen)
  function getHeatColor(p) {
    const percent = Math.max(0, Math.min(100, Number(p || 0)));
    // 0-50: green -> yellow, 50-100: yellow -> red
    let r, g, b = 60;
    if (percent <= 50) {
      const t = percent / 50; // 0..1
      r = Math.round(129 + (255 - 129) * t); // 129->255
      g = Math.round(199 + (235 - 199) * t); // 199->235 (pidetään kirkkaana)
    } else {
      const t = (percent - 50) / 50;
      r = 255;
      g = Math.round(235 - (235 - 68) * t); // 235->68
    }
    return `rgb(${r}, ${g}, ${b})`;
  }

  function getTextColorForBg(bg) {
   
    try {
      const [r, g, b] = bg.match(/\d+/g).map(Number);
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      return luminance > 160 ? '#111' : '#fff';
    } catch {
      return '#fff';
    }
  }

  const lineOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: false }
    },
    scales: {
      x: {
        title: { display: true, text: 'Aikajakso' },
        grid: {
          color: '#333' 
        }
      },
      y: {
        title: {
          display: true,
          text:
            userMetric === 'weight'
              ? 'Paino (kg)'
              : userMetric === 'volume'
                ? 'Tilavuus (m³)'
                : userMetric === 'count'
                  ? 'Lähetykset (kpl)'
                  : 'Tuotteet (kpl)'
        },
        beginAtZero: true,
        grid: {
          color: '#333' 
        }
      }
    }
  };

    return (
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: 24 }}>
        <h2 style={{ marginBottom: 24 }}>Varaston tilastot</h2>

    
        <div style={{
          background: '#222',
          borderRadius: 18,
          padding: 30,
          marginBottom: 40,
          maxWidth: 900,
          marginLeft: 'auto',
          marginRight: 'auto'
        }}>
          {/* Lähetykset chart + controls */}
          <div style={{
            background: 'none',
            borderRadius: 0,
            padding: 0,
            marginBottom: 36
          }}>
            <h3 style={{ marginBottom: 18, color: '#fff' }}>Lähetykset</h3>
            <div style={{ background: '#111', borderRadius: 12, padding: 24, marginBottom: 18 }}>
              <Line data={combinedLineData} options={lineOptions} />
            </div>
            <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
              <label style={{ color: '#fff' }}>
                Näytä:
                <select value={groupBy} onChange={e => setGroupBy(e.target.value)} style={{ marginLeft: 8 }}>
                  <option value="day">Päivittäin</option>
                  <option value="week">Viikoittain</option>
                  <option value="month">Kuukausittain</option>
                </select>
              </label>
              <label style={{ color: '#fff' }}>
                Alkaen:
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ marginLeft: 8 }} />
              </label>
              <label style={{ color: '#fff' }}>
                Päättyen:
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ marginLeft: 8 }} />
              </label>
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={{ color: '#fff', marginRight: 24 }}>
                Valitse mittari kaaviolle:
                <select value={userMetric} onChange={e => setUserMetric(e.target.value)} style={{ marginLeft: 8 }}>
                  <option value="count">Lähetyksien määrä</option>
                  <option value="products">Tuotteiden määrä</option>
                  <option value="weight">Lähetyksien paino (kg)</option>
                  <option value="volume">Lähetyksien tilavuus (m³)</option>
                </select>
              </label>
              <label style={{ color: '#fff' }}>
                <input
                  type="checkbox"
                  checked={showMainDatasets}
                  onChange={e => setShowMainDatasets(e.target.checked)}
                  style={{ marginRight: 8 }}
                />
                Näytä kokonaismäärät (esim. saapuneet/lähetetyt tuotteet)
              </label>
            </div>

          </div>

          {/* Työntekijälista */}
          <div style={{
            background: 'none',
            borderRadius: 0,
            padding: 0
          }}>
            <h4 style={{ marginBottom: 12, color: '#fff' }}>Työntekijä lista</h4>
            <div style={{ display: 'flex', gap: 12, margin: '16px 0' }}>
              <input
                type="text"
                placeholder="Hae käyttäjää..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                style={{ padding: 6, flex: 1, borderRadius: 6, border: '1px solid #444', background: '#181818', color: '#fff' }}
              />
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#181818', borderRadius: 8, overflow: 'hidden' }}>
              <thead>
                <tr style={{ background: '#222', color: '#fff' }}>
                  <th onClick={() => toggleSort('name')} style={{ cursor: 'pointer', padding: 8 }}>Nimi {userSort.field === 'name' ? (userSort.dir === 'asc' ? '▲' : '▼') : ''}</th>
                  <th onClick={() => toggleSort('email')} style={{ cursor: 'pointer', padding: 8 }}>Sähköposti {userSort.field === 'email' ? (userSort.dir === 'asc' ? '▲' : '▼') : ''}</th>
                  <th onClick={() => toggleSort('role')} style={{ cursor: 'pointer', padding: 8 }}>Rooli {userSort.field === 'role' ? (userSort.dir === 'asc' ? '▲' : '▼') : ''}</th>
                  <th onClick={() => toggleSort('total_shipments')} style={{ cursor: 'pointer', padding: 8 }}>Lähetyksiä {userSort.field === 'total_shipments' ? (userSort.dir === 'asc' ? '▲' : '▼') : ''}</th>
                  <th style={{ padding: 8 }}>Näytä kaaviossa</th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((user, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #222', color: '#fff' }}>
                    <td style={{ padding: 8 }}>{user.name}</td>
                    <td style={{ padding: 8 }}>{user.email}</td>
                    <td style={{ padding: 8 }}>{user.role}</td>
                    <td style={{ padding: 8, fontWeight: 'bold' }}>{user.total_shipments}</td>
                    <td style={{ padding: 8, textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.userId)}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedUsers([...selectedUsers, user.userId]);
                          } else {
                            setSelectedUsers(selectedUsers.filter(id => id !== user.userId));
                          }
                        }}
                      />
                    </td>
                  </tr>
                ))}
                {sortedUsers.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: 20, color: '#fff' }}>Ei tuloksia</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Top 5 tuotteet valitulta aikajänteeltä */}
          <div style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <h4 style={{ margin: 0, color: '#fff' }}>Top 5 tuotteet</h4>
              <label style={{ color: '#fff' }}>
                Aikajänne:
                <select value={topRange} onChange={e => setTopRange(e.target.value)} style={{ marginLeft: 8 }}>
                  <option value="day">Päivä</option>
                  <option value="month">Kuukausi</option>
                  <option value="6months">6 kuukautta</option>
                  <option value="year">Vuosi</option>
                </select>
              </label>
              <div style={{ color: '#aaa', fontSize: 12 }}>(päättyen: {endDate})</div>
            </div>
            <div style={{ background: '#111', borderRadius: 12, padding: 16 }}>
              <Bar data={barData} />
            </div>
          </div>
        </div>

        
        <div style={{ marginTop: 24 }}>
          <h3>Varastopaikkojen täyttöasteet</h3>

          {/* Kontrollit */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginTop: 8 }}>
            <label>
              Näkymä:
              <select value={slotView} onChange={(e) => { setSlotPage(1); setSlotView(e.target.value); }} style={{ marginLeft: 8 }}>
                <option value="grid">Tiivis ruudukko</option>
                <option value="list">Lista</option>
              </select>
            </label>
            <label>
              Mittari:
              <select value={slotMetric} onChange={(e) => { setSlotPage(1); setSlotMetric(e.target.value); }} style={{ marginLeft: 8 }}>
                <option value="volume">Tilavuus %</option>
                <option value="weight">Paino %</option>
              </select>
            </label>
            <label>
              Hae koodilla:
              <input type="text" value={slotSearch} onChange={(e) => { setSlotPage(1); setSlotSearch(e.target.value); }} placeholder="esim. A-01" style={{ marginLeft: 8 }} />
            </label>
            <label>
              Min %:
              <input type="number" min={0} max={100} value={slotMinPercent} onChange={(e) => { setSlotPage(1); setSlotMinPercent(Number(e.target.value)); }} style={{ marginLeft: 8, width: 80 }} />
            </label>
            <label>
              Järjestys:
              <select value={slotSort} onChange={(e) => { setSlotPage(1); setSlotSort(e.target.value); }} style={{ marginLeft: 8 }}>
                <option value="percent_desc">Täyttöaste ↓</option>
                <option value="percent_asc">Täyttöaste ↑</option>
                <option value="code_asc">Koodi A–Ö</option>
              </select>
            </label>
            <label>
              Per sivu:
              <select value={slotPageSize} onChange={(e) => { setSlotPage(1); setSlotPageSize(Number(e.target.value)); }} style={{ marginLeft: 8 }}>
                <option value={24}>24</option>
                <option value={36}>36</option>
                <option value={60}>60</option>
                <option value={120}>120</option>
              </select>
            </label>
          </div>

          {(() => {
            const getPercent = (s) => Number((slotMetric === 'volume' ? s.volume_fill_percent : s.weight_fill_percent) || 0);
            const filtered = (slotFill || [])
              .filter(s => (s.slot_code || '').toLowerCase().includes(slotSearch.toLowerCase()))
              .filter(s => getPercent(s) >= slotMinPercent);
            const sorted = filtered.sort((a, b) => {
              if (slotSort === 'code_asc') return (a.slot_code || '').localeCompare(b.slot_code || '');
              const pa = getPercent(a), pb = getPercent(b);
              return slotSort === 'percent_asc' ? pa - pb : pb - pa;
            });
            const total = sorted.length;
            const maxPage = Math.max(1, Math.ceil(total / slotPageSize));
            const safePage = Math.min(slotPage, maxPage);
            const start = (safePage - 1) * slotPageSize;
            const pageItems = sorted.slice(start, start + slotPageSize);

            return (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ fontSize: 13, opacity: 0.8 }}>{total} paikkoa • Sivu {safePage} / {maxPage}</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button disabled={safePage <= 1} onClick={() => setSlotPage(p => Math.max(1, p - 1))}>Edellinen</button>
                    <button disabled={safePage >= maxPage} onClick={() => setSlotPage(p => Math.min(maxPage, p + 1))}>Seuraava</button>
                  </div>
                </div>

                {slotView === 'grid' ? (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
                    gap: 10
                  }}>
                    {pageItems.map((slot, i) => {
                      const percent = getPercent(slot);
                      const bg = getHeatColor(percent);
                      const fg = getTextColorForBg(bg);
                      return (
                        <div key={i} title={`${slot.slot_code}\n${percent.toFixed(1)}% ${slotMetric === 'volume' ? '(tilavuus)' : '(paino)'}\nKlikkaa nähdäksesi lisätiedot`}
                             style={{
                               background: bg,
                               color: fg,
                               borderRadius: 10,
                               padding: 10,
                               minHeight: 74,
                               display: 'flex',
                               flexDirection: 'column',
                               justifyContent: 'space-between',
                               boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.15)'
                             }}
                        >
                          <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{slot.slot_code}</div>
                          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                            <div style={{ fontSize: 22, fontWeight: 800 }}>{percent.toFixed(0)}%</div>
                            <div style={{ fontSize: 11, opacity: 0.9 }}>{slotMetric === 'volume' ? 'm³' : 'kg'}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div>
                    {pageItems.map((slot, i) => (
                      <div key={i} style={{ marginBottom: 16, background: '#222', padding: 12, borderRadius: 8 }}>
                        <div style={{ fontWeight: 'bold', marginBottom: 6 }}>{slot.slot_code}</div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                          <span>Tilavuus</span>
                          <span>{Number(slot.volume_fill_percent || 0).toFixed(1)}% ({Number(slot.used_volume_m3 || 0).toFixed(2)} / {Number(slot.max_volume_m3 || 0).toFixed(2)} m³)</span>
                        </div>
                        <div style={{ background: '#eee', borderRadius: 8, height: 12, marginBottom: 8 }}>
                          <div style={{
                            width: `${slot.volume_fill_percent}%`,
                            background: getColor(slot.volume_fill_percent),
                            height: '100%',
                            borderRadius: 8,
                            transition: 'width 0.4s ease'
                          }}></div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                          <span>Paino</span>
                          <span>{Number(slot.weight_fill_percent || 0).toFixed(1)}% ({Number(slot.used_weight || 0).toFixed(1)} / {Number(slot.max_weight || 0).toFixed(1)} kg)</span>
                        </div>
                        <div style={{ background: '#eee', borderRadius: 8, height: 12 }}>
                          <div style={{
                            width: `${slot.weight_fill_percent}%`,
                            background: getColor(slot.weight_fill_percent),
                            height: '100%',
                            borderRadius: 8,
                            transition: 'width 0.4s ease'
                          }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                  <div style={{ fontSize: 13, opacity: 0.8 }}>{total} paikkoa • Sivu {safePage} / {maxPage}</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button disabled={safePage <= 1} onClick={() => setSlotPage(p => Math.max(1, p - 1))}>Edellinen</button>
                    <button disabled={safePage >= maxPage} onClick={() => setSlotPage(p => Math.min(maxPage, p + 1))}>Seuraava</button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        <button onClick={onBack} style={{ marginLeft: 16, padding: '10px 24px', borderRadius: 4 }}>
          Takaisin
        </button>
      </div>
    );
  }

  function getDateRange(start, end) {
    const arr = [];
    let dt = new Date(start);
    const endDt = new Date(end);
    while (dt <= endDt) {
      arr.push(dt.toISOString().slice(0, 10));
      dt.setDate(dt.getDate() + 1);
    }
    return arr;
  }

  function getWeekRange(start, end) {
    const arr = [];
    let dt = new Date(start);
    const endDt = new Date(end);
    while (dt <= endDt) {
      
      const year = dt.getFullYear();
      const week = getISOWeek(dt);
      arr.push(`${year}${week.toString().padStart(2, '0')}`);
      dt.setDate(dt.getDate() + 7);
    }
    return Array.from(new Set(arr));
  }

  
  function getISOWeek(date) {
    const tmp = new Date(date.valueOf());
    const dayNr = (date.getDay() + 6) % 7;
    tmp.setDate(tmp.getDate() - dayNr + 3);
    const firstThursday = tmp.valueOf();
    tmp.setMonth(0, 1);
    if (tmp.getDay() !== 4) {
      tmp.setMonth(0, 1 + ((4 - tmp.getDay()) + 7) % 7);
    }
    return 1 + Math.ceil((firstThursday - tmp) / 604800000);
  }

  function getMonthRange(start, end) {
    const arr = [];
    let dt = new Date(start);
    const endDt = new Date(end);
    dt.setDate(1); 
    while (dt <= endDt) {
      arr.push(dt.toISOString().slice(0, 7));
      dt.setMonth(dt.getMonth() + 1);
    }
    return arr;
  }
