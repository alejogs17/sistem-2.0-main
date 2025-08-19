-- Migración: Crear tabla invoices
-- Basado en soenac/api-dian y especificaciones DIAN

CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    number VARCHAR(50) NOT NULL,
    series VARCHAR(10) NOT NULL,
    issue_date DATE NOT NULL,
    issue_time TIME NOT NULL,
    currency VARCHAR(3) DEFAULT 'COP',
    exchange_rate DECIMAL(10,4) DEFAULT 1.0000,
    operation_type VARCHAR(2) DEFAULT '10',
    
    -- Totales
    line_extension_amount DECIMAL(15,2) NOT NULL,
    tax_exclusive_amount DECIMAL(15,2) NOT NULL,
    tax_inclusive_amount DECIMAL(15,2) NOT NULL,
    allowance_total_amount DECIMAL(15,2) DEFAULT 0.00,
    charge_total_amount DECIMAL(15,2) DEFAULT 0.00,
    payable_amount DECIMAL(15,2) NOT NULL,
    
    -- Impuestos
    tax_amount DECIMAL(15,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 19.00,
    
    -- Estados DIAN
    status VARCHAR(20) DEFAULT 'DRAFT',
    cufe VARCHAR(255),
    qr_url TEXT,
    dian_uuid VARCHAR(255),
    xml_url TEXT,
    pdf_url TEXT,
    
    -- Relaciones
    customer_id INTEGER REFERENCES customers(id),
    organization_id INTEGER REFERENCES organizations(id) DEFAULT 1,
    
    -- Notas
    notes TEXT[],
    
    -- Auditoría
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_cufe ON invoices(cufe);
CREATE INDEX IF NOT EXISTS idx_invoices_dian_uuid ON invoices(dian_uuid);
CREATE INDEX IF NOT EXISTS idx_invoices_number_series ON invoices(number, series);

-- Crear constraint único para número y serie
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_unique_number_series ON invoices(number, series);
