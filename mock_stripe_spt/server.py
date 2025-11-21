"""
Mock Stripe Shared Payment Token Server
Simulates Stripe's SPT API for European demo purposes
"""

from flask import Flask, Response, jsonify, request
from flask_cors import CORS
from typing import Dict, Any, Optional
import secrets
import time
import os

# ============================================================================
# CONSTANTS
# ============================================================================

PORT = int(os.getenv('MOCK_STRIPE_SPT_PORT', '8001'))
DEFAULT_CURRENCY = 'usd'
SPT_ID_PREFIX = 'spt_'
SPT_ID_LENGTH = 12

# ============================================================================
# APPLICATION SETUP
# ============================================================================

app = Flask(__name__)
CORS(app)

# ============================================================================
# DATA STORAGE
# ============================================================================

# In-memory storage for Shared Payment Tokens
# Format: {spt_id: {payment_method, usage_limits, created_at, metadata}}
spt_storage: Dict[str, Dict[str, Any]] = {}

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def _generate_spt_id() -> str:
    """
    Generates a unique Shared Payment Token identifier.
    
    Returns:
        A string identifier in the format 'spt_<hex_string>'
    """
    return f"{SPT_ID_PREFIX}{secrets.token_hex(SPT_ID_LENGTH)}"


def _create_error_response(error_type: str, error_code: str, message: str, status_code: int) -> tuple[Response, int]:
    """
    Creates a standardized error response in Stripe API format.
    
    Args:
        error_type: The type of error (e.g., 'invalid_request')
        error_code: A specific error code (e.g., 'missing_payment_method')
        message: Human-readable error message
        status_code: HTTP status code to return
        
    Returns:
        A tuple containing the JSON response and status code
    """
    return jsonify({
        'error': {
            'type': error_type,
            'code': error_code,
            'message': message
        }
    }), status_code


def _extract_request_parameters(request_data: Dict[str, str]) -> Dict[str, Optional[str]]:
    """
    Extracts and parses parameters from the form data request.
    
    Args:
        request_data: Dictionary containing form data from the request
        
    Returns:
        Dictionary containing extracted parameters with keys:
        - payment_method: The payment method identifier
        - currency: Currency code for usage limits
        - max_amount: Maximum allowed amount as string
        - expires_at: Expiration timestamp as string
        - network_id: Seller network identifier
        - external_id: Seller external identifier
    """
    return {
        'payment_method': request_data.get('payment_method'),
        'currency': request_data.get('usage_limits[currency]'),
        'max_amount': request_data.get('usage_limits[max_amount]'),
        'expires_at': request_data.get('usage_limits[expires_at]'),
        'network_id': request_data.get('seller_details[network_id]'),
        'external_id': request_data.get('seller_details[external_id]')
    }


def _validate_payment_method(payment_method: Optional[str]) -> None:
    """
    Validates that a payment method is provided.
    
    Args:
        payment_method: The payment method to validate
        
    Raises:
        ValueError: If payment_method is None or empty
    """
    if not payment_method:
        raise ValueError('payment_method is required')


def _parse_amount(amount_string: Optional[str]) -> Optional[int]:
    """
    Converts an amount string to an integer.
    
    Args:
        amount_string: String representation of the amount
        
    Returns:
        Integer value of the amount, or None if amount_string is None or empty
    """
    if not amount_string:
        return None
    return int(amount_string)


def _parse_timestamp(timestamp_string: Optional[str]) -> Optional[int]:
    """
    Converts a timestamp string to an integer.
    
    Args:
        timestamp_string: String representation of the timestamp
        
    Returns:
        Integer value of the timestamp, or None if timestamp_string is None or empty
    """
    if not timestamp_string:
        return None
    return int(timestamp_string)


def _is_token_expired(expires_at: Optional[int]) -> bool:
    """
    Checks if a token has expired based on its expiration timestamp.
    
    Args:
        expires_at: Unix timestamp when the token expires, or None if no expiration
        
    Returns:
        True if the token has expired, False otherwise
    """
    if expires_at is None:
        return False
    return int(time.time()) > expires_at


def _store_spt(spt_id: str, payment_method: str, currency: str, max_amount: Optional[int], 
                expires_at: Optional[int], network_id: Optional[str], external_id: Optional[str]) -> None:
    """
    Stores a Shared Payment Token in memory.
    
    Args:
        spt_id: Unique identifier for the token
        payment_method: Payment method identifier
        currency: Currency code for usage limits
        max_amount: Maximum allowed amount, or None
        expires_at: Expiration timestamp, or None
        network_id: Seller network identifier, or None
        external_id: Seller external identifier, or None
    """
    spt_storage[spt_id] = {
        'id': spt_id,
        'payment_method': payment_method,
        'usage_limits': {
            'currency': currency,
            'max_amount': max_amount,
            'expires_at': expires_at
        },
        'seller_details': {
            'network_id': network_id,
            'external_id': external_id
        },
        'created_at': int(time.time()),
        'status': 'active'
    }

# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.route('/', methods=['GET'])
def index():
    """Root endpoint - shows available endpoints"""
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Mock Stripe SPT Server</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
            .container { background: white; padding: 30px; border-radius: 8px; max-width: 800px; }
            h1 { color: #333; }
            h2 { color: #666; margin-top: 30px; }
            .endpoint { background: #f9f9f9; padding: 15px; margin: 10px 0; border-left: 4px solid #667eea; }
            .method { display: inline-block; padding: 4px 8px; border-radius: 4px; font-weight: bold; margin-right: 10px; }
            .post { background: #49cc90; color: white; }
            .get { background: #61affe; color: white; }
            code { background: #e8e8e8; padding: 2px 6px; border-radius: 3px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Mock Stripe Shared Payment Token Server</h1>
            <p>Mock server that simulates Stripe's Shared Payment Token (SPT) API for demo purposes.</p>
            
            <h2>Available Endpoints</h2>
            
            <div class="endpoint">
                <span class="method post">POST</span>
                <code>/v1/shared_payment/issued_tokens</code>
                <p>Create a new Shared Payment Token</p>
            </div>
            
            <div class="endpoint">
                <span class="method get">GET</span>
                <code>/v1/shared_payment/granted_tokens/&lt;spt_id&gt;</code>
                <p>Retrieve payment method details for an SPT</p>
            </div>
            
            <div class="endpoint">
                <span class="method get">GET</span>
                <code>/health</code>
                <p>Health check endpoint</p>
            </div>
        </div>
    </body>
    </html>
    """
    return html

@app.route('/v1/shared_payment/issued_tokens', methods=['POST'])
def create_spt() -> tuple[Response, int]:
    """
    Creates a new Shared Payment Token.
    
    This endpoint is called by the Chat Backend to create a token that can be
    shared with sellers for payment processing.
    
    Expected form data:
        - payment_method: Required. Payment method identifier
        - usage_limits[currency]: Optional. Currency code (defaults to 'usd')
        - usage_limits[max_amount]: Optional. Maximum allowed amount
        - usage_limits[expires_at]: Optional. Expiration timestamp
        - seller_details[network_id]: Optional. Seller network identifier
        - seller_details[external_id]: Optional. Seller external identifier
        
    Returns:
        JSON response with the created token ID and metadata, or an error response
    """
    # Step 1: Extract and parse request parameters
    request_data = request.form.to_dict()
    parameters = _extract_request_parameters(request_data)
    
    # Step 2: Validate required parameters
    try:
        _validate_payment_method(parameters['payment_method'])
    except ValueError as error:
        return _create_error_response(
            'invalid_request',
            'missing_payment_method',
            str(error),
            400
        )
    
    # Step 3: Parse optional parameters
    currency = parameters['currency'] or DEFAULT_CURRENCY
    max_amount = _parse_amount(parameters['max_amount'])
    expires_at = _parse_timestamp(parameters['expires_at'])
    network_id = parameters['network_id']
    external_id = parameters['external_id']
    
    # Step 4: Generate unique token identifier
    spt_id = _generate_spt_id()
    
    # Step 5: Store token data
    _store_spt(
        spt_id=spt_id,
        payment_method=parameters['payment_method'],
        currency=currency,
        max_amount=max_amount,
        expires_at=expires_at,
        network_id=network_id,
        external_id=external_id
    )
    
    print(f"Created SPT: {spt_id}")
    print(f"  Payment Method: {parameters['payment_method']}")
    print(f"  Max Amount: {max_amount} {currency}")
    
    # Step 6: Return success response
    return jsonify({
        'id': spt_id,
        'object': 'shared_payment.issued_token',
        'created': int(time.time()),
        'livemode': False
    }), 201


@app.route('/v1/shared_payment/granted_tokens/<spt_id>', methods=['GET'])
def get_spt(spt_id: str) -> tuple[Response, int]:
    """
    Retrieves details for an existing Shared Payment Token.
    
    This endpoint is called by the Seller Backend to retrieve token information
    for payment processing.
    
    Args:
        spt_id: The identifier of the token to retrieve
        
    Returns:
        JSON response with token details, or an error response if not found or expired
    """
    # Step 1: Check if token exists
    if spt_id not in spt_storage:
        return _create_error_response(
            'invalid_request',
            'spt_not_found',
            f'Shared payment token {spt_id} not found',
            404
        )
    
    # Step 2: Retrieve token data
    spt_data = spt_storage[spt_id]
    
    # Step 3: Check if token has expired
    expires_at = spt_data['usage_limits']['expires_at']
    if _is_token_expired(expires_at):
        return _create_error_response(
            'invalid_request',
            'spt_expired',
            'Shared payment token has expired',
            400
        )
    
    print(f"Retrieved SPT: {spt_id}")
    print(f"  Payment Method: {spt_data['payment_method']}")
    
    # Step 4: Return token details
    return jsonify({
        'id': spt_id,
        'object': 'shared_payment.granted_token',
        'payment_method': spt_data['payment_method'],
        'usage_limits': spt_data['usage_limits'],
        'seller_details': spt_data['seller_details'],
        'created': spt_data['created_at'],
        'status': spt_data['status'],
        'livemode': False
    }), 200


@app.route('/health', methods=['GET'])
def health() -> tuple[Response, int]:
    """
    Health check endpoint to verify the service is running.
    
    Returns:
        JSON response with service status and active token count
    """
    return jsonify({
        'status': 'healthy',
        'service': 'mock-stripe-spt',
        'active_tokens': len(spt_storage)
    }), 200

# ============================================================================
# APPLICATION ENTRY POINT
# ============================================================================

if __name__ == '__main__':
    # Step 1: Display startup information
    print("\nMock Stripe SPT Server Starting...")
    print(f"Port: {PORT}")
    print(f"Base URL: http://localhost:{PORT}")
    print("\nAvailable endpoints:")
    print("  POST   /v1/shared_payment/issued_tokens    - Create SPT")
    print("  GET    /v1/shared_payment/granted_tokens/<id> - Retrieve SPT")
    print("  GET    /health                             - Health check")
    print("\n")
    
    # Step 2: Start the Flask application
    app.run(host='0.0.0.0', port=PORT, debug=True)
