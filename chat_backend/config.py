"""
Configuration for Chat Backend
"""

import os
from dotenv import load_dotenv

load_dotenv()

# Seller Backend Configuration
SELLER_BACKEND_URL = os.getenv('SELLER_BACKEND_URL', 'http://localhost:3000')

# Chat Backend Configuration
CHAT_BACKEND_PORT = int(os.getenv('CHAT_BACKEND_PORT', 9000))
DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'

