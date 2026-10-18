from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    name = 'apps.notifications'

    def ready(self):
        # Imported here so models of all apps are loaded first.
        from . import signals
        signals.register_all()
