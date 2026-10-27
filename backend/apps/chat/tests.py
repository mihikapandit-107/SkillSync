from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from apps.chat.models import ChatMessage
from apps.safety.models import Block

User = get_user_model()


class ChatTests(APITestCase):
    def setUp(self):
        self.alice = User.objects.create_user("alice", "alice@test.com", "pass12345!")
        self.bob = User.objects.create_user("bob", "bob@test.com", "pass12345!")

    def test_send_message_and_retrieve_thread(self):
        self.client.force_authenticate(self.alice)
        res = self.client.post("/api/chat/messages/", {
            "recipient": self.bob.id,
            "message": "Hey Bob, let's swap Python for Guitar!",
        }, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertEqual(ChatMessage.objects.count(), 1)

        # Cannot message self
        self_res = self.client.post("/api/chat/messages/", {
            "recipient": self.alice.id,
            "message": "Self message test",
        }, format="json")
        self.assertEqual(self_res.status_code, 400)

        # Bob logs in and checks messages
        self.client.force_authenticate(self.bob)
        thread_res = self.client.get(f"/api/chat/messages/{self.alice.id}/")
        self.assertEqual(thread_res.status_code, 200)
        self.assertEqual(len(thread_res.data["messages"]), 1)
        # Verify it was marked read
        msg = ChatMessage.objects.first()
        self.assertTrue(msg.is_read)

        # Conversation list check
        conv_res = self.client.get("/api/chat/conversations/")
        self.assertEqual(conv_res.status_code, 200)
        self.assertEqual(len(conv_res.data["results"]), 1)
        self.assertEqual(conv_res.data["results"][0]["peer"]["username"], "alice")

    def test_blocked_user_cannot_chat(self):
        Block.objects.create(blocker=self.bob, blocked=self.alice)
        self.client.force_authenticate(self.alice)
        res = self.client.post("/api/chat/messages/", {
            "recipient": self.bob.id,
            "message": "Hello?",
        }, format="json")
        self.assertEqual(res.status_code, 400)
