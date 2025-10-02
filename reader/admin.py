from django.contrib import admin
from .models import Meter, Bill, Charge


@admin.register(Meter)
class MeterAdmin(admin.ModelAdmin):
    list_display = ('name', 'client_number', 'meter_type', 'coverage')
    search_fields = ('name', 'client_number')
    list_filter = ('meter_type',)
    ordering = ('name',)


@admin.register(Bill)
class BillAdmin(admin.ModelAdmin):
    list_display = ('meter', 'month', 'year', 'total_to_pay')
    search_fields = ('meter__name', 'month', 'year')
    list_filter = ('month', 'year')
    ordering = ('-year', '-month')


@admin.register(Charge)
class ChargeAdmin(admin.ModelAdmin):
    list_display = ('bill', 'name', 'value', 'value_type', 'charge')
    search_fields = ('bill__meter__name', 'name', 'value_type')
    list_filter = ('value_type',)
    ordering = ('-bill__year', '-bill__month')
