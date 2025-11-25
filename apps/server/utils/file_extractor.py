"""
Utility functions for extracting text content from various file types
"""
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def extract_text_from_file(file_path: str, file_type: Optional[str] = None) -> str:
    """
    Extract text content from a file based on its extension or MIME type.
    
    Args:
        file_path: Path to the file
        file_type: Optional MIME type or file extension
        
    Returns:
        Extracted text content as string
    """
    if not os.path.exists(file_path):
        logger.error(f"File not found: {file_path}")
        return ""
    
    # Determine file type from extension if not provided
    if not file_type:
        _, ext = os.path.splitext(file_path)
        file_type = ext.lower()
    else:
        # Extract extension from MIME type if needed
        if '/' in file_type:
            file_type = file_type.split('/')[-1]
    
    try:
        # Handle different file types
        if file_type in ['.txt', '.text', 'txt', 'text/plain']:
            return extract_text_from_txt(file_path)
        elif file_type in ['.pdf', 'pdf', 'application/pdf']:
            return extract_text_from_pdf(file_path)
        elif file_type in ['.docx', 'docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']:
            return extract_text_from_docx(file_path)
        elif file_type in ['.doc', 'doc', 'application/msword']:
            return extract_text_from_doc(file_path)
        elif file_type in ['.md', 'md', 'markdown', 'text/markdown']:
            return extract_text_from_txt(file_path)  # Markdown is plain text
        elif file_type in ['.csv', 'csv', 'text/csv']:
            return extract_text_from_csv(file_path)
        else:
            logger.warning(f"Unsupported file type: {file_type}. Attempting to read as text.")
            return extract_text_from_txt(file_path)
    except Exception as e:
        logger.error(f"Error extracting text from {file_path}: {e}")
        return f"[Error: Could not extract text from file. File type: {file_type}]"


def extract_text_from_txt(file_path: str) -> str:
    """Extract text from plain text files"""
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            return f.read()
    except Exception as e:
        logger.error(f"Error reading text file {file_path}: {e}")
        return ""


def extract_text_from_pdf(file_path: str) -> str:
    """Extract text from PDF files"""
    try:
        import PyPDF2
        text = ""
        with open(file_path, 'rb') as f:
            pdf_reader = PyPDF2.PdfReader(f)
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
        return text.strip()
    except ImportError:
        logger.error("PyPDF2 is not installed. Please install it to extract PDF text.")
        return "[Error: PDF extraction requires PyPDF2 library]"
    except Exception as e:
        logger.error(f"Error extracting text from PDF {file_path}: {e}")
        return ""


def extract_text_from_docx(file_path: str) -> str:
    """Extract text from DOCX files"""
    try:
        from docx import Document
        doc = Document(file_path)
        text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
        return text.strip()
    except ImportError:
        logger.error("python-docx is not installed. Please install it to extract DOCX text.")
        return "[Error: DOCX extraction requires python-docx library]"
    except Exception as e:
        logger.error(f"Error extracting text from DOCX {file_path}: {e}")
        return ""


def extract_text_from_doc(file_path: str) -> str:
    """Extract text from DOC files (legacy Word format)"""
    # DOC files are binary and harder to parse without external tools
    # For now, return a message indicating it's not supported
    logger.warning("DOC file format is not fully supported. Please convert to DOCX or PDF.")
    return "[Note: Legacy .doc files are not supported. Please convert to .docx or .pdf format]"


def extract_text_from_csv(file_path: str) -> str:
    """Extract text from CSV files"""
    try:
        import csv
        text_lines = []
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            csv_reader = csv.reader(f)
            for row in csv_reader:
                text_lines.append(", ".join(row))
        return "\n".join(text_lines)
    except Exception as e:
        logger.error(f"Error extracting text from CSV {file_path}: {e}")
        return ""

