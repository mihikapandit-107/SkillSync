from django import template
from apps.analytics import services

register = template.Library()


@register.simple_tag
def get_analytics_overview():
    try:
        return services.overview()
    except Exception:
        return {}
