const express = require('express');
const app = express();
const userRoutes = require('./routes/users');
const productsRoutes = require('./routes/products');
const warehouseRoutes = require('./routes/warehouseslots');
const shipmentRoutes = require('./routes/shipments');
const registerRoutes = require('./routes/register');
const productslotRoutes = require('./routes/product_slots');
const statsRoutes = require('./routes/stats');
const cors = require('cors');
const driversRoutes = require('./routes/drivers');
const deliveryRunRoutes = require('./routes/delivery_runs');
const vehiclesRoutes = require('./routes/vehicles');
app.use(cors({
  origin: 'http://localhost:3005', // Salli vain frontin osoite
  credentials: true
}));

app.use(express.json());

//middleware for parsing application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

app.use('/api/stats', statsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/warehouseslots', warehouseRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/register', registerRoutes);
app.use('/api/product_slots', productslotRoutes);
app.use('/api/drivers', driversRoutes);
app.use('/api/delivery-runs', deliveryRunRoutes);
app.use('/api/vehicles', vehiclesRoutes);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Serveri käynnissä portissa ${PORT}`);
});