#!/usr/bin/env python3
"""
Script CLI para procesar facturas electrónicas DIANA
Autor: Sistema 2.0
Fecha: 2024

Este script permite procesar facturas desde la línea de comandos con
funcionalidades avanzadas como procesamiento en lote, validación y reportes.
"""

import json
import csv
import asyncio
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Optional, Any
import concurrent.futures
from dataclasses import dataclass

import click
from rich.console import Console
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.panel import Panel
from rich.align import Align
from loguru import logger

from config import load_config, setup_logging, LoggingConfig, validate_certificate
from diana_service import (
    DianaService, DianaInvoice, DianaCustomer, DianaLineItem, 
    DianaResponse
)


@dataclass
class ProcessingResult:
    """Resultado del procesamiento de una factura"""
    invoice_number: str
    success: bool
    response_code: Optional[str]
    response_message: Optional[str]
    document_uuid: Optional[str]
    processing_time: float
    xml_content: Optional[str] = None
    error_details: Optional[str] = None


class InvoiceProcessor:
    """Procesador de facturas con capacidades avanzadas"""
    
    def __init__(self, config_path: Optional[str] = None):
        """
        Inicializar procesador
        
        Args:
            config_path: Ruta al archivo de configuración
        """
        self.console = Console()
        self.config = load_config()
        self.service = DianaService(self.config)
        self.results: List[ProcessingResult] = []
        
        # Configurar logging
        logging_config = LoggingConfig(
            level="INFO",
            file_path="logs/invoice_processing.log"
        )
        setup_logging(logging_config)
        
        logger.info("Procesador de facturas inicializado")
    
    def validate_environment(self) -> bool:
        """
        Validar entorno de procesamiento
        
        Returns:
            bool: True si el entorno es válido
        """
        try:
            # Validar certificado
            if not validate_certificate(self.config.certificate_path):
                self.console.print("❌ Certificado digital inválido", style="red")
                return False
            
            # Validar configuración
            if not self.config.dian_auth_token or self.config.dian_auth_token == "dummy-token":
                self.console.print("❌ Token de autenticación DIAN no configurado", style="red")
                return False
            
            # Validar URL de servicios
            if not self.config.dian_ws_url:
                self.console.print("❌ URL de servicios DIAN no configurada", style="red")
                return False
            
            self.console.print("✅ Entorno validado correctamente", style="green")
            return True
            
        except Exception as e:
            self.console.print(f"❌ Error validando entorno: {e}", style="red")
            return False
    
    def load_invoices_from_json(self, file_path: str) -> List[DianaInvoice]:
        """
        Cargar facturas desde archivo JSON
        
        Args:
            file_path: Ruta al archivo JSON
            
        Returns:
            List[DianaInvoice]: Lista de facturas cargadas
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            invoices = []
            for item in data:
                # Crear cliente
                customer = DianaCustomer(**item['customer'])
                
                # Crear líneas
                lines = [DianaLineItem(**line) for line in item['lines']]
                
                # Crear factura
                invoice_data = {k: v for k, v in item.items() if k not in ['customer', 'lines']}
                invoice = DianaInvoice(
                    customer=customer,
                    lines=lines,
                    **invoice_data
                )
                invoices.append(invoice)
            
            logger.info(f"Cargadas {len(invoices)} facturas desde {file_path}")
            return invoices
            
        except Exception as e:
            logger.error(f"Error cargando facturas desde JSON: {e}")
            raise
    
    def load_invoices_from_csv(self, file_path: str) -> List[DianaInvoice]:
        """
        Cargar facturas desde archivo CSV
        
        Args:
            file_path: Ruta al archivo CSV
            
        Returns:
            List[DianaInvoice]: Lista de facturas cargadas
        """
        try:
            invoices = []
            
            with open(file_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                
                for row in reader:
                    # Crear cliente
                    customer = DianaCustomer(
                        tax_id=row['customer_tax_id'],
                        business_name=row['customer_business_name'],
                        address=row['customer_address'],
                        city=row['customer_city'],
                        state=row['customer_state'],
                        postal_code=row['customer_postal_code'],
                        email=row.get('customer_email'),
                        phone=row.get('customer_phone')
                    )
                    
                    # Crear línea de producto
                    line = DianaLineItem(
                        id=row['line_id'],
                        description=row['line_description'],
                        quantity=float(row['line_quantity']),
                        unit_price=float(row['line_unit_price']),
                        total_amount=float(row['line_total_amount']),
                        tax_amount=float(row['line_tax_amount']),
                        tax_rate=float(row.get('line_tax_rate', 19.0))
                    )
                    
                    # Crear factura
                    invoice = DianaInvoice(
                        document_number=row['document_number'],
                        issue_date=row['issue_date'],
                        issue_time=row['issue_time'],
                        customer=customer,
                        lines=[line],
                        line_extension_amount=float(row['line_extension_amount']),
                        tax_exclusive_amount=float(row['tax_exclusive_amount']),
                        tax_inclusive_amount=float(row['tax_inclusive_amount']),
                        payable_amount=float(row['payable_amount']),
                        tax_amount=float(row['tax_amount'])
                    )
                    
                    invoices.append(invoice)
            
            logger.info(f"Cargadas {len(invoices)} facturas desde {file_path}")
            return invoices
            
        except Exception as e:
            logger.error(f"Error cargando facturas desde CSV: {e}")
            raise
    
    def process_single_invoice(self, invoice: DianaInvoice) -> ProcessingResult:
        """
        Procesar una factura individual
        
        Args:
            invoice: Factura a procesar
            
        Returns:
            ProcessingResult: Resultado del procesamiento
        """
        start_time = datetime.now()
        
        try:
            # Procesar factura
            response = self.service.process_invoice(invoice)
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            return ProcessingResult(
                invoice_number=invoice.document_number,
                success=response.success,
                response_code=response.response_code,
                response_message=response.response_message,
                document_uuid=response.document_uuid,
                processing_time=processing_time,
                xml_content=response.response_xml
            )
            
        except Exception as e:
            processing_time = (datetime.now() - start_time).total_seconds()
            logger.error(f"Error procesando factura {invoice.document_number}: {e}")
            
            return ProcessingResult(
                invoice_number=invoice.document_number,
                success=False,
                response_code="PROCESSING_ERROR",
                response_message=str(e),
                document_uuid=None,
                processing_time=processing_time,
                error_details=str(e)
            )
    
    def process_invoices_batch(self, invoices: List[DianaInvoice], max_workers: int = 3) -> List[ProcessingResult]:
        """
        Procesar facturas en lote con procesamiento paralelo
        
        Args:
            invoices: Lista de facturas a procesar
            max_workers: Número máximo de workers paralelos
            
        Returns:
            List[ProcessingResult]: Resultados del procesamiento
        """
        results = []
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=self.console
        ) as progress:
            task = progress.add_task("Procesando facturas...", total=len(invoices))
            
            # Procesar en paralelo
            with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
                # Enviar todas las tareas
                future_to_invoice = {
                    executor.submit(self.process_single_invoice, invoice): invoice 
                    for invoice in invoices
                }
                
                # Recolectar resultados
                for future in concurrent.futures.as_completed(future_to_invoice):
                    result = future.result()
                    results.append(result)
                    progress.advance(task)
                    
                    # Mostrar progreso
                    if result.success:
                        self.console.print(f"✅ {result.invoice_number} procesada", style="green")
                    else:
                        self.console.print(f"❌ {result.invoice_number} falló: {result.response_message}", style="red")
        
        self.results = results
        return results
    
    def generate_report(self, output_file: Optional[str] = None) -> str:
        """
        Generar reporte de procesamiento
        
        Args:
            output_file: Archivo de salida para el reporte
            
        Returns:
            str: Contenido del reporte
        """
        if not self.results:
            return "No hay resultados para reportar"
        
        # Estadísticas
        total = len(self.results)
        successful = sum(1 for r in self.results if r.success)
        failed = total - successful
        avg_time = sum(r.processing_time for r in self.results) / total
        
        # Crear tabla
        table = Table(title="Reporte de Procesamiento de Facturas")
        table.add_column("Número", style="cyan")
        table.add_column("Estado", style="green")
        table.add_column("Código", style="yellow")
        table.add_column("Tiempo (s)", style="blue")
        table.add_column("UUID", style="magenta")
        
        for result in self.results:
            status = "✅ Exitoso" if result.success else "❌ Falló"
            table.add_row(
                result.invoice_number,
                status,
                result.response_code or "N/A",
                f"{result.processing_time:.2f}",
                result.document_uuid or "N/A"
            )
        
        # Crear reporte
        report = f"""
# Reporte de Procesamiento de Facturas DIANA
Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Resumen
- Total de facturas: {total}
- Exitosas: {successful} ({successful/total*100:.1f}%)
- Fallidas: {failed} ({failed/total*100:.1f}%)
- Tiempo promedio: {avg_time:.2f} segundos

## Detalles
"""
        
        # Agregar tabla al reporte
        report += "\n" + str(table)
        
        # Guardar reporte si se especifica archivo
        if output_file:
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(report)
            logger.info(f"Reporte guardado en {output_file}")
        
        return report
    
    def save_results_to_json(self, output_file: str) -> None:
        """
        Guardar resultados en formato JSON
        
        Args:
            output_file: Archivo de salida
        """
        try:
            results_data = []
            for result in self.results:
                results_data.append({
                    'invoice_number': result.invoice_number,
                    'success': result.success,
                    'response_code': result.response_code,
                    'response_message': result.response_message,
                    'document_uuid': result.document_uuid,
                    'processing_time': result.processing_time,
                    'error_details': result.error_details
                })
            
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(results_data, f, indent=2, ensure_ascii=False)
            
            logger.info(f"Resultados guardados en {output_file}")
            
        except Exception as e:
            logger.error(f"Error guardando resultados: {e}")
            raise


@click.group()
@click.version_option(version="1.0.0")
def cli():
    """Script CLI para procesar facturas electrónicas DIANA"""
    pass


@cli.command()
@click.option('--input-file', '-i', required=True, help='Archivo de entrada (JSON o CSV)')
@click.option('--output-file', '-o', help='Archivo de salida para el reporte')
@click.option('--workers', '-w', default=3, help='Número de workers paralelos')
@click.option('--validate-only', is_flag=True, help='Solo validar, no enviar a DIAN')
def process(input_file: str, output_file: Optional[str], workers: int, validate_only: bool):
    """Procesar facturas desde archivo"""
    try:
        processor = InvoiceProcessor()
        
        # Validar entorno
        if not processor.validate_environment():
            click.echo("❌ Entorno inválido. Verificar configuración.")
            return
        
        # Cargar facturas
        file_path = Path(input_file)
        if file_path.suffix.lower() == '.json':
            invoices = processor.load_invoices_from_json(input_file)
        elif file_path.suffix.lower() == '.csv':
            invoices = processor.load_invoices_from_csv(input_file)
        else:
            click.echo("❌ Formato de archivo no soportado. Usar JSON o CSV.")
            return
        
        if not invoices:
            click.echo("❌ No se encontraron facturas para procesar.")
            return
        
        click.echo(f"📄 Cargadas {len(invoices)} facturas para procesar")
        
        if validate_only:
            # Solo validar
            click.echo("🔍 Validando facturas...")
            for invoice in invoices:
                is_valid, errors = processor.service.validate_invoice(invoice)
                if is_valid:
                    click.echo(f"✅ {invoice.document_number} válida")
                else:
                    click.echo(f"❌ {invoice.document_number} inválida: {', '.join(errors)}")
        else:
            # Procesar facturas
            results = processor.process_invoices_batch(invoices, workers)
            
            # Generar reporte
            report = processor.generate_report(output_file)
            click.echo(report)
            
            # Guardar resultados JSON
            if output_file:
                json_file = output_file.replace('.txt', '.json')
                processor.save_results_to_json(json_file)
    
    except Exception as e:
        click.echo(f"❌ Error: {e}")
        logger.error(f"Error en comando process: {e}")


@cli.command()
@click.option('--document-number', '-d', required=True, help='Número de documento')
@click.option('--customer-tax-id', required=True, help='NIT del cliente')
@click.option('--customer-name', required=True, help='Nombre del cliente')
@click.option('--amount', required=True, type=float, help='Monto total')
def create_sample(document_number: str, customer_tax_id: str, customer_name: str, amount: float):
    """Crear factura de ejemplo"""
    try:
        processor = InvoiceProcessor()
        
        # Crear cliente
        customer = DianaCustomer(
            tax_id=customer_tax_id,
            business_name=customer_name,
            address="Dirección del cliente",
            city="Ciudad",
            state="Departamento",
            postal_code="000000"
        )
        
        # Calcular montos
        subtotal = amount / 1.19  # Sin IVA
        tax_amount = amount - subtotal
        
        # Crear línea
        line = DianaLineItem(
            id="1",
            description="Producto de ejemplo",
            quantity=1,
            unit_price=subtotal,
            total_amount=subtotal,
            tax_amount=tax_amount,
            tax_rate=19.0
        )
        
        # Crear factura
        invoice = DianaInvoice(
            document_number=document_number,
            issue_date=datetime.now().strftime("%Y-%m-%d"),
            issue_time=datetime.now().strftime("%H:%M:%S"),
            customer=customer,
            lines=[line],
            line_extension_amount=subtotal,
            tax_exclusive_amount=subtotal,
            tax_inclusive_amount=amount,
            payable_amount=amount,
            tax_amount=tax_amount
        )
        
        # Validar
        is_valid, errors = processor.service.validate_invoice(invoice)
        if not is_valid:
            click.echo(f"❌ Factura inválida: {', '.join(errors)}")
            return
        
        # Procesar
        result = processor.process_single_invoice(invoice)
        
        if result.success:
            click.echo(f"✅ Factura {document_number} procesada exitosamente")
            click.echo(f"UUID: {result.document_uuid}")
        else:
            click.echo(f"❌ Error: {result.response_message}")
    
    except Exception as e:
        click.echo(f"❌ Error: {e}")
        logger.error(f"Error en comando create_sample: {e}")


@cli.command()
def validate_config():
    """Validar configuración del sistema"""
    try:
        processor = InvoiceProcessor()
        
        if processor.validate_environment():
            click.echo("✅ Configuración válida")
        else:
            click.echo("❌ Configuración inválida")
    
    except Exception as e:
        click.echo(f"❌ Error: {e}")
        logger.error(f"Error en comando validate_config: {e}")


@cli.command()
@click.option('--template', '-t', default='json', type=click.Choice(['json', 'csv']), help='Tipo de plantilla')
@click.option('--output-file', '-o', required=True, help='Archivo de salida')
def create_template(template: str, output_file: str):
    """Crear plantilla para facturas"""
    try:
        if template == 'json':
            template_data = [
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
            
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(template_data, f, indent=2, ensure_ascii=False)
        
        elif template == 'csv':
            with open(output_file, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow([
                    'document_number', 'issue_date', 'issue_time',
                    'customer_tax_id', 'customer_business_name', 'customer_address',
                    'customer_city', 'customer_state', 'customer_postal_code',
                    'line_id', 'line_description', 'line_quantity', 'line_unit_price',
                    'line_total_amount', 'line_tax_amount', 'line_tax_rate',
                    'line_extension_amount', 'tax_exclusive_amount', 'tax_inclusive_amount',
                    'payable_amount', 'tax_amount'
                ])
                writer.writerow([
                    'FAC001', '2024-01-15', '10:30:00',
                    '12345678-9', 'CLIENTE EJEMPLO SAS', 'Calle 123 # 45-67',
                    'Bogotá', 'Cundinamarca', '110111',
                    '1', 'Producto de ejemplo', '2', '10000',
                    '20000', '3800', '19.0',
                    '20000', '20000', '23800',
                    '23800', '3800'
                ])
        
        click.echo(f"✅ Plantilla {template} creada en {output_file}")
    
    except Exception as e:
        click.echo(f"❌ Error: {e}")
        logger.error(f"Error en comando create_template: {e}")


def main():
    """Función principal"""
    try:
        cli()
    except KeyboardInterrupt:
        click.echo("\n🛑 Proceso interrumpido por el usuario")
    except Exception as e:
        click.echo(f"❌ Error inesperado: {e}")
        logger.error(f"Error inesperado: {e}")


if __name__ == "__main__":
    main()
