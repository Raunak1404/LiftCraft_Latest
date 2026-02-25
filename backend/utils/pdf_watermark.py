# backend/utils/pdf_watermark.py
"""
LiftCraft PDF Watermark Utility
Add LiftCraft logo as a watermark to PDF reports
"""

from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
import os

def add_liftcraft_watermark(pdf_canvas, logo_path=None, position='top-right', opacity=0.15, size=60):
    """
    Add LiftCraft logo as watermark to PDF page
    
    Args:
        pdf_canvas: ReportLab canvas object
        logo_path: Path to LiftCraft-logo.png (default: backend/assets/LiftCraft-logo.png)
        position: 'top-right', 'top-left', 'bottom-right', 'bottom-left', or 'center'
        opacity: Watermark opacity (0.0 to 1.0)
        size: Logo size in pixels
    """
    try:
        # Default logo path
        if logo_path is None:
            logo_path = os.path.join(
                os.path.dirname(os.path.dirname(__file__)), 
                'assets', 
                'LiftCraft-logo.png'
            )
        
        # Check if logo exists
        if not os.path.exists(logo_path):
            print(f"Warning: Logo not found at {logo_path}")
            return False
        
        # Load logo
        logo = ImageReader(logo_path)
        
        # Get page dimensions
        page_width, page_height = pdf_canvas._pagesize
        
        # Calculate position
        margin = 15
        positions = {
            'top-right': (page_width - size - margin, page_height - size - margin),
            'top-left': (margin, page_height - size - margin),
            'bottom-right': (page_width - size - margin, margin),
            'bottom-left': (margin, margin),
            'center': ((page_width - size) / 2, (page_height - size) / 2)
        }
        
        x, y = positions.get(position, positions['top-right'])
        
        # Draw watermark with transparency
        pdf_canvas.saveState()
        pdf_canvas.setFillAlpha(opacity)
        pdf_canvas.drawImage(
            logo, 
            x, y, 
            width=size, 
            height=size, 
            preserveAspectRatio=True,
            mask='auto'
        )
        pdf_canvas.restoreState()
        
        return True
        
    except Exception as e:
        print(f"Failed to add watermark: {e}")
        return False


def add_watermark_all_pages(pdf_canvas, num_pages, **kwargs):
    """
    Add watermark to all pages in a PDF
    
    Args:
        pdf_canvas: ReportLab canvas object
        num_pages: Number of pages in the PDF
        **kwargs: Additional arguments for add_liftcraft_watermark
    """
    for page in range(num_pages):
        add_liftcraft_watermark(pdf_canvas, **kwargs)
        if page < num_pages - 1:  # Don't add new page on last iteration
            pdf_canvas.showPage()


# Example usage in your PDF generation code:
"""
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from utils.pdf_watermark import add_liftcraft_watermark
from io import BytesIO

def generate_airfoil_report(design_data):
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    
    # Add watermark to first page
    add_liftcraft_watermark(c, position='top-right', opacity=0.15, size=60)
    
    # Add your content here
    c.drawString(100, 750, "LiftCraft Airfoil Design Report")
    # ... more content ...
    
    # If you have multiple pages:
    c.showPage()
    
    # Add watermark to second page
    add_liftcraft_watermark(c, position='top-right', opacity=0.15, size=60)
    
    # ... more content ...
    
    c.save()
    buffer.seek(0)
    return buffer.getvalue()
"""