"""
Dataset templates for common evaluation use cases.
Provides pre-built datasets that can be used for prompt evaluation and improvement.
"""
from typing import Dict, Any, List
from app.schemas.dataset import DatasetCreate, DatasetEntryCreate


DATASET_TEMPLATES: Dict[str, Dict[str, Any]] = {
    "code-review-assistant": {
        "name": "Code Review Test Cases",
        "description": "Test cases for code review prompts focusing on security vulnerabilities and best practices",
        "metadata": {
            "task": "code-review",
            "domain": "security",
            "difficulty": "medium"
        },
        "entries": [
            {
                "input_data": {
                    "code": "def login(user, password):\n    query = f\"SELECT * FROM users WHERE username = '{user}' AND password = '{password}'\"\n    return execute_query(query)",
                    "language": "python"
                },
                "expected_output": {
                    "vulnerability": "SQL injection",
                    "severity": "critical"
                },
                "rubric": "Must identify SQL injection vulnerability. Should suggest parameterized queries."
            },
            {
                "input_data": {
                    "code": "function divide(a, b) {\n    return a / b;\n}",
                    "language": "javascript"
                },
                "expected_output": {
                    "issue": "division by zero",
                    "severity": "medium"
                },
                "rubric": "Should identify division by zero edge case."
            },
            {
                "input_data": {
                    "code": "import os\nos.system(f\"rm -rf {user_input}\")",
                    "language": "python"
                },
                "expected_output": {
                    "vulnerability": "command injection",
                    "severity": "critical"
                },
                "rubric": "Must identify command injection risk. Should suggest safer alternatives."
            },
            {
                "input_data": {
                    "code": "const apiKey = 'sk-1234567890abcdef';\nconsole.log(apiKey);",
                    "language": "javascript"
                },
                "expected_output": {
                    "issue": "hardcoded secret",
                    "severity": "critical"
                },
                "rubric": "Should identify hardcoded API key. Must suggest using environment variables."
            },
            {
                "input_data": {
                    "code": "def process_payment(amount):\n    if amount > 0:\n        charge_card(amount)",
                    "language": "python"
                },
                "expected_output": {
                    "issue": "missing validation",
                    "severity": "high"
                },
                "rubric": "Should identify missing input validation and error handling."
            }
        ]
    },
    
    "sentiment-analyzer": {
        "name": "Sentiment Analysis Test Set",
        "description": "Test cases for sentiment analysis prompts",
        "metadata": {
            "task": "sentiment-analysis",
            "domain": "nlp",
            "difficulty": "easy"
        },
        "entries": [
            {
                "input_data": {
                    "text": "I absolutely love this product! It's amazing!"
                },
                "expected_output": {
                    "sentiment": "positive",
                    "confidence": 0.95
                },
                "rubric": "Should correctly identify positive sentiment with high confidence."
            },
            {
                "input_data": {
                    "text": "This is terrible. I hate it."
                },
                "expected_output": {
                    "sentiment": "negative",
                    "confidence": 0.90
                },
                "rubric": "Should correctly identify negative sentiment."
            },
            {
                "input_data": {
                    "text": "The weather is okay today."
                },
                "expected_output": {
                    "sentiment": "neutral",
                    "confidence": 0.70
                },
                "rubric": "Should identify neutral sentiment."
            },
            {
                "input_data": {
                    "text": "Not bad, but could be better."
                },
                "expected_output": {
                    "sentiment": "neutral",
                    "confidence": 0.65
                },
                "rubric": "Should handle mixed signals and identify as neutral or slightly negative."
            },
            {
                "input_data": {
                    "text": "I'm so excited!!! This is the best day ever!!!"
                },
                "expected_output": {
                    "sentiment": "positive",
                    "confidence": 0.98
                },
                "rubric": "Should identify strong positive sentiment despite excessive punctuation."
            }
        ]
    },
    
    "text-classifier": {
        "name": "Text Classification Test Cases",
        "description": "Test cases for text classification prompts",
        "metadata": {
            "task": "classification",
            "domain": "nlp",
            "difficulty": "medium"
        },
        "entries": [
            {
                "input_data": {
                    "text": "Meeting scheduled for tomorrow at 3pm in conference room A"
                },
                "expected_output": {
                    "category": "calendar",
                    "confidence": 0.95
                },
                "rubric": "Should classify as calendar event."
            },
            {
                "input_data": {
                    "text": "Your order #12345 has been shipped and will arrive on Friday"
                },
                "expected_output": {
                    "category": "shipping",
                    "confidence": 0.90
                },
                "rubric": "Should classify as shipping notification."
            },
            {
                "input_data": {
                    "text": "URGENT: Server down, need immediate attention"
                },
                "expected_output": {
                    "category": "alert",
                    "priority": "high",
                    "confidence": 0.92
                },
                "rubric": "Should identify as alert with high priority."
            },
            {
                "input_data": {
                    "text": "Can you help me reset my password?"
                },
                "expected_output": {
                    "category": "support",
                    "confidence": 0.88
                },
                "rubric": "Should classify as support request."
            },
            {
                "input_data": {
                    "text": "Thank you for your purchase! Here's your receipt."
                },
                "expected_output": {
                    "category": "transaction",
                    "confidence": 0.85
                },
                "rubric": "Should classify as transaction confirmation."
            }
        ]
    },
    
    "document-summarizer": {
        "name": "Document Summarization Test Cases",
        "description": "Test cases for document summarization prompts",
        "metadata": {
            "task": "summarization",
            "domain": "nlp",
            "difficulty": "medium"
        },
        "entries": [
            {
                "input_data": {
                    "text": "The quarterly earnings report shows significant growth. Revenue increased by 25% compared to last quarter. Operating expenses decreased by 10%. Net profit margin improved to 18%. The company plans to expand into three new markets next year."
                },
                "expected_output": {
                    "summary_length": "short",
                    "key_points": ["25% revenue growth", "10% expense reduction", "18% profit margin", "expansion planned"]
                },
                "rubric": "Should extract key financial metrics and create concise summary."
            },
            {
                "input_data": {
                    "text": "Machine learning is transforming industries. AI models can now process vast amounts of data. Deep learning enables pattern recognition. Natural language processing improves communication. Computer vision automates visual tasks."
                },
                "expected_output": {
                    "summary_length": "medium",
                    "key_points": ["ML transformation", "data processing", "pattern recognition", "NLP", "computer vision"]
                },
                "rubric": "Should identify main AI/ML concepts and create structured summary."
            },
            {
                "input_data": {
                    "text": "Climate change poses significant challenges. Rising temperatures affect ecosystems. Sea levels are increasing. Extreme weather events are more frequent. Renewable energy adoption is accelerating. Carbon emissions need reduction."
                },
                "expected_output": {
                    "summary_length": "short",
                    "key_points": ["temperature rise", "sea level increase", "extreme weather", "renewable energy", "emission reduction"]
                },
                "rubric": "Should capture environmental impacts and solutions."
            }
        ]
    },
    
    "question-answering": {
        "name": "Question Answering Test Cases",
        "description": "Test cases for question answering prompts",
        "metadata": {
            "task": "qa",
            "domain": "nlp",
            "difficulty": "hard"
        },
        "entries": [
            {
                "input_data": {
                    "context": "Python is a high-level programming language. It was created by Guido van Rossum and first released in 1991.",
                    "question": "Who created Python?"
                },
                "expected_output": {
                    "answer": "Guido van Rossum",
                    "confidence": 1.0
                },
                "rubric": "Should extract exact answer from context."
            },
            {
                "input_data": {
                    "context": "The company was founded in 2010. It has 500 employees. Revenue last year was $10M.",
                    "question": "How many employees does the company have?"
                },
                "expected_output": {
                    "answer": "500",
                    "confidence": 1.0
                },
                "rubric": "Should identify specific numerical fact."
            },
            {
                "input_data": {
                    "context": "Machine learning requires data, algorithms, and computing power. It's used in many applications.",
                    "question": "What are the requirements for machine learning?"
                },
                "expected_output": {
                    "answer": "data, algorithms, and computing power",
                    "confidence": 0.95
                },
                "rubric": "Should extract list of requirements from context."
            }
        ]
    },
    
    "code-generator": {
        "name": "Code Generation Test Cases",
        "description": "Test cases for code generation prompts",
        "metadata": {
            "task": "code-generation",
            "domain": "programming",
            "difficulty": "hard"
        },
        "entries": [
            {
                "input_data": {
                    "description": "Create a function that calculates the factorial of a number",
                    "language": "python"
                },
                "expected_output": {
                    "code": "def factorial(n):\n    if n <= 1:\n        return 1\n    return n * factorial(n - 1)",
                    "has_recursion": True
                },
                "rubric": "Should generate correct recursive factorial function with base case."
            },
            {
                "input_data": {
                    "description": "Write a function to reverse a string",
                    "language": "python"
                },
                "expected_output": {
                    "code": "def reverse_string(s):\n    return s[::-1]",
                    "complexity": "O(n)"
                },
                "rubric": "Should generate efficient string reversal using slicing."
            },
            {
                "input_data": {
                    "description": "Create a function to check if a number is prime",
                    "language": "python"
                },
                "expected_output": {
                    "code": "def is_prime(n):\n    if n < 2:\n        return False\n    for i in range(2, int(n**0.5) + 1):\n        if n % i == 0:\n            return False\n    return True",
                    "has_optimization": True
                },
                "rubric": "Should generate optimized prime check using square root optimization."
            }
        ]
    },
    
    "email-classifier": {
        "name": "Email Classification Test Cases",
        "description": "Test cases for email classification and routing",
        "metadata": {
            "task": "email-classification",
            "domain": "communication",
            "difficulty": "medium"
        },
        "entries": [
            {
                "input_data": {
                    "subject": "Invoice #12345",
                    "body": "Please find attached invoice for services rendered."
                },
                "expected_output": {
                    "category": "invoice",
                    "priority": "normal",
                    "action": "archive"
                },
                "rubric": "Should classify as invoice and suggest archiving."
            },
            {
                "input_data": {
                    "subject": "URGENT: Security Alert",
                    "body": "Unusual login detected from new location. Please verify."
                },
                "expected_output": {
                    "category": "security",
                    "priority": "urgent",
                    "action": "review_immediately"
                },
                "rubric": "Should identify security alert with urgent priority."
            },
            {
                "input_data": {
                    "subject": "Meeting Request",
                    "body": "Can we schedule a meeting for next week?"
                },
                "expected_output": {
                    "category": "scheduling",
                    "priority": "normal",
                    "action": "respond"
                },
                "rubric": "Should classify as scheduling request."
            },
            {
                "input_data": {
                    "subject": "Newsletter - Weekly Updates",
                    "body": "Check out our latest products and promotions..."
                },
                "expected_output": {
                    "category": "newsletter",
                    "priority": "low",
                    "action": "archive_or_delete"
                },
                "rubric": "Should identify marketing newsletter with low priority."
            }
        ]
    },
    
    "content-moderation": {
        "name": "Content Moderation Test Cases",
        "description": "Test cases for content moderation and safety checks",
        "metadata": {
            "task": "moderation",
            "domain": "safety",
            "difficulty": "medium"
        },
        "entries": [
            {
                "input_data": {
                    "text": "This is a great product! Highly recommend it."
                },
                "expected_output": {
                    "is_safe": True,
                    "violations": [],
                    "confidence": 0.98
                },
                "rubric": "Should identify safe, positive content."
            },
            {
                "input_data": {
                    "text": "I hate this and want to harm someone"
                },
                "expected_output": {
                    "is_safe": False,
                    "violations": ["threat", "hate_speech"],
                    "confidence": 0.95
                },
                "rubric": "Should identify threats and hate speech."
            },
            {
                "input_data": {
                    "text": "Buy now! Limited time offer! Click here!"
                },
                "expected_output": {
                    "is_safe": True,
                    "violations": ["spam_indicators"],
                    "confidence": 0.75
                },
                "rubric": "Should flag spam indicators while keeping content safe."
            },
            {
                "input_data": {
                    "text": "This contains explicit content that should be filtered"
                },
                "expected_output": {
                    "is_safe": False,
                    "violations": ["explicit_content"],
                    "confidence": 0.90
                },
                "rubric": "Should identify explicit content appropriately."
            }
        ]
    },
    
    "data-extraction": {
        "name": "Data Extraction Test Cases",
        "description": "Test cases for structured data extraction from text",
        "metadata": {
            "task": "extraction",
            "domain": "nlp",
            "difficulty": "hard"
        },
        "entries": [
            {
                "input_data": {
                    "text": "Contact John Doe at john.doe@example.com or call 555-1234. Address: 123 Main St, New York, NY 10001"
                },
                "expected_output": {
                    "name": "John Doe",
                    "email": "john.doe@example.com",
                    "phone": "555-1234",
                    "address": "123 Main St, New York, NY 10001"
                },
                "rubric": "Should extract all contact information accurately."
            },
            {
                "input_data": {
                    "text": "Order #45678 placed on 2024-01-15. Total: $129.99. Items: 2x Widget A, 1x Widget B"
                },
                "expected_output": {
                    "order_id": "45678",
                    "date": "2024-01-15",
                    "total": 129.99,
                    "items": [
                        {"name": "Widget A", "quantity": 2},
                        {"name": "Widget B", "quantity": 1}
                    ]
                },
                "rubric": "Should extract structured order information with items."
            },
            {
                "input_data": {
                    "text": "Meeting: Project Review, Date: March 15, 2024, Time: 2:00 PM, Attendees: Alice, Bob, Charlie"
                },
                "expected_output": {
                    "event": "Project Review",
                    "date": "2024-03-15",
                    "time": "14:00",
                    "attendees": ["Alice", "Bob", "Charlie"]
                },
                "rubric": "Should extract meeting details in structured format."
            }
        ]
    },
    
    "translation": {
        "name": "Translation Quality Test Cases",
        "description": "Test cases for translation quality evaluation",
        "metadata": {
            "task": "translation",
            "domain": "nlp",
            "difficulty": "hard"
        },
        "entries": [
            {
                "input_data": {
                    "text": "Hello, how are you?",
                    "source_language": "en",
                    "target_language": "es"
                },
                "expected_output": {
                    "translation": "Hola, ¿cómo estás?",
                    "accuracy": 1.0
                },
                "rubric": "Should produce accurate Spanish translation with proper punctuation."
            },
            {
                "input_data": {
                    "text": "The weather is nice today.",
                    "source_language": "en",
                    "target_language": "fr"
                },
                "expected_output": {
                    "translation": "Il fait beau aujourd'hui.",
                    "accuracy": 0.95
                },
                "rubric": "Should translate idiomatically to French."
            },
            {
                "input_data": {
                    "text": "Good morning",
                    "source_language": "en",
                    "target_language": "de"
                },
                "expected_output": {
                    "translation": "Guten Morgen",
                    "accuracy": 1.0
                },
                "rubric": "Should provide correct German greeting."
            }
        ]
    }
}


