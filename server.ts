import express from 'express';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { runAgentPipeline } from './src/ai/agentPipeline';
import { optimizeLanes } from './src/ai/optimization';

const app = express();
const PORT = 3000;

app.use(express.json());

// Setup SQLite database
const db = new Database('logistics.db');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS shipments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    raw_origin TEXT,
    raw_destination TEXT,
    raw_truck_type TEXT,
    raw_weight REAL,
    raw_price REAL,
    raw_timestamp TEXT,
    carrier_name TEXT,
    clean_origin TEXT,
    clean_destination TEXT,
    clean_truck_type TEXT,
    is_duplicate BOOLEAN DEFAULT 0,
    is_anomaly BOOLEAN DEFAULT 0,
    anomaly_reason TEXT,
    lane_id TEXT,
    status TEXT DEFAULT 'raw'
  );

  CREATE TABLE IF NOT EXISTS metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    total_processed INTEGER DEFAULT 0,
    duplicates_removed INTEGER DEFAULT 0,
    anomalies_detected INTEGER DEFAULT 0,
    normalization_accuracy REAL DEFAULT 0,
    processing_time_ms INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS standard_cities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    city_name TEXT UNIQUE
  );
`);

// Seed standard cities if empty
const cityCount = db.prepare("SELECT COUNT(*) as count FROM standard_cities").get() as any;
if (cityCount.count === 0) {
  const insertCity = db.prepare("INSERT INTO standard_cities (city_name) VALUES (?)");
  const initialCities = [
    "MUMBAI", "BANGALORE", "DELHI", "CHENNAI", "KOLKATA", 
    "HYDERABAD", "PUNE", "AHMEDABAD", "JAIPUR", "SURAT",
    "LUCKNOW", "KANPUR", "NAGPUR", "INDORE", "THANE"
  ];
  const insertManyCities = db.transaction((cities: string[]) => {
    for (const c of cities) insertCity.run(c);
  });
  insertManyCities(initialCities);
}

// Setup multer for file uploads
const upload = multer({ dest: 'uploads/' });

// API Routes
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const results: any[] = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => {
      // Insert raw data into DB
      const insert = db.prepare(`
        INSERT INTO shipments (
          raw_origin, raw_destination, raw_truck_type, raw_weight, raw_price, raw_timestamp, carrier_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      const insertMany = db.transaction((shipments) => {
        for (const s of shipments) {
          insert.run(
            s.origin_city || s.origin || '',
            s.destination_city || s.destination || '',
            s.truck_type || '',
            parseFloat(s.shipment_weight || s.weight || 0),
            parseFloat(s.price || 0),
            s.timestamp || new Date().toISOString(),
            s.carrier_name || ''
          );
        }
      });

      insertMany(results);
      
      // Clean up uploaded file
      fs.unlinkSync(req.file!.path);
      
      res.json({ message: 'File uploaded successfully', count: results.length });
    });
});

// Agentic Workflow Pipeline
app.post('/api/process', async (req, res) => {
  try {
    // Agent 1: Data Validator (Fetch raw shipments)
    const rawShipments = db.prepare("SELECT * FROM shipments WHERE status = 'raw'").all() as any[];
    
    const result = await runAgentPipeline(db, rawShipments);
    res.json(result);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/dashboard', (req, res) => {
  try {
    const metrics = db.prepare("SELECT * FROM metrics ORDER BY id DESC LIMIT 1").get() || {
      total_processed: 0, duplicates_removed: 0, anomalies_detected: 0, normalization_accuracy: 0, processing_time_ms: 0
    };

    const lanes = optimizeLanes(db);

    const anomalies = db.prepare(`
      SELECT * FROM shipments WHERE is_anomaly = 1 ORDER BY id DESC LIMIT 10
    `).all();

    const recentShipments = db.prepare(`
      SELECT * FROM shipments WHERE status = 'processed' ORDER BY id DESC LIMIT 20
    `).all();

    res.json({ metrics, lanes, anomalies, recentShipments });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/cities', (req, res) => {
  try {
    const cities = db.prepare("SELECT city_name FROM standard_cities ORDER BY city_name ASC").all();
    res.json(cities.map((c: any) => c.city_name));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/cities', (req, res) => {
  try {
    const { city } = req.body;
    if (!city) return res.status(400).json({ error: 'City name required' });
    db.prepare("INSERT INTO standard_cities (city_name) VALUES (?)").run(city.trim().toUpperCase());
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: 'City might already exist or invalid input' });
  }
});

app.delete('/api/cities/:city', (req, res) => {
  try {
    const city = req.params.city;
    db.prepare("DELETE FROM standard_cities WHERE city_name = ?").run(city.toUpperCase());
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/export', (req, res) => {
  try {
    const shipments = db.prepare("SELECT * FROM shipments WHERE status = 'processed'").all();
    res.json(shipments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/reset', (req, res) => {
  db.exec("DROP TABLE IF EXISTS shipments; DROP TABLE IF EXISTS metrics;");
  db.exec(`
    CREATE TABLE IF NOT EXISTS shipments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      raw_origin TEXT,
      raw_destination TEXT,
      raw_truck_type TEXT,
      raw_weight REAL,
      raw_price REAL,
      raw_timestamp TEXT,
      carrier_name TEXT,
      clean_origin TEXT,
      clean_destination TEXT,
      clean_truck_type TEXT,
      is_duplicate BOOLEAN DEFAULT 0,
      is_anomaly BOOLEAN DEFAULT 0,
      anomaly_reason TEXT,
      lane_id TEXT,
      status TEXT DEFAULT 'raw'
    );

    CREATE TABLE IF NOT EXISTS metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      total_processed INTEGER DEFAULT 0,
      duplicates_removed INTEGER DEFAULT 0,
      anomalies_detected INTEGER DEFAULT 0,
      normalization_accuracy REAL DEFAULT 0,
      processing_time_ms INTEGER DEFAULT 0
    );
  `);
  res.json({ message: 'Database reset' });
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
