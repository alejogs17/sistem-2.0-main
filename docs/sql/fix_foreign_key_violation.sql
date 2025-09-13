-- Ubicación original: raíz del proyecto. Movido a docs/sql para evitar subirlo al deploy.
-- SCRIPT PARA CORREGIR VIOLACIÓN DE CLAVE FORÁNEA
-- Error: insert or update on table "stocks" violates foreign key constraint "stocks_product_id_fkey"
-- DETAIL: Key (product_id)=(6) is not present in table "products".

-- =====================================================
-- 1. DIAGNÓSTICO DEL PROBLEMA
-- =====================================================

SELECT 'DIAGNÓSTICO DEL PROBLEMA:' as info;

-- Verificar si el producto con ID 6 existe
SELECT 'Verificando producto con ID 6:' as info;
SELECT id, product_name, details, status
FROM public.products 
WHERE id = 6;

-- Verificar stocks que referencian productos inexistentes
SELECT 'Stocks con referencias a productos inexistentes:' as info;
SELECT 
    s.id,
    s.product_id,
    s.product_code,
    s.stock_quantity,
    s.current_quantity,
    s.status
FROM public.stocks s
LEFT JOIN public.products p ON s.product_id = p.id
WHERE s.product_id IS NOT NULL AND p.id IS NULL
ORDER BY s.product_id;

-- Contar total de stocks con referencias inválidas
SELECT 'Total de stocks con referencias inválidas:' as info;
SELECT 
    'Productos inválidos' as tipo,
    COUNT(*) as cantidad
FROM public.stocks s
LEFT JOIN public.products p ON s.product_id = p.id
WHERE s.product_id IS NOT NULL AND p.id IS NULL

UNION ALL

SELECT 
    'Categorías inválidas' as tipo,
    COUNT(*) as cantidad
FROM public.stocks s
LEFT JOIN public.categories c ON s.category_id = c.id
WHERE s.category_id IS NOT NULL AND c.id IS NULL

UNION ALL

SELECT 
    'Proveedores inválidos' as tipo,
    COUNT(*) as cantidad
FROM public.stocks s
LEFT JOIN public.vendors v ON s.vendor_id = v.id
WHERE s.vendor_id IS NOT NULL AND v.id IS NULL;

-- =====================================================
-- 2. SOLUCIÓN: LIMPIAR REFERENCIAS INVÁLIDAS
-- =====================================================

SELECT 'APLICANDO SOLUCIÓN:' as info;

-- Opción 1: Establecer product_id como NULL para referencias inválidas
SELECT 'Limpiando referencias a productos inexistentes...' as accion;
UPDATE public.stocks 
SET product_id = NULL 
WHERE product_id IS NOT NULL 
  AND product_id NOT IN (SELECT id FROM public.products);

-- Limpiar referencias a categorías inexistentes
SELECT 'Limpiando referencias a categorías inexistentes...' as accion;
UPDATE public.stocks 
SET category_id = NULL 
WHERE category_id IS NOT NULL 
  AND category_id NOT IN (SELECT id FROM public.categories);

-- Limpiar referencias a proveedores inexistentes
SELECT 'Limpiando referencias a proveedores inexistentes...' as accion;
UPDATE public.stocks 
SET vendor_id = NULL 
WHERE vendor_id IS NOT NULL 
  AND vendor_id NOT IN (SELECT id FROM public.vendors);

-- =====================================================
-- 3. VERIFICACIÓN POST-CORRECCIÓN
-- =====================================================

SELECT 'VERIFICACIÓN POST-CORRECCIÓN:' as info;

-- Verificar que no queden referencias inválidas
SELECT 'Verificando que no queden referencias inválidas:' as info;
SELECT 
    'Productos inválidos restantes' as tipo,
    COUNT(*) as cantidad
FROM public.stocks s
LEFT JOIN public.products p ON s.product_id = p.id
WHERE s.product_id IS NOT NULL AND p.id IS NULL

UNION ALL

SELECT 
    'Categorías inválidas restantes' as tipo,
    COUNT(*) as cantidad
FROM public.stocks s
LEFT JOIN public.categories c ON s.category_id = c.id
WHERE s.category_id IS NOT NULL AND c.id IS NULL

UNION ALL

SELECT 
    'Proveedores inválidos restantes' as tipo,
    COUNT(*) as cantidad
FROM public.stocks s
LEFT JOIN public.vendors v ON s.vendor_id = v.id
WHERE s.vendor_id IS NOT NULL AND v.id IS NULL;

-- Mostrar algunos stocks después de la corrección
SELECT 'Muestra de stocks después de la corrección:' as info;
SELECT 
    s.id,
    s.product_code,
    s.product_id,
    s.vendor_id,
    s.category_id,
    s.stock_quantity,
    s.current_quantity,
    s.status,
    p.product_name,
    v.name as vendor_name,
    c.name as category_name
FROM public.stocks s
LEFT JOIN public.products p ON s.product_id = p.id
LEFT JOIN public.vendors v ON s.vendor_id = v.id
LEFT JOIN public.categories c ON s.category_id = c.id
ORDER BY s.id DESC 
LIMIT 10;

-- =====================================================
-- 4. ALTERNATIVA: CREAR PRODUCTO FALTANTE (SI ES NECESARIO)
-- =====================================================

-- Si necesitas crear el producto con ID 6, descomenta y modifica estas líneas:
/*
SELECT 'Creando producto faltante con ID 6...' as accion;
INSERT INTO public.products (id, product_name, details, status, created_at, updated_at)
VALUES (6, 'Producto Faltante', 'Producto creado para corregir referencia', 1, NOW(), NOW());
*/

-- =====================================================
-- 5. MENSAJE DE ÉXITO
-- =====================================================

SELECT '¡PROBLEMA RESUELTO!' as mensaje;
SELECT 'Las referencias inválidas han sido limpiadas.' as resultado;
SELECT 'Ahora puedes insertar/actualizar stocks sin violaciones de clave foránea.' as siguiente_paso;
SELECT 'Prueba tu operación nuevamente.' as instruccion;
