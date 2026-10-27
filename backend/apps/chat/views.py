from collections import defaultdict
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.notifications.services import notify
from apps.safety.services import is_blocked_between
from apps.users.serializers import PublicUserSerializer
from .models import ChatMessage
from .serializers import ChatMessageSerializer

User = get_user_model()


class ChatMessageCreateView(generics.CreateAPIView):
    """POST /api/chat/messages/ -> Send a new chat message to a peer."""
    serializer_class = ChatMessageSerializer

    def perform_create(self, serializer):
        msg = serializer.save(sender=self.request.user)
        # Notify recipient of new message
        notify(
            recipient=msg.recipient,
            notification_type="system",
            message=f"New message from {self.request.user.first_name or self.request.user.username}: \"{msg.message[:60]}\"",
            actor=self.request.user,
            target_type="chat",
            target_id=self.request.user.pk,
        )


class ConversationMessagesView(APIView):
    """
    GET /api/chat/messages/<user_id>/
    Retrieve thread messages between current user and peer, and mark unread as read.
    """

    def get(self, request, user_id):
        peer = get_object_or_404(User, pk=user_id, is_active=True)
        if is_blocked_between(request.user.pk, peer.pk):
            return Response({"detail": "Conversation unavailable."}, status=status.HTTP_403_FORBIDDEN)

        # Mark all messages sent by peer to request.user as read
        ChatMessage.objects.filter(sender=peer, recipient=request.user, is_read=False).update(is_read=True)

        messages = (
            ChatMessage.objects.filter(
                (Q(sender=request.user, recipient=peer) | Q(sender=peer, recipient=request.user))
            )
            .select_related("sender", "recipient", "swap")
            .order_by("created_at")
        )
        serializer = ChatMessageSerializer(messages, many=True, context={"request": request})
        return Response({
            "peer": PublicUserSerializer(peer).data,
            "messages": serializer.data,
        })


class ConversationListView(APIView):
    """
    GET /api/chat/conversations/
    List active peer chats with last message preview and unread counters.
    """

    def get(self, request):
        user = request.user
        all_msgs = (
            ChatMessage.objects.filter(Q(sender=user) | Q(recipient=user))
            .select_related("sender", "recipient")
            .order_by("-created_at")
        )

        conversations = {}
        unread_counts = defaultdict(int)

        for m in all_msgs:
            peer = m.recipient if m.sender_id == user.id else m.sender
            if peer.id not in conversations:
                conversations[peer.id] = {
                    "peer": PublicUserSerializer(peer).data,
                    "last_message": m.message,
                    "last_message_at": m.created_at,
                    "last_message_by_me": m.sender_id == user.id,
                }
            if m.recipient_id == user.id and not m.is_read:
                unread_counts[peer.id] += 1

        results = []
        for peer_id, c in conversations.items():
            c["unread_count"] = unread_counts[peer_id]
            results.append(c)

        return Response({"results": results})


class MarkConversationReadView(APIView):
    """POST /api/chat/conversations/<user_id>/read/ -> Mark peer messages as read."""

    def post(self, request, user_id):
        updated = ChatMessage.objects.filter(
            sender_id=user_id, recipient=request.user, is_read=False
        ).update(is_read=True)
        return Response({"marked_read": updated})
