#!/usr/bin/env python3
"""
Script de instalación y configuración para scripts de facturación electrónica DIANA
Autor: Sistema 2.0
Fecha: 2024

Este script automatiza la instalación de dependencias y configuración inicial
del entorno para los scripts de facturación electrónica.
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path
from typing import List, Dict, Optional
import json

from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.prompt import Prompt, Confirm
from rich.table import Table


class SetupManager:
    """Gestor de instalación y configuración"""
    
    def __init__(self):
        """Inicializar gestor de configuración"""
        self.console = Console()
        self.project_root = Path(__file__).parent
        self.scripts_dir = self.project_root / "scripts"
        self.logs_dir = self.scripts_dir / "logs"
        self.certificates_dir = self.scripts_dir / "certificates"
        
    def show_welcome(self) -> None:
        """Mostrar mensaje de bienvenida"""
        welcome_text = """
[bold blue]SISTEM 2.0 - Configuración de Facturación Electrónica DIANA[/bold blue]

Este script te ayudará a configurar el entorno para la facturación electrónica
según los estándares DIANA 2.1.

[bold yellow]Requisitos previos:[/bold yellow]
• Python 3.8 o superior
• Certificado digital de la DIAN
• Token de autenticación DIAN
• Datos de tu empresa

[bold green]¿Estás listo para comenzar?[/bold green]
        """
        
        self.console.print(Panel(welcome_text, title="Bienvenido"))
    
    def check_python_version(self) -> bool:
        """
        Verificar versión de Python
        
        Returns:
            bool: True si la versión es compatible
        """
        version = sys.version_info
        if version.major < 3 or (version.major == 3 and version.minor < 8):
            self.console.print(
                "❌ Python 3.8 o superior es requerido. "
                f"Versión actual: {version.major}.{version.minor}",
                style="red"
            )
            return False
        
        self.console.print(f"✅ Python {version.major}.{version.minor}.{version.micro} detectado", style="green")
        return True
    
    def install_dependencies(self) -> bool:
        """
        Instalar dependencias de Python
        
        Returns:
            bool: True si la instalación fue exitosa
        """
        try:
            self.console.print("📦 Instalando dependencias...")
            
            requirements_file = self.scripts_dir / "requirements.txt"
            if not requirements_file.exists():
                self.console.print("❌ Archivo requirements.txt no encontrado", style="red")
                return False
            
            # Instalar dependencias
            result = subprocess.run([
                sys.executable, "-m", "pip", "install", "-r", str(requirements_file)
            ], capture_output=True, text=True)
            
            if result.returncode == 0:
                self.console.print("✅ Dependencias instaladas correctamente", style="green")
                return True
            else:
                self.console.print(f"❌ Error instalando dependencias: {result.stderr}", style="red")
                return False
                
        except Exception as e:
            self.console.print(f"❌ Error: {e}", style="red")
            return False
    
    def create_directories(self) -> bool:
        """
        Crear directorios necesarios
        
        Returns:
            bool: True si se crearon correctamente
        """
        try:
            directories = [
                self.logs_dir,
                self.certificates_dir,
                self.scripts_dir / "templates",
                self.scripts_dir / "output"
            ]
            
            for directory in directories:
                directory.mkdir(parents=True, exist_ok=True)
                self.console.print(f"📁 Directorio creado: {directory}")
            
            return True
            
        except Exception as e:
            self.console.print(f"❌ Error creando directorios: {e}", style="red")
            return False
    
    def setup_environment_file(self) -> bool:
        """
        Configurar archivo de variables de entorno
        
        Returns:
            bool: True si se configuró correctamente
        """
        try:
            env_example = self.scripts_dir / "env.example"
            env_file = self.scripts_dir / ".env"
            
            if not env_example.exists():
                self.console.print("❌ Archivo env.example no encontrado", style="red")
                return False
            
            # Copiar archivo de ejemplo
            shutil.copy2(env_example, env_file)
            self.console.print("📄 Archivo .env creado desde plantilla")
            
            # Solicitar configuración básica
            self.console.print("\n[bold yellow]Configuración básica requerida:[/bold yellow]")
            
            config_data = {}
            
            # Datos del emisor
            config_data['DIANA_ISSUER_NIT'] = Prompt.ask("NIT de tu empresa")
            config_data['DIANA_ISSUER_BUSINESS_NAME'] = Prompt.ask("Razón social")
            config_data['DIANA_ISSUER_ADDRESS'] = Prompt.ask("Dirección")
            config_data['DIANA_ISSUER_CITY'] = Prompt.ask("Ciudad")
            config_data['DIANA_ISSUER_STATE'] = Prompt.ask("Departamento")
            config_data['DIANA_ISSUER_EMAIL'] = Prompt.ask("Email de facturación")
            config_data['DIANA_ISSUER_PHONE'] = Prompt.ask("Teléfono")
            
            # Configuración técnica
            config_data['DIANA_SOFTWARE_ID'] = Prompt.ask("ID del software DIAN", default="SW123456789")
            config_data['DIANA_ENVIRONMENT'] = Prompt.ask(
                "Ambiente", 
                choices=["HABILITACION", "PRODUCCION"], 
                default="HABILITACION"
            )
            
            # Actualizar archivo .env
            self._update_env_file(env_file, config_data)
            
            self.console.print("✅ Archivo .env configurado", style="green")
            return True
            
        except Exception as e:
            self.console.print(f"❌ Error configurando .env: {e}", style="red")
            return False
    
    def _update_env_file(self, env_file: Path, config_data: Dict[str, str]) -> None:
        """
        Actualizar archivo .env con datos de configuración
        
        Args:
            env_file: Ruta al archivo .env
            config_data: Datos de configuración
        """
        # Leer archivo actual
        with open(env_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Actualizar variables
        for key, value in config_data.items():
            # Buscar línea con la variable
            lines = content.split('\n')
            for i, line in enumerate(lines):
                if line.startswith(f"{key}="):
                    lines[i] = f"{key}={value}"
                    break
            else:
                # Si no existe, agregar al final
                lines.append(f"{key}={value}")
        
        # Escribir archivo actualizado
        with open(env_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))
    
    def setup_certificate(self) -> bool:
        """
        Configurar certificado digital
        
        Returns:
            bool: True si se configuró correctamente
        """
        try:
            self.console.print("\n[bold yellow]Configuración del certificado digital:[/bold yellow]")
            
            # Solicitar ruta del certificado
            cert_path = Prompt.ask(
                "Ruta al certificado digital (.p12 o .pfx)",
                default=str(self.certificates_dir / "certificate.p12")
            )
            
            cert_file = Path(cert_path)
            if not cert_file.exists():
                self.console.print("⚠️  El archivo de certificado no existe. Deberás copiarlo manualmente.", style="yellow")
                self.console.print(f"   Ubicación esperada: {self.certificates_dir}")
            
            # Solicitar contraseña
            password = Prompt.ask("Contraseña del certificado", password=True)
            
            # Actualizar .env
            env_file = self.scripts_dir / ".env"
            config_data = {
                'DIANA_CERTIFICATE_PATH': str(cert_file),
                'DIANA_CERTIFICATE_PASSWORD': password
            }
            self._update_env_file(env_file, config_data)
            
            self.console.print("✅ Certificado configurado", style="green")
            return True
            
        except Exception as e:
            self.console.print(f"❌ Error configurando certificado: {e}", style="red")
            return False
    
    def setup_dian_credentials(self) -> bool:
        """
        Configurar credenciales DIAN
        
        Returns:
            bool: True si se configuraron correctamente
        """
        try:
            self.console.print("\n[bold yellow]Configuración de credenciales DIAN:[/bold yellow]")
            
            # Solicitar token
            token = Prompt.ask("Token de autenticación DIAN", password=True)
            
            # Actualizar .env
            env_file = self.scripts_dir / ".env"
            config_data = {
                'DIANA_AUTH_TOKEN': token
            }
            self._update_env_file(env_file, config_data)
            
            self.console.print("✅ Credenciales DIAN configuradas", style="green")
            return True
            
        except Exception as e:
            self.console.print(f"❌ Error configurando credenciales: {e}", style="red")
            return False
    
    def create_sample_files(self) -> bool:
        """
        Crear archivos de ejemplo
        
        Returns:
            bool: True si se crearon correctamente
        """
        try:
            # Crear plantilla JSON
            json_template = self.scripts_dir / "templates" / "sample_invoices.json"
            json_template.parent.mkdir(exist_ok=True)
            
            sample_data = [
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
            
            with open(json_template, 'w', encoding='utf-8') as f:
                json.dump(sample_data, f, indent=2, ensure_ascii=False)
            
            self.console.print(f"📄 Plantilla JSON creada: {json_template}")
            
            # Crear README
            readme_file = self.scripts_dir / "README.md"
            readme_content = """# Scripts de Facturación Electrónica DIANA

