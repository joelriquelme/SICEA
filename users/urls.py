from django.urls import path
from .views import RegisterView, LoginView, LogoutView, UserMeView
from .views import AdminUserListCreateView, AdminUserDetailView

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", UserMeView.as_view(), name="me"),
    # Endpoints para administradores: CRUD de usuarios
    path("admin-users/", AdminUserListCreateView.as_view(), name="admin-user-list-create"),
    path("admin-users/<uuid:pk>/", AdminUserDetailView.as_view(), name="admin-user-detail"),
]
