# Chat Frontend - Shopping Assistant

Interactive chat interface for shopping using the Agentic Commerce Protocol.

## Quick Start

### Prerequisites
Make sure both backends are running:
```bash
# Terminal 1 - Seller Backend
cd seller_backend && npm start

# Terminal 2 - Chat Backend
cd chat_backend && source venv/bin/activate && python server.py
```

### Open Interface
```bash
cd chat_frontend
python -m http.server 8000
# Then open http://localhost:8000
```

## Chat Commands

- `show products`

## File Structure

```
chat_frontend/
├── index.html        # Main HTML
├── styles.css        # Styling
└── app.js           # Application logic
```

## Customization

Change API URL in `app.js`:
```javascript
const API_BASE_URL = 'http://localhost:5000';
```