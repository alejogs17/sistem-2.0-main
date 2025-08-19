-- Migración: Crear tabla invoice_items
-- Basado en soenac/api-dian y especificaciones DIAN

CREATE TABLE IF NOT EXISTS invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES products(id),
    
    -- Detalles del ítem
    description TEXT NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit_measure VARCHAR(3) DEFAULT '94', -- Unidad de medida UBL
    unit_price DECIMAL(15,2) NOT NULL,
    
    -- Descuentos
    discount_pct DECIMAL(5,2) DEFAULT 0.00,
    discount_amount DECIMAL(15,2) DEFAULT 0.00,
    
    -- Impuestos
    tax_rate DECIMAL(5,2) DEFAULT 19.00,
    tax_amount DECIMAL(15,2) NOT NULL,
    
    -- Totales por línea
    line_subtotal DECIMAL(15,2) NOT NULL,
    line_tax DECIMAL(15,2) NOT NULL,
    line_total DECIMAL(15,2) NOT NULL,
    
    -- Información adicional
    product_code VARCHAR(50),
    notes TEXT,
    
    -- Auditoría
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_item_id ON invoice_items(item_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_product_code ON invoice_items(product_code);
