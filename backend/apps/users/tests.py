from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()


class UserAuthVerificationTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="existing_student",
            email="existing@campus.edu",
            password="StrongPassword123!",
            first_name="Jane",
            last_name="Doe",
            college="Engineering",
        )

    def test_register_success(self):
        url = reverse("register")
        payload = {
            "username": "new_student",
            "email": "new@campus.edu",
            "first_name": "John",
            "last_name": "Smith",
            "college": "Design",
            "password": "Password123!",
            "password2": "Password123!",
        }
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username="new_student").exists())

    def test_register_duplicate_email(self):
        url = reverse("register")
        payload = {
            "username": "unique_username",
            "email": "EXISTING@campus.edu",  # case-insensitive check
            "first_name": "John",
            "last_name": "Smith",
            "password": "Password123!",
            "password2": "Password123!",
        }
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_register_duplicate_username(self):
        url = reverse("register")
        payload = {
            "username": "existing_student",
            "email": "another@campus.edu",
            "first_name": "John",
            "last_name": "Smith",
            "password": "Password123!",
            "password2": "Password123!",
        }
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", response.data)

    def test_register_invalid_username_characters(self):
        url = reverse("register")
        payload = {
            "username": "invalid student!",
            "email": "another2@campus.edu",
            "first_name": "John",
            "last_name": "Smith",
            "password": "Password123!",
            "password2": "Password123!",
        }
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", response.data)

    def test_register_password_mismatch(self):
        url = reverse("register")
        payload = {
            "username": "valid_user",
            "email": "valid@campus.edu",
            "first_name": "John",
            "last_name": "Smith",
            "password": "Password123!",
            "password2": "DifferentPassword123!",
        }
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password2", response.data)

    def test_login_with_username_success(self):
        url = reverse("login")
        payload = {
            "username": "existing_student",
            "password": "StrongPassword123!",
        }
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_login_with_email_success(self):
        url = reverse("login")
        payload = {
            "username": "existing@campus.edu",  # student logs in with email
            "password": "StrongPassword123!",
        }
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)

    def test_login_invalid_password(self):
        url = reverse("login")
        payload = {
            "username": "existing_student",
            "password": "WrongPassword!",
        }
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_inactive_user(self):
        self.user.is_active = False
        self.user.save()
        url = reverse("login")
        payload = {
            "username": "existing_student",
            "password": "StrongPassword123!",
        }
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)
