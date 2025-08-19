# Scripts de Facturación Electrónica DIANA - Sistema 2.0

## 📋 Descripción

Este directorio contiene scripts de Python optimizados para la facturación electrónica DIANA, implementados con las mejores prácticas de programación:

- ✅ **Código modular y bien estructurado**
- ✅ **Funciones bien definidas con `def` y `main`**
- ✅ **Manejo robusto de errores**
- ✅ **Logging profesional**
- ✅ **Validación de datos con Pydantic**
- ✅ **Interfaz CLI intuitiva**
- ✅ **Procesamiento paralelo optimizado**
- ✅ **Documentación completa**

## 🏗️ Arquitectura del Proyecto

```
scripts/
├── config.py              # Configuración base y validación
├── diana_service.py       # Servicio principal DIANA
├── process_invoices.py    # Script CLI para procesamiento
├── setup.py              # Script de instalación automática
├── requirements.txt      # Dependencias Python
├── env.example          # Plantilla de variables de entorno
├── README.md            # Este archivo
├── certificates/        # Directorio para certificados digitales
├── logs/               # Directorio para logs
├── templates/          # Plantillas de facturas
└── output/             # Archivos de salida
```

## 🚀 Instalación Rápida

### 1. Configuración Automática
```bash
cd scripts
python setup.py
```

### 2. Configuración Manual
```bash
# 1. Instalar dependencias
pip install -r requirements.txt

# 2. Copiar archivo de configuración
cp env.example .env

# 3. Editar configuración
nano .env

# 4. Crear directorios
mkdir -p logs certificates templates output
```

## ⚙️ Configuración

### Variables de Entorno (.env)

```bash
# Datos del emisor
DIANA_ISSUER_NIT=900123456-7
DIANA_ISSUER_BUSINESS_NAME=MI EMPRESA SAS
DIANA_ISSUER_ADDRESS=Calle 123 # 45-67
DIANA_ISSUER_CITY=Bogotá
DIANA_ISSUER_STATE=Cundinamarca
DIANA_ISSUER_EMAIL=facturacion@miempresa.com
DIANA_ISSUER_PHONE=+57 1 1234567

# Configuración técnica
DIANA_SOFTWARE_ID=SW123456789
DIANA_ENVIRONMENT=HABILITACION

# Certificado digital
DIANA_CERTIFICATE_PATH=certificates/certificate.p12
DIANA_CERTIFICATE_PASSWORD=tu-contraseña

# Servicios DIAN
DIANA_WS_URL=https://api.dian.gov.co/facturaelectronica/v1
DIANA_AUTH_TOKEN=tu-token-dian
```

## 📖 Uso de los Scripts

### 1. Script CLI Principal (`process_invoices.py`)

#### Procesar facturas desde archivo
```bash
# Procesar archivo JSON
python process_invoices.py process -i templates/sample_invoices.json -o report.txt

# Procesar archivo CSV
python process_invoices.py process -i invoices.csv -o report.txt

# Solo validar (sin enviar a DIAN)
python process_invoices.py process -i invoices.json --validate-only

# Procesamiento paralelo con 5 workers
python process_invoices.py process -i invoices.json -w 5
```

#### Crear factura de ejemplo
```bash
python process_invoices.py create-sample \
  -d FAC001 \
  -c 12345678-9 \
  -n "Cliente Ejemplo SAS" \
  -a 23800
```

#### Validar configuración
```bash
python process_invoices.py validate-config
```

#### Crear plantillas
```bash
# Plantilla JSON
python process_invoices.py create-template -t json -o my_template.json

# Plantilla CSV
python process_invoices.py create-template -t csv -o my_template.csv
```

### 2. Script de Configuración (`setup.py`)

```bash
# Configuración interactiva completa
python setup.py
```

### 3. Servicio DIANA (`diana_service.py`)

```python
from config import load_config
from diana_service import DianaService, DianaInvoice

# Cargar configuración
config = load_config()

# Crear servicio
service = DianaService(config)

# Procesar factura
response = service.process_invoice(invoice)
```

## 📊 Formatos de Entrada

### 1. Formato JSON

```json
[
  {
    "document_number": "FAC001",
    "issue_date": "2024-01-15",
    "issue_time": "10:30:00",
    "customer": {
      "tax_id": "12345678-9",
      "business_name": "CLIENTE EJEMPLO SAS",
      "address": "Calle 123 # 45-67",
      "city": "Bogotá",
      "state": "Cundinamarca",
      "postal_code": "110111"
    },
    "lines": [
      {
        "id": "1",
        "description": "Producto de ejemplo",
        "quantity": 2,
        "unit_price": 10000,
        "total_amount": 20000,
        "tax_amount": 3800,
        "tax_rate": 19.0
      }
    ],
    "line_extension_amount": 20000,
    "tax_exclusive_amount": 20000,
    "tax_inclusive_amount": 23800,
    "payable_amount": 23800,
    "tax_amount": 3800
  }
]
```

### 2. Formato CSV

