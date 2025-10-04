from django.urls import path
from . import views

urlpatterns = [
    path("process-multiple-bills/", views.ProcessMultipleBillsView.as_view(), name="process_multiple_bills")
]