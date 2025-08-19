"""
Servicio de Facturación Electrónica DIANA
Autor: Sistema 2.0
Fecha: 2024

Este módulo implementa la funcionalidad completa para generar, firmar y enviar
facturas electrónicas según los estándares DIANA 2.1
"""

import uuid
import hashlib
import base64
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from pathlib import Path
import xml.etree.ElementTree as ET
from xml.dom import minidom

import requests
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.primitives.serialization import pkcs12
from lxml import etree
from pydantic import BaseModel, Field
from loguru import logger
from rich.console import Console
from rich.table import Table

from config import DianaConfig, load_config, setup_logging, LoggingConfig


class DianaLineItem(BaseModel):
    """Modelo para línea de producto en factura DIANA"""
    
    id: str = Field(..., description="ID único de la línea")
    description: str = Field(..., description="Descripción del producto")
    quantity: float = Field(..., description="Cantidad")
    unit_measure: str = Field(default="94", description="Unidad de medida")
    unit_price: float = Field(..., description="Precio unitario")
    total_amount: float = Field(..., description="Monto total")
    discount_amount: float = Field(default=0.0, description="Monto de descuento")
    tax_amount: float = Field(..., description="Monto de impuestos")
    tax_rate: float = Field(default=19.0, description="Tasa de impuesto")
    product_code: Optional[str] = Field(None, description="Código del producto")


class DianaCustomer(BaseModel):
    """Modelo para cliente en factura DIANA"""
    
    tax_id: str = Field(..., description="NIT o documento de identidad")
    business_name: str = Field(..., description="Razón social")
    commercial_name: Optional[str] = Field(None, description="Nombre comercial")
    address: str = Field(..., description="Dirección")
    city: str = Field(..., description="Ciudad")
    state: str = Field(..., description="Departamento")
    country_code: str = Field(default="CO", description="Código de país")
    postal_code: str = Field(..., description="Código postal")
    email: Optional[str] = Field(None, description="Email")
    phone: Optional[str] = Field(None, description="Teléfono")
    customer_type: str = Field(default="PERSONA_JURIDICA", description="Tipo de cliente")


class DianaInvoice(BaseModel):
    """Modelo para factura DIANA"""
    
    document_number: str = Field(..., description="Número de documento")
    issue_date: str = Field(..., description="Fecha de emisión")
    issue_time: str = Field(..., description="Hora de emisión")
    currency: str = Field(default="COP", description="Moneda")
    exchange_rate: float = Field(default=1.0, description="Tasa de cambio")
    operation_type: str = Field(default="10", description="Tipo de operación")
    notes: List[str] = Field(default_factory=list, description="Notas adicionales")
    
    # Totales
    line_extension_amount: float = Field(..., description="Subtotal")
    tax_exclusive_amount: float = Field(..., description="Monto sin impuestos")
    tax_inclusive_amount: float = Field(..., description="Monto con impuestos")
    allowance_total_amount: float = Field(default=0.0, description="Total descuentos")
    charge_total_amount: float = Field(default=0.0, description="Total cargos")
    payable_amount: float = Field(..., description="Monto a pagar")
    
    # Impuestos
    tax_amount: float = Field(..., description="Monto total de impuestos")
    tax_rate: float = Field(default=19.0, description="Tasa de impuesto")
    
    # Participantes
    customer: DianaCustomer = Field(..., description="Datos del cliente")
    lines: List[DianaLineItem] = Field(..., description="Líneas de producto")


class DianaResponse(BaseModel):
    """Modelo para respuesta de servicios DIANA"""
    
    success: bool = Field(..., description="Indica si la operación fue exitosa")
    response_code: Optional[str] = Field(None, description="Código de respuesta")
    response_message: Optional[str] = Field(None, description="Mensaje de respuesta")
    response_xml: Optional[str] = Field(None, description="XML de respuesta")
    document_uuid: Optional[str] = Field(None, description="UUID del documento")
    document_number: Optional[str] = Field(None, description="Número de documento")
    qr_code: Optional[str] = Field(None, description="Código QR")
    pdf_url: Optional[str] = Field(None, description="URL del PDF")


