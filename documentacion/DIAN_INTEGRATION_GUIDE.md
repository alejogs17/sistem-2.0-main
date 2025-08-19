# 🏛️ Guía de Integración DIAN - Sistema 2.0

## 📋 Resumen Ejecutivo

Este documento describe cómo configurar y usar el sistema completo de facturación electrónica que cumple con los estándares de la DIAN (Dirección de Impuestos y Aduanas Nacionales) de Colombia.

## ✅ Lo que ya está implementado

### 1. **Plantilla HTML para Visualización**
- ✅ Diseño profesional de factura
- ✅ Campos editables (número, fecha, moneda, etc.)
- ✅ Cálculos automáticos de totales
- ✅ Impresión optimizada
- ✅ Datos del emisor y cliente
- ✅ Tabla de productos con cálculos

### 2. **Generación de XML UBL 2.1**
- ✅ Scripts Python para generar XML según estándares DIAN
- ✅ Validación de documentos
- ✅ Firma digital con certificados
- ✅ Envío a servicios web de la DIAN
- ✅ Manejo de respuestas y errores

### 3. **Integración Frontend-Backend**
- ✅ API endpoint para procesar facturas
- ✅ Comunicación con scripts Python
- ✅ Descarga automática de XML
- ✅ Notificaciones de estado

## 🔧 Configuración Requerida

### 1. **Certificado Digital (.p12)**

**Obtener certificado:**
- Solicitar certificado digital a una entidad certificadora autorizada
- Formato: archivo .p12
- Ubicación: `scripts/certificates/certificate.p12`

**Configurar en `.env.local`:**
```bash
CERTIFICATE_PATH=scripts/certificates/certificate.p12
CERTIFICATE_PASSWORD=tu_contraseña_del_certificado
```

### 2. **Credenciales DIAN**

**Obtener credenciales:**
- Registrarse en el portal de la DIAN
- Solicitar acceso a servicios de facturación electrónica
- Obtener token de autenticación

**Configurar en `.env.local`:**
```bash
DIAN_ENVIRONMENT=HABILITACION  # o PRODUCCION
DIAN_USERNAME=tu_usuario_dian
DIAN_PASSWORD=tu_password_dian
DIAN_NIT=tu_nit_empresa
DIAN_AUTH_TOKEN=tu_token_autenticacion
DIAN_WS_URL=https://api.dian.gov.co/ubl2.1
```

### 3. **Datos de la Empresa**

**Configurar en la interfaz web:**
- NIT de la empresa
- Razón social
- Dirección completa
- Email de facturación
- Teléfono
- Responsabilidades fiscales

### 4. **Numeración Autorizada**

**Obtener autorización:**
- Solicitar rango de numeración a la DIAN
- Configurar prefijo autorizado
- Establecer consecutivos

**Ejemplo:**
```
Prefijo: F
Rango: 0001-9999
Formato: F-0001, F-0002, etc.
```

## 🚀 Flujo de Facturación Electrónica

### 1. **Crear Venta en el Sistema**
```
Venta → Productos → Cliente → Total
```

### 2. **Generar Factura Electrónica**
```
Botón "Generar Factura Electrónica" →
Validación de datos →
Generación XML UBL 2.1 →
Firma digital →
Envío a DIAN →
Respuesta con CUFE
```

### 3. **Procesamiento Automático**
```
Frontend → API → Script Python → DIAN → Respuesta
```

### 4. **Resultados**
- ✅ XML firmado descargado automáticamente
- ✅ CUFE (Código Único de Factura Electrónica)
- ✅ Estado de aprobación/rechazo
- ✅ Logs de auditoría

## 📁 Estructura de Archivos

```
sistem-2.0-main/
├── app/
│   ├── api/generate-invoice/route.ts    # Endpoint API
│   └── electronic-invoice/page.tsx      # Interfaz web
├── components/
│   └── invoice-template.tsx             # Plantilla HTML
├── scripts/
│   ├── diana_service.py                 # Servicio DIAN
│   ├── generate_invoice.py              # Script principal
│   ├── config.py                        # Configuración
│   ├── certificates/                    # Certificados
│   ├── xml_output/                      # XML generados
│   └── logs/                           # Logs del sistema
└── .env.local                          # Variables de entorno
```

## 🔍 Validaciones Implementadas

### 1. **Validación de Datos**
- ✅ NIT válido (formato y dígito de verificación)
- ✅ Email válido
- ✅ Precios y cantidades positivos
- ✅ Totales calculados correctamente
- ✅ Datos obligatorios completos

### 2. **Validación de Certificado**
- ✅ Certificado válido y no expirado
- ✅ Contraseña correcta
- ✅ Formato .p12 válido

### 3. **Validación de Conexión DIAN**
- ✅ Credenciales válidas
- ✅ Servicio disponible
- ✅ Respuesta correcta

## 📊 Estados de Facturación

### 1. **Pendiente de Facturación**
- Venta creada, lista para generar factura electrónica

### 2. **En Proceso**
- XML generado, enviándose a la DIAN

### 3. **Aprobada**
- DIAN aprobó la factura, CUFE asignado

### 4. **Rechazada**
- DIAN rechazó la factura, error específico

### 5. **Error**
- Error en el proceso, requiere revisión

## 🛠️ Comandos de Mantenimiento

### 1. **Validar Configuración**
```bash
cd scripts
python generate_invoice.py --test
```

### 2. **Procesar Facturas Pendientes**
```bash
cd scripts
python process_invoices.py --from-supabase
```

### 3. **Generar Reportes**
```bash
cd scripts
python process_invoices.py --report
```

### 4. **Ver Logs**
```bash
tail -f scripts/logs/diana.log
```

## 🔒 Seguridad y Cumplimiento

### 1. **Certificados Digitales**
- Almacenamiento seguro en `scripts/certificates/`
- Contraseñas en variables de entorno
- Rotación periódica de certificados

### 2. **Logs de Auditoría**
- Todas las operaciones registradas
- Logs en `scripts/logs/`
- Retención por 5 años (requerimiento DIAN)

### 3. **Backup de XML**
- XML firmados guardados en `scripts/xml_output/`
- Backup automático de respuestas DIAN
- Archivo de respaldo para auditorías

## 📞 Soporte y Troubleshooting

### 1. **Errores Comunes**

**Error: Certificado inválido**
```
Solución: Verificar ruta y contraseña del certificado
```

**Error: Credenciales DIAN**
```
Solución: Verificar usuario, password y token
```

**Error: XML malformado**
```
Solución: Verificar datos de entrada y validaciones
```

### 2. **Contactos**
- **DIAN**: Portal de servicios web
- **Entidad Certificadora**: Para certificados digitales
- **Soporte Técnico**: Documentación y logs

## 🎯 Próximos Pasos

1. **Configurar certificado digital**
2. **Obtener credenciales DIAN**
3. **Configurar datos de empresa**
4. **Probar en ambiente de habilitación**
5. **Migrar a producción**
6. **Capacitar usuarios**

---

**¡El sistema está listo para cumplir con todos los requisitos de facturación electrónica de la DIAN! 🎉**
