from typing import Dict, Any

import pdfplumber
from pathlib import Path
import pandas as pd
import re
from datetime import datetime
from reader.models import Meter, Bill, Charge


class AguasAndinasReader:
    def __init__(self):
        self.all_data = []

    @staticmethod
    def extract_info_from_text(text: str, file_pdf: str) -> dict:
        """
        Extract relevant information from PDF text, focusing on 'CONSUMO DE AGUA'.
        """
        data_tmp = {'file': file_pdf}

        # Extract Account Number
        account_match = re.search(r'Nro de cuenta\s*(\d+-\d+)', text)
        if account_match:
            data_tmp['account_number'] = account_match.group(1)

        # Extract Current Reading Date and calculate month/year
        reading_date_match = re.search(r'LECTURA ACTUAL\s*(\d{2}-[A-Z]{3}-\d{4})', text)
        if reading_date_match:
            reading_date_str = reading_date_match.group(1)
            try:
                reading_date = datetime.strptime(reading_date_str, '%d-%b-%Y')
                previous_month = reading_date.month - 1 if reading_date.month > 1 else 12
                year = reading_date.year if previous_month != 12 else reading_date.year - 1
                data_tmp['month'] = previous_month
                data_tmp['year'] = year
            except ValueError:
                data_tmp['month'] = None
                data_tmp['year'] = None

        # Extract Total to Pay
        total_match = re.search(r'TOTAL A PAGAR\s*\$\s*([\d.,]+)', text)
        if total_match:
            data_tmp['total_amount'] = float(total_match.group(1).replace('.', '').replace(',', '.'))

        # Extract 'CONSUMO DE AGUA' charge
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

            # Retrieve or create the Meter
            meter, _ = Meter.objects.get_or_create(
                client_number=extracted_data['account_number'],
                defaults={
                    'name': f"Meter {extracted_data['account_number']}",
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
            )

            # Create the Charge for 'CONSUMO AGUA'
            if 'charge_name' in extracted_data:
                Charge.objects.create(
                    bill=bill,
                    name=extracted_data['charge_name'],
                    value=extracted_data['cubic_meters'],
                    value_type='Water Consumption',
                    charge=int(extracted_data['charge_amount']),
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


class EnelReader:
    def __init__(self):
        self.all_data = []

    @staticmethod
    def extract_info_from_text(text: str, file_pdf: str) -> dict:
        """
        Extract relevant information from PDF text for Enel electricity bills.
        """
        data_tmp = {'file': file_pdf}

        # Extract Client Number - varios patrones posibles
        client_patterns = [
            r'Número de cliente\s*(\d+(?:-\d+)?)',
            r'(\d{6,7}-\d)\s*\d{2}/\d{2}/\d{4}',  # Ejemplo: 177949-4 10/01/2024
            r'(\d+-\d+)\s+\d{2}/\d{2}/\d{4}'  # Ejemplo: 3042290-2 18/02/2025
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
            r'(\d{2}/\d{2}/\d{4})\s+(\d{2}/\d{2}/\d{4})',  # Dos fechas consecutivas
            r'Transporte de electricidad.*?(\d{2}/\d{2}/\d{4})\s+(\d{2}/\d{2}/\d{4})'
        ]

        for pattern in period_patterns:
            period_match = re.search(pattern, text, re.IGNORECASE)
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
                    break
                except ValueError:
                    continue

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
            )

            # Create the Charge for 'Electricidad Consumida'
            if 'charge_name' in extracted_data:
                Charge.objects.create(
                    bill=bill,
                    name=extracted_data['charge_name'],
                    value=extracted_data.get('consumption_kwh', 0),
                    value_type='Electricity Consumption',
                    charge=extracted_data.get('consumption_charge', 0),
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
