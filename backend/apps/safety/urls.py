from django.urls import path

from .views import (
    AdminReportDetailView, AdminReportListView,
    BlockDeleteView, BlockListCreateView, ReportListCreateView,
)

urlpatterns = [
    path("blocks/", BlockListCreateView.as_view(), name="block-list"),
    path("blocks/<int:user_id>/", BlockDeleteView.as_view(), name="block-delete"),
    path("reports/", ReportListCreateView.as_view(), name="report-list"),
    path("admin/reports/", AdminReportListView.as_view(), name="admin-report-list"),
    path("admin/reports/<int:pk>/", AdminReportDetailView.as_view(), name="admin-report-detail"),
]