## Configuración

1. Copiar `env.example` a `.env`
2. Completar variables de entorno con tus datos
3. Colocar certificado digital en `certificates/`
4. Ejecutar `python setup.py` para configuración inicial

## Uso

### Procesar facturas desde archivo
```bash
python process_invoices.py process -i templates/sample_invoices.json
```

### Crear factura de ejemplo
```bash
python process_invoices.py create-sample -d FAC001 -c 12345678-9 -n "Cliente Ejemplo" -a 23800
```

### Validar configuración
```bash
python process_invoices.py validate-config
```

### Crear plantilla
```bash
python process_invoices.py create-template -t json -o my_template.json
```

## Estructura de archivos

- `config.py`: Configuración base
- `diana_service.py`: Servicio principal DIANA
- `process_invoices.py`: Script CLI para procesamiento
- `setup.py`: Script de instalación
- `requirements.txt`: Dependencias Python
- `env.example`: Plantilla de variables de entorno
- `certificates/`: Directorio para certificados
- `logs/`: Directorio para logs
- `templates/`: Plantillas de facturas
- `output/`: Archivos de salida
"""
            
            with open(readme_file, 'w', encoding='utf-8') as f:
                f.write(readme_content)
            
            self.console.print(f"📄 README creado: {readme_file}")
            
            return True
            
        except Exception as e:
            self.console.print(f"❌ Error creando archivos de ejemplo: {e}", style="red")
            return False
    
    def run_tests(self) -> bool:
        """
        Ejecutar pruebas básicas
        
        Returns:
            bool: True si las pruebas pasaron
        """
        try:
            self.console.print("\n[bold yellow]Ejecutando pruebas básicas...[/bold yellow]")
            
            # Probar importación de módulos
            try:
                from config import load_config
                from diana_service import DianaService
                self.console.print("✅ Módulos importados correctamente")
            except ImportError as e:
                self.console.print(f"❌ Error importando módulos: {e}", style="red")
                return False
            
            # Probar carga de configuración
            try:
                config = load_config()
                self.console.print("✅ Configuración cargada correctamente")
            except Exception as e:
                self.console.print(f"❌ Error cargando configuración: {e}", style="red")
                return False
            
            # Probar creación de servicio
            try:
                service = DianaService(config)
                self.console.print("✅ Servicio DIANA creado correctamente")
            except Exception as e:
                self.console.print(f"❌ Error creando servicio: {e}", style="red")
                return False
            
            self.console.print("✅ Todas las pruebas pasaron", style="green")
            return True
            
        except Exception as e:
            self.console.print(f"❌ Error en pruebas: {e}", style="red")
            return False
    
    def show_next_steps(self) -> None:
        """Mostrar próximos pasos"""
        next_steps = """
