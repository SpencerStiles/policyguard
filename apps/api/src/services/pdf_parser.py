"""PDF parsing service using PyMuPDF (fitz).

Extracts text, metadata, and page structure from uploaded policy PDFs.
"""

import logging
from dataclasses import dataclass, field
from pathlib import Path

import fitz  # PyMuPDF

logger = logging.getLogger("policyguard.pdf_parser")


@dataclass
class PageContent:
    """Extracted content from a single PDF page."""
    page_number: int
    text: str
    word_count: int


@dataclass
class ParsedDocument:
    """Complete parsed output from a PDF document."""
    filename: str
    page_count: int
    pages: list[PageContent]
    metadata: dict = field(default_factory=dict)
    full_text: str = ""

    @property
    def total_words(self) -> int:
        return sum(p.word_count for p in self.pages)


def parse_pdf(file_path: str | Path) -> ParsedDocument:
    """Parse a PDF file and extract text content from all pages.

    Args:
        file_path: Path to the PDF file on disk.

    Returns:
        ParsedDocument with page-level and full text content.

    Raises:
        FileNotFoundError: If the file does not exist.
        RuntimeError: If the PDF cannot be opened or parsed.
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"PDF file not found: {path}")

    try:
        doc = fitz.open(str(path))
    except Exception as exc:
        raise RuntimeError(f"Failed to open PDF: {exc}") from exc

    pages: list[PageContent] = []
    full_text_parts: list[str] = []

    for page_num in range(doc.page_count):
        page = doc[page_num]
        text = page.get_text("text")
        word_count = len(text.split())
        pages.append(PageContent(
            page_number=page_num + 1,
            text=text,
            word_count=word_count,
        ))
        full_text_parts.append(text)

    metadata = doc.metadata or {}
    doc.close()

    full_text = "\n\n---PAGE BREAK---\n\n".join(full_text_parts)

    logger.info(
        "Parsed %s: %d pages, %d total words",
        path.name,
        len(pages),
        sum(p.word_count for p in pages),
    )

    return ParsedDocument(
        filename=path.name,
        page_count=len(pages),
        pages=pages,
        metadata=metadata,
        full_text=full_text,
    )


def chunk_document(
    parsed: ParsedDocument,
    chunk_size: int = 1000,
    chunk_overlap: int = 200,
) -> list[dict]:
    """Split a parsed document into overlapping text chunks for RAG.

    Each chunk includes metadata about its source page(s) for citation.

    Args:
        parsed: The parsed PDF document.
        chunk_size: Target number of characters per chunk.
        chunk_overlap: Number of overlapping characters between consecutive chunks.

    Returns:
        List of dicts with keys: text, page_numbers, chunk_index, source.
    """
    chunks: list[dict] = []
    chunk_index = 0

    for page in parsed.pages:
        text = page.text.strip()
        if not text:
            continue

        start = 0
        while start < len(text):
            end = start + chunk_size
            chunk_text = text[start:end]

            # Try to break at a sentence boundary
            if end < len(text):
                last_period = chunk_text.rfind(". ")
                last_newline = chunk_text.rfind("\n")
                break_point = max(last_period, last_newline)
                if break_point > chunk_size * 0.5:
                    chunk_text = chunk_text[: break_point + 1]
                    end = start + break_point + 1

            chunks.append({
                "text": chunk_text.strip(),
                "page_numbers": [page.page_number],
                "chunk_index": chunk_index,
                "source": parsed.filename,
            })
            chunk_index += 1
            start = end - chunk_overlap if end < len(text) else len(text)

    logger.info("Chunked %s into %d chunks", parsed.filename, len(chunks))
    return chunks
