from django.http import JsonResponse
import os
import tempfile
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from .models import Meter, Bill, Charge
from .reader import EnelReader, BillDetector, AguasAndinasReader
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
                # Detectar tipo de boleta
                provider = BillDetector.detect_provider(tmp_path)

                if provider == "enel":
                    reader = EnelReader()
                elif provider == "aguas":
                    reader = AguasAndinasReader()
                else:
                    raise ValueError("No se pudo identificar el proveedor de la boleta")

                # Procesar PDF con el reader correcto
                bill_data = reader.process_bill(tmp_path)

                meter = Meter.objects.filter(client_number=bill_data.get('client_number')).first()

                unique_pdf_name = f"{uuid.uuid4()}.pdf"  # Nombre único para el archivo PDF

                # Obtener boleta
                bill = Bill.objects.filter(
                    meter=meter,
                    month=bill_data.get('month'),
                    year=bill_data.get('year'),
                ).first()

                if not bill.pdf_filename:
                    bill.pdf_filename = unique_pdf_name
                    bill.save()
                if bill.pdf_filename == unique_pdf_name:
                    # Guardar PDF en el sistema de archivos solo si se creó una nueva boleta
                    with open(f'{storage_dir}/{unique_pdf_name}', 'wb+') as destination:
                        for chunk in file.chunks():
                            destination.write(chunk)

                results.append({
                    'file': file.name,
                    'status': 'procesado',
                    'client_number': bill_data.get('client_number'),
                    'month': bill_data.get('month'),
                    'year': bill_data.get('year'),
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
