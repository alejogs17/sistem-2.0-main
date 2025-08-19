#!/usr/bin/env python3
"""
Script para generar facturas electrónicas individuales en formato XML UBL 2.1
Autor: Sistema 2.0
Fecha: 2024

Este script toma los datos de una factura y genera el XML UBL 2.1 firmado
para envío a la DIAN.
"""

import json
import argparse
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, Any

# Agregar el directorio actual al path para importar módulos locales
sys.path.append(str(Path(__file__).parent))

from config import load_config, setup_logging, LoggingConfig
from diana_service import DianaService, DianaInvoice, DianaCustomer, DianaLineItem


def load_invoice_data(input_file: str) -> Dict[str, Any]:
    """Cargar datos de la factura desde archivo JSON"""
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error cargando datos de factura: {e}")
        sys.exit(1)


def convert_to_diana_invoice(data: Dict[str, Any]) -> DianaInvoice:
    """Convertir datos JSON a objeto DianaInvoice"""
    
    # Crear cliente
    customer = DianaCustomer(
        tax_id=data['customer']['tax_id'],
        business_name=data['customer']['business_name'],
        commercial_name=data['customer'].get('commercial_name'),
        address=data['customer']['address'],
        city=data['customer']['city'],
        state=data['customer']['state'],
        country_code=data['customer']['country_code'],
        postal_code=data['customer']['postal_code'],
        email=data['customer']['email'],
        phone=data['customer']['phone'],
        customer_type=data['customer']['customer_type']
    )
    
    # Crear líneas de producto
    lines = []
    for line_data in data['lines']:
        line = DianaLineItem(
            id=line_data['id'],
            description=line_data['description'],
            quantity=line_data['quantity'],
            unit_measure=line_data['unit_measure'],
            unit_price=line_data['unit_price'],
            total_amount=line_data['total_amount'],
            discount_amount=line_data['discount_amount'],
            tax_amount=line_data['tax_amount'],
            tax_rate=line_data['tax_rate'],
            product_code=line_data['product_code']
        )
        lines.append(line)
    
    # Crear factura
    invoice = DianaInvoice(
        document_number=data['document_number'],
        issue_date=data['issue_date'],
        issue_time=data['issue_time'],
        currency=data['currency'],
        exchange_rate=data['exchange_rate'],
        operation_type=data['operation_type'],
        notes=data['notes'],
        line_extension_amount=data['line_extension_amount'],
        tax_exclusive_amount=data['tax_exclusive_amount'],
        tax_inclusive_amount=data['tax_inclusive_amount'],
        allowance_total_amount=data['allowance_total_amount'],
        charge_total_amount=data['charge_total_amount'],
        payable_amount=data['payable_amount'],
        tax_amount=data['tax_amount'],
        tax_rate=data['tax_rate'],
        customer=customer,
        lines=lines
    )
    
    return invoice


def save_result(output_dir: str, result: Dict[str, Any]):
    """Guardar resultado en archivo JSON"""
    output_file = Path(output_dir) / 'result.json'
    output_file.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)


def main():
    parser = argparse.ArgumentParser(description='Generar factura electrónica XML UBL 2.1')
    parser.add_argument('--input', required=True, help='Archivo JSON con datos de la factura')
    parser.add_argument('--output', required=True, help='Directorio de salida')
    parser.add_argument('--format', default='xml', choices=['xml', 'json'], help='Formato de salida')
    
    args = parser.parse_args()
    
    # Configurar logging
    logging_config = LoggingConfig(
        level="INFO",
        file_path="logs/generate_invoice.log"
    )
    setup_logging(logging_config)
    
    try:
        # Cargar configuración
        config = load_config()
        
        # Inicializar servicio DIANA
        service = DianaService(config)
        
        # Cargar datos de la factura
        invoice_data = load_invoice_data(args.input)
        
        # Convertir a objeto DianaInvoice
        invoice = convert_to_diana_invoice(invoice_data)
        
        # Validar factura
        validation = service.validate_invoice(invoice)
        if not validation['valid']:
            result = {
                'success': False,
                'error': 'Factura inválida',
                'validation_errors': validation['errors']
            }
            save_result(args.output, result)
            sys.exit(1)
        
        # Generar XML UBL 2.1
        xml_content = service.generate_invoice_xml(invoice)
        
        # Firmar documento
        signed_xml = service.sign_document(xml_content)
        
        # Enviar a la DIAN
        response = service.send_to_dian(signed_xml)
        
        # Preparar resultado
        result = {
            'success': response.success,
            'document_uuid': response.document_uuid,
            'document_number': invoice.document_number,
            'response_code': response.response_code,
            'response_message': response.response_message,
            'xml_content': signed_xml if response.success else None
        }
        
        # Guardar resultado
        save_result(args.output, result)
        
        # Guardar XML si fue exitoso
        if response.success and args.format == 'xml':
            xml_file = Path(args.output) / f"factura_{invoice.document_number}.xml"
            with open(xml_file, 'w', encoding='utf-8') as f:
                f.write(signed_xml)
        
        print(f"Procesamiento completado: {'Éxito' if response.success else 'Error'}")
        
    except Exception as e:
        result = {
            'success': False,
            'error': str(e)
        }
        save_result(args.output, result)
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
