from django.http import JsonResponse, FileResponse, Http404
import os
import tempfile
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from .models import Meter, Bill, Charge
from .reader import EnelReader, BillDetector, AguasAndinasReader
import uuid
from rest_framework import generics, permissions
from .serializers import BillSerializer
from django.views.generic import ListView, DetailView
from rest_framework.response import Response
from rest_framework import status
from .serializers import MeterSerializer, ChargeSerializer
from django.db.models import F, Value, IntegerField
from django.db.models.functions import Coalesce
from rest_framework.generics import ListAPIView
from django.conf import settings

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


class BillListView(generics.ListAPIView):
    """
    GET /api/reader/bills/?client_number=...&meter_type=...&month=...&year=...&start_date=...&end_date=...
    Lista facturas con filtros opcionales, incluyendo rango de fechas.
    """
    serializer_class = BillSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'results': serializer.data,
            'count': queryset.count()
        })

    def get_queryset(self):
        qs = Bill.objects.select_related("meter").prefetch_related("charges").all()
        client_number = self.request.query_params.get("client_number")
        meter_type = self.request.query_params.get("meter_type")
        month = self.request.query_params.get("month")
        year = self.request.query_params.get("year")
        start_date = self.request.query_params.get("start_date")  # Formato: YYYY-MM
        end_date = self.request.query_params.get("end_date")      # Formato: YYYY-MM

        if client_number:
            qs = qs.filter(meter__client_number=client_number)
        if meter_type:
            qs = qs.filter(meter__meter_type=meter_type)
        if month:
            qs = qs.filter(month=month)
        if year:
            qs = qs.filter(year=year)

        # Filtrar por rango de fechas
        if start_date and end_date:
            try:
                start_year, start_month = map(int, start_date.split('-'))
                end_year, end_month = map(int, end_date.split('-'))
                start_period = start_year * 12 + start_month
                end_period = end_year * 12 + end_month

                # Anotar el período en meses y filtrar
                qs = qs.annotate(
                    period_in_months=Coalesce(F('year') * 12 + F('month'), Value(0, output_field=IntegerField()))
                ).filter(
                    period_in_months__gte=start_period,
                    period_in_months__lte=end_period
                )
            except ValueError:
                raise ValueError("Formato inválido de fechas. Use YYYY-MM.")

        return qs

class BillDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET / PUT / DELETE para una factura por pk.
    """
    queryset = Bill.objects.select_related("meter").prefetch_related("charges").all()
    serializer_class = BillSerializer

    def perform_destroy(self, instance):
        # Eliminar PDF asociado en storage/ si existe antes de borrar la instancia
        try:
            pdf_name = instance.pdf_filename
            if pdf_name:
                file_path = os.path.join(settings.BASE_DIR, 'storage', pdf_name)
                if os.path.exists(file_path):
                    os.unlink(file_path)
        except Exception as e:
            # No interrumpir el borrado por errores al eliminar el archivo; registrar para debug
            print(f"Warning: no se pudo eliminar el PDF asociado {getattr(instance, 'pdf_filename', None)}: {e}")
        return super().perform_destroy(instance)


class MeterListView(APIView):
    """
    GET /api/reader/meters/
    Devuelve una lista de todos los medidores.
    """
    def get(self, request):
        meters = Meter.objects.all()
        serializer = MeterSerializer(meters, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
        

class MeterDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET / PUT / DELETE para un medidor por pk.
    """
    queryset = Meter.objects.all()
    serializer_class = MeterSerializer


class MeterCreateView(generics.CreateAPIView):
    """
    POST /api/reader/meters/
    Crea un nuevo medidor.
    """
    queryset = Meter.objects.all()
    serializer_class = MeterSerializer


class MeterUpdateView(generics.UpdateAPIView):
    """
    PUT / PATCH /api/reader/meters/<pk>/
    Edita un medidor existente.
    """
    queryset = Meter.objects.all()
    serializer_class = MeterSerializer

class MeterDeleteView(generics.DestroyAPIView):
    """
    DELETE /api/reader/meters/<pk>/delete/
    Elimina un medidor por pk.
    """
    queryset = Meter.objects.all()
    serializer_class = MeterSerializer

class BillChargesView(ListAPIView):
    """
    GET /api/reader/bills/<pk>/charges/
    Devuelve los cargos asociados a una factura específica.
    """
    serializer_class = ChargeSerializer

    def get_queryset(self):
        pk = self.kwargs.get('pk')  # Obtener el pk de la factura desde la URL
        return Charge.objects.filter(bill_id=pk)

