from django.urls import path
from . import views

urlpatterns = [
    path("process-multiple-bills/", views.ProcessMultipleBillsView.as_view(), name="process_multiple_bills"),
    # Endpoints para listar y editar/eliminar facturas
    path("bills/", views.BillListView.as_view(), name="bills-list"),
    path("bills/<int:pk>/", views.BillDetailView.as_view(), name="bills-detail"),

    # Endpoint para obtener cargos de una factura específica
    path("bills/<int:pk>/charges/", views.BillChargesView.as_view(), name="bill-charges"),

    # Endpoint para obtener PDF de una factura específica
    path("bills/<int:pk>/download/", views.DownloadBillView.as_view(), name="bill-download"),

    # Endpoints para listar y editar/eliminar medidores
    path("meters/", views.MeterListView.as_view(), name="meters-list"),
    path("meters/<int:pk>/", views.MeterDetailView.as_view(), name="meters-detail"),

    # Endpoints para crear y actualizar medidores
    path("meters/create/", views.MeterCreateView.as_view(), name="meter-create-new"),
    path("meters/<int:pk>/update/", views.MeterUpdateView.as_view(), name="meter-update-existing"),
    path("meters/<int:pk>/delete/", views.MeterDeleteView.as_view(), name="meter-delete"),
]