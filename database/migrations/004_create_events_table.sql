-- Migración: Crear tabla events
-- Basado en soenac/api-dian y especificaciones DIAN

CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    payload_json JSONB,
    message TEXT,
    status VARCHAR(20) DEFAULT 'PENDING',
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_events_invoice_id ON events(invoice_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_next_retry_at ON events(next_retry_at);

-- Crear tipos de eventos comunes
CREATE TYPE event_type AS ENUM (
    'INVOICE_CREATED',
    'INVOICE_SIGNED',
    'INVOICE_SENT_TO_DIAN',
    'DIAN_RESPONSE_RECEIVED',
    'INVOICE_ACCEPTED',
    'INVOICE_REJECTED',
    'PDF_GENERATED',
    'EMAIL_SENT',
    'WEBHOOK_SENT',
    'ERROR_OCCURRED'
);
