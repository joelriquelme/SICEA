import pdfplumber


class AguasAndinasReader:
    def __init__(self):
        self.data = {}

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
            self.data['complete_text'] = complete_text

            return self.data

        except Exception as e:
            print(f"Error processing bill: {e}")
            return {}


reader = AguasAndinasReader()
print(reader.process_bill("bills/M1 461384 Enero.pdf")['complete_text'])
