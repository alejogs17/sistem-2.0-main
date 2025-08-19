# 🏢 Sistema de Gestión 2.0

Sistema completo de gestión de inventarios con facturación electrónica DIAN integrada.

## 🚀 Características Principales

### 📦 Gestión de Inventarios
- **Productos y Categorías**: Gestión completa de catálogo
- **Stock y Proveedores**: Control de inventario y proveedores
- **Ventas y Clientes**: Sistema de ventas con clientes
- **Reportes**: Reportes detallados del negocio

### 🧾 Facturación Electrónica DIAN
- **Plantilla HTML Profesional**: Diseño limpio y profesional
- **Generación XML UBL 2.1**: Cumplimiento normativo DIAN
- **Firma Digital**: Certificados digitales integrados
- **Envío Automático**: Transmisión a servicios DIAN
- **Impresión Optimizada**: Plantilla limpia para impresión

### 🔧 Tecnologías
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Python 3.12, FastAPI
- **Base de Datos**: Supabase (PostgreSQL)
- **UI Components**: shadcn/ui, Radix UI
- **DIAN Integration**: XML UBL 2.1, SOAP/REST

## 📁 Estructura del Proyecto

```
sistem-2.0-main/
├── app/                    # ✅ Aplicación Next.js (App Router)
│   ├── api/               # Endpoints API
│   │   └── generate-invoice/route.ts
│   ├── electronic-invoice/page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/            # ✅ Componentes React
│   ├── ui/               # Componentes de UI (shadcn/ui)
│   └── invoice-template.tsx
├── lib/                  # ✅ Librerías y utilidades
│   ├── supabase.ts
│   ├── diana.ts
│   └── company-config.ts
├── hooks/                # ✅ Hooks personalizados
│   └── use-toast.ts
├── public/               # ✅ Archivos públicos
│   └── placeholder-*.png
├── scripts/              # ✅ Scripts Python para DIAN
│   ├── config.py         # Configuración
│   ├── diana_service.py  # Servicio DIAN
│   ├── generate_invoice.py # Generador de facturas
│   ├── process_invoices.py # Procesador en lote
│   ├── requirements.txt  # Dependencias Python
│   └── env.example       # Variables de entorno ejemplo
├── package.json          # ✅ Dependencias Node.js
├── requirements.txt      # ✅ Dependencias Python
├── .env.local           # ✅ Variables de entorno (crear)
├── .gitignore          # ✅ Archivos ignorados por Git
└── cleanup_essential.sh # ✅ Script de limpieza
```

## 🛠️ Instalación

### 1. Clonar el Repositorio
```bash
git clone <repository-url>
cd sistem-2.0-main
```

### 2. Instalar Dependencias Node.js
```bash
npm install
# o
pnpm install
```

### 3. Configurar Variables de Entorno
```bash
cp scripts/env.example .env.local
# Editar .env.local con tus credenciales
```

### 4. Instalar Dependencias Python
```bash
cd scripts
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 5. Configurar Base de Datos
- Crear proyecto en Supabase
- Configurar tablas según esquema
- Actualizar variables de entorno

## 🚀 Ejecutar el Proyecto

### Desarrollo
```bash
npm run dev
# o
pnpm dev
```

### Producción
```bash
npm run build
npm start
```

## 🧹 Mantenimiento

### Limpiar Proyecto
```bash
./cleanup_essential.sh
```

### Reinstalar Dependencias
```bash
# Node.js
npm install

# Python
cd scripts
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## 📋 Configuración DIAN

### Variables de Entorno Requeridas
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key

# DIAN
DIAN_ENVIRONMENT=HABILITACION
DIAN_USERNAME=your_username
DIAN_PASSWORD=your_password
DIAN_NIT=your_nit
CERTIFICATE_PATH=scripts/certificates/certificate.p12
CERTIFICATE_PASSWORD=your_password
```

### Certificados Digitales
1. Obtener certificado digital de la DIAN
2. Colocar en `scripts/certificates/`
3. Configurar ruta en variables de entorno

## 📚 Documentación

- [Guía de Integración DIAN](./documentacion/DIAN_INTEGRATION_GUIDE.md)
- [Estructura del Proyecto](./documentacion/PROJECT_STRUCTURE.md)
- [Configuración del Entorno](./documentacion/README.md)

## 🔧 Scripts Disponibles

### Limpieza
- `cleanup_essential.sh` - Limpia archivos innecesarios
- `cleanup.sh` - Limpieza básica

### Python
- `scripts/generate_invoice.py` - Generar factura individual
- `scripts/process_invoices.py` - Procesar facturas en lote
- `scripts/setup.py` - Configuración inicial

## 📊 Funcionalidades

### Dashboard
- Resumen de ventas
- Productos más vendidos
- Stock bajo
- Gráficos de rendimiento

### Gestión de Productos
- CRUD completo de productos
- Categorización
- Control de stock
- Precios y descuentos

### Ventas
- Crear ventas
- Gestión de clientes
- Historial de transacciones
- Reportes detallados

### Facturación Electrónica
- Plantilla profesional
- Generación XML UBL 2.1
- Firma digital
- Envío a DIAN
- Impresión optimizada

## 🎯 Cumplimiento DIAN

✅ **XML UBL 2.1**: Estándar oficial DIAN  
✅ **Firma Digital**: Certificados válidos  
✅ **Numeración Autorizada**: Consecutivos autorizados  
✅ **Transmisión Automática**: Envío a servicios DIAN  
✅ **CUFE**: Código Único de Factura Electrónica  
✅ **Representación Gráfica**: PDF/HTML para visualización  

## 🤝 Contribuir

1. Fork el proyecto
2. Crear rama de feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 🆘 Soporte

Para soporte técnico o preguntas sobre la integración DIAN:
- Revisar documentación en `documentacion/`
- Verificar configuración en `scripts/env.example`
- Ejecutar scripts de limpieza si hay problemas

---

**¡Sistema listo para producción con cumplimiento DIAN completo! 🎉**
