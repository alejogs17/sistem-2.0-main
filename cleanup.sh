#!/bin/bash

echo "🧹 Limpiando archivos innecesarios del proyecto..."

# Eliminar archivos de cache de Python
echo "📁 Eliminando cache de Python..."
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find . -name "*.pyc" -delete 2>/dev/null || true
find . -name "*.pyo" -delete 2>/dev/null || true

# Eliminar archivos de cache de Node.js
echo "📁 Eliminando cache de Node.js..."
rm -rf .next 2>/dev/null || true
rm -rf node_modules/.cache 2>/dev/null || true

# Eliminar logs
echo "📁 Eliminando logs..."
rm -rf scripts/logs/*.log 2>/dev/null || true
rm -rf logs/ 2>/dev/null || true

# Eliminar archivos temporales
echo "📁 Eliminando archivos temporales..."
rm -rf scripts/xml_output/*.xml 2>/dev/null || true
rm -rf scripts/pdf_output/*.pdf 2>/dev/null || true
rm -rf scripts/temp_*.json 2>/dev/null || true

# Eliminar archivos de certificados (mantener estructura)
echo "📁 Limpiando certificados..."
rm -f scripts/certificates/*.p12 2>/dev/null || true
rm -f scripts/certificates/*.pem 2>/dev/null || true
rm -f scripts/certificates/*.key 2>/dev/null || true

# Eliminar archivos de sistema
echo "📁 Eliminando archivos de sistema..."
find . -name ".DS_Store" -delete 2>/dev/null || true
find . -name "Thumbs.db" -delete 2>/dev/null || true

# Eliminar archivos de IDE
echo "📁 Eliminando archivos de IDE..."
rm -rf .vscode/ 2>/dev/null || true
rm -rf .idea/ 2>/dev/null || true
find . -name "*.swp" -delete 2>/dev/null || true
find . -name "*.swo" -delete 2>/dev/null || true

# Crear archivos .gitkeep para mantener estructura
echo "📁 Creando archivos .gitkeep..."
mkdir -p scripts/logs
mkdir -p scripts/xml_output
mkdir -p scripts/pdf_output
mkdir -p scripts/certificates
touch scripts/logs/.gitkeep
touch scripts/xml_output/.gitkeep
touch scripts/pdf_output/.gitkeep
touch scripts/certificates/.gitkeep

echo "✅ Limpieza completada!"
echo ""
echo "📋 Archivos esenciales mantenidos:"
echo "   ✅ app/ - Aplicación Next.js"
echo "   ✅ components/ - Componentes React"
echo "   ✅ lib/ - Librerías y utilidades"
echo "   ✅ hooks/ - Hooks personalizados"
echo "   ✅ public/ - Archivos públicos"
echo "   ✅ scripts/ - Scripts Python esenciales"
echo "   ✅ package.json - Dependencias Node.js"
echo "   ✅ requirements.txt - Dependencias Python"
echo "   ✅ Configuración (.env, etc.)"
echo ""
echo "🗑️ Archivos eliminados:"
echo "   ❌ Cache de Python (__pycache__, *.pyc)"
echo "   ❌ Cache de Node.js (.next, node_modules/.cache)"
echo "   ❌ Logs temporales"
echo "   ❌ Archivos XML/PDF temporales"
echo "   ❌ Certificados (se mantiene estructura)"
echo "   ❌ Archivos de sistema (.DS_Store, Thumbs.db)"
echo "   ❌ Archivos de IDE (.vscode, .idea)"
echo ""
echo "💡 Para reinstalar dependencias:"
echo "   npm install  # o pnpm install"
echo "   cd scripts && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
