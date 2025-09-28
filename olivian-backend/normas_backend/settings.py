"""
Django settings for normas_backend project.
"""

from pathlib import Path
from datetime import timedelta # Importe o timedelta para a configuracao do JWT

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-#j1%pi^)__#(11-0gz124$6!n5%-k1$_&zf-%%*#!r3h@d5@xh'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

# Permite acesso via localhost e IP do loopback
# Se for testar de outro dispositivo (celular, etc.), adicione o IP da sua máquina aqui.
ALLOWED_HOSTS = ['127.0.0.1', 'localhost']

# Application definition
INSTALLED_APPS = [
    'corsheaders', # Necessário para o CORS
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'gestao_normas',
    'rest_framework_simplejwt',
]

MIDDLEWARE = [
    # O CorsMiddleware DEVE ser o PRIMEIRO para aplicar os cabeçalhos.
    'corsheaders.middleware.CorsMiddleware', 
    
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'normas_backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'normas_backend.wsgi.application'

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'normas_empresa',
        'USER': 'postgres',
        'PASSWORD': '13062730',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# -----------------------------------------------------------
# --- CONFIGURAÇÕES DE CORS E CSRF (CORRIGIDAS) ---
# -----------------------------------------------------------

# Portas do frontend (baseado no seu console: 5500)
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5500", 
    "http://127.0.0.1:5500", 
]

# Permite o envio de credenciais (necessário para cabeçalhos de Autorização/JWT)
CORS_ALLOW_CREDENTIALS = True 

# Permite os cabeçalhos necessários para o JWT e requisições POST
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization', # Essencial para o JWT
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# Informa ao Django que o CSRF deve confiar nessas origens para não bloquear POST/PUT
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5500", 
    "http://127.0.0.1:5500", 
]

# -----------------------------------------------------------

# Configuracao do Django REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    )
}

# Configuracao do django-rest-framework-simplejwt
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# Configuracoes de e-mail para desenvolvimento
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'