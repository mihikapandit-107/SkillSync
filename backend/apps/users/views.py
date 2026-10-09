from rest_framework import generics, permissions
from .models import User
from .serializers import RegisterSerializer, UserSerializer, PublicUserSerializer


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MeView(generics.RetrieveUpdateAPIView):
    """GET or PUT/PATCH the logged-in user's own profile."""
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class UserDetailView(generics.RetrieveAPIView):
    """View another student's public profile."""
    queryset = User.objects.filter(is_active=True)
    serializer_class = PublicUserSerializer