class DianaService:
    """Servicio principal para facturación electrónica DIANA"""
    
    def __init__(self, config: DianaConfig):
        """
        Inicializar servicio DIANA
        
        Args:
            config: Configuración del servicio
        """
        self.config = config
        self.console = Console()
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/xml',
            'Authorization': f'Bearer {config.dian_auth_token}'
        })
        
        logger.info("Servicio DIANA inicializado")
    
    def generate_document_number(self, prefix: str = "FAC") -> str:
        """
        Generar número de documento único
        
        Args:
            prefix: Prefijo del documento
            
        Returns:
            str: Número de documento único
        """
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        random_suffix = str(uuid.uuid4())[:8]
        return f"{prefix}{timestamp}{random_suffix}"
    
    def generate_uuid(self) -> str:
        """
        Generar UUID único para el documento
        
        Returns:
            str: UUID único
        """
        return str(uuid.uuid4())
    
    def calculate_totals(self, lines: List[DianaLineItem]) -> Tuple[float, float, float]:
        """
        Calcular totales de la factura
        
        Args:
            lines: Líneas de producto
            
        Returns:
            Tuple[float, float, float]: (subtotal, impuestos, total)
        """
        subtotal = sum(line.total_amount for line in lines)
        tax_amount = sum(line.tax_amount for line in lines)
        total = subtotal + tax_amount
        
        return subtotal, tax_amount, total
    
    def generate_invoice_xml(self, invoice: DianaInvoice) -> str:
        """
        Generar XML de factura según estándares DIANA 2.1
        
        Args:
            invoice: Datos de la factura
            
        Returns:
            str: XML generado
            
        Raises:
            ValueError: Si hay errores en la generación del XML
        """
        try:
            # Crear elemento raíz
            root = ET.Element("Invoice")
            root.set("xmlns", "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2")
            root.set("xmlns:cac", "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2")
            root.set("xmlns:cbc", "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2")
            root.set("xmlns:ext", "urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2")
            
            # Información básica del documento
            self._add_basic_info(root, invoice)
            
            # Extensiones DIANA
            self._add_diana_extensions(root, invoice)
            
            # Información del emisor
            self._add_supplier_info(root)
            
            # Información del cliente
            self._add_customer_info(root, invoice.customer)
            
            # Líneas de producto
            self._add_invoice_lines(root, invoice.lines)
            
            # Totales
            self._add_totals(root, invoice)
            
            # Generar XML formateado
            xml_string = ET.tostring(root, encoding='unicode')
            dom = minidom.parseString(xml_string)
            formatted_xml = dom.toprettyxml(indent="  ")
            
            logger.info(f"XML generado para factura {invoice.document_number}")
            return formatted_xml
            
        except Exception as e:
            logger.error(f"Error generando XML: {e}")
            raise ValueError(f"Error en generación de XML: {e}")
    
    def _add_basic_info(self, root: ET.Element, invoice: DianaInvoice) -> None:
        """Agregar información básica del documento"""
        ET.SubElement(root, "cbc:UBLVersionID").text = "2.1"
        ET.SubElement(root, "cbc:CustomizationID").text = "DIAN 2.1"
        ET.SubElement(root, "cbc:ProfileID").text = "DIAN 2.1: Factura Electrónica de Venta"
        ET.SubElement(root, "cbc:ProfileExecutionID").text = "1"
        ET.SubElement(root, "cbc:ID").text = invoice.document_number
        ET.SubElement(root, "cbc:UUID").text = self.generate_uuid()
        ET.SubElement(root, "cbc:IssueDate").text = invoice.issue_date
        ET.SubElement(root, "cbc:IssueTime").text = invoice.issue_time
        ET.SubElement(root, "cbc:InvoiceTypeCode").text = "01"
        ET.SubElement(root, "cbc:DocumentCurrencyCode").text = invoice.currency
        ET.SubElement(root, "cbc:LineCountNumeric").text = str(len(invoice.lines))
    
    def _add_diana_extensions(self, root: ET.Element, invoice: DianaInvoice) -> None:
        """Agregar extensiones específicas de DIANA"""
        extensions = ET.SubElement(root, "ext:UBLExtensions")
        extension = ET.SubElement(extensions, "ext:UBLExtension")
        content = ET.SubElement(extension, "ext:ExtensionContent")
        
        # Extensión DIANA
        dian_ext = ET.SubElement(content, "sts:DianExtensions")
        dian_ext.set("xmlns:sts", "http://www.dian.gov.co/contratos/facturaelectronica/v1/Structures")
        
        # Control de factura
        control = ET.SubElement(dian_ext, "sts:InvoiceControl")
        ET.SubElement(control, "sts:InvoiceAuthorization").text = self.config.software_id
        
        # Período de autorización
        period = ET.SubElement(control, "sts:AuthorizationPeriod")
        start_date = datetime.now().strftime("%Y-%m-%d")
        end_date = (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d")
        ET.SubElement(period, "cbc:StartDate").text = start_date
        ET.SubElement(period, "cbc:EndDate").text = end_date
        
        # Facturas autorizadas
        auth_invoices = ET.SubElement(control, "sts:AuthorizedInvoices")
        ET.SubElement(auth_invoices, "sts:Prefix").text = invoice.document_number[:3]
        ET.SubElement(auth_invoices, "sts:From").text = "1"
        ET.SubElement(auth_invoices, "sts:To").text = "99999999"
        
        # Origen de la factura
        source = ET.SubElement(dian_ext, "sts:InvoiceSource")
        id_code = ET.SubElement(source, "cbc:IdentificationCode")
        id_code.text = "CO"
        id_code.set("listAgencyID", "6")
        id_code.set("listAgencyName", "United Nations Economic Commission for Europe")
        id_code.set("listName", "Electronic Commerce Code")
    
    def _add_supplier_info(self, root: ET.Element) -> None:
        """Agregar información del emisor"""
        supplier = ET.SubElement(root, "cac:AccountingSupplierParty")
        party = ET.SubElement(supplier, "cac:Party")
        
        # Identificación
        identification = ET.SubElement(party, "cac:PartyIdentification")
        id_elem = ET.SubElement(identification, "cbc:ID")
        id_elem.text = self.config.issuer_nit
        id_elem.set("schemeID", "31")
        id_elem.set("schemeName", "NIT")
        
        # Nombre
        party_name = ET.SubElement(party, "cac:PartyName")
        ET.SubElement(party_name, "cbc:Name").text = self.config.issuer_business_name
        
        # Dirección
        address = ET.SubElement(party, "cac:PostalAddress")
        ET.SubElement(address, "cbc:StreetName").text = self.config.issuer_address
        ET.SubElement(address, "cbc:CityName").text = self.config.issuer_city
        ET.SubElement(address, "cbc:CountrySubentity").text = self.config.issuer_state
        ET.SubElement(address, "cbc:CountrySubentityCode").text = self.config.issuer_state
        
        country = ET.SubElement(address, "cac:Country")
        ET.SubElement(country, "cbc:IdentificationCode").text = self.config.issuer_country_code
        
        # Responsabilidades fiscales
        if self.config.issuer_fiscal_responsibilities:
            tax_scheme = ET.SubElement(party, "cac:PartyTaxScheme")
            scheme = ET.SubElement(tax_scheme, "cac:TaxScheme")
            ET.SubElement(scheme, "cbc:ID").text = self.config.issuer_fiscal_responsibilities[0]
        
        # Contacto
        contact = ET.SubElement(party, "cac:Contact")
        ET.SubElement(contact, "cbc:Telephone").text = self.config.issuer_phone
        ET.SubElement(contact, "cbc:ElectronicMail").text = self.config.issuer_email
    
    def _add_customer_info(self, root: ET.Element, customer: DianaCustomer) -> None:
        """Agregar información del cliente"""
        customer_elem = ET.SubElement(root, "cac:AccountingCustomerParty")
        party = ET.SubElement(customer_elem, "cac:Party")
        
        # Identificación
        identification = ET.SubElement(party, "cac:PartyIdentification")
        id_elem = ET.SubElement(identification, "cbc:ID")
        id_elem.text = customer.tax_id
        
        if customer.customer_type == "PERSONA_JURIDICA":
            id_elem.set("schemeID", "31")
            id_elem.set("schemeName", "NIT")
        else:
            id_elem.set("schemeID", "13")
            id_elem.set("schemeName", "Cédula de Ciudadanía")
        
        # Nombre
        party_name = ET.SubElement(party, "cac:PartyName")
        ET.SubElement(party_name, "cbc:Name").text = customer.business_name
        
        # Dirección
        address = ET.SubElement(party, "cac:PostalAddress")
        ET.SubElement(address, "cbc:StreetName").text = customer.address
        ET.SubElement(address, "cbc:CityName").text = customer.city
        ET.SubElement(address, "cbc:CountrySubentity").text = customer.state
        ET.SubElement(address, "cbc:CountrySubentityCode").text = customer.state
        
        country = ET.SubElement(address, "cac:Country")
        ET.SubElement(country, "cbc:IdentificationCode").text = customer.country_code
        
        # Contacto si está disponible
        if customer.phone or customer.email:
            contact = ET.SubElement(party, "cac:Contact")
            if customer.phone:
                ET.SubElement(contact, "cbc:Telephone").text = customer.phone
            if customer.email:
                ET.SubElement(contact, "cbc:ElectronicMail").text = customer.email
    
    def _add_invoice_lines(self, root: ET.Element, lines: List[DianaLineItem]) -> None:
        """Agregar líneas de producto"""
        for i, line in enumerate(lines, 1):
            line_elem = ET.SubElement(root, "cac:InvoiceLine")
            ET.SubElement(line_elem, "cbc:ID").text = str(i)
            
            # Cantidad
            quantity = ET.SubElement(line_elem, "cbc:InvoicedQuantity")
            quantity.text = str(line.quantity)
            quantity.set("unitCode", line.unit_measure)
            
            # Monto de la línea
            ET.SubElement(line_elem, "cbc:LineExtensionAmount").text = f"{line.total_amount:.2f}"
            ET.SubElement(line_elem, "cbc:LineExtensionAmount").set("currencyID", "COP")
            
            # Información del producto
            item = ET.SubElement(line_elem, "cac:Item")
            ET.SubElement(item, "cbc:Description").text = line.description
            ET.SubElement(item, "cbc:Name").text = line.description
            
            if line.product_code:
                seller_id = ET.SubElement(item, "cbc:SellersItemIdentification")
                ET.SubElement(seller_id, "cbc:ID").text = line.product_code
            
            # Precio
            price = ET.SubElement(line_elem, "cac:Price")
            ET.SubElement(price, "cbc:PriceAmount").text = f"{line.unit_price:.2f}"
            ET.SubElement(price, "cbc:PriceAmount").set("currencyID", "COP")
            
            # Impuestos
            tax_total = ET.SubElement(line_elem, "cac:TaxTotal")
            ET.SubElement(tax_total, "cbc:TaxAmount").text = f"{line.tax_amount:.2f}"
            ET.SubElement(tax_total, "cbc:TaxAmount").set("currencyID", "COP")
            
            tax_subtotal = ET.SubElement(tax_total, "cac:TaxSubtotal")
            ET.SubElement(tax_subtotal, "cbc:TaxableAmount").text = f"{line.total_amount:.2f}"
            ET.SubElement(tax_subtotal, "cbc:TaxableAmount").set("currencyID", "COP")
            ET.SubElement(tax_subtotal, "cbc:TaxAmount").text = f"{line.tax_amount:.2f}"
            ET.SubElement(tax_subtotal, "cbc:TaxAmount").set("currencyID", "COP")
            ET.SubElement(tax_subtotal, "cbc:Percent").text = str(line.tax_rate)
            
            tax_category = ET.SubElement(tax_subtotal, "cac:TaxCategory")
            ET.SubElement(tax_category, "cbc:ID").text = "O" if line.tax_rate > 0 else "Z"
            ET.SubElement(tax_category, "cbc:Percent").text = str(line.tax_rate)
            
            tax_scheme = ET.SubElement(tax_category, "cac:TaxScheme")
            ET.SubElement(tax_scheme, "cbc:ID").text = "01"
    
    def _add_totals(self, root: ET.Element, invoice: DianaInvoice) -> None:
        """Agregar totales de la factura"""
        # Total de impuestos
        tax_total = ET.SubElement(root, "cac:TaxTotal")
        ET.SubElement(tax_total, "cbc:TaxAmount").text = f"{invoice.tax_amount:.2f}"
        ET.SubElement(tax_total, "cbc:TaxAmount").set("currencyID", invoice.currency)
        
        tax_subtotal = ET.SubElement(tax_total, "cac:TaxSubtotal")
        ET.SubElement(tax_subtotal, "cbc:TaxableAmount").text = f"{invoice.line_extension_amount:.2f}"
        ET.SubElement(tax_subtotal, "cbc:TaxableAmount").set("currencyID", invoice.currency)
        ET.SubElement(tax_subtotal, "cbc:TaxAmount").text = f"{invoice.tax_amount:.2f}"
        ET.SubElement(tax_subtotal, "cbc:TaxAmount").set("currencyID", invoice.currency)
        ET.SubElement(tax_subtotal, "cbc:Percent").text = str(invoice.tax_rate)
        
        tax_category = ET.SubElement(tax_subtotal, "cac:TaxCategory")
        ET.SubElement(tax_category, "cbc:ID").text = "O" if invoice.tax_rate > 0 else "Z"
        ET.SubElement(tax_category, "cbc:Percent").text = str(invoice.tax_rate)
        
        tax_scheme = ET.SubElement(tax_category, "cac:TaxScheme")
        ET.SubElement(tax_scheme, "cbc:ID").text = "01"
        
        # Totales monetarios
        monetary_total = ET.SubElement(root, "cac:LegalMonetaryTotal")
        ET.SubElement(monetary_total, "cbc:LineExtensionAmount").text = f"{invoice.line_extension_amount:.2f}"
        ET.SubElement(monetary_total, "cbc:LineExtensionAmount").set("currencyID", invoice.currency)
        ET.SubElement(monetary_total, "cbc:TaxExclusiveAmount").text = f"{invoice.tax_exclusive_amount:.2f}"
        ET.SubElement(monetary_total, "cbc:TaxExclusiveAmount").set("currencyID", invoice.currency)
        ET.SubElement(monetary_total, "cbc:TaxInclusiveAmount").text = f"{invoice.tax_inclusive_amount:.2f}"
        ET.SubElement(monetary_total, "cbc:TaxInclusiveAmount").set("currencyID", invoice.currency)
        ET.SubElement(monetary_total, "cbc:AllowanceTotalAmount").text = f"{invoice.allowance_total_amount:.2f}"
        ET.SubElement(monetary_total, "cbc:AllowanceTotalAmount").set("currencyID", invoice.currency)
        ET.SubElement(monetary_total, "cbc:ChargeTotalAmount").text = f"{invoice.charge_total_amount:.2f}"
        ET.SubElement(monetary_total, "cbc:ChargeTotalAmount").set("currencyID", invoice.currency)
        ET.SubElement(monetary_total, "cbc:PayableAmount").text = f"{invoice.payable_amount:.2f}"
        ET.SubElement(monetary_total, "cbc:PayableAmount").set("currencyID", invoice.currency)
    
    def sign_document(self, xml_content: str) -> str:
        """
        Firmar documento XML con certificado digital
        
        Args:
            xml_content: Contenido XML a firmar
            
        Returns:
            str: XML firmado
            
        Raises:
            ValueError: Si hay errores en la firma
        """
        try:
            # Cargar certificado
            with open(self.config.certificate_path, 'rb') as cert_file:
                private_key, certificate, additional_certificates = pkcs12.load_key_and_certificates(
                    cert_file.read(),
                    self.config.certificate_password.encode('utf-8')
                )
            
            # Parsear XML
            root = etree.fromstring(xml_content.encode('utf-8'))
            
            # Crear firma
            signed_info = self._create_signed_info(root)
            
            # Firmar con clave privada
            signature = private_key.sign(
                signed_info,
                padding.PKCS1v15(),
                hashes.SHA256()
            )
            
            # Agregar firma al XML
            signed_xml = self._add_signature_to_xml(root, signature, certificate)
            
            logger.info("Documento firmado exitosamente")
            return signed_xml
            
        except Exception as e:
            logger.error(f"Error firmando documento: {e}")
            raise ValueError(f"Error en firma digital: {e}")
    
    def _create_signed_info(self, root: etree._Element) -> bytes:
        """Crear información de firma"""
        # Implementación simplificada - en producción usar librería específica
        canonical_xml = etree.tostring(root, method='c14n')
        return hashlib.sha256(canonical_xml).digest()
    
    def _add_signature_to_xml(self, root: etree._Element, signature: bytes, certificate) -> str:
        """Agregar firma al XML"""
        # Implementación simplificada - en producción usar librería específica
        signature_b64 = base64.b64encode(signature).decode('utf-8')
        
        # Crear elemento de firma
        signature_elem = etree.SubElement(root, "ds:Signature")
        signature_elem.set("xmlns:ds", "http://www.w3.org/2000/09/xmldsig#")
        
        signed_info = etree.SubElement(signature_elem, "ds:SignedInfo")
        etree.SubElement(signed_info, "ds:SignatureValue").text = signature_b64
        
        return etree.tostring(root, encoding='unicode', pretty_print=True)
    
    def send_to_dian(self, xml_content: str) -> DianaResponse:
        """
        Enviar documento a la DIAN
        
        Args:
            xml_content: XML del documento a enviar
            
        Returns:
            DianaResponse: Respuesta de la DIAN
        """
        try:
            logger.info("Enviando documento a la DIAN...")
            
            # Realizar petición HTTP
            response = self.session.post(
                self.config.dian_ws_url,
                data=xml_content,
                timeout=60
            )
            
            # Procesar respuesta
            if response.status_code == 200:
                response_data = response.text
                return self._parse_dian_response(response_data, success=True)
            else:
                logger.error(f"Error HTTP {response.status_code}: {response.text}")
                return DianaResponse(
                    success=False,
                    response_code=str(response.status_code),
                    response_message=f"Error HTTP: {response.status_code}"
                )
                
        except requests.exceptions.Timeout:
            logger.error("Timeout al enviar documento a la DIAN")
            return DianaResponse(
                success=False,
                response_code="TIMEOUT",
                response_message="Timeout en la comunicación con la DIAN"
            )
        except requests.exceptions.RequestException as e:
            logger.error(f"Error de conexión: {e}")
            return DianaResponse(
                success=False,
                response_code="CONNECTION_ERROR",
                response_message=f"Error de conexión: {e}"
            )
        except Exception as e:
            logger.error(f"Error inesperado: {e}")
            return DianaResponse(
                success=False,
                response_code="UNKNOWN_ERROR",
                response_message=f"Error inesperado: {e}"
            )
    
    def _parse_dian_response(self, response_xml: str, success: bool) -> DianaResponse:
        """
        Parsear respuesta de la DIAN
        
        Args:
            response_xml: XML de respuesta
            success: Si la operación fue exitosa
            
        Returns:
            DianaResponse: Respuesta parseada
        """
        try:
            # Parsear XML de respuesta
            root = etree.fromstring(response_xml.encode('utf-8'))
            
            # Extraer información básica
            response_code = root.find(".//cbc:ResponseCode")
            response_message = root.find(".//cbc:ResponseDescription")
            document_uuid = root.find(".//cbc:UUID")
            document_number = root.find(".//cbc:ID")
            
            return DianaResponse(
                success=success,
                response_code=response_code.text if response_code is not None else None,
                response_message=response_message.text if response_message is not None else None,
                response_xml=response_xml,
                document_uuid=document_uuid.text if document_uuid is not None else None,
                document_number=document_number.text if document_number is not None else None
            )
            
        except Exception as e:
            logger.error(f"Error parseando respuesta DIAN: {e}")
            return DianaResponse(
                success=success,
                response_xml=response_xml,
                response_message=f"Error parseando respuesta: {e}"
            )
    
    def validate_invoice(self, invoice: DianaInvoice) -> Tuple[bool, List[str]]:
        """
        Validar factura antes del envío
        
        Args:
            invoice: Factura a validar
            
        Returns:
            Tuple[bool, List[str]]: (válida, lista de errores)
        """
        errors = []
        
        # Validaciones básicas
        if not invoice.document_number:
            errors.append("Número de documento es requerido")
        
        if not invoice.customer.tax_id:
            errors.append("NIT/Documento del cliente es requerido")
        
        if not invoice.customer.business_name:
            errors.append("Nombre del cliente es requerido")
        
        if len(invoice.lines) == 0:
            errors.append("La factura debe tener al menos una línea de producto")
        
        if invoice.payable_amount <= 0:
            errors.append("El monto total debe ser mayor a cero")
        
        # Validar totales
        subtotal, tax_amount, total = self.calculate_totals(invoice.lines)
        if abs(subtotal - invoice.line_extension_amount) > 0.01:
            errors.append("El subtotal no coincide con las líneas de producto")
        
        if abs(total - invoice.payable_amount) > 0.01:
            errors.append("El total no coincide con el cálculo")
        
        # Validar líneas
        for i, line in enumerate(invoice.lines, 1):
            if line.quantity <= 0:
                errors.append(f"Línea {i}: La cantidad debe ser mayor a cero")
            
            if line.unit_price <= 0:
                errors.append(f"Línea {i}: El precio unitario debe ser mayor a cero")
            
            calculated_total = line.quantity * line.unit_price
            if abs(calculated_total - line.total_amount) > 0.01:
                errors.append(f"Línea {i}: El total no coincide con cantidad * precio")
        
        return len(errors) == 0, errors
    
    def process_invoice(self, invoice: DianaInvoice) -> DianaResponse:
        """
        Procesar factura completa: validar, generar XML, firmar y enviar
        
        Args:
            invoice: Factura a procesar
            
        Returns:
            DianaResponse: Resultado del procesamiento
        """
        try:
            logger.info(f"Iniciando procesamiento de factura {invoice.document_number}")
            
            # 1. Validar factura
            is_valid, errors = self.validate_invoice(invoice)
            if not is_valid:
                logger.error(f"Factura inválida: {errors}")
                return DianaResponse(
                    success=False,
                    response_code="VALIDATION_ERROR",
                    response_message=f"Errores de validación: {', '.join(errors)}"
                )
            
            # 2. Generar XML
            xml_content = self.generate_invoice_xml(invoice)
            
            # 3. Firmar documento
            signed_xml = self.sign_document(xml_content)
            
            # 4. Enviar a la DIAN
            response = self.send_to_dian(signed_xml)
            
            if response.success:
                logger.info(f"Factura {invoice.document_number} procesada exitosamente")
            else:
                logger.error(f"Error procesando factura {invoice.document_number}: {response.response_message}")
            
            return response
            
        except Exception as e:
            logger.error(f"Error procesando factura: {e}")
            return DianaResponse(
                success=False,
                response_code="PROCESSING_ERROR",
                response_message=f"Error en procesamiento: {e}"
            )


def main():
    """Función principal para pruebas del servicio"""
    try:
        # Configurar logging
        logging_config = LoggingConfig(level="INFO")
        setup_logging(logging_config)
        
        # Cargar configuración
        config = load_config()
        
        # Crear servicio
        service = DianaService(config)
        
        # Crear factura de prueba
        customer = DianaCustomer(
            tax_id="12345678-9",
            business_name="CLIENTE DE PRUEBA SAS",
            address="Calle 123 # 45-67",
            city="Bogotá",
            state="Cundinamarca",
            postal_code="110111"
        )
        
        lines = [
            DianaLineItem(
                id="1",
                description="Producto de prueba",
                quantity=2,
                unit_price=10000,
                total_amount=20000,
                tax_amount=3800,
                tax_rate=19.0
            )
        ]
        
        invoice = DianaInvoice(
            document_number=service.generate_document_number(),
            issue_date=datetime.now().strftime("%Y-%m-%d"),
            issue_time=datetime.now().strftime("%H:%M:%S"),
            customer=customer,
            lines=lines,
            line_extension_amount=20000,
            tax_exclusive_amount=20000,
            tax_inclusive_amount=23800,
            payable_amount=23800,
            tax_amount=3800
        )
        
        # Procesar factura
        response = service.process_invoice(invoice)
        
        # Mostrar resultado
        console = Console()
        if response.success:
            console.print("✅ Factura procesada exitosamente", style="green")
            console.print(f"UUID: {response.document_uuid}")
            console.print(f"Número: {response.document_number}")
        else:
            console.print("❌ Error procesando factura", style="red")
            console.print(f"Error: {response.response_message}")
        
    except Exception as e:
        logger.error(f"Error en función principal: {e}")
        exit(1)


if __name__ == "__main__":
    main()