[bold green]¡Configuración completada![/bold green]

[bold yellow]Próximos pasos:[/bold yellow]

1. [bold]Completar configuración manual:[/bold]
   • Editar archivo `.env` con datos reales
   • Colocar certificado digital en `certificates/`
   • Obtener token de autenticación DIAN

2. [bold]Probar el sistema:[/bold]
   ```bash
   cd scripts
   python process_invoices.py validate-config
   python process_invoices.py create-sample -d FAC001 -c 12345678-9 -n "Cliente Test" -a 23800
   ```

3. [bold]Procesar facturas:[/bold]
   ```bash
   python process_invoices.py process -i templates/sample_invoices.json -o report.txt
   ```

4. [bold]Documentación:[/bold]
   • Revisar `README.md` para más detalles
   • Consultar documentación DIAN para certificados

[bold blue]¡Listo para facturar electrónicamente![/bold blue]
        """
        
        self.console.print(Panel(next_steps, title="Configuración Completada"))
    
    def run_setup(self) -> bool:
        """
        Ejecutar proceso completo de configuración
        
        Returns:
            bool: True si la configuración fue exitosa
        """
        try:
            self.show_welcome()
            
            if not Confirm.ask("¿Continuar con la configuración?"):
                self.console.print("Configuración cancelada")
                return False
            
            # Verificar Python
            if not self.check_python_version():
                return False
            
            # Instalar dependencias
            if not self.install_dependencies():
                return False
            
            # Crear directorios
            if not self.create_directories():
                return False
            
            # Configurar archivo de entorno
            if not self.setup_environment_file():
                return False
            
            # Configurar certificado
            if not self.setup_certificate():
                return False
            
            # Configurar credenciales DIAN
            if not self.setup_dian_credentials():
                return False
            
            # Crear archivos de ejemplo
            if not self.create_sample_files():
                return False
            
            # Ejecutar pruebas
            if not self.run_tests():
                return False
            
            # Mostrar próximos pasos
            self.show_next_steps()
            
            return True
            
        except KeyboardInterrupt:
            self.console.print("\n🛑 Configuración interrumpida por el usuario")
            return False
        except Exception as e:
            self.console.print(f"❌ Error inesperado: {e}", style="red")
            return False


def main():
    """Función principal"""
    console = Console()
    
    try:
        setup_manager = SetupManager()
        success = setup_manager.run_setup()
        
        if success:
            console.print("✅ Configuración completada exitosamente", style="green")
            return 0
        else:
            console.print("❌ Configuración falló", style="red")
            return 1
            
    except Exception as e:
        console.print(f"❌ Error inesperado: {e}", style="red")
        return 1


if __name__ == "__main__":
    exit(main())
