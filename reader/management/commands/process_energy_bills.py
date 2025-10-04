from pathlib import Path
from django.core.management.base import BaseCommand

from reader.reader import EnelReader


class Command(BaseCommand):
    help = "Procesa las boletas de luz con EnelReader"

    def handle(self, *args, **options):
        # Carpeta de entrada
        energy_path = Path("./reader/input/energy_bills")

        # Obtener PDFs
        energy_pdfs = [file for file in energy_path.iterdir() if file.is_file()]

        # Procesar facturas

        reader = EnelReader()
        reader.process_multiple_bills(energy_pdfs)

        # Mensaje final
        self.stdout.write(self.style.SUCCESS(f"Processed {len(reader.all_data)} bills"))
