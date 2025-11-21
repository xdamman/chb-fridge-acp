"""
Agentic Commerce Protocol Client
Handles communication with the seller backend following ACP specification
"""

import requests
from typing import Optional, Dict, List, Any
from config import SELLER_BACKEND_URL
import os
import datetime 
class ACPClient:
    """Client for interacting with ACP-compliant seller backend"""
    
    def __init__(self, base_url: str = SELLER_BACKEND_URL):
        self.base_url = base_url.rstrip('/')
        
    def _make_request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> Dict[str, Any]:
        """Make HTTP request to seller backend"""
        url = f"{self.base_url}{endpoint}"

        # Add required ACP headers
        headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer facilitator_token',  # Required by OpenAPI spec
            'API-Version': '2025-09-29'  # Required by OpenAPI spec
        }

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            else:
                raise ValueError(f"Unsupported method: {method}")

            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            return {'error': str(e), 'status_code': getattr(e.response, 'status_code', None)}
    
    # Products
    def list_products(self) -> Dict[str, Any]:
        """Get list of available products"""
        return self._make_request('GET', '/products')
    
    # Checkout Operations
    def create_checkout(
        self,
        items: List[Dict[str, Any]],
        buyer: Optional[Dict[str, str]] = None,
        fulfillment_address: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Create a new checkout session
        
        Args:
            items: List of items with id and quantity
            buyer: Optional buyer information (first_name, last_name, email, phone_number)
            fulfillment_address: Optional shipping address
        """
        data = {'items': items}
        if buyer:
            data['buyer'] = buyer
        if fulfillment_address:
            data['fulfillment_address'] = fulfillment_address
            
        return self._make_request('POST', '/checkout_sessions', data)

    def get_checkout(self, checkout_id: str) -> Dict[str, Any]:
        """Retrieve an existing checkout session"""
        return self._make_request('GET', f'/checkout_sessions/{checkout_id}')
    
    def update_checkout(
        self,
        checkout_id: str,
        items: Optional[List[Dict[str, Any]]] = None,
        buyer: Optional[Dict[str, str]] = None,
        fulfillment_address: Optional[Dict[str, str]] = None,
        fulfillment_option_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Update an existing checkout session
        
        Args:
            checkout_id: ID of the checkout to update
            items: Optional updated items list
            buyer: Optional updated buyer information
            fulfillment_address: Optional updated shipping address
            fulfillment_option_id: Optional selected fulfillment option
        """
        data = {}
        if items is not None:
            data['items'] = items
        if buyer:
            data['buyer'] = buyer
        if fulfillment_address:
            data['fulfillment_address'] = fulfillment_address
        if fulfillment_option_id:
            data['fulfillment_option_id'] = fulfillment_option_id

        return self._make_request('POST', f'/checkout_sessions/{checkout_id}', data)
    
    def complete_checkout(
        self,
        checkout_id: str,
        payment_token: str,
        payment_provider: str = 'stripe',
        billing_address: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Complete a checkout with payment
        
        Args:
            checkout_id: ID of the checkout to complete
            payment_token: Payment token from payment provider
            payment_provider: Payment provider name (default: stripe)
            billing_address: Optional billing address
        """
        payment_data = {
            'token': payment_token,
            'provider': payment_provider
        }

        # Get the total amount from the checkout (including items + shipping + tax)
        checkout_response = self.get_checkout(checkout_id)
        # Find the 'total' entry in the totals array (not subtotal)
        total_entry = next((t for t in checkout_response['totals'] if t['type'] == 'total'), None)
        if not total_entry:
            return {'error': 'Total amount not found in checkout response'}
        amount = total_entry['amount']

        tomorrow = datetime.datetime.now() + datetime.timedelta(days=1)
        expires_at_timestamp = int(tomorrow.timestamp()) 
        
        get_pst_token_response = requests.post(
            url= "https://api.stripe.com/v1/shared_payment/issued_tokens", 
            data={
                "payment_method": payment_token,
                "usage_limits[currency]": "usd",
                "usage_limits[max_amount]": amount,
                "usage_limits[expires_at]": expires_at_timestamp,
                "seller_details[network_id]": "internal",
                "seller_details[external_id]": "stripe_test_merchant",
            },
            auth=(os.getenv("FACILITATOR_API_KEY"), "")
        )
        
        print(get_pst_token_response.json())
        spt_token_id = get_pst_token_response.json()['id']


        payment_data['token'] = spt_token_id

        data = {'payment_data': payment_data}
        return self._make_request('POST', f'/checkout_sessions/{checkout_id}/complete', data)

    def cancel_checkout(self, checkout_id: str) -> Dict[str, Any]:
        """Cancel an existing checkout session"""
        return self._make_request('POST', f'/checkout_sessions/{checkout_id}/cancel', {})

