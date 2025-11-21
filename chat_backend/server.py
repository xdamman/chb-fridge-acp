"""
Chat Backend Server

Simple Python server that acts as a bridge between chat/AI agents and the seller backend.
Handles product listing, checkout operations, and chat message processing.
"""

from typing import Dict, Any, Tuple, Optional
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from acp_client import ACPClient
from config import CHAT_BACKEND_PORT, DEBUG
from llm_service import LLMService


# ============================================================================
# APPLICATION SETUP
# ============================================================================

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

acp_client = ACPClient()
llm_service = LLMService(acp_client)


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def _validate_request_json() -> Dict[str, Any]:
    """
    Validate that the request contains valid JSON data.
    
    Returns:
        The parsed JSON data from the request.
        
    Raises:
        ValueError: If request JSON is missing or invalid.
    """
    if request.json is None:
        raise ValueError("Request body must contain valid JSON")
    return request.json


def _handle_acp_error(result: Dict[str, Any], default_status_code: int = 500) -> Tuple[Response, int]:
    """
    Handle errors returned from ACP client operations.
    
    Args:
        result: The result dictionary from ACP client that contains an error.
        default_status_code: Default HTTP status code to use if not specified in result.
        
    Returns:
        A tuple of (JSON response, HTTP status code).
    """
    status_code = result.get('status_code')
    if status_code is None:
        status_code = default_status_code
    return jsonify(result), status_code


# ============================================================================
# PRODUCT ENDPOINTS
# ============================================================================

@app.route('/products', methods=['GET'])
def list_products() -> Tuple[Response, int]:
    """
    Get list of available products from the seller backend.
    
    Returns:
        JSON response containing list of products, or error response if request fails.
    """
    result = acp_client.list_products()
    
    if 'error' in result:
        return _handle_acp_error(result, default_status_code=500)
    
    return jsonify(result), 200


# ============================================================================
# CHECKOUT ENDPOINTS
# ============================================================================

@app.route('/checkout/create', methods=['POST'])
def create_checkout() -> Tuple[Response, int]:
    """
    Create a new checkout session with specified items.
    
    Request body must contain:
        - items: List of items to purchase (required)
        - buyer: Buyer information dictionary (optional)
        - fulfillment_address: Shipping address dictionary (optional)
        
    Returns:
        JSON response containing checkout session details, or error response.
    """
    request_data = _validate_request_json()
    
    if 'items' not in request_data:
        return jsonify({'error': 'Items are required'}), 400
    
    result = acp_client.create_checkout(
        items=request_data['items'],
        buyer=request_data.get('buyer'),
        fulfillment_address=request_data.get('fulfillment_address')
    )
    
    if 'error' in result:
        return _handle_acp_error(result, default_status_code=500)
    
    return jsonify(result), 201


@app.route('/checkout/<checkout_id>', methods=['GET'])
def get_checkout(checkout_id: str) -> Tuple[Response, int]:
    """
    Retrieve an existing checkout session by ID.
    
    Args:
        checkout_id: The unique identifier of the checkout session.
        
    Returns:
        JSON response containing checkout session details, or error response.
    """
    result = acp_client.get_checkout(checkout_id)
    
    if 'error' in result:
        return _handle_acp_error(result, default_status_code=404)
    
    return jsonify(result), 200


@app.route('/checkout/<checkout_id>/update', methods=['PUT'])
def update_checkout(checkout_id: str) -> Tuple[Response, int]:
    """
    Update an existing checkout session.
    
    Args:
        checkout_id: The unique identifier of the checkout session to update.
        
    Request body may contain:
        - items: Updated list of items (optional)
        - buyer: Updated buyer information (optional)
        - fulfillment_address: Updated shipping address (optional)
        - fulfillment_option_id: Selected fulfillment option ID (optional)
        
    Returns:
        JSON response containing updated checkout session details, or error response.
    """
    request_data = _validate_request_json()
    
    result = acp_client.update_checkout(
        checkout_id=checkout_id,
        items=request_data.get('items'),
        buyer=request_data.get('buyer'),
        fulfillment_address=request_data.get('fulfillment_address'),
        fulfillment_option_id=request_data.get('fulfillment_option_id')
    )
    
    if 'error' in result:
        return _handle_acp_error(result, default_status_code=400)
    
    return jsonify(result), 200


