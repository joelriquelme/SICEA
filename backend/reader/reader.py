from typing import Dict, Any

import pdfplumber
from pathlib import Path
import pandas as pd
import re
from datetime import datetime
from reader.models import Meter, Bill, Charge

class BillDetector:
    @staticmethod
    def detect_provider(file_path: str) -> str:
        """
        Detect whether the bill is from Enel (electricity) or Aguas Andinas (water).
        Returns: "enel", "aguas", or "unknown"
        """
        try:
            with pdfplumber.open(file_path) as pdf:
                text = ""
                for page in pdf.pages[:2]:  # leer solo primeras páginas, más rápido
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text.lower()

            if "agua" in text or "Agua" in text or "AGUA" in text:
                return "aguas"
            if "Electricidad" in text or "electricidad" in text or "ELECTRICIDAD" in text:
                return "enel"
            return "unknown"

        except Exception:
            return "unknown"

class AguasAndinasReader:
    def __init__(self):
        self.all_data = []

    @staticmethod
    def extract_main_charges(text: str) -> list:
        """
        Extrae todos los cargos principales de una boleta de agua de forma dinámica.
        Captura cualquier línea entre el inicio del cuadro y antes de "El valor neto".
        Incluye descuentos que aparecen después de TOTAL VENTA.
        """
        charges = []
        
        # Extraer la sección de cargos (entre VENCIMIENTO y "El valor neto")
        # Esto incluye cargos antes y después de "TOTAL VENTA" (como descuentos)
        charge_section_match = re.search(
            r'VENCIMIENTO.*?TOTAL A PAGAR.*?\n(.*?)(?:El valor neto|Acogido Pago|Los valores con IVA)',
            text,
            re.DOTALL
        )
        
        if charge_section_match:
            charge_section = charge_section_match.group(1)
            
            # Patrones dinámicos para capturar cargos
            # Formato 1: NOMBRE (con paréntesis) valor1 valor2 o solo valor
            # Formato 2: NOMBRE valor1 valor2 (con cantidad y monto)
            # Formato 3: NOMBRE valor (solo monto)
            
            for line in charge_section.split('\n'):
                line = line.strip()
                if not line:
                    continue
                
                # Patrón flexible que captura nombre (incluyendo paréntesis), y uno o dos valores numéricos (positivos o negativos)
                # Ejemplo: "IVA (19%) 23.941" o "CONSUMO AGUA 40,00 18.464" o "DESCUENTO LEY REDONDEO -7"
                match = re.match(r'^([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s\(\)%\d]+?)\s+(-?[\d.,]+)(?:\s+(-?[\d.,]+))?\s*$', line)
                
                if match:
                    charge_name = match.group(1).strip()
                    first_value = match.group(2)
                    second_value = match.group(3)
                    
                    if second_value:
                        # Tiene dos valores: cantidad y monto
                        value = float(first_value.replace('.', '').replace(',', '.'))
                        charge_amount = float(second_value.replace('.', '').replace(',', '.'))
                        
                        # Determinar tipo de valor según el nombre del cargo
                        value_type = 'm3'  # Por defecto para agua
                        if 'CARGO FIJO' in charge_name or 'DESPACHO' in charge_name:
                            value_type = 'unidad'
                        
                        charges.append({
                            'name': charge_name,
                            'value': value,
                            'value_type': value_type,
                            'charge': int(charge_amount)
                        })
                    else:
                        # Solo tiene un valor: es el monto
                        charge_amount = float(first_value.replace('.', '').replace(',', '.'))
                        
                        charges.append({
                            'name': charge_name,
                            'value': 1,
                            'value_type': 'unidad',
                            'charge': int(charge_amount)
                        })
        
        return charges

    @staticmethod
    def extract_unit_rates(text: str) -> list:
        """
        Extrae todas las tarifas unitarias del cuadro 'aguas informa' de forma dinámica.
        Captura cualquier tarifa que aparezca en el formato: "descripción = $ valor"
        """
        rates = []
        
        # Buscar la sección de tarifas (desde "Los valores con IVA" hasta "Plantas de Tratamiento" o similar)
        rate_section_match = re.search(
            r'Los valores con IVA.*?son los siguientes:(.*?)(?:Plantas de Tratamiento|LECTURA ACTUAL|Corte o Reposición)',
            text,
            re.DOTALL
        )
        
        if rate_section_match:
            rate_section = rate_section_match.group(1)
            
            # Patrón para capturar tarifas en formato: "descripción = $ valor"
            rate_pattern = r'([A-Za-zÁÉÍÓÚáéíóúñÑ][A-Za-zÁÉÍÓÚáéíóúñÑ\s\d°]+?)\s*[=:]\s*\$\s*([\d.,]+)'
            
            for match in re.finditer(rate_pattern, rate_section):
                rate_name = match.group(1).strip()
                rate_value = float(match.group(2).replace('.', '').replace(',', '.'))
                
                # Normalizar el nombre para que sea consistente
                if not rate_name.startswith('Tarifa'):
                    rate_name = f'Tarifa {rate_name}'
                
                rates.append({
                    'name': rate_name,
                    'value': rate_value,
                    'value_type': '$/unidad',
                    'charge': 0  # Las tarifas son informativas, no cargos
                })
        
        # También capturar tarifas de Corte o Reposición que pueden estar fuera de esa sección
        corte_patterns = [
            (r'Corte o Reposición 1era instancia[:\s]*\$\s*([\d.,]+)', 'Tarifa Corte o Reposición 1era instancia'),
            (r'Corte o Reposición 2da instancia[:\s]*\$\s*([\d.,]+)', 'Tarifa Corte o Reposición 2da instancia'),
        ]
        
        for pattern, rate_name in corte_patterns:
            match = re.search(pattern, text)
            if match:
                # Evitar duplicados
                if not any(r['name'] == rate_name for r in rates):
                    rate_value = float(match.group(1).replace('.', '').replace(',', '.'))
                    rates.append({
                        'name': rate_name,
                        'value': rate_value,
                        'value_type': '$/unidad',
                        'charge': 0
                    })
        
        return rates

    @staticmethod
    def extract_consumption_details(text: str) -> list:
        """
        Extrae el detalle de consumo de forma dinámica.
        Captura lecturas, consumos y otros datos informativos.
        """
        details = []
        
        # Patrones comunes que pueden aparecer
        detail_patterns = [
            # Lecturas con fecha y valor (SIN incluir fecha en el nombre para agrupar)
            (r'LECTURA ACTUAL\s+(\d{2}-[A-Z]{3}-\d{4})\s+([\d.,]+)\s+m3', 'Lectura actual', 'm3', 'date_value'),
            (r'LECTURA ANTERIOR\s+(\d{2}-[A-Z]{3}-\d{4})\s+([\d.,]+)\s+m3', 'Lectura anterior', 'm3', 'date_value'),
            
            # Valores de consumo
            (r'DIFERENCIA DE LECTURAS\s+([\d.,]+)\s+m3', 'Diferencia de lecturas', 'm3', 'value'),
            (r'CONSUMO TOTAL\s+([\d.,]+)\s+m3', 'Consumo total', 'm3', 'value'),
            (r'LÍMITE DE SOBRECONSUMO\s+([\d.,]+)\s+M3', 'Límite de sobreconsumo', 'm3', 'value'),
            
            # Información del medidor
            (r'Número de Medidor\s+(\d+)', 'Número de medidor', 'número', 'value'),
            (r'Diametro Arranque individual[-\s]+([\d]+)', 'Diámetro arranque', 'mm', 'value'),
            
            # Clasificaciones
            (r'Grupo Tarifario\s+([A-Z_0-9]+)', 'Grupo tarifario', 'código', 'text'),
            (r'Clave Facturación\s+([A-Za-z\s]+?)(?:\n|Clave)', 'Clave facturación', 'código', 'text'),
            (r'Clave Lectura\s+([A-Z\s]+?)(?:\n|ACUSE)', 'Clave lectura', 'código', 'text'),
            
            # Factores y otros
            (r'Factor de Cobro del Periodo\s+([\d.,]+)', 'Factor de cobro del periodo', 'factor', 'value'),
            
            # Fechas importantes
            (r'FECHA ESTIMADA PRÓXIMA LECTURA\s+(\d{2}-[A-Z]{3}-\d{4})', 'Fecha próxima lectura', 'fecha', 'text'),
            (r'Ultimo pago\s+(\d{2}-[A-Z]{3}-\d{4})\s+\$\s*([\d.,]+)', 'Último pago', 'fecha_monto', 'special'),
        ]
        
        for pattern, detail_name, value_type, pattern_type in detail_patterns:
            match = re.search(pattern, text)
            if match:
                try:
                    if pattern_type == 'date_value':
                        # Lecturas con fecha - OMITIR la fecha del nombre para agrupar
                        value = float(match.group(2).replace('.', '').replace(',', '.'))
                        # No incluir la fecha en el nombre
                        details.append({
                            'name': detail_name,  # Sin fecha
                            'value': value,
                            'value_type': value_type,
                            'charge': 0
                        })
                    elif pattern_type == 'value':
                        # Valores numéricos
                        value_str = match.group(1).replace('.', '').replace(',', '.')
                        value = float(value_str)
                        details.append({
                            'name': detail_name,
                            'value': value,
                            'value_type': value_type,
                            'charge': 0
                        })
                    elif pattern_type == 'text':
                        # Valores de texto
                        text_value = match.group(1).strip()
                        details.append({
                            'name': f'{detail_name}: {text_value}',
                            'value': 0,
                            'value_type': value_type,
                            'charge': 0
                        })
                    elif pattern_type == 'special':
                        # Casos especiales como "Último pago"
                        if 'pago' in detail_name.lower():
                            fecha = match.group(1)
                            monto = float(match.group(2).replace('.', '').replace(',', '.'))
                            details.append({
                                'name': f'{detail_name} ({fecha})',
                                'value': monto,
                                'value_type': '$',
                                'charge': 0
                            })
                except (ValueError, IndexError) as e:
                    # Si hay error al parsear, continuar con el siguiente
                    continue
        
        return details

    @staticmethod
    def extract_info_from_text(text: str, file_pdf: str) -> dict:
        """
        Extract relevant information from PDF text, focusing on 'CONSUMO DE AGUA'.
        """
        data_tmp = {'file': file_pdf}

        # Extract Invoice Number (Nº después de FACTURA/BOLETA ELECTRÓNICA)
        invoice_match = re.search(r'(?:FACTURA|BOLETA)\s+ELECTR[ÓO]NICA\s*N[°º]\s*(\d+)', text, re.IGNORECASE)
        if invoice_match:
            data_tmp['invoice_number'] = invoice_match.group(1)
        else:
            data_tmp['invoice_number'] = ''

        # Extract Account Number
        account_match = re.search(r'Nro de cuenta\s*(\d+-[\dkK]+)', text)
        if account_match:
            data_tmp['client_number'] = account_match.group(1)

        # Extract Current Reading Date and calculate month/year
        # Intentar múltiples patrones para encontrar la fecha
        reading_date_patterns = [
            r'LECTURA ACTUAL\s*(\d{2}-[A-Z]{3}-\d{4})',  # 01-AGO-2024
            r'LECTURA ACTUAL\s*(\d{2}/\d{2}/\d{4})',     # 01/08/2024
            r'LECTURA ACTUAL\s+(\d{2}-[A-Za-z]{3}-\d{4})',  # Variante con mayúsculas/minúsculas
            r'Periodo de Lectura.*?(\d{2}-[A-Z]{3}-\d{4})',  # Buscar en período
            r'LECTURA ANTERIOR\s*\d{2}-[A-Z]{3}-\d{4}\s*[\d.,]+\s*m3.*?LECTURA ACTUAL\s*(\d{2}-[A-Z]{3}-\d{4})',
            r'FECHA ESTIMADA PRÓXIMA LECTURA\s+(\d{2}-[A-Z]{3}-\d{4})',  # Próxima lectura (restar 2 meses)
            r'FECHA EMISIÓN:\s*(\d{2}-[A-Z]{3}-\d{4})',  # Fecha de emisión
            r'VENCIMIENTO\s+(\d{2}-[A-Z]{3}-\d{4})',  # Fecha de vencimiento (restar 1 mes)
        ]
        
        reading_date = None
        is_next_reading = False  # Flag para saber si es fecha de próxima lectura
        
        for pattern in reading_date_patterns:
            reading_date_match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
            if reading_date_match:
                reading_date_str = reading_date_match.group(1).upper()  # Normalizar a mayúsculas
                
                # Detectar si necesita restar 2 meses (próxima lectura o vencimiento)
                if 'PRÓXIMA LECTURA' in pattern or 'VENCIMIENTO' in pattern:
                    is_next_reading = True
                
                # Primero intentar convertir meses en español a inglés
                month_map_es = {
                    'ENE': 'JAN', 'FEB': 'FEB', 'MAR': 'MAR', 'ABR': 'APR',
                    'MAY': 'MAY', 'JUN': 'JUN', 'JUL': 'JUL', 'AGO': 'AUG',
                    'SEP': 'SEP', 'OCT': 'OCT', 'NOV': 'NOV', 'DIC': 'DEC'
                }
                reading_date_str_converted = reading_date_str
                for es, en in month_map_es.items():
                    if es in reading_date_str:
                        reading_date_str_converted = reading_date_str.replace(es, en)
                        break
                
                # Intentar parsear con formato dd-MMM-yyyy (ahora con meses convertidos a inglés)
                try:
                    reading_date = datetime.strptime(reading_date_str_converted, '%d-%b-%Y')
                    break
                except ValueError:
                    pass
                
                # Intentar parsear con formato dd/mm/yyyy
                try:
                    reading_date = datetime.strptime(reading_date_str_converted, '%d/%m/%Y')
                    break
                except ValueError:
                    pass
        
        if reading_date:
            # Si es fecha de próxima lectura, restar 2 meses; si es lectura actual, restar 1 mes
            months_to_subtract = 2 if is_next_reading else 1
            
            # Calcular el mes correspondiente a la factura
            target_month = reading_date.month - months_to_subtract
            target_year = reading_date.year
            
            # Ajustar si el mes es negativo o cero
            while target_month <= 0:
                target_month += 12
                target_year -= 1
            
            data_tmp['month'] = target_month
            data_tmp['year'] = target_year
        else:
            # Si no se encuentra la fecha de lectura, buscar mes en texto
            # y también restar un mes (mismo comportamiento que con fecha de lectura)
            month_year_match = re.search(r'(Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre)\s+(\d{4})', text, re.IGNORECASE)
            if month_year_match:
                month_names_es = {
                    'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4,
                    'mayo': 5, 'junio': 6, 'julio': 7, 'agosto': 8,
                    'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
                }
                month_name = month_year_match.group(1).lower()
                found_year = int(month_year_match.group(2))
                found_month = month_names_es.get(month_name)
                
                # Restar un mes (mismo comportamiento que con fecha de lectura)
                previous_month = found_month - 1 if found_month > 1 else 12
                year = found_year if previous_month != 12 else found_year - 1
                
                data_tmp['month'] = previous_month
                data_tmp['year'] = year
            else:
                data_tmp['month'] = None
                data_tmp['year'] = None

        # Extract Total to Pay
        total_match = re.search(r'TOTAL A PAGAR\s*\$\s*([\d.,]+)', text)
        if total_match:
            data_tmp['total_amount'] = float(total_match.group(1).replace('.', '').replace(',', '.'))

        # Extract 'CONSUMO DE AGUA' charge (mantener compatibilidad)
        consumption_match = re.search(r'(CONSUMO AGUA)\s+([\d.,]+)\s+([\d.,]+)', text)
        if consumption_match:
            data_tmp['charge_name'] = consumption_match.group(1)
            data_tmp['cubic_meters'] = float(consumption_match.group(2).replace('.', '').replace(',', '.'))
            data_tmp['charge_amount'] = float(consumption_match.group(3).replace('.', '').replace(',', '.'))

        return data_tmp

    def process_bill(self, file_pdf: str) -> dict:
        """
        Process a PDF bill from Aguas Andinas and extract relevant information.
        """
        print(f"Processing bill: {file_pdf}")

        try:
            with pdfplumber.open(file_pdf) as pdf:
                complete_text = ""
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        complete_text += text + "\n"

            # Extract specific information
            extracted_data = self.extract_info_from_text(complete_text, file_pdf)

            # Validar campos requeridos
            if not extracted_data.get('client_number'):
                raise ValueError("No se pudo extraer el número de cliente del PDF")
            if extracted_data.get('month') is None:
                raise ValueError("No se pudo extraer el mes del PDF. Verifique que el PDF contenga la fecha de lectura o el período de facturación.")
            if extracted_data.get('year') is None:
                raise ValueError("No se pudo extraer el año del PDF")
            if extracted_data.get('total_amount') is None:
                raise ValueError("No se pudo extraer el monto total del PDF")

            # Retrieve or create the Meter
            meter, _ = Meter.objects.get_or_create(
                client_number=extracted_data['client_number'],
                defaults={
                    'name': f"Meter {extracted_data['client_number']}",
                    'meter_type': 'WATER',
                    'coverage': 'Unknown',
                }
            )

            # Create the Bill
            bill = Bill.objects.create(
                meter=meter,
                month=extracted_data['month'],
                year=extracted_data['year'],
                total_to_pay=extracted_data['total_amount'],
                invoice_number=extracted_data.get('invoice_number', ''),
            )

            # Extraer y guardar todos los cargos principales (cuadro superior)
            main_charges = self.extract_main_charges(complete_text)
            for charge_data in main_charges:
                Charge.objects.create(
                    bill=bill,
                    name=charge_data['name'],
                    value=charge_data['value'],
                    value_type=charge_data['value_type'],
                    charge=charge_data['charge'],
                )

            # Extraer y guardar las tarifas unitarias (cuadro aguas informa)
            unit_rates = self.extract_unit_rates(complete_text)
            for rate_data in unit_rates:
                Charge.objects.create(
                    bill=bill,
                    name=rate_data['name'],
                    value=rate_data['value'],
                    value_type=rate_data['value_type'],
                    charge=rate_data['charge'],
                )

            # Extraer y guardar los detalles de consumo (cuadro inferior izquierdo)
            consumption_details = self.extract_consumption_details(complete_text)
            for detail_data in consumption_details:
                Charge.objects.create(
                    bill=bill,
                    name=detail_data['name'],
                    value=detail_data['value'],
                    value_type=detail_data['value_type'],
                    charge=detail_data['charge'],
                )

            # Add to the list of all processed bills
            extracted_data['complete_text'] = complete_text
            self.all_data.append(extracted_data)

            return extracted_data

        except Exception as e:
            print(f"Error processing bill {file_pdf}: {e}")
            return {}

    def export_to_excel(self, output_filename: str = "aguas_andinas_bills.xlsx"):
        """
        Export all processed data to an Excel file
        """
        if not self.all_data:
            print("No data to export")
            return False

        try:
            # Create output directory if it doesn't exist
            output_dir = Path("output")
            output_dir.mkdir(exist_ok=True)

            # Create DataFrame
            df = pd.DataFrame(self.all_data)

            # Select and order relevant columns
            columns_to_export = ['file', 'account_number', 'total_amount', 'month', 'year', 'month_year']
            # Keep only columns that exist in the data
            available_columns = [col for col in columns_to_export if col in df.columns]

            df_export = df[available_columns]

            # Save to Excel
            output_path = output_dir / output_filename
            df_export.to_excel(output_path, index=False)

            print(f"Data successfully exported to: {output_path}")
            return True

        except Exception as e:
            print(f"Error exporting to Excel: {e}")
            return False

    def process_multiple_bills(self, pdf_files: list):
        """
        Process multiple PDF files
        """
        for pdf_file in pdf_files:
            self.process_bill(pdf_file)

    def clear_data(self):
        """
        Clear all stored data
        """
        self.all_data = []
        print("All data cleared")

    def validate_bill(self, file_pdf: str) -> dict:
        """
        Extrae la información relevante de la boleta sin crear instancias en la base de datos.
        """
        try:
            with pdfplumber.open(file_pdf) as pdf:
                complete_text = ""
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        complete_text += text + "\n"
            extracted_data = self.extract_info_from_text(complete_text, file_pdf)
            extracted_data['complete_text'] = complete_text
            return extracted_data
        except Exception as e:
            print(f"Error validating bill {file_pdf}: {e}")
            return {}

