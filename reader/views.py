from django.http import JsonResponse
import os
import tempfile
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from .models import Meter, Bill, Charge
from .reader import EnelReader
import uuid

User = get_user_model()


class ProcessMultipleBillsView(APIView):
    def post(self, request):
        files = request.FILES.getlist('files')
        results = []

        storage_dir = 'storage/'
        os.makedirs(storage_dir, exist_ok=True)

        for file in files:
            # Crear archivo temporal
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
                for chunk in file.chunks():
                    tmp_file.write(chunk)
                tmp_path = tmp_file.name

            try:
                # Procesar PDF
                reader = EnelReader()
                bill_data = reader.process_bill(tmp_path)

                # Obtener o crear el medidor
                meter, _ = Meter.objects.get_or_create(
                    client_number=bill_data.get('client_number'),
                    defaults={
                        'name': f"Medidor {bill_data.get('client_number')}",
                        'meter_type': 'ELECTRICITY',
                    }
                )

                unique_pdf_name = f"{uuid.uuid4()}.pdf"  # Nombre único para el archivo PDF

                # Crear la boleta
                bill, _ = Bill.objects.get_or_create(
                    meter=meter,
                    month=bill_data.get('month'),
                    year=bill_data.get('year'),
                    total_to_pay=bill_data.get('total_amount', 0),
                )
                if not bill.pdf_filename:
                    bill.pdf_filename = unique_pdf_name
                    bill.save()
                if bill.pdf_filename == unique_pdf_name:
                    # Guardar PDF en el sistema de archivos solo si se creó una nueva boleta
                    with open(f'{storage_dir}/{unique_pdf_name}', 'wb+') as destination:
                        for chunk in file.chunks():
                            destination.write(chunk)

                # Crear el cargo de consumo
                if 'consumption_kwh' in bill_data:
                    Charge.objects.get_or_create(
                        bill=bill,
                        name=bill_data.get('charge_name', 'Electricidad Consumida'),
                        value=bill_data.get('consumption_kwh', 0),
                        value_type='Electricity Consumption',
                        charge=bill_data.get('consumption_charge', 0),
                    )

                results.append({
                    'file': file.name,
                    'status': 'procesado',
                    'client_number': bill_data.get('client_number'),
                    'total_amount': bill_data.get('total_amount')
                })

            except Exception as e:
                results.append({
                    'file': file.name,
                    'status': 'error',
                    'error': str(e)
                })
            finally:
                # Limpiar archivo temporal
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)

        return JsonResponse({'results': results})
