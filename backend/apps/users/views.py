from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import User, SavedPeer
from .serializers import (
    RegisterSerializer,
    UserSerializer,
    PublicProfileSerializer,
    CustomTokenObtainPairSerializer,
    SavedPeerSerializer,
    skill_lists,
)


class CustomTokenObtainPairView(TokenObtainPairView):
    """Token obtain endpoint with username/email fallback and status verification."""
    serializer_class = CustomTokenObtainPairSerializer


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
    """View another student's public profile (includes rating info and skill lists)."""
    queryset = User.objects.filter(is_active=True)
    serializer_class = PublicProfileSerializer


class UserSkillsView(generics.GenericAPIView):
    """GET /api/users/<int:pk>/skills/ - returns offered and wanted skills for a user."""
    queryset = User.objects.filter(is_active=True)

    def get(self, request, pk):
        user = self.get_object()
        return Response(skill_lists(user))


class SavedPeerListCreateView(generics.ListCreateAPIView):
    """GET /api/users/saved/ - list saved peers; POST - save/bookmark a peer."""
    serializer_class = SavedPeerSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SavedPeer.objects.filter(user=self.request.user).select_related("peer")


class SavedPeerDeleteView(APIView):
    """DELETE /api/users/saved/<int:peer_id>/ - unbookmark a peer."""
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, peer_id):
        deleted, _ = SavedPeer.objects.filter(user=request.user, peer_id=peer_id).delete()
        if deleted:
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response({"detail": "Bookmark not found."}, status=status.HTTP_404_NOT_FOUND)