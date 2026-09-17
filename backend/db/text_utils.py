"""Text utility functions for cleaning scraped HTML, normalizing whitespace,
and constructing embedding text blobs for hotels and POIs.
"""

import html
import re
from typing import List, Optional

# Regular expression to match any HTML tag
HTML_TAG_PATTERN = re.compile(r"<[^>]+>")
# Regular expression to match multiple whitespace characters
WHITESPACE_PATTERN = re.compile(r"\s+")


def strip_html(text: Optional[str]) -> str:
    """Removes HTML tags and unescapes HTML entities from text."""
    if not text:
        return ""
    # Strip HTML tags
    cleaned = HTML_TAG_PATTERN.sub(" ", str(text))
    # Unescape HTML entities (e.g. &amp;, &quot;, &nbsp;)
    cleaned = html.unescape(cleaned)
    return normalize_whitespace(cleaned)


def normalize_whitespace(text: Optional[str]) -> str:
    """Collapses multiple spaces, tabs, and newlines into a single space and strips ends."""
    if not text:
        return ""
    return WHITESPACE_PATTERN.sub(" ", str(text)).strip()


def build_text_blob(
    name: str,
    description: Optional[str] = "",
    tags: Optional[List[str]] = None,
    reviews: Optional[List[str]] = None,
) -> str:
    """Constructs a consolidated text blob for semantic embedding and vector search.
    
    Structure:
    {name}. {description}. Tags: {tags}. Highlights: {top 3 reviews}
    """
    parts = []

    clean_name = normalize_whitespace(strip_html(name))
    if clean_name:
        parts.append(clean_name)

    clean_desc = normalize_whitespace(strip_html(description))
    if clean_desc and clean_desc != "No description available.":
        parts.append(clean_desc)

    if tags:
        valid_tags = [normalize_whitespace(strip_html(t)) for t in tags if t]
        valid_tags = [t for t in valid_tags if t]
        if valid_tags:
            parts.append("Tags: " + ", ".join(valid_tags))

    if reviews:
        # Take up to top 3 reviews
        top_reviews = [normalize_whitespace(strip_html(r)) for r in reviews[:3] if r]
        top_reviews = [r for r in top_reviews if r]
        if top_reviews:
            parts.append("Reviews: " + " | ".join(top_reviews))

    # Join parts with period and space
    blob = ". ".join(parts).strip()
    if not blob:
        blob = clean_name or "Unspecified venue"

    return blob
