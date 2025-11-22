import os
import requests
import json
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

from acp_client import ACPClient

load_dotenv()


# ============================================================================
# CONSTANTS
# ============================================================================

DAT1_API_KEY: Optional[str] = os.getenv('DAT1_API_KEY')


# ============================================================================
# LLM SERVICE CLASS
# ============================================================================

class LLMService:
    def __init__(self, acp_client: ACPClient):
        self.acp_client = acp_client
        self.api_url = 'https://api.dat1.co/api/v1/collection/open-ai/chat/completions'
        self.model = 'gpt-120-oss'
        
        # Define tools available to the LLM
        self.tools = [
            {
                "type": "function",
                "function": {
                    "name": "list_products",
                    "description": "Get a list of available drinks from the catalog. Use this when the user asks to see drinks or what is for sale.",
                    "parameters": {
                        "type": "object",
                        "properties": {},
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "add_to_cart",
                    "description": "Add a product to the user's shopping cart. Use this when the user explicitly wants to buy a specific item.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "item_id": {
                                "type": "string",
                                "description": "The ID of the product to add to cart (e.g., 'item_1')"
                            }
                        },
                        "required": ["item_id"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "start_checkout",
                    "description": "Initiate the checkout process. Use this when the user says they are ready to checkout or buy the items in their cart.",
                    "parameters": {
                        "type": "object",
                        "properties": {},
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "complete_checkout",
                    "description": "Complete the checkout process using a payment token. Use this ONLY when the user provides a payment token and checkout ID.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "checkout_id": {
                                "type": "string",
                                "description": "The ID of the checkout session"
                            },
                            "payment_token": {
                                "type": "string",
                                "description": "The payment token provided by the user/frontend"
                            }
                        },
                        "required": ["checkout_id", "payment_token"]
                    }
                }
            }
        ]

    def _call_llm(self, messages: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Call the LLM API"""
        if not DAT1_API_KEY:
            return {
                "role": "assistant",
                "content": "Error: DAT1_API_KEY is not configured in the backend."
            }

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {DAT1_API_KEY}"
        }

        payload = {
            "model": self.model,
            "messages": messages,
            "tools": self.tools,
            "temperature": 0.7
        }

        try:
            response = requests.post(self.api_url, headers=headers, json=payload)
            response.raise_for_status()
            return response.json()['choices'][0]['message']
        except Exception as e:
            print(f"LLM API Error: {e}")
            return {
                "role": "assistant",
                "content": "I apologize, but I'm having trouble connecting to my brain right now."
            }

    def process_message(self, messages: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Process a chat message history, execute tools if needed, and return the final response.
        Returns a dict with 'role' and 'content', and optionally 'tool_calls' if the frontend needs to act.
        """
        
        # First call to LLM
        response_message = self._call_llm(messages)
        
        # Check for tool calls
        if response_message.get('tool_calls'):
            # Append the assistant's message with tool calls to history
            messages.append(response_message)
            
            tool_calls = response_message['tool_calls']
            
            for tool_call in tool_calls:
                function_name = tool_call['function']['name']
                function_args = json.loads(tool_call['function']['arguments'])
                tool_call_id = tool_call['id']
                
                tool_result = None
                
                # Handle tools that need backend execution
                if function_name == "list_products":
                    products = self.acp_client.list_products()
                    tool_result = json.dumps(products)
                
                elif function_name == "complete_checkout":
                    result = self.acp_client.complete_checkout(
                        checkout_id=function_args['checkout_id'],
                        payment_token=function_args['payment_token']
                    )
                    tool_result = json.dumps(result)
                
                # Handle tools that are just signals for the frontend
                # For these, we still need to provide a result to the LLM so it knows what happened
                elif function_name == "add_to_cart":
                    tool_result = json.dumps({"status": "success", "message": f"Added {function_args.get('item_id')} to cart"})
                    
                elif function_name == "start_checkout":
                    tool_result = json.dumps({"status": "success", "message": "Checkout started"})
                
                else:
                    tool_result = json.dumps({"error": "Unknown tool"})

                # Append tool result to history
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call_id,
                    "name": function_name,
                    "content": tool_result
                })

            # Call LLM again with tool results
            final_response = self._call_llm(messages)
            
            # If the tool was a frontend action (add_to_cart, start_checkout), 
            # we might want to include that info in the response so the frontend knows what to do.
            # However, the standard way is that the LLM describes what it did.
            # But for the frontend to actually update the UI, it needs to know.
            # We can attach the original tool calls to the final response for the frontend to inspect.
            final_response['original_tool_calls'] = tool_calls
            
            return final_response
            
        return response_message
