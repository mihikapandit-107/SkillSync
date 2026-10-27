from django.urls import path

from .views import (
    ChatMessageCreateView,
    ConversationListView,
    ConversationMessagesView,
    MarkConversationReadView,
)

urlpatterns = [
    path("chat/conversations/", ConversationListView.as_view(), name="chat-conversations"),
    path("chat/conversations/<int:user_id>/read/", MarkConversationReadView.as_view(), name="chat-conversation-read"),
    path("chat/messages/", ChatMessageCreateView.as_view(), name="chat-message-create"),
    path("chat/messages/<int:user_id>/", ConversationMessagesView.as_view(), name="chat-messages-thread"),
]