```csv
document_number,issue_date,issue_time,customer_tax_id,customer_business_name,customer_address,customer_city,customer_state,customer_postal_code,line_id,line_description,line_quantity,line_unit_price,line_total_amount,line_tax_amount,line_tax_rate,line_extension_amount,tax_exclusive_amount,tax_inclusive_amount,payable_amount,tax_amount
FAC001,2024-01-15,10:30:00,12345678-9,CLIENTE EJEMPLO SAS,Calle 123 # 45-67,Bogotá,Cundinamarca,110111,1,Producto de ejemplo,2,10000,20000,3800,19.0,20000,20000,23800,23800,3800
```

## 🔧 Funciones Principales

### DianaService

```python
class DianaService:
    def generate_document_number(self, prefix: str = "FAC") -> str
    def generate_invoice_xml(self, invoice: DianaInvoice) -> str
    def sign_document(self, xml_content: str) -> str
    def send_to_dian(self, xml_content: str) -> DianaResponse
    def validate_invoice(self, invoice: DianaInvoice) -> Tuple[bool, List[str]]
    def process_invoice(self, invoice: DianaInvoice) -> DianaResponse
```

### InvoiceProcessor

```python
class InvoiceProcessor:
    def load_invoices_from_json(self, file_path: str) -> List[DianaInvoice]
    def load_invoices_from_csv(self, file_path: str) -> List[DianaInvoice]
    def process_single_invoice(self, invoice: DianaInvoice) -> ProcessingResult
    def process_invoices_batch(self, invoices: List[DianaInvoice], max_workers: int = 3) -> List[ProcessingResult]
    def generate_report(self, output_file: Optional[str] = None) -> str
```

## 📈 Características Avanzadas

### 1. Procesamiento Paralelo
- Procesamiento de múltiples facturas simultáneamente
- Configuración de número de workers
- Manejo de timeouts y reintentos

### 2. Validación Robusta
- Validación de datos con Pydantic
- Verificación de totales y cálculos
- Validación de certificado digital

### 3. Logging Profesional
- Logs estructurados con Loguru
- Rotación automática de archivos
- Niveles de logging configurables

### 4. Manejo de Errores
- Captura y manejo de excepciones
- Reintentos automáticos
- Reportes detallados de errores

### 5. Reportes y Estadísticas
- Reportes en formato texto y JSON
- Estadísticas de procesamiento
- Métricas de rendimiento

## 🛠️ Desarrollo y Mantenimiento

### Estructura de Código

```python
def main():
    """Función principal con manejo de errores"""
    try:
        # Configuración
        config = load_config()
        
        # Lógica principal
        processor = InvoiceProcessor()
        results = processor.process_invoices_batch(invoices)
        
        # Reportes
        report = processor.generate_report()
        
    except Exception as e:
        logger.error(f"Error inesperado: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())
```

### Buenas Prácticas Implementadas

1. **Funciones bien definidas**: Cada función tiene una responsabilidad específica
2. **Validación de datos**: Uso de Pydantic para validación automática
3. **Manejo de errores**: Try-catch en todas las operaciones críticas
4. **Logging estructurado**: Logs informativos y de error
5. **Documentación**: Docstrings en todas las funciones
6. **Tipado**: Type hints en todas las funciones
7. **Configuración externa**: Variables de entorno para configuración
8. **Modularidad**: Código organizado en módulos reutilizables

### Testing

```bash
# Ejecutar pruebas básicas
python setup.py

# Validar configuración
python process_invoices.py validate-config

# Probar con factura de ejemplo
python process_invoices.py create-sample -d TEST001 -c 12345678-9 -n "Test" -a 10000
```

## 🔒 Seguridad

### Certificado Digital
- Validación de certificado antes del uso
- Almacenamiento seguro de contraseñas
- Verificación de validez del certificado

### Credenciales
- Variables de entorno para credenciales
- No hardcodeo de información sensible
- Validación de tokens de autenticación

## 📝 Logs y Debugging

### Niveles de Log
- `DEBUG`: Información detallada para desarrollo
- `INFO`: Información general del proceso
- `WARNING`: Advertencias no críticas
- `ERROR`: Errores que requieren atención

### Ubicación de Logs
```
logs/
├── invoice_processing.log    # Logs de procesamiento
├── config_test.log          # Logs de configuración
└── diana.log               # Logs generales
```

## 🚨 Solución de Problemas

### Errores Comunes

1. **Certificado no encontrado**
   ```bash
   # Verificar ruta del certificado
   ls -la certificates/
   
   # Actualizar ruta en .env
   DIANA_CERTIFICATE_PATH=certificates/certificate.p12
   ```

2. **Token de autenticación inválido**
   ```bash
   # Obtener nuevo token desde portal DIAN
   # Actualizar en .env
   DIANA_AUTH_TOKEN=nuevo-token
   ```

3. **Dependencias faltantes**
   ```bash
   # Reinstalar dependencias
   pip install -r requirements.txt
   ```

### Debugging

```bash
# Activar modo debug
export LOG_LEVEL=DEBUG

# Ejecutar con más información
python process_invoices.py process -i invoices.json --verbose
```

## 📞 Soporte

Para soporte técnico o preguntas sobre la implementación:

1. Revisar logs en `logs/`
2. Verificar configuración en `.env`
3. Ejecutar validación: `python process_invoices.py validate-config`
4. Consultar documentación DIAN para certificados

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

---

**Desarrollado con ❤️ para el cumplimiento de obligaciones fiscales en Colombia**
