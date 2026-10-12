# backend/app/utils.py
import pandas as pd
from io import BytesIO
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.pagesizes import letter

def reviews_to_csv_bytes(reviews):
    df = pd.DataFrame(reviews)
    bio = BytesIO()
    df.to_csv(bio, index=False)
    bio.seek(0)
    return bio

def simple_pdf_from_text(title, items):
    bio = BytesIO()
    doc = SimpleDocTemplate(bio, pagesize=letter)
    styles = getSampleStyleSheet()
    story = [Paragraph(title, styles["Title"]), Spacer(1,12)]
    for it in items:
        story.append(Paragraph(str(it), styles["Normal"]))
        story.append(Spacer(1,6))
    doc.build(story)
    bio.seek(0)
    return bio
