# Lakshmi Lane Intelligence Builder Agent

An AI-powered logistics lane intelligence system that cleans messy shipment data, deduplicates entries, detects anomalies, and builds optimized logistics lanes.

## Project Architecture

The system is built as a full-stack application using React/Vite for the frontend and Express/Node.js with SQLite for the backend. It uses a Multi-Agent architecture to process raw logistics data sequentially.

### Multi-Agent Concept

The core of the system is an Agentic Workflow Pipeline (`src/ai/agentPipeline.ts`) that orchestrates 5 distinct AI agents:

1. **Agent 1: Data Validator**
   - Ingests raw CSV data and validates the schema.
   - Stores the raw data in the SQLite database for processing.

2. **Agent 2: Normalization Agent**
   - Uses the **Gemini API** to intelligently map messy city names (e.g., "Bombay", "MUMBAI") and truck types (e.g., "32 ft truck", "32-feet") to standardized formats (e.g., "MUMBAI", "32FT").
   - Employs **Fuzzy String Matching** (`fuzzball`) as a fallback and strict standardizer to ensure the final output adheres to a predefined list of standard major cities.

3. **Agent 3: Deduplication Agent**
   - Detects duplicate shipments using a combination of exact and fuzzy matching.
   - **How it works:** It checks if a shipment has the exact same origin-destination lane, truck type, and a similar price (within a small threshold) as an already processed shipment. If these match, it uses `fuzzball` to calculate a similarity score between the carrier names. If the similarity is > 80%, it flags the shipment as a duplicate.

4. **Agent 4: Lane Builder Agent**
   - Groups the cleaned and standardized shipments into logical Origin-Destination lanes (e.g., `MUMBAI-BANGALORE`).
   - Calculates key metrics per lane, such as total shipment volume, average freight cost, and determines the best carrier based on historical pricing.

5. **Agent 5: Quality Monitor (Anomaly Detection) Agent**
   - Flags unusual entries using rule-based and statistical thresholding.
   - **Statistical Z-Score Approach:** It calculates the moving average and standard deviation of prices for each specific lane. If a new shipment's price deviates by more than 2 standard deviations (Z-score > 2) from the lane's historical mean, it is flagged as an anomaly. It also catches basic errors like negative prices or zero weight.

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables by creating a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
   *Note: Add your `GEMINI_API_KEY` to the `.env` file to enable the AI Normalization Agent.*

### Running the Application
To start the development server (which runs both the Express backend and Vite frontend):
```bash
npm run dev
```
The application will be available at `http://localhost:3000`.

## Features
- **CSV Upload:** Easily ingest messy shipment logs.
- **Real-time AI Processing:** Watch the multi-agent pipeline clean and organize data in real-time.
- **Production-Grade Dashboard:** View data quality metrics, lane analytics, and anomaly alerts.
- **Dynamic Metrics:** The system calculates real normalization accuracy by comparing the number of AI-corrected strings versus the number of strings that remained unchanged.
