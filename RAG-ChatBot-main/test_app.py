import unittest
import os
import sys

# Ensure project directory is in sys.path
sys.path.insert(0, os.path.dirname(__file__))

from app import RAGService, app

class TestRAGApplication(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = app.test_client()
        cls.rag = RAGService()

    def test_relevance_score(self):
        query = "What is Antigravity?"
        context = "Antigravity is an advanced AI coding assistant developed by Google DeepMind."
        score = self.rag._calculate_relevance_score(query, context)
        self.assertGreater(score, 0.0)

        # Test empty query/context
        self.assertEqual(self.rag._calculate_relevance_score("", context), 0.0)
        self.assertEqual(self.rag._calculate_relevance_score(query, ""), 0.0)

    def test_routes_exist(self):
        # Index route
        res = self.client.get('/')
        self.assertEqual(res.status_code, 200)

        # Loaded files route
        res = self.client.get('/loaded-files')
        self.assertEqual(res.status_code, 200)
        self.assertIn('files', res.get_json())

    def test_chat_without_pdf(self):
        res = self.client.post('/chat', json={"query": "Hello"})
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn('response', data)
        # Should prompt to upload PDF
        self.assertTrue('upload' in data['response'].lower() or 'pdf' in data['response'].lower())

    def test_pdf_lifecycle(self):
        # Create a mock/sample PDF for testing
        test_pdf_path = os.path.join(os.path.dirname(__file__), "test_sample.pdf")
        
        # Simple PDF generator using reportlab or minimal PDF bytes if available
        # Or test add_pdf error handling
        success, msg = self.rag.add_pdf("non_existent_file.pdf")
        self.assertFalse(success)

if __name__ == '__main__':
    unittest.main()
