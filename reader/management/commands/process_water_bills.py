from pathlib import Path
from django.core.management.base import BaseCommand

from reader.reader import AguasAndinasReader


class Command(BaseCommand):
    help = "Procesa las boletas de agua con AguasAndinasReader"

    def handle(self, *args, **options):
        # Carpeta de entrada
        water_path = Path("./reader/input/water_bills")  # ajusté la ruta porque está dentro de tu app

        # Obtener PDFs
        water_pdfs = [file for file in water_path.iterdir() if file.is_file()]

        # Procesar facturas

        reader = AguasAndinasReader()
        reader.process_multiple_bills(water_pdfs)

        # Mostrar primera factura
        if reader.all_data:
            self.stdout.write(str(reader.all_data[0]))

        # Exportar a Excel
        reader.export_to_excel()

        # Mensaje final
        self.stdout.write(self.style.SUCCESS(f"Processed {len(reader.all_data)} bills"))
