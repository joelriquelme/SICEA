from rest_framework import serializers
from django.contrib.auth import authenticate, get_user_model

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "date_joined", "is_active", "is_staff"]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "password", "date_joined"]
        read_only_fields = ["id", "date_joined"]

    def create(self, validated_data):
        return User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
        )


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(username=data["email"], password=data["password"])
        if user and user.is_active:
            return {"user": user}
        raise serializers.ValidationError("Credenciales inválidas")


class AdminUserSerializer(serializers.ModelSerializer):
    """Serializer para que administradores creen/editen usuarios.

    - Permite establecer contraseña (opcional en update).
    - Expone campos administrativos como is_staff e is_active.
    """
    password = serializers.CharField(write_only=True, required=False, allow_blank=True, min_length=8)

    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "password", "is_active", "is_staff", "date_joined"]
        read_only_fields = ["id", "date_joined"]

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        user = User.objects.create_user(
            email=validated_data.get("email"),
            password=password or None,
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            is_active=validated_data.get("is_active", True),
            is_staff=validated_data.get("is_staff", False),
        )
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance
