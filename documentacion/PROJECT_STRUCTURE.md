# 📁 Estructura del Proyecto - Sistema 2.0

## 🎯 Archivos Esenciales

### **Frontend (Next.js)**
```
app/                    # Aplicación Next.js (App Router)
├── api/               # Endpoints API
│   └── generate-invoice/route.ts
├── electronic-invoice/page.tsx
├── globals.css
├── layout.tsx
└── page.tsx

components/            # Componentes React
├── ui/               # Componentes de UI (shadcn/ui)
└── invoice-template.tsx

lib/                  # Librerías y utilidades
├── supabase.ts
├── diana.ts
└── company-config.ts

hooks/                # Hooks personalizados
└── use-toast.ts

public/               # Archivos públicos
└── placeholder-*.png
```

### **Backend (Python)**
```
scripts/              # Scripts Python para DIAN
├── config.py         # Configuración
├── diana_service.py  # Servicio DIAN
├── generate_invoice.py # Generador de facturas
├── process_invoices.py # Procesador en lote
├── requirements.txt  # Dependencias Python
└── env.example       # Variables de entorno ejemplo

# Directorios de salida (creados automáticamente)
├── logs/             # Logs del sistema
├── xml_output/       # XML generados
├── pdf_output/       # PDF generados
└── certificates/     # Certificados digitales
```

### **Configuración**
```
package.json          # Dependencias Node.js
package-lock.json     # Lock file Node.js
pnpm-lock.yaml        # Lock file pnpm
next.config.mjs       # Configuración Next.js
tailwind.config.ts    # Configuración Tailwind
tsconfig.json         # Configuración TypeScript
components.json       # Configuración shadcn/ui
postcss.config.mjs    # Configuración PostCSS
.env.local            # Variables de entorno (crear)
.gitignore           # Archivos ignorados por Git
```

## 🗑️ Archivos Eliminados

### **Cache y Temporales**
- `__pycache__/` - Cache de Python
- `*.pyc` - Archivos compilados Python
- `.next/` - Cache de Next.js
- `node_modules/.cache/` - Cache de Node.js
- `logs/*.log` - Logs temporales
- `scripts/xml_output/*.xml` - XML temporales
- `scripts/pdf_output/*.pdf` - PDF temporales

### **Sistema e IDE**
- `.DS_Store` - Archivos de macOS
- `Thumbs.db` - Archivos de Windows
- `.vscode/` - Configuración VS Code
- `.idea/` - Configuración IntelliJ
- `*.swp`, `*.swo` - Archivos temporales Vim

### **Certificados**
- `scripts/certificates/*.p12` - Certificados (se mantiene estructura)
- `scripts/certificates/*.pem` - Certificados PEM
- `scripts/certificates/*.key` - Claves privadas

## 🚀 Comandos de Mantenimiento

### **Limpiar Proyecto**
```bash
./cleanup.sh
```

### **Instalar Dependencias**
```bash
# Node.js
npm install
# o
pnpm install

# Python
cd scripts
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### **Ejecutar Proyecto**
```bash
# Desarrollo
npm run dev
# o
pnpm dev

# Construir
npm run build
npm start
```

## 📋 Archivos de Configuración

### **Variables de Entorno (.env.local)**
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

### **Estructura de Directorios**
```
sistem-2.0-main/
├── app/              # ✅ Aplicación Next.js
├── components/       # ✅ Componentes React
├── lib/             # ✅ Librerías
├── hooks/           # ✅ Hooks personalizados
├── public/          # ✅ Archivos públicos
├── scripts/         # ✅ Scripts Python
├── package.json     # ✅ Dependencias Node.js
├── requirements.txt # ✅ Dependencias Python
├── .env.local       # ✅ Variables de entorno
├── .gitignore      # ✅ Archivos ignorados
└── cleanup.sh      # ✅ Script de limpieza
```

## 🎯 Funcionalidades Principales

### **1. Gestión de Inventarios**
- Productos y categorías
- Stock y proveedores
- Ventas y clientes
- Reportes

### **2. Facturación Electrónica DIAN**
- Plantilla HTML profesional
- Generación XML UBL 2.1
- Firma digital
- Envío a servicios DIAN
- Impresión optimizada

### **3. Integración Completa**
- Frontend React/Next.js
- Backend Python
- Base de datos Supabase
- API REST

## 🔧 Mantenimiento

### **Limpieza Regular**
```bash
# Ejecutar limpieza
./cleanup.sh

# Verificar estructura
tree -I 'node_modules|.next|__pycache__|*.pyc'
```

### **Backup**
```bash
# Crear backup
tar -czf backup-$(date +%Y%m%d).tar.gz \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=scripts/venv \
  --exclude=scripts/__pycache__ \
  .
```

---

**¡Proyecto limpio y optimizado! 🎉**