@app.route('/checkout/<checkout_id>/complete', methods=['POST'])
def complete_checkout(checkout_id: str) -> Tuple[Response, int]:
    """
    Complete a checkout session with payment.
    
    Args:
        checkout_id: The unique identifier of the checkout session to complete.
        
    Request body must contain:
        - payment_token: Payment token from payment provider (required)
        - payment_provider: Name of payment provider (optional, defaults to 'stripe')
        - billing_address: Billing address dictionary (optional)
        
    Returns:
        JSON response containing completion details, or error response.
    """
    request_data = _validate_request_json()
    
    if 'payment_token' not in request_data:
        return jsonify({'error': 'Payment token is required'}), 400
    
    payment_provider = request_data.get('payment_provider')
    if payment_provider is None:
        payment_provider = 'stripe'
    
    result = acp_client.complete_checkout(
        checkout_id=checkout_id,
        payment_token=request_data['payment_token'],
        payment_provider=payment_provider,
        billing_address=request_data.get('billing_address')
    )
    
    if 'error' in result:
        return _handle_acp_error(result, default_status_code=400)
    
    return jsonify(result), 200


@app.route('/checkout/<checkout_id>/cancel', methods=['POST'])
def cancel_checkout(checkout_id: str) -> Tuple[Response, int]:
    """
    Cancel an existing checkout session.
    
    Args:
        checkout_id: The unique identifier of the checkout session to cancel.
        
    Returns:
        JSON response containing cancellation details, or error response.
    """
    result = acp_client.cancel_checkout(checkout_id)
    
    if 'error' in result:
        return _handle_acp_error(result, default_status_code=400)
    
    return jsonify(result), 200


# ============================================================================
# CHAT ENDPOINTS
# ============================================================================

@app.route('/chat', methods=['POST'])
def chat() -> Tuple[Response, int]:
    """
    Process chat messages through the LLM service.
    
    Request body must contain:
        - messages: List of message dictionaries with 'role' and 'content' fields (required)
        
    Returns:
        JSON response containing the LLM's response message.
    """
    request_data = _validate_request_json()
    
    if 'messages' not in request_data:
        return jsonify({'error': 'Messages are required'}), 400
    
    messages = request_data['messages']
    response = llm_service.process_message(messages)
    
    return jsonify(response), 200


# ============================================================================
# PAYMENT TOKEN ENDPOINTS
# ============================================================================

@app.route('/exchange_token', methods=['POST'])
def exchange_token() -> Tuple[Response, int]:
    """
    Exchange a raw payment token for a Shared Payment Token (SPT).
    
    Request body must contain:
        - payment_token: Raw payment token from payment provider (required)
        - amount: Payment amount in cents as integer (required)
        
    Returns:
        JSON response containing the SPT token, or error response.
    """
    request_data = _validate_request_json()
    
    if 'payment_token' not in request_data:
        return jsonify({'error': 'payment_token is required'}), 400
    
    if 'amount' not in request_data:
        return jsonify({'error': 'amount is required'}), 400
    
    payment_token = request_data['payment_token']
    amount_value = request_data['amount']
    
    if not isinstance(amount_value, int):
        return jsonify({'error': 'amount must be an integer'}), 400
    
    spt_token = acp_client.create_spt(payment_token, amount_value)
    
    return jsonify({'spt_token': spt_token}), 200


# ============================================================================
# APPLICATION ENTRY POINT
# ============================================================================

if __name__ == '__main__':
    print(f"\nChat Backend Server Starting...")
    print(f"Port: {CHAT_BACKEND_PORT}")
    print(f"Seller Backend: {acp_client.base_url}")
    print(f"\nAvailable endpoints:")
    print(f"  GET    /products                      - List products")
    print(f"  POST   /checkout/create               - Create checkout")
    print(f"  GET    /checkout/<id>                 - Get checkout")
    print(f"  PUT    /checkout/<id>/update          - Update checkout")
    print(f"  POST   /checkout/<id>/complete        - Complete checkout")
    print(f"  POST   /checkout/<id>/cancel          - Cancel checkout")
    print(f"  POST   /chat                          - Process chat message")
    print(f"  POST   /exchange_token                - Exchange payment token")
    print(f"\n")
    
    app.run(host='0.0.0.0', port=CHAT_BACKEND_PORT, debug=DEBUG)

