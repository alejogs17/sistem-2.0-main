-- Migración: Crear tabla organizations
-- Basado en soenac/api-dian y especificaciones DIAN

CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    tax_id VARCHAR(20) NOT NULL UNIQUE,
    software_id VARCHAR(50),
    software_pin VARCHAR(50),
    certificate_p12_url TEXT,
    certificate_password VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country_code VARCHAR(2) DEFAULT 'CO',
    postal_code VARCHAR(10),
    email VARCHAR(255),
    phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar organización por defecto
INSERT INTO organizations (name, tax_id, software_id, software_pin, address, city, state, email) 
VALUES (
    'Mi Empresa SAS',
    '900123456-7',
    'SOFTWARE_ID_DEFAULT',
    'SOFTWARE_PIN_DEFAULT',
    'Calle 123 # 45-67',
    'Bogotá',
    'Cundinamarca',
    'facturacion@miempresa.com'
) ON CONFLICT (tax_id) DO NOTHING;

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_organizations_tax_id ON organizations(tax_id);
CREATE INDEX IF NOT EXISTS idx_organizations_software_id ON organizations(software_id);
