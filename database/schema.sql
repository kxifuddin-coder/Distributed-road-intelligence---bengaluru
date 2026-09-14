-- Database Schema for Pothole Prevention System (DRIS)

-- Enable PostGIS if you want advanced spatial features (optional but good for future)
-- CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Create custom enum for pothole tracking status
CREATE TYPE pothole_status AS ENUM ('Active', 'Reported', 'Verifying_Fix', 'Resolved');

-- 2. Create the main potholes table
CREATE TABLE IF NOT EXISTS potholes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    road_name VARCHAR(255) DEFAULT 'Unknown Road',
    confidence DOUBLE PRECISION NOT NULL,
    verified_count INTEGER DEFAULT 1,
    status pothole_status DEFAULT 'Active',
    fix_confidence INTEGER DEFAULT 0,
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    reported_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    has_image BOOLEAN DEFAULT FALSE,
    image_base64 TEXT
);

-- 3. Create indexes for fast spatial queries
CREATE INDEX idx_potholes_spatial ON potholes (latitude, longitude);
CREATE INDEX idx_potholes_status ON potholes (status);
