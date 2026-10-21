from django.core.management.base import BaseCommand

from apps.skills.models import Skill

# (name, category). Categories match the filter chips in the React app.
SEED_SKILLS = [
    # Programming
    ("Python Programming", "Programming"),
    ("React & Frontend", "Programming"),
    ("Data Structures & Algorithms", "Programming"),
    ("Django & REST APIs", "Programming"),
    ("SQL & Databases", "Programming"),
    ("Git & GitHub", "Programming"),
    # Design & UI/UX
    ("UI/UX Design in Figma", "Design & UI/UX"),
    ("Graphic Design & Branding", "Design & UI/UX"),
    ("Digital Photography & Editing", "Design & UI/UX"),
    ("Video Editing & Color Grading", "Design & UI/UX"),
    # Languages
    ("Conversational Spanish", "Languages"),
    ("Japanese for Beginners", "Languages"),
    ("Conversational Hindi", "Languages"),
    # Academics & STEM
    ("Calculus & Linear Algebra", "Academics & STEM"),
    ("Organic Chemistry", "Academics & STEM"),
    ("Statistics & Probability", "Academics & STEM"),
    # Music & Audio
    ("Acoustic Guitar Basics", "Music & Audio"),
    ("Music Production", "Music & Audio"),
    # Writing & Communication
    ("Public Speaking & Presentations", "Writing & Communication"),
    ("Resume & Interview Prep", "Writing & Communication"),
]


class Command(BaseCommand):
    help = "Create the starter skill catalog. Safe to run more than once."

    def handle(self, *args, **options):
        created = 0
        for name, category in SEED_SKILLS:
            # Case-insensitive match so we never duplicate a skill someone already added.
            if Skill.objects.filter(name__iexact=name).exists():
                continue
            Skill.objects.create(name=name, category=category)
            created += 1

        skipped = len(SEED_SKILLS) - created
        self.stdout.write(self.style.SUCCESS(
            f"Seeded {created} new skill(s); {skipped} already existed."
        ))