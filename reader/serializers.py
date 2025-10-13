from rest_framework import serializers
from .models import Bill, Charge, Meter

class ChargeSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)

    class Meta:
        model = Charge
        fields = ["id", "name", "value", "value_type", "charge"]

class BillSerializer(serializers.ModelSerializer):
    charges = ChargeSerializer(many=True, required=False)
    meter_id = serializers.PrimaryKeyRelatedField(source='meter', queryset=Meter.objects.all(), write_only=True, required=False)
    meter = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Bill
        fields = ["id", "meter", "meter_id", "month", "year", "total_to_pay", "pdf_filename", "charges"]

    def update(self, instance, validated_data):
        charges_data = validated_data.pop("charges", None)
        meter_data = validated_data.pop("meter", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if meter_data:
            instance.meter = meter_data
        instance.save()

        if charges_data is not None:
            # Replace existing charges with submitted ones
            instance.charges.all().delete()
            for c in charges_data:
                Charge.objects.create(bill=instance, **c)

        return instance

class MeterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Meter
        fields = ['id', 'name', 'client_number', 'meter_type']