class EnelReader:
    def __init__(self):
        self.all_data = []

    @staticmethod
    def extract_info_from_text(text: str, file_pdf: str) -> dict:
        """
        Extract relevant information from PDF text for Enel electricity bills.
        """
        data_tmp = {'file': file_pdf}

        # Extract Invoice Number - buscar el número de factura electrónica
        # Priorizar "FACTURA ELECTRONICA N° xxxxxxxx" o "N° xxxxxxxx" cerca de "FACTURA"
        invoice_patterns = [
            r'FACTURA ELECTRONICA\s*N°\s*(\d{8})',
            r'FACTURA ELECTR[ÓO]NICA\s*N[°º]\s*(\d{8})',
            r'N°\s*(\d{8})\s*(?:\n|$)',  # N° seguido de 8 dígitos al final de línea
            r'^(\d{10})\s+(?:Compañía|Cliente)',  # Patrón antiguo como fallback
        ]
        invoice_match = None
        for pattern in invoice_patterns:
            invoice_match = re.search(pattern, text, re.MULTILINE | re.IGNORECASE)
            if invoice_match:
                data_tmp['invoice_number'] = invoice_match.group(1)
                break
        if not invoice_match:
            data_tmp['invoice_number'] = ''

        # Extract Client Number - varios patrones posibles
        # Ordenados de más específico a menos específico
        client_patterns = [
            r'Número de cliente\s*(\d+(?:-[\dkK]+)?)',
            r'SANTIAGO\s*-\s*(\d{6,7}-[\dkK])',  # Ejemplo: SANTIAGO - 2556131-7 (más específico)
            r'SANTIAGO\s+(\d{6,7}-[\dkK])',  # Ejemplo: SANTIAGO 177946-K (al final de la dirección)
            r'(\d{6,7}-[\dkK])\s*\d{2}/\d{2}/\d{4}',  # Ejemplo: 177949-4 10/01/2024 o 177949-k (solo 6-7 dígitos)
            r'(\d{7}-[\dkK])\s+\d{2}/\d{2}/\d{4}',  # Ejemplo: 3042290-2 18/02/2025 (7 dígitos exactos)
        ]

        for pattern in client_patterns:
            client_match = re.search(pattern, text)
            if client_match:
                data_tmp['client_number'] = client_match.group(1)
                break

        # Extract Reading Period and calculate month/year
        # Buscar patrones de período de lectura
        period_patterns = [
            r'Periodo de Lectura\s+(\d{2}/\d{2}/\d{4})\s*.*?\s*(\d{2}/\d{2}/\d{4})',
            r'Transporte de electricidad.*?(\d{2}/\d{2}/\d{4})\s+(\d{2}/\d{2}/\d{4})',
        ]

        # Primero intentar con patrones específicos
        period_match = None
        for pattern in period_patterns:
            period_match = re.search(pattern, text, re.IGNORECASE)
            if period_match:
                break
        
        # Si no se encuentra, buscar dos fechas consecutivas DIFERENTES en la MISMA línea
        if not period_match:
            # Buscar línea por línea para asegurar que ambas fechas estén juntas
            for line in text.split('\n'):
                match = re.search(r'(\d{2}/\d{2}/\d{4})\s+(\d{2}/\d{2}/\d{4})', line)
                if match:
                    date1, date2 = match.groups()
                    # Solo aceptar si las fechas son diferentes
                    if date1 != date2:
                        period_match = match
                        break
        
        if period_match:
            end_date_str = period_match.group(2)  # La segunda fecha es el "hasta"
            try:
                end_date = datetime.strptime(end_date_str, '%d/%m/%Y')
                # El mes de la boleta es el mes anterior al de la fecha final
                bill_month = end_date.month - 1 if end_date.month > 1 else 12
                bill_year = end_date.year if bill_month != 12 else end_date.year - 1

                data_tmp['reading_period_start'] = period_match.group(1)
                data_tmp['reading_period_end'] = end_date_str
                data_tmp['month'] = bill_month
                data_tmp['year'] = bill_year
                data_tmp['month_year'] = f"{bill_month:02d}/{bill_year}"
            except ValueError:
                pass

        # Extract Tarifa (ej: AT43 AREA 1 S Caso 3 (a))
        # Buscar patrón "AT" seguido de números y texto
        tarifa_match = re.search(r'(AT\d+\s+AREA\s+\d+\s+\S+\s+Caso\s+\d+\s+\([a-z]\))', text, re.IGNORECASE)
        if tarifa_match:
            data_tmp['tarifa'] = tarifa_match.group(1)
        else:
            data_tmp['tarifa'] = ''

        # Extract Total to Pay - múltiples patrones
        total_patterns = [
            r'Total a pagar\s*\$?\s*([\d.,]+)',
            r'Monto Total\s*\$?\s*([\d.,]+)',
            r'TOTAL A PAGAR\s*\$?\s*([\d.,]+)',
            r'Pagar hasta el.*?\$?\s*([\d.,]+)'
        ]

        for pattern in total_patterns:
            total_match = re.search(pattern, text, re.IGNORECASE)
            if total_match:
                try:
                    total_str = total_match.group(1).replace('.', '').replace(',', '.')
                    data_tmp['total_amount'] = float(total_str)
                    break
                except ValueError:
                    continue

        # Extract 'Electricidad Consumida' with kWh value in parentheses
        consumption_patterns = [
            r'Electricidad Consumida\s*\((\d+)kWh\)\s*([\d.,]+)',
            r'Electricidad Comerciaria\s*\((\d+)kWh\)\s*([\d.,]+)',
            r'Electricidad Consumida.*?\((\d+)\s*kWh\)\s*([\d.,]+)'
        ]

        for pattern in consumption_patterns:
            consumption_match = re.search(pattern, text, re.IGNORECASE)
            if consumption_match:
                try:
                    data_tmp['consumption_kwh'] = int(consumption_match.group(1))
                    charge_amount_str = consumption_match.group(2).replace('.', '').replace(',', '.')
                    data_tmp['consumption_charge'] = float(charge_amount_str)
                    data_tmp['charge_name'] = 'Electricidad Consumida'
                    break
                except ValueError:
                    continue

        return data_tmp

    @staticmethod
    def extract_electricity_charges(text: str) -> list:
        """
        Extrae todos los cargos de electricidad de forma dinámica.
        Busca cargos que aparecen entre el número de cliente y 'Total Monto Neto'.
        """
        charges = []
        
        # Buscar la sección de cargos (entre datos de medidor y totales)
        # Típicamente después de "CLUB HIPICO" o datos de medidores y antes de "Total Monto Neto"
        charge_section_match = re.search(
            r'(?:CLUB HIPICO|AVD TUPPER|Dirección suministro).*?\n(.*?)(?:Total Monto Neto|\d+-[\dkK]\s+[\d,]+\s+[\d,]+\s+\d+\s+\d+-\d+-\d+)',
            text,
            re.DOTALL | re.IGNORECASE
        )
        
        if charge_section_match:
            charge_section = charge_section_match.group(1)
            
            for line in charge_section.split('\n'):
                line = line.strip()
                if not line or 'Total' in line or 'Monto' in line:
                    continue
                
                # Patrón para capturar cargos de electricidad:
                # Ejemplos:
                # "Administración del servicio 669 AT43 AREA..."  -> extraer "Administración del servicio" y 669
                # "Electricidad Consumida (119092kWh) 9.121.637"
                # "Cargo por Servicio Público 89.320"
                # "Dem. Horas punta (206,000kW) 1.494.224"
                
                # Patrón 1: Con cantidad entre paréntesis
                match_with_unit = re.match(r'^([A-Za-zÁÉÍÓÚáéíóúñÑ][A-Za-zÁÉÍÓÚáéíóúñÑ\s\.]+?)\s+\((\d+(?:[.,]\d+)?)(k?Wh?|kW)\)\s+(-?[\d.,]+)', line)
                
                if match_with_unit:
                    charge_name = match_with_unit.group(1).strip()
                    quantity_str = match_with_unit.group(2).replace('.', '').replace(',', '.')
                    unit = match_with_unit.group(3)
                    value_str = match_with_unit.group(4)
                    charge_amount = float(value_str.replace('.', '').replace(',', '.'))
                    
                    # Normalizar unidad
                    if unit.upper() in ['WH', 'KWH']:
                        value_type = 'kWh'
                        quantity = float(quantity_str)
                        if unit.upper() == 'WH':
                            quantity = quantity / 1000
                    elif unit.upper() == 'KW':
                        value_type = 'kW'
                        quantity = float(quantity_str)
                    else:
                        value_type = unit
                        quantity = float(quantity_str)
                    
                    # No incluir la cantidad en el nombre para consolidar columnas
                    charges.append({
                        'name': charge_name,
                        'value': quantity,
                        'value_type': value_type,
                        'charge': int(charge_amount)
                    })
                    continue
                
                # Patrón 2: Solo nombre y valor (puede tener texto adicional al final que ignoramos)
                match_simple = re.match(r'^([A-Za-zÁÉÍÓÚáéíóúñÑ][A-Za-zÁÉÍÓÚáéíóúñÑ\s\.]+?)\s+(-?[\d.,]+)(?:\s+[A-Z0-9].*)?$', line)
                
                if match_simple:
                    charge_name = match_simple.group(1).strip()
                    value_str = match_simple.group(2)
                    
                    # Validar que el valor numérico sea razonable (más de 3 dígitos típicamente)
                    if len(value_str.replace('.', '').replace(',', '')) >= 2:
                        charge_amount = float(value_str.replace('.', '').replace(',', '.'))
                        
                        charges.append({
                            'name': charge_name,
                            'value': 1,
                            'value_type': 'unidad',
                            'charge': int(charge_amount)
                        })
        
        return charges

    @staticmethod
    def extract_electricity_summary(text: str) -> list:
        """
        Extrae los valores de resumen: Total Monto Neto, Total I.V.A., Monto Exento, Monto Total.
        """
        summary = []
        
        # Buscar la sección de totales (después de los cargos)
        summary_patterns = [
            (r'Total Monto Neto\s+([\d.,]+)', 'Total Monto Neto'),
            (r'Total I\.?\s*V\.?\s*A\.?\s*\(19%\)\s+([\d.,]+)', 'Total I.V.A. (19%)'),
            (r'Monto Exento\s+([\d.,]+)', 'Monto Exento'),
            (r'Monto Total\s+([\d.,]+)', 'Monto Total'),
        ]
        
        for pattern, name in summary_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                value_str = match.group(1).replace('.', '').replace(',', '.')
                summary.append({
                    'name': name,
                    'value': 1,
                    'value_type': 'unidad',
                    'charge': int(float(value_str))
                })
        
        return summary

    def process_bill(self, file_pdf: str) -> dict:
        """
        Process a PDF bill from Enel and extract relevant information.
        """
        print(f"Processing bill: {file_pdf}")

        try:
            with pdfplumber.open(file_pdf) as pdf:
                complete_text = ""
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        complete_text += text + "\n"

            # Extract specific information
            extracted_data = self.extract_info_from_text(complete_text, file_pdf)

            # Validar campos requeridos
            if not extracted_data.get('client_number'):
                raise ValueError("No se pudo extraer el número de cliente del PDF")
            if extracted_data.get('month') is None:
                raise ValueError("No se pudo extraer el mes del PDF. Verifique que el PDF contenga el período de lectura.")
            if extracted_data.get('year') is None:
                raise ValueError("No se pudo extraer el año del PDF")
            if extracted_data.get('total_amount') is None:
                raise ValueError("No se pudo extraer el monto total del PDF")

            # Retrieve or create the Meter
            meter, _ = Meter.objects.get_or_create(
                client_number=extracted_data.get('client_number', ''),
                defaults={
                    'name': f"Meter {extracted_data.get('client_number', '')}",
                    'meter_type': 'ELECTRICITY',
                    'coverage': 'Unknown',
                }
            )

            # Create the Bill
            bill = Bill.objects.create(
                meter=meter,
                month=extracted_data.get('month'),
                year=extracted_data.get('year'),
                total_to_pay=extracted_data.get('total_amount', 0),
                tarifa=extracted_data.get('tarifa', ''),
                invoice_number=extracted_data.get('invoice_number', ''),
            )

            # Extraer y guardar todos los cargos de electricidad
            electricity_charges = self.extract_electricity_charges(complete_text)
            for charge_data in electricity_charges:
                Charge.objects.create(
                    bill=bill,
                    name=charge_data['name'],
                    value=charge_data['value'],
                    value_type=charge_data['value_type'],
                    charge=charge_data['charge'],
                )

            # Extraer y guardar los totales (Monto Neto, IVA, etc.)
            summary_charges = self.extract_electricity_summary(complete_text)
            for charge_data in summary_charges:
                Charge.objects.create(
                    bill=bill,
                    name=charge_data['name'],
                    value=charge_data['value'],
                    value_type=charge_data['value_type'],
                    charge=charge_data['charge'],
                )

            # Add to the list of all processed bills
            extracted_data['complete_text'] = complete_text
            self.all_data.append(extracted_data)

            return extracted_data

        except Exception as e:
            print(f"Error processing bill {file_pdf}: {e}")
            return {}

    def process_multiple_bills(self, pdf_files: list):
        """
        Process multiple PDF files
        """
        for pdf_file in pdf_files:
            self.process_bill(pdf_file)

    def validate_bill(self, file_pdf: str) -> dict:
        """
        Extrae la información relevante de la boleta sin crear instancias en la base de datos.
        """
        try:
            with pdfplumber.open(file_pdf) as pdf:
                complete_text = ""
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        complete_text += text + "\n"
            extracted_data = self.extract_info_from_text(complete_text, file_pdf)
            extracted_data['complete_text'] = complete_text
            return extracted_data
        except Exception as e:
            print(f"Error validating bill {file_pdf}: {e}")
            return {}
