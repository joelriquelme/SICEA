import uuid
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager


class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("El usuario debe tener un correo electrónico")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        return self.create_user(email, password, **extra_fields)


class CustomUser(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, max_length=255)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)

    session_token = models.UUIDField(null=True, blank=True, editable=False)

    objects = CustomUserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    def __str__(self):
        return self.email


class Medidor(models.Model):
    TIPO_CHOICES = (
        ('ELECTRICIDAD', 'Electricidad'),
        ('AGUA', 'Agua'),
    )
    nombre = models.CharField(max_length=100)
    numero_cliente = models.CharField(max_length=50)
    tipo_medidor = models.CharField(max_length=20, choices=TIPO_CHOICES)
    cobertura = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.nombre} ({self.numero_cliente})"


class Boleta(models.Model):
    medidor = models.ForeignKey(Medidor, on_delete=models.CASCADE, related_name='boletas')
    mes = models.IntegerField()
    año = models.IntegerField()
    día = models.IntegerField()
    neto = models.DecimalField(max_digits=10, decimal_places=2)
    iva = models.DecimalField(max_digits=10, decimal_places=2)
    total_pagar = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"Boleta {self.mes}/{self.año} - Medidor {self.medidor.nombre}"


class Cargo(models.Model):
    boleta = models.ForeignKey(Boleta, on_delete=models.CASCADE, related_name='cargos')
    nombre = models.CharField(max_length=100)
    kw = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    kwh = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    m3 = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    monto = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.nombre} - Boleta {self.boleta.id}"