class DownloadBillView(APIView):
    """
    GET /api/reader/bills/<pk>/download/
    Descarga el archivo PDF de la boleta almacenada en 'storage'.
    """
    def get(self, request, pk):
        try:
            # Obtener la boleta por su ID
            bill = Bill.objects.get(pk=pk)

            # Verificar si el archivo PDF está definido
            if not bill.pdf_filename:
                return Response(
                    {"detail": "La boleta no tiene un archivo PDF asociado."},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Construir la ruta completa al archivo
            file_path = os.path.join(settings.BASE_DIR, 'storage', bill.pdf_filename)

            # Verificar si el archivo existe
            if not os.path.exists(file_path):
                raise Http404("El archivo PDF no existe en el servidor.")

            # Devolver el archivo como respuesta
            return FileResponse(open(file_path, 'rb'), as_attachment=True, filename=bill.pdf_filename)

        except Bill.DoesNotExist:
            return Response(
                {"detail": "La boleta no existe."},
                status=status.HTTP_404_NOT_FOUND
            )

class ValidateBatchBillsView(APIView):
    """
    POST /api/reader/validate-batch-bills/
    Recibe archivos PDF y retorna el estado de cada factura:
    - correct: factura válida y no duplicada
    - duplicated: factura duplicada dentro del lote
    - in_db: factura ya existente en la base de datos
    - invalid: factura con formato incorrecto o no reconocida
    - not_found: medidor no encontrado
    """
    def post(self, request):
        files = request.FILES.getlist('files')
        results = []
        seen_keys = set()
        lote_keys = set()

        for file in files:
            # Validar primero que sea un archivo PDF
            if not file.name.lower().endswith('.pdf'):
                results.append({
                    'file': file.name,
                    'status': 'invalid',
                    'detail': 'Formato de archivo no válido.'
                })
                continue

            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
                for chunk in file.chunks():
                    tmp_file.write(chunk)
                tmp_path = tmp_file.name

            try:
                provider = BillDetector.detect_provider(tmp_path)
                if provider == "enel":
                    reader = EnelReader()
                    bill_data = reader.validate_bill(tmp_path)
                elif provider == "aguas":
                    reader = AguasAndinasReader()
                    bill_data = reader.validate_bill(tmp_path)
                else:
                    results.append({
                        'file': file.name,
                        'status': 'invalid',
                        'detail': 'Proveedor no reconocido.'
                    })
                    continue

                key = (
                    bill_data.get('client_number'),
                    bill_data.get('month'),
                    bill_data.get('year'),
                )

                # Debug: imprimir información de extracción
                print(f"Archivo: {file.name}")
                print(f"  Cliente: {bill_data.get('client_number')}")
                print(f"  Mes: {bill_data.get('month')}, Año: {bill_data.get('year')}")
                print(f"  Key: {key}")

                # Verificar si se pudo extraer la fecha
                if bill_data.get('month') is None or bill_data.get('year') is None:
                    results.append({
                        'file': file.name,
                        'status': 'invalid',
                        'detail': 'No se pudo extraer el mes/año del PDF. Verifique que contenga la fecha de lectura o período de facturación.'
                    })
                    continue

                # Verifica duplicados en el lote
                if key in lote_keys:
                    results.append({
                        'file': file.name,
                        'status': 'duplicated',
                        'detail': f'Duplicada en el lote (mes={bill_data.get("month")}, año={bill_data.get("year")}).'
                    })
                    continue
                lote_keys.add(key)

                # Verifica si se obtuvo el client_number
                if not bill_data.get('client_number'):
                    results.append({
                        'file': file.name,
                        'status': 'invalid',
                        'detail': 'No se pudo extraer el número de cliente.'
                    })
                    continue

                # Verifica existencia en la base de datos
                meter = Meter.objects.filter(client_number=bill_data.get('client_number')).first()
                if not meter:
                    results.append({
                        'file': file.name,
                        'status': 'not_found',
                        'detail': f'El medidor {bill_data.get("client_number")} no existe',
                        'meter': bill_data.get("client_number")
                    })
                    continue

                exists = Bill.objects.filter(
                    meter=meter,
                    month=bill_data.get('month'),
                    year=bill_data.get('year'),
                ).exists()

                if exists:
                    results.append({
                        'file': file.name,
                        'status': 'in_db',
                        'detail': 'Ya existe en la base de datos.'
                    })
                else:
                    results.append({
                        'file': file.name,
                        'status': 'correct',
                        'detail': 'Factura válida y no duplicada.'
                    })

            except Exception as e:
                results.append({
                    'file': file.name,
                    'status': 'invalid',
                    'detail': str(e)
                })
            finally:
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)

        return JsonResponse({'results': results})
