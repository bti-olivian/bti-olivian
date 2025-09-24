from django.contrib import admin
from django.urls import path, include
from gestao_normas.views import CustomLoginAPIView
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('gestao_normas.urls')),
    path('api/token/', CustomLoginAPIView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]