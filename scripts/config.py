"""
Configuración base para scripts de facturación electrónica DIANA
Autor: Sistema 2.0
Fecha: 2024
"""

import os
from typing import Optional, List
from pathlib import Path
from pydantic import BaseModel, Field, validator
from dotenv import load_dotenv
from loguru import logger

# Cargar variables de entorno
load_dotenv()


class DianaConfig(BaseModel):
    """Configuración para servicios DIANA"""
    
    # Configuración del emisor
    issuer_nit: str = Field(..., description="NIT del emisor")
    issuer_business_name: str = Field(..., description="Razón social del emisor")
    issuer_commercial_name: Optional[str] = Field(None, description="Nombre comercial")
    issuer_address: str = Field(..., description="Dirección del emisor")
    issuer_city: str = Field(..., description="Ciudad del emisor")
    issuer_state: str = Field(..., description="Departamento del emisor")
    issuer_country_code: str = Field(default="CO", description="Código de país")
    issuer_postal_code: str = Field(..., description="Código postal")
    issuer_email: str = Field(..., description="Email del emisor")
    issuer_phone: str = Field(..., description="Teléfono del emisor")
    issuer_fiscal_responsibilities: List[str] = Field(default_factory=list, description="Responsabilidades fiscales")
    
    # Configuración técnica
    software_id: str = Field(..., description="ID del software autorizado")
    software_version: str = Field(..., description="Versión del software")
    environment: str = Field(default="HABILITACION", description="Ambiente: HABILITACION o PRODUCCION")
    test_set_id: Optional[str] = Field(None, description="ID del conjunto de pruebas")
    
    # Configuración del certificado
    certificate_path: str = Field(..., description="Ruta al certificado digital")
    certificate_password: str = Field(..., description="Contraseña del certificado")
    
    # Configuración de servicios web
    dian_ws_url: str = Field(..., description="URL del servicio web DIAN")
    dian_auth_token: str = Field(..., description="Token de autenticación DIAN")
    
    # Configuración de base de datos
    supabase_url: str = Field(..., description="URL de Supabase")
    supabase_key: str = Field(..., description="Clave de Supabase")
    
    @validator('environment')
    def validate_environment(cls, v):
        """Validar que el ambiente sea válido"""
        if v not in ['HABILITACION', 'PRODUCCION']:
            raise ValueError('El ambiente debe ser HABILITACION o PRODUCCION')
        return v
    
    @validator('issuer_fiscal_responsibilities')
    def validate_fiscal_responsibilities(cls, v):
        """Validar responsabilidades fiscales"""
        valid_responsibilities = ['O-23', 'O-15', 'O-47', 'O-48', 'O-49', 'O-50']
        for resp in v:
            if resp not in valid_responsibilities:
                logger.warning(f"Responsabilidad fiscal '{resp}' no reconocida")
        return v


class DatabaseConfig(BaseModel):
    """Configuración de base de datos"""
    
    url: str = Field(..., description="URL de conexión")
    key: str = Field(..., description="Clave de autenticación")
    timeout: int = Field(default=30, description="Timeout en segundos")
    max_retries: int = Field(default=3, description="Máximo número de reintentos")


class LoggingConfig(BaseModel):
    """Configuración de logging"""
    
    level: str = Field(default="INFO", description="Nivel de logging")
    format: str = Field(default="{time:YYYY-MM-DD HH:mm:ss} | {level} | {message}", description="Formato del log")
    file_path: Optional[str] = Field(None, description="Ruta del archivo de log")
    rotation: str = Field(default="1 day", description="Rotación de logs")
    retention: str = Field(default="30 days", description="Retención de logs")


def load_config() -> DianaConfig:
    """
    Cargar configuración desde variables de entorno
    
    Returns:
        DianaConfig: Configuración cargada
        
    Raises:
        ValueError: Si faltan variables de entorno requeridas
    """
    try:
        config = DianaConfig(
            issuer_nit=os.getenv('DIANA_ISSUER_NIT'),
            issuer_business_name=os.getenv('DIANA_ISSUER_BUSINESS_NAME'),
            issuer_commercial_name=os.getenv('DIANA_ISSUER_COMMERCIAL_NAME'),
            issuer_address=os.getenv('DIANA_ISSUER_ADDRESS'),
            issuer_city=os.getenv('DIANA_ISSUER_CITY'),
            issuer_state=os.getenv('DIANA_ISSUER_STATE'),
            issuer_country_code=os.getenv('DIANA_ISSUER_COUNTRY_CODE', 'CO'),
            issuer_postal_code=os.getenv('DIANA_ISSUER_POSTAL_CODE'),
            issuer_email=os.getenv('DIANA_ISSUER_EMAIL'),
            issuer_phone=os.getenv('DIANA_ISSUER_PHONE'),
            issuer_fiscal_responsibilities=os.getenv('DIANA_ISSUER_FISCAL_RESPONSIBILITIES', '').split(','),
            software_id=os.getenv('DIANA_SOFTWARE_ID'),
            software_version=os.getenv('DIANA_SOFTWARE_VERSION'),
            environment=os.getenv('DIANA_ENVIRONMENT', 'HABILITACION'),
            test_set_id=os.getenv('DIANA_TEST_SET_ID'),
            certificate_path=os.getenv('DIANA_CERTIFICATE_PATH'),
            certificate_password=os.getenv('DIANA_CERTIFICATE_PASSWORD'),
            dian_ws_url=os.getenv('DIANA_WS_URL'),
            dian_auth_token=os.getenv('DIANA_AUTH_TOKEN'),
            supabase_url=os.getenv('SUPABASE_URL'),
            supabase_key=os.getenv('SUPABASE_KEY')
        )
        
        logger.info("Configuración cargada exitosamente")
        return config
        
    except Exception as e:
        logger.error(f"Error al cargar configuración: {e}")
        raise ValueError(f"Error en configuración: {e}")


def setup_logging(config: LoggingConfig) -> None:
    """
    Configurar sistema de logging
    
    Args:
        config: Configuración de logging
    """
    # Configurar logger
    logger.remove()  # Remover configuración por defecto
    
    # Logger para consola
    logger.add(
        lambda msg: print(msg, end=""),
        format=config.format,
        level=config.level,
        colorize=True
    )
    
    # Logger para archivo si se especifica
    if config.file_path:
        logger.add(
            config.file_path,
            format=config.format,
            level=config.level,
            rotation=config.rotation,
            retention=config.retention,
            compression="zip"
        )
    
    logger.info("Sistema de logging configurado")


def validate_certificate(certificate_path: str) -> bool:
    """
    Validar que el certificado digital existe y es válido
    
    Args:
        certificate_path: Ruta al certificado
        
    Returns:
        bool: True si el certificado es válido
    """
    try:
        cert_file = Path(certificate_path)
        if not cert_file.exists():
            logger.error(f"Certificado no encontrado: {certificate_path}")
            return False
        
        if not cert_file.is_file():
            logger.error(f"La ruta no es un archivo: {certificate_path}")
            return False
        
        # Verificar extensión
        if cert_file.suffix.lower() not in ['.p12', '.pfx']:
            logger.warning(f"Extensión de certificado no estándar: {cert_file.suffix}")
        
        logger.info(f"Certificado válido: {certificate_path}")
        return True
        
    except Exception as e:
        logger.error(f"Error validando certificado: {e}")
        return False


def get_default_config() -> DianaConfig:
    """
    Obtener configuración por defecto para desarrollo
    
    Returns:
        DianaConfig: Configuración por defecto
    """
    return DianaConfig(
        issuer_nit="900123456-7",
        issuer_business_name="MI EMPRESA SAS",
        issuer_commercial_name="MI EMPRESA",
        issuer_address="Calle 123 # 45-67",
        issuer_city="Bogotá",
        issuer_state="Cundinamarca",
        issuer_country_code="CO",
        issuer_postal_code="110111",
        issuer_email="facturacion@miempresa.com",
        issuer_phone="+57 1 1234567",
        issuer_fiscal_responsibilities=["O-23", "O-15"],
        software_id="SW123456789",
        software_version="1.0.0",
        environment="HABILITACION",
        certificate_path="/path/to/certificate.p12",
        certificate_password="password",
        dian_ws_url="https://api.dian.gov.co/facturaelectronica/v1",
        dian_auth_token="dummy-token",
        supabase_url="https://your-project.supabase.co",
        supabase_key="your-supabase-key"
    )


if __name__ == "__main__":
    """Script de prueba para validar configuración"""
    try:
        # Configurar logging
        logging_config = LoggingConfig(
            level="DEBUG",
            file_path="logs/config_test.log"
        )
        setup_logging(logging_config)
        
        # Cargar configuración
        config = load_config()
        logger.info("Configuración cargada correctamente")
        
        # Validar certificado
        if validate_certificate(config.certificate_path):
            logger.info("✅ Configuración válida")
        else:
            logger.error("❌ Error en configuración del certificado")
            
    except Exception as e:
        logger.error(f"❌ Error en configuración: {e}")
        exit(1)
