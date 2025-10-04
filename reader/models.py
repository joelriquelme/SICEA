from django.db import models


class Meter(models.Model):
    TYPE_CHOICES = (
        ('ELECTRICITY', 'Electricity'),
        ('WATER', 'Water'),
    )
    name = models.CharField(max_length=100)
    client_number = models.CharField(max_length=50)
    meter_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    coverage = models.CharField(max_length=250)

    def __str__(self):
        return f"{self.name} ({self.client_number})"


class Bill(models.Model):
    meter = models.ForeignKey(Meter, on_delete=models.CASCADE, related_name='bills')
    month = models.IntegerField()
    year = models.IntegerField()
    total_to_pay = models.DecimalField(max_digits=10, decimal_places=2)
    pdf_filename = models.CharField(max_length=255, null=True, blank=True, default=None)

    class Meta:
        unique_together = (('meter', 'month', 'year'),)

    def __str__(self):
        return f"Bill {self.month}/{self.year} - Meter {self.meter.name}"


class Charge(models.Model):
    bill = models.ForeignKey(Bill, on_delete=models.CASCADE, related_name='charges')
    name = models.CharField(max_length=100)
    value = models.DecimalField(max_digits=10, decimal_places=2)
    value_type = models.CharField(max_length=50)
    charge = models.IntegerField()

    def __str__(self):
        return f"{self.name} - Bill {self.bill.id}"