def get_template(template_id: str) -> Dict[str, Any]:
    """
    Get a dataset template by ID.
    
    Args:
        template_id: Template identifier
        
    Returns:
        Template dictionary
        
    Raises:
        ValueError: If template not found
    """
    if template_id not in DATASET_TEMPLATES:
        available = ", ".join(DATASET_TEMPLATES.keys())
        raise ValueError(f"Template '{template_id}' not found. Available templates: {available}")
    
    return DATASET_TEMPLATES[template_id]


def list_templates() -> List[Dict[str, Any]]:
    """
    List all available dataset templates.
    
    Returns:
        List of template metadata
    """
    return [
        {
            "id": template_id,
            "name": template["name"],
            "description": template.get("description", ""),
            "metadata": template.get("metadata", {}),
            "entry_count": len(template.get("entries", []))
        }
        for template_id, template in DATASET_TEMPLATES.items()
    ]


def create_dataset_from_template(template_id: str, custom_name: str = None) -> DatasetCreate:
    """
    Create a DatasetCreate object from a template.
    
    Args:
        template_id: Template identifier
        custom_name: Optional custom name (defaults to template name)
        
    Returns:
        DatasetCreate object ready to be used
    """
    template = get_template(template_id)
    
    return DatasetCreate(
        name=custom_name or template["name"],
        description=template.get("description", ""),
        metadata=template.get("metadata", {}),
        entries=[
            DatasetEntryCreate(**entry) for entry in template.get("entries", [])
        ]
    )

