from django.contrib import admin
from django.urls import path, include

from django.views.generic import RedirectView

urlpatterns = [
    path("", RedirectView.as_view(url="http://localhost:5173/"), name="site-home"),
    path("admin/", admin.site.urls),
    path("api/", include("apps.users.urls")),
    path("api/", include("apps.skills.urls")),
    path("api/", include("apps.matching.urls")),
    path("api/", include("apps.notifications.urls")),
    path("api/", include("apps.analytics.urls")),
    path("api/", include("apps.swaps.urls")),
    path("api/", include("apps.scheduling.urls")),
    path("api/", include("apps.reviews.urls")),
    path("api/", include("apps.safety.urls")),
    path("api/", include("apps.availability.urls")),
    path("api/", include("apps.achievements.urls")),
    path("api/", include("apps.chat.urls")),
]