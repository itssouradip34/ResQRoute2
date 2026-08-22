-- ============================================================================
-- ResQRoute-A (v2.0) Supabase / PostgreSQL Database Migration
-- Roadside Emergency & Rescue Navigator
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number TEXT UNIQUE,
    email TEXT UNIQUE,
    full_name TEXT,
    default_region TEXT DEFAULT 'IN-DL',
    sensor_sensitivity TEXT DEFAULT 'medium' CHECK (sensor_sensitivity IN ('low', 'medium', 'high')),
    countdown_seconds INT DEFAULT 20 CHECK (countdown_seconds BETWEEN 10 AND 60),
    is_guest BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TRUSTED CONTACTS TABLE
CREATE TABLE IF NOT EXISTS public.trusted_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    relation TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. EMERGENCY SERVICES DIRECTORY
CREATE TABLE IF NOT EXISTS public.emergency_services (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('hospital', 'police', 'ambulance', 'towing', 'puncture_repair', 'mechanic', 'fuel', 'other')),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    phone_number TEXT NOT NULL,
    address TEXT NOT NULL,
    region_code TEXT NOT NULL, -- e.g. 'IN-DL', 'IN-KA', 'IN-MH'
    source TEXT NOT NULL,
    is_verified BOOLEAN DEFAULT true,
    rating DOUBLE PRECISION DEFAULT 4.5 CHECK (rating BETWEEN 1 AND 5),
    open_24x7 BOOLEAN DEFAULT true,
    emergency_level TEXT,
    specialty TEXT,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- 4. INCIDENT REPORTS TABLE
CREATE TABLE IF NOT EXISTS public.incident_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('manual', 'auto_sensor')),
    situation_type TEXT NOT NULL CHECK (situation_type IN ('accident', 'breakdown', 'medical', 'flat_tyre', 'fuel_out', 'other')),
    urgency_level TEXT NOT NULL CHECK (urgency_level IN ('critical', 'high', 'moderate')),
    confidence_score DOUBLE PRECISION NOT NULL CHECK (confidence_score BETWEEN 0 AND 1),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    address_text TEXT,
    description_text TEXT,
    status TEXT NOT NULL DEFAULT 'detected' CHECK (status IN ('detected', 'confirming', 'cancelled', 'active', 'classified', 'dispatched', 'tracking', 'resolved')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- 5. SENSOR SNAPSHOTS TABLE (Only saved on detected event, no long-term continuous stream)
CREATE TABLE IF NOT EXISTS public.sensor_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID REFERENCES public.incident_reports(id) ON DELETE CASCADE,
    accel_peak DOUBLE PRECISION NOT NULL,
    gyro_peak DOUBLE PRECISION NOT NULL,
    speed_before DOUBLE PRECISION NOT NULL,
    speed_after DOUBLE PRECISION NOT NULL,
    raw_anomaly_score DOUBLE PRECISION NOT NULL,
    threshold_used DOUBLE PRECISION NOT NULL,
    captured_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TIMELINE EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.timeline_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID REFERENCES public.incident_reports(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 7. INCIDENT SERVICE MATCHES TABLE
CREATE TABLE IF NOT EXISTS public.incident_service_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID REFERENCES public.incident_reports(id) ON DELETE CASCADE,
    service_id TEXT REFERENCES public.emergency_services(id) ON DELETE CASCADE,
    rank_score DOUBLE PRECISION NOT NULL,
    distance_km DOUBLE PRECISION NOT NULL,
    contacted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. NOTIFICATION LOG TABLE
CREATE TABLE IF NOT EXISTS public.notification_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID REFERENCES public.incident_reports(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.trusted_contacts(id) ON DELETE SET NULL,
    channel TEXT NOT NULL CHECK (channel IN ('sms', 'push')),
    status TEXT NOT NULL DEFAULT 'sent',
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. OFFLINE CACHE BUNDLES TABLE
CREATE TABLE IF NOT EXISTS public.offline_cache_bundles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    region_code TEXT UNIQUE NOT NULL,
    bundle_data JSONB NOT NULL,
    version INT DEFAULT 1,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. FEEDBACK TABLE
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID REFERENCES public.incident_reports(id) ON DELETE SET NULL,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    comments TEXT,
    synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lightning fast location & region queries
CREATE INDEX IF NOT EXISTS idx_services_region ON public.emergency_services(region_code);
CREATE INDEX IF NOT EXISTS idx_services_category ON public.emergency_services(category);
CREATE INDEX IF NOT EXISTS idx_services_coords ON public.emergency_services(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_incidents_user ON public.incident_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON public.incident_reports(status);
CREATE INDEX IF NOT EXISTS idx_timeline_incident ON public.timeline_events(incident_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offline_cache_bundles ENABLE ROW LEVEL SECURITY;

-- Public read policies for emergency services & offline bundles
CREATE POLICY "Allow public read of emergency services"
    ON public.emergency_services FOR SELECT
    USING (true);

CREATE POLICY "Allow public read of offline cache bundles"
    ON public.offline_cache_bundles FOR SELECT
    USING (true);

-- User-scoped policies
CREATE POLICY "Users can manage their own profile"
    ON public.users FOR ALL
    USING (auth.uid() = id);

CREATE POLICY "Users can manage their own trusted contacts"
    ON public.trusted_contacts FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view and create their own incidents"
    ON public.incident_reports FOR ALL
    USING (true); -- Allow anonymous & guest incident creation

CREATE POLICY "Allow access to sensor snapshots for associated incidents"
    ON public.sensor_snapshots FOR ALL
    USING (true);

CREATE POLICY "Allow timeline tracking"
    ON public.timeline_events FOR ALL
    USING (true);
