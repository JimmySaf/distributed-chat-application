import unittest

from common.protocol import decode_message, encode_message


class ProtocolTests(unittest.TestCase):
    def test_round_trip_unicode_message(self):
        original = {"type": "chat", "username": "Amina", "text": "Hello 👋"}
        encoded = encode_message(original)
        self.assertTrue(encoded.endswith(b"\n"))
        self.assertEqual(decode_message(encoded.decode("utf-8")), original)

    def test_rejects_non_object_json(self):
        with self.assertRaises(ValueError):
            decode_message('["not", "an", "object"]')


if __name__ == "__main__":
    unittest.main()
