#!/bin/bash

echo "🧹 Limpiando proyecto - Manteniendo solo archivos esenciales..."

# Crear backup antes de limpiar
echo "📦 Creando backup..."
BACKUP_FILE="backup-$(date +%Y%m%d-%H%M%S).tar.gz"
tar -czf "$BACKUP_FILE" \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=scripts/venv \
  --exclude=scripts/__pycache__ \
  --exclude=scripts/*.pyc \
  --exclude=scripts/logs \
  --exclude=scripts/xml_output \
  --exclude=scripts/pdf_output \
  --exclude=scripts/certificates \
  --exclude=.git \
  .

echo "✅ Backup creado: $BACKUP_FILE"

# Eliminar entorno virtual completo
echo "🗑️ Eliminando entorno virtual..."
rm -rf scripts/venv/

# Eliminar archivos de cache
echo "🗑️ Eliminando archivos de cache..."
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find . -name "*.pyc" -delete 2>/dev/null || true
find . -name "*.pyo" -delete 2>/dev/null || true
rm -rf .next 2>/dev/null || true
rm -rf node_modules/.cache 2>/dev/null || true

# Eliminar archivos temporales
echo "🗑️ Eliminando archivos temporales..."
rm -rf scripts/logs/*.log 2>/dev/null || true
rm -rf scripts/xml_output/*.xml 2>/dev/null || true
rm -rf scripts/pdf_output/*.pdf 2>/dev/null || true
rm -rf scripts/temp_*.json 2>/dev/null || true

# Eliminar archivos de sistema
echo "🗑️ Eliminando archivos de sistema..."
find . -name ".DS_Store" -delete 2>/dev/null || true
find . -name "Thumbs.db" -delete 2>/dev/null || true

# Eliminar archivos de IDE
echo "🗑️ Eliminando archivos de IDE..."
rm -rf .vscode/ 2>/dev/null || true
rm -rf .idea/ 2>/dev/null || true
find . -name "*.swp" -delete 2>/dev/null || true
find . -name "*.swo" -delete 2>/dev/null || true

# Crear estructura de directorios limpia
echo "📁 Creando estructura de directorios..."
mkdir -p scripts/logs
mkdir -p scripts/xml_output
mkdir -p scripts/pdf_output
mkdir -p scripts/certificates

# Crear archivos .gitkeep
touch scripts/logs/.gitkeep
touch scripts/xml_output/.gitkeep
touch scripts/pdf_output/.gitkeep
touch scripts/certificates/.gitkeep

echo ""
echo "✅ Limpieza completada!"
echo ""
echo "📋 Archivos esenciales mantenidos:"
echo "   ✅ app/ - Aplicación Next.js"
echo "   ✅ components/ - Componentes React"
echo "   ✅ lib/ - Librerías y utilidades"
echo "   ✅ hooks/ - Hooks personalizados"
echo "   ✅ public/ - Archivos públicos"
echo "   ✅ scripts/ - Scripts Python (sin venv)"
echo "   ✅ package.json - Dependencias Node.js"
echo "   ✅ requirements.txt - Dependencias Python"
echo "   ✅ Configuración (.env, etc.)"
echo ""
echo "🗑️ Archivos eliminados:"
echo "   ❌ scripts/venv/ - Entorno virtual completo"
echo "   ❌ Cache de Python (__pycache__, *.pyc)"
echo "   ❌ Cache de Node.js (.next, node_modules/.cache)"
echo "   ❌ Logs temporales"
echo "   ❌ Archivos XML/PDF temporales"
echo "   ❌ Archivos de sistema (.DS_Store, Thumbs.db)"
echo "   ❌ Archivos de IDE (.vscode, .idea)"
echo ""
echo "💡 Para reinstalar dependencias:"
echo "   # Node.js"
echo "   npm install"
echo ""
echo "   # Python"
echo "   cd scripts"
echo "   python -m venv venv"
echo "   source venv/bin/activate  # En Windows: venv\\Scripts\\activate"
echo "   pip install -r requirements.txt"
echo ""
echo "📦 Backup disponible: $BACKUP_FILE"
