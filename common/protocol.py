"""Shared message-formatting functions for the chat application."""

import json


def encode_message(message):
    """Convert a Python dictionary into newline-terminated JSON bytes."""
    return (json.dumps(message, ensure_ascii=False) + "\n").encode("utf-8")


def decode_message(line):
    """Convert a JSON string into a Python dictionary."""
    message = json.loads(line)

    if not isinstance(message, dict):
        raise ValueError("A protocol message must be a JSON object.")

    return message