// Configuration
const API_BASE_URL = 'http://localhost:5000';

// Default buyer and shipping information
const DEFAULT_BUYER = {
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    phone_number: '+1234567890'
};

const DEFAULT_SHIPPING_ADDRESS = {
    name: 'John Doe',
    line_one: '123 Main Street',
    line_two: 'Apt 4B',
    city: 'San Francisco',
    state: 'CA',
    country: 'US',
    postal_code: '94105'
};

const DEFAULT_PAYMENT_METHOD = {
    payment_method: 'pm_card_visa',
};

// State management
const state = {
    products: [],
    currentCheckout: null,
    cart: [],
    userInfo: DEFAULT_BUYER, // Use default buyer info
    step: 'initial', // initial, browsing, cart, info, shipping, payment, completed
    currentProduct: null,
    modalQuantity: 1
};

// DOM Elements
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');

// Event Listeners
sendButton.addEventListener('click', handleSendMessage);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleSendMessage();
    }
});

// Initialize chat
window.addEventListener('load', () => {
    addBotMessage("👋 Welcome to the Shopping Assistant! I'm here to help you shop.");
    setTimeout(() => {
        addBotMessage("Type 'show products' to browse available products !\n");
    }, 500);
});

// Message handling
function handleSendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    addUserMessage(message);
    userInput.value = '';

    // Show typing indicator
    const typingId = showTypingIndicator();

    // Process message
    setTimeout(() => {
        processMessage(message, typingId);
    }, 500);
}

function processMessage(message, typingId) {
    const lowerMessage = message.toLowerCase();

    // Command routing
    if (lowerMessage.includes('show products') || lowerMessage.includes('browse') || lowerMessage.includes('catalog')) {
        removeTypingIndicator(typingId);
        handleShowProducts();
    } else if (lowerMessage.includes('buy') || lowerMessage.includes('purchase')) {
        removeTypingIndicator(typingId);
        handleBuyProduct(message);
    } else if (lowerMessage.includes('cart')) {
        removeTypingIndicator(typingId);
        handleShowCart();
    } else if (lowerMessage.includes('help')) {
        removeTypingIndicator(typingId);
        handleHelp();
    } else if (lowerMessage.includes('cancel') && state.currentCheckout) {
        removeTypingIndicator(typingId);
        handleCancelCheckout();
    } else {
        removeTypingIndicator(typingId);
        handleGeneralQuery(message);
    }
}

// Command handlers
async function handleShowProducts() {
    try {
        const response = await fetch(`${API_BASE_URL}/products`);
        const data = await response.json();
        state.products = data.products;

        addBotMessage("Here are our available products:");
        
        // Create a container for all products to display in one line
        let productsHtml = '<div class="products-container">';
        data.products.forEach(product => {
            productsHtml += createProductCardHtml(product);
        });
        productsHtml += '</div>';
        
        addRawMessage(productsHtml, 'bot');

        setTimeout(() => {
            addBotMessage("Click on any product to view details and purchase!");
        }, 500);
    } catch (error) {
        addBotMessage("❌ Sorry, I couldn't load the products. Please make sure the backend is running.");
    }
}

function handleBuyProduct(message) {
    // Extract item ID from message
    const itemMatch = message.match(/item_\w+/);
    if (!itemMatch) {
        addBotMessage("Please specify a valid item ID, like 'buy item_123'");
        return;
    }

    const itemId = itemMatch[0];
    const product = state.products.find(p => p.id === itemId);

    if (!product) {
        addBotMessage(`I couldn't find that product. Type 'show products' to see available items.`);
        return;
    }

    addToCart(product);
}

function addToCart(product) {
    const existingItem = state.cart.find(item => item.id === product.id);
    
    if (existingItem) {
        existingItem.quantity += 1;
        addBotMessage(`Added another ${product.name} to your cart! (Quantity: ${existingItem.quantity})`);
    } else {
        state.cart.push({ ...product, quantity: 1 });
        addBotMessage(`✅ Added ${product.name} to your cart!`);
    }

    setTimeout(() => {
        showCheckoutOption();
    }, 500);
}

function showCheckoutOption() {
    const total = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const itemCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);

    addBotMessage(
        `🛒 Your cart: ${itemCount} item(s) - Total: $${(total / 100).toFixed(2)}\n\nReady to checkout?`,
        [
            { text: 'Checkout Now', action: 'startCheckout' },
            { text: 'Continue Shopping', action: 'showProducts' },
            { text: 'View Cart', action: 'showCart' }
        ]
    );
}

function handleShowCart() {
    if (state.cart.length === 0) {
        addBotMessage("Your cart is empty. Type 'show products' to start shopping!");
        return;
    }

    let cartMessage = "🛒 Your Cart:\n\n";
    let total = 0;

    state.cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        cartMessage += `• ${item.name} x${item.quantity} - $${(itemTotal / 100).toFixed(2)}\n`;
    });

    cartMessage += `\nTotal: $${(total / 100).toFixed(2)}`;

    addBotMessage(cartMessage, [
        { text: 'Checkout', action: 'startCheckout' },
        { text: 'Clear Cart', action: 'clearCart' }
    ]);
}

async function startCheckout() {
    if (state.cart.length === 0) {
        addBotMessage("Your cart is empty!");
        return;
    }

    addBotMessage("Great! Let's complete your purchase. I'll need some information from you.");
    
    setTimeout(() => {
        requestUserInfo();
    }, 500);
}

function requestUserInfo() {
    addBotMessage("First, let me get your contact information:", [], true);
    
    const formHtml = `
        <div class="form-container">
            <div class="form-group">
                <label>First Name*</label>
                <input type="text" id="firstName" value="${DEFAULT_BUYER.first_name}" required>
            </div>
            <div class="form-group">
                <label>Last Name*</label>
                <input type="text" id="lastName" value="${DEFAULT_BUYER.last_name}" required>
            </div>
            <div class="form-group">
                <label>Email*</label>
                <input type="email" id="email" value="${DEFAULT_BUYER.email}" required>
            </div>
            <div class="form-group">
                <label>Phone Number</label>
                <input type="tel" id="phone" value="${DEFAULT_BUYER.phone_number}">
            </div>
            <div class="checkout-actions">
                <button class="btn-primary" onclick="submitUserInfo()">Next: Shipping</button>
                <button class="btn-secondary" onclick="handleCancelCheckout()">Cancel</button>
            </div>
        </div>
    `;
    
    addRawMessage(formHtml, 'bot');
}

function submitUserInfo() {
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();

    if (!firstName || !lastName || !email) {
        addBotMessage("❌ Please fill in all required fields (First Name, Last Name, Email)");
        return;
    }

    state.userInfo = {
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone_number: phone || undefined
    };

    addBotMessage(`✅ Got it, ${firstName}! Now let's get your shipping address.`);
    
    setTimeout(() => {
        requestShippingInfo();
    }, 500);
}

function requestShippingInfo() {
    const formHtml = `
        <div class="form-container">
            <div class="form-group">
                <label>Full Name*</label>
                <input type="text" id="shipName" value="${DEFAULT_SHIPPING_ADDRESS.name}">
            </div>
            <div class="form-group">
                <label>Address Line 1*</label>
                <input type="text" id="lineOne" value="${DEFAULT_SHIPPING_ADDRESS.line_one}">
            </div>
            <div class="form-group">
                <label>Address Line 2</label>
                <input type="text" id="lineTwo" value="${DEFAULT_SHIPPING_ADDRESS.line_two || ''}">
            </div>
            <div class="form-group">
                <label>City*</label>
                <input type="text" id="city" value="${DEFAULT_SHIPPING_ADDRESS.city}">
            </div>
            <div class="form-group">
                <label>State*</label>
                <input type="text" id="state" value="${DEFAULT_SHIPPING_ADDRESS.state}">
            </div>
            <div class="form-group">
                <label>Country*</label>
                <input type="text" id="country" value="${DEFAULT_SHIPPING_ADDRESS.country}">
            </div>
            <div class="form-group">
                <label>Postal Code*</label>
                <input type="text" id="postalCode" value="${DEFAULT_SHIPPING_ADDRESS.postal_code}">
            </div>
            <div class="checkout-actions">
                <button class="btn-primary" onclick="submitShippingInfo()">Review Order</button>
                <button class="btn-secondary" onclick="handleCancelCheckout()">Cancel</button>
            </div>
        </div>
    `;
    
    addRawMessage(formHtml, 'bot');
}

async function submitShippingInfo() {
    const name = document.getElementById('shipName').value.trim();
    const lineOne = document.getElementById('lineOne').value.trim();
    const lineTwo = document.getElementById('lineTwo').value.trim();
    const city = document.getElementById('city').value.trim();
    const stateVal = document.getElementById('state').value.trim();
    const country = document.getElementById('country').value.trim();
    const postalCode = document.getElementById('postalCode').value.trim();

    if (!name || !lineOne || !city || !stateVal || !country || !postalCode) {
        addBotMessage("❌ Please fill in all required fields");
        return;
    }

    const shippingAddress = {
        name,
        line_one: lineOne,
        line_two: lineTwo || undefined,
        city,
        state: stateVal,
        country,
        postal_code: postalCode
    };

    // Store shipping address temporarily
    state.pendingShippingAddress = shippingAddress;

    addBotMessage("⏳ Getting shipping options...");

    try {
        // Create checkout to get available shipping options
        const items = state.cart.map(item => ({
            id: item.id,
            quantity: item.quantity
        }));

        const checkoutData = {
            items,
            buyer: state.userInfo,
            fulfillment_address: shippingAddress
        };

        const response = await fetch(`${API_BASE_URL}/checkout/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(checkoutData)
        });

        const checkout = await response.json();
        state.currentCheckout = checkout;

        if (checkout.status === 'ready_for_payment') {
            // Show shipping options for user to select
            showShippingOptionsSelection(checkout);
        } else {
            addBotMessage("❌ There was an issue creating your checkout. Please try again.");
        }
    } catch (error) {
        addBotMessage("❌ Error creating checkout. Please make sure the backend is running.");
    }
}

function showShippingOptionsSelection(checkout) {
    addBotMessage("📦 Please select your preferred shipping method:");

    let shippingHtml = '<div class="checkout-info">';
    
    checkout.fulfillment_options.forEach(option => {
        const isSelected = option.id === checkout.fulfillment_option_id;
        shippingHtml += `<div style="margin-bottom: 16px; padding: 16px; background: ${isSelected ? '#f0f4ff' : '#f9f9f9'}; border: 2px solid ${isSelected ? '#667eea' : '#e0e0e0'}; border-radius: 8px; cursor: pointer;" onclick="selectInitialShipping('${option.id}')">`;
        shippingHtml += `<div style="display: flex; justify-content: space-between; align-items: center;">`;
        shippingHtml += `<div>`;
        shippingHtml += `<strong style="font-size: 16px;">${option.title}</strong> ${isSelected ? '<span style="color: #667eea;">✓</span>' : ''}<br>`;
        if (option.subtitle) {
            shippingHtml += `<span style="color: #666; font-size: 14px;">${option.subtitle}</span><br>`;
        }
        if (option.carrier) {
            shippingHtml += `<span style="color: #999; font-size: 13px;">via ${option.carrier}</span>`;
        }
        shippingHtml += `</div>`;
        shippingHtml += `<div style="text-align: right;">`;
        shippingHtml += `<span style="color: #2e7d32; font-weight: bold; font-size: 18px;">$${(option.total / 100).toFixed(2)}</span>`;
        shippingHtml += `</div>`;
        shippingHtml += `</div>`;
        shippingHtml += `</div>`;
    });
    
    shippingHtml += '<p style="color: #666; font-size: 13px; margin-top: 12px;">💡 Click on any option to select it</p>';
    shippingHtml += '</div>';
    addRawMessage(shippingHtml, 'bot');
}

async function selectInitialShipping(optionId) {
    if (!state.currentCheckout) {
        addBotMessage("❌ No active checkout found.");
        return;
    }

    addBotMessage(`⏳ Selecting shipping method...`);

    try {
        const response = await fetch(`${API_BASE_URL}/checkout/${state.currentCheckout.id}/update`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fulfillment_option_id: optionId })
        });

        const updatedCheckout = await response.json();
        state.currentCheckout = updatedCheckout;

        const selectedOption = updatedCheckout.fulfillment_options.find(opt => opt.id === optionId);
        addBotMessage(`✅ Great choice! ${selectedOption.title} selected.`);
        
        setTimeout(() => {
            showOrderReview(updatedCheckout);
        }, 800);
    } catch (error) {
        addBotMessage("❌ Error selecting shipping. Please try again.");
    }
}

function showOrderReview(checkout) {
    addBotMessage("📋 Order Review:");

    let reviewHtml = '<div class="checkout-info">';
    reviewHtml += `<strong>Items:</strong><br>`;
    checkout.line_items.forEach(item => {
        reviewHtml += `• ${item.item.id} x${item.item.quantity} - $${(item.total / 100).toFixed(2)}<br>`;
    });

    const subtotal = checkout.totals.find(t => t.type === 'subtotal');
    const shipping = checkout.totals.find(t => t.type === 'fulfillment');
    const tax = checkout.totals.find(t => t.type === 'tax');
    const total = checkout.totals.find(t => t.type === 'total');

    reviewHtml += `<br><strong>Shipping:</strong><br>`;
    const selectedOption = checkout.fulfillment_options.find(opt => opt.id === checkout.fulfillment_option_id);
    if (selectedOption) {
        reviewHtml += `${selectedOption.title} - $${(selectedOption.total / 100).toFixed(2)}<br>`;
        if (selectedOption.subtitle) {
            reviewHtml += `<span style="color: #666; font-size: 13px;">${selectedOption.subtitle}</span><br>`;
        }
    }

    reviewHtml += `<br><strong>Summary:</strong><br>`;
    reviewHtml += `Subtotal: $${(subtotal.amount / 100).toFixed(2)}<br>`;
    reviewHtml += `Shipping: $${(shipping.amount / 100).toFixed(2)}<br>`;
    reviewHtml += `Tax: $${(tax.amount / 100).toFixed(2)}<br>`;
    reviewHtml += `<br><strong>Total: $${(total.amount / 100).toFixed(2)}</strong>`;
    reviewHtml += '</div>';

    addRawMessage(reviewHtml, 'bot');

    setTimeout(() => {
        addBotMessage("Ready to complete your purchase?", [
            { text: 'Complete Order', action: 'completeOrder' },
            { text: 'Modify Order', action: 'showModifyOptions' },
            { text: 'Cancel', action: 'cancelCheckout' }
        ]);
    }, 500);
}

async function completeOrder() {
    if (!state.currentCheckout) {
        addBotMessage("❌ No active checkout found.");
        return;
    }

    addBotMessage("💳 Processing payment...");

    try {
        const paymentData = {
            payment_token: DEFAULT_PAYMENT_METHOD.payment_method,
            payment_provider: 'stripe'
        };

        const response = await fetch(`${API_BASE_URL}/checkout/${state.currentCheckout.id}/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(paymentData)
        });

        const result = await response.json();

        if (result.status === 'completed') {
            showOrderComplete(result);
        } else {
            addBotMessage("❌ Payment failed. Please try again.");
        }
    } catch (error) {
        addBotMessage("❌ Error processing payment. Please try again.");
    }
}

function showOrderComplete(checkout) {
    const total = checkout.totals.find(t => t.type === 'total');
    
    addBotMessage(`🎉 Order Complete!`);
    
    const successHtml = `
        <div class="success-message">
            <strong>✅ Payment Successful!</strong><br><br>
            Order ID: ${checkout.id}<br>
            Total Paid: $${(total.amount / 100).toFixed(2)}<br>
            <br>
            Thank you for your purchase, ${state.userInfo.first_name}!<br>
            A confirmation email has been sent to ${state.userInfo.email}
        </div>
    `;
    
    addRawMessage(successHtml, 'bot');

    // Reset state
    state.cart = [];
    state.currentCheckout = null;
    state.userInfo = null;

    setTimeout(() => {
        addBotMessage("Would you like to shop for more items?", [
            { text: 'Browse Products', action: 'showProducts' },
            { text: 'Done', action: 'thankYou' }
        ]);
    }, 1000);
}

async function handleCancelCheckout() {
    if (state.currentCheckout) {
        try {
            await fetch(`${API_BASE_URL}/checkout/${state.currentCheckout.id}/cancel`, {
                method: 'POST'
            });
        } catch (error) {
            console.error('Error canceling checkout:', error);
        }
    }

    state.currentCheckout = null;
    addBotMessage("❌ Checkout cancelled. Your cart is still saved if you want to try again!");
    
    setTimeout(() => {
        if (state.cart.length > 0) {
            addBotMessage("Type 'cart' to see your items, or 'show products' to keep shopping.");
        }
    }, 500);
}

function handleHelp() {
    const helpMessage = `
🤖 Available Commands:

• "show products" or "browse" - View all products
• "buy item_123" - Add product to cart
• "cart" - View your shopping cart
• "checkout" - Start checkout process
• "cancel" - Cancel current checkout
• "help" - Show this message

You can also just chat naturally with me!
    `;
    addBotMessage(helpMessage);
}

function handleGeneralQuery(message) {
    const responses = [
        "I'm here to help you shop! Type 'show products' to see what's available.",
        "Looking for something specific? Type 'show products' to browse our catalog!",
        "I can help you find and purchase products. Try 'show products' to get started!",
    ];
    
    addBotMessage(responses[Math.floor(Math.random() * responses.length)]);
}

// UI Helper Functions
function addUserMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message message-user';
    messageDiv.innerHTML = `<div class="message-content">${escapeHtml(text)}</div>`;
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

function addBotMessage(text, actions = [], skipContent = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message message-bot';
    
    let html = '';
    if (!skipContent) {
        html += `<div class="message-content">${escapeHtml(text).replace(/\n/g, '<br>')}</div>`;
    }
    
    if (actions.length > 0) {
        html += '<div class="checkout-actions">';
        actions.forEach(action => {
            html += `<button class="btn-primary" onclick="${action.action}()">${action.text}</button>`;
        });
        html += '</div>';
    }
    
    messageDiv.innerHTML = html;
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

function addRawMessage(html, type = 'bot') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.innerHTML = html;
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

function createProductCardHtml(product) {
    const imageContent = product.image 
        ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" style="width: 100%; height: 100%; object-fit: cover;">`
        : `<div style="background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%); width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #999; font-size: 48px;">🏺</div>`;
    
    return `
        <div class="product-card" onclick="openProductModal(${JSON.stringify(product).replace(/"/g, '&quot;')})">
            <div class="product-card-image">
                ${imageContent}
            </div>
            <div class="product-card-content">
                <h3>${escapeHtml(product.name)}</h3>
                <p>${escapeHtml(product.description)}</p>
                <div class="product-card-footer">
                    <span class="product-price">$${(product.price / 100).toFixed(2)}</span>
                </div>
            </div>
        </div>
    `;
}

function addProductCard(product) {
    const cardHtml = createProductCardHtml(product);
    addRawMessage(cardHtml, 'bot');
}

function showTypingIndicator() {
    const id = 'typing-' + Date.now();
    const typingDiv = document.createElement('div');
    typingDiv.id = id;
    typingDiv.className = 'message message-bot';
    typingDiv.innerHTML = `
        <div class="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;
    chatMessages.appendChild(typingDiv);
    scrollToBottom();
    return id;
}

function removeTypingIndicator(id) {
    const element = document.getElementById(id);
    if (element) {
        element.remove();
    }
}

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function clearCart() {
    state.cart = [];
    addBotMessage("🗑️ Cart cleared! Type 'show products' to start shopping again.");
}

function thankYou() {
    addBotMessage("Thank you for shopping with us! Have a great day! 😊");
}

// Modify order functions
function showModifyOptions() {
    addBotMessage("What would you like to modify?", [
        { text: 'Change Items', action: 'modifyItems' },
        { text: 'Change Shipping', action: 'modifyShipping' },
        { text: 'Back to Review', action: 'refreshCheckout' }
    ]);
}

function modifyItems() {
    if (!state.currentCheckout) {
        addBotMessage("❌ No active checkout found.");
        return;
    }

    addBotMessage("Let me show you the current items in your order:");
    
    let itemsHtml = '<div class="checkout-info">';
    itemsHtml += '<strong>Current Items:</strong><br><br>';
    
    state.currentCheckout.line_items.forEach((lineItem, index) => {
        const product = state.products.find(p => p.id === lineItem.item.id);
        if (product) {
            itemsHtml += `<div style="margin-bottom: 16px; padding: 12px; background: #f9f9f9; border-radius: 8px;">`;
            itemsHtml += `<strong>${product.name}</strong><br>`;
            itemsHtml += `Quantity: ${lineItem.item.quantity}<br>`;
            itemsHtml += `Price: $${(lineItem.total / 100).toFixed(2)}<br>`;
            itemsHtml += `<div style="margin-top: 8px;">`;
            itemsHtml += `<button class="btn-primary" style="margin-right: 8px;" onclick="updateItemQuantity('${lineItem.item.id}', ${lineItem.item.quantity + 1})">Add One (+)</button>`;
            if (lineItem.item.quantity > 1) {
                itemsHtml += `<button class="btn-secondary" onclick="updateItemQuantity('${lineItem.item.id}', ${lineItem.item.quantity - 1})">Remove One (-)</button>`;
            }
            itemsHtml += `</div></div>`;
        }
    });
    
    itemsHtml += '</div>';
    addRawMessage(itemsHtml, 'bot');

    setTimeout(() => {
        addBotMessage("Update quantities above, or:", [
            { text: 'Add More Items', action: 'addMoreItems' },
            { text: 'Done Modifying', action: 'refreshCheckout' }
        ]);
    }, 500);
}

async function updateItemQuantity(itemId, newQuantity) {
    if (!state.currentCheckout) {
        addBotMessage("❌ No active checkout found.");
        return;
    }

    addBotMessage(`⏳ Updating item quantity...`);

    try {
        // Build updated items list
        const updatedItems = state.currentCheckout.line_items.map(lineItem => {
            if (lineItem.item.id === itemId) {
                return { id: itemId, quantity: newQuantity };
            }
            return { id: lineItem.item.id, quantity: lineItem.item.quantity };
        });

        const response = await fetch(`${API_BASE_URL}/checkout/${state.currentCheckout.id}/update`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: updatedItems })
        });

        const updatedCheckout = await response.json();
        state.currentCheckout = updatedCheckout;

        // Update cart to match
        state.cart = updatedItems.map(item => {
            const product = state.products.find(p => p.id === item.id);
            return { ...product, quantity: item.quantity };
        });

        addBotMessage(`✅ Updated! New quantity: ${newQuantity}`);
        
        setTimeout(() => {
            showOrderReview(updatedCheckout);
        }, 1000);
    } catch (error) {
        addBotMessage("❌ Error updating checkout. Please try again.");
    }
}

function addMoreItems() {
    addBotMessage("Here are all available products:");
    
    // Create a container for all products to display in one line
    let productsHtml = '<div class="products-container">';
    
    state.products.forEach(product => {
        // Check if item is already in checkout
        const existingItem = state.currentCheckout.line_items.find(li => li.item.id === product.id);
        
        const imageContent = product.image 
            ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" style="width: 100%; height: 100%; object-fit: cover;">`
            : `<div style="background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%); width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #999; font-size: 48px;">🏺</div>`;
        
        productsHtml += `
            <div class="product-card" onclick="addItemToExistingCheckout('${product.id}')">
                <div class="product-card-image">
                    ${imageContent}
                </div>
                <div class="product-card-content">
                    <h3>${escapeHtml(product.name)}</h3>
                    <p>${escapeHtml(product.description)}</p>
                    ${existingItem ? `<p style="color: #10a37f; font-size: 12px; font-weight: 600; margin-top: 8px;">✓ In cart: ${existingItem.item.quantity}</p>` : ''}
                    <div class="product-card-footer">
                        <span class="product-price">$${(product.price / 100).toFixed(2)}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    productsHtml += '</div>';
    addRawMessage(productsHtml, 'bot');

    setTimeout(() => {
        addBotMessage("Click any product to add it, or click 'Done' when finished:", [
            { text: 'Done Adding', action: 'refreshCheckout' }
        ]);
    }, 500);
}

async function addItemToExistingCheckout(itemId) {
    if (!state.currentCheckout) {
        addBotMessage("❌ No active checkout found.");
        return;
    }

    addBotMessage(`⏳ Adding item to your order...`);

    try {
        // Build updated items list
        const updatedItems = [...state.currentCheckout.line_items.map(li => ({ 
            id: li.item.id, 
            quantity: li.item.quantity 
        }))];

        // Check if item exists, increment or add new
        const existingItemIndex = updatedItems.findIndex(item => item.id === itemId);
        if (existingItemIndex >= 0) {
            updatedItems[existingItemIndex].quantity += 1;
        } else {
            updatedItems.push({ id: itemId, quantity: 1 });
        }

        const response = await fetch(`${API_BASE_URL}/checkout/${state.currentCheckout.id}/update`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: updatedItems })
        });

        const updatedCheckout = await response.json();
        state.currentCheckout = updatedCheckout;

        const product = state.products.find(p => p.id === itemId);
        addBotMessage(`✅ Added ${product.name} to your order!`);
    } catch (error) {
        addBotMessage("❌ Error adding item. Please try again.");
    }
}

function modifyShipping() {
    if (!state.currentCheckout) {
        addBotMessage("❌ No active checkout found.");
        return;
    }

    addBotMessage("Choose your preferred shipping method:");

    let shippingHtml = '<div class="checkout-info">';
    
    state.currentCheckout.fulfillment_options.forEach(option => {
        const isSelected = option.id === state.currentCheckout.fulfillment_option_id;
        shippingHtml += `<div style="margin-bottom: 16px; padding: 16px; background: ${isSelected ? '#f0f4ff' : '#f9f9f9'}; border: 2px solid ${isSelected ? '#667eea' : '#e0e0e0'}; border-radius: 8px;">`;
        shippingHtml += `<strong>${option.title}</strong> ${isSelected ? '✓ (Current)' : ''}<br>`;
        if (option.subtitle) {
            shippingHtml += `<span style="color: #666;">${option.subtitle}</span><br>`;
        }
        shippingHtml += `<span style="color: #2e7d32; font-weight: bold;">$${(option.total / 100).toFixed(2)}</span><br>`;
        if (!isSelected) {
            shippingHtml += `<button class="btn-primary" style="margin-top: 8px;" onclick="updateShippingOption('${option.id}')">Select This</button>`;
        }
        shippingHtml += `</div>`;
    });
    
    shippingHtml += '</div>';
    addRawMessage(shippingHtml, 'bot');

    setTimeout(() => {
        addBotMessage("Or go back:", [
            { text: 'Back to Review', action: 'refreshCheckout' }
        ]);
    }, 500);
}

async function updateShippingOption(optionId) {
    if (!state.currentCheckout) {
        addBotMessage("❌ No active checkout found.");
        return;
    }

    addBotMessage(`⏳ Updating shipping method...`);

    try {
        const response = await fetch(`${API_BASE_URL}/checkout/${state.currentCheckout.id}/update`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fulfillment_option_id: optionId })
        });

        const updatedCheckout = await response.json();
        state.currentCheckout = updatedCheckout;

        const selectedOption = updatedCheckout.fulfillment_options.find(opt => opt.id === optionId);
        addBotMessage(`✅ Shipping updated to ${selectedOption.title}!`);
        
        setTimeout(() => {
            showOrderReview(updatedCheckout);
        }, 1000);
    } catch (error) {
        addBotMessage("❌ Error updating shipping. Please try again.");
    }
}

async function refreshCheckout() {
    if (!state.currentCheckout) {
        addBotMessage("❌ No active checkout found.");
        return;
    }

    addBotMessage("⏳ Refreshing your order...");

    try {
        const response = await fetch(`${API_BASE_URL}/checkout/${state.currentCheckout.id}`);
        const checkout = await response.json();
        state.currentCheckout = checkout;

        setTimeout(() => {
            showOrderReview(checkout);
        }, 500);
    } catch (error) {
        addBotMessage("❌ Error refreshing checkout. Please try again.");
    }
}

// Global function exposure for onclick handlers
window.addToCart = addToCart;
window.startCheckout = startCheckout;
window.showProducts = handleShowProducts;
window.showCart = handleShowCart;
window.clearCart = clearCart;
window.submitUserInfo = submitUserInfo;
window.submitShippingInfo = submitShippingInfo;
window.completeOrder = completeOrder;
window.handleCancelCheckout = handleCancelCheckout;
window.cancelCheckout = handleCancelCheckout;
window.thankYou = thankYou;
window.showModifyOptions = showModifyOptions;
window.modifyItems = modifyItems;
window.updateItemQuantity = updateItemQuantity;
window.addMoreItems = addMoreItems;
window.addItemToExistingCheckout = addItemToExistingCheckout;
window.modifyShipping = modifyShipping;
window.updateShippingOption = updateShippingOption;
window.refreshCheckout = refreshCheckout;
window.selectInitialShipping = selectInitialShipping;

// Modal Functions
function openProductModal(product) {
    state.currentProduct = product;
    state.modalQuantity = 1;
    
    const modal = document.getElementById('productModal');
    const modalBody = document.getElementById('modalBody');
    const modalFooter = document.getElementById('modalFooter');
    const modalTitle = document.getElementById('modalTitle');
    
    modalTitle.textContent = product.name;
    
    const imageContent = product.image
        ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" class="product-detail-image" style="width: 100%; height: 300px; object-fit: cover;">`
        : `<div class="product-detail-image" style="background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%); display: flex; align-items: center; justify-content: center; color: #ccc; font-size: 80px;">🏺</div>`;
    
    modalBody.innerHTML = `
        ${imageContent}
        <div class="product-detail-content">
            <h2 class="product-detail-title">${escapeHtml(product.name)}</h2>
            <p class="product-detail-description">${escapeHtml(product.description)}</p>
            
            <div class="product-detail-specs">
                <div class="product-spec">
                    <div class="product-spec-label">Price</div>
                    <div class="product-spec-value">$${(product.price / 100).toFixed(2)}</div>
                </div>
            </div>
            
            <div class="quantity-selector">
                <label>Quantity</label>
                <div class="quantity-controls">
                    <button class="quantity-btn" onclick="updateModalQuantity(-1)" id="decreaseBtn">−</button>
                    <span class="quantity-display" id="quantityDisplay">1</span>
                    <button class="quantity-btn" onclick="updateModalQuantity(1)">+</button>
                </div>
            </div>
            
            <div class="order-summary">
                <div class="order-summary-row">
                    <span class="order-summary-label">Subtotal</span>
                    <span class="order-summary-value" id="modalSubtotal">$${(product.price / 100).toFixed(2)}</span>
                </div>
            </div>
        </div>
    `;
    
    modalFooter.innerHTML = `
        <button class="modal-primary-btn" onclick="startModalCheckout()">Buy Now</button>
    `;
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('productModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    state.currentProduct = null;
    state.modalQuantity = 1;
}

function updateModalQuantity(change) {
    state.modalQuantity = Math.max(1, Math.min(state.currentProduct.stock, state.modalQuantity + change));
    document.getElementById('quantityDisplay').textContent = state.modalQuantity;
    document.getElementById('decreaseBtn').disabled = state.modalQuantity <= 1;
    
    const subtotal = state.currentProduct.price * state.modalQuantity;
    document.getElementById('modalSubtotal').textContent = `$${(subtotal / 100).toFixed(2)}`;
}

async function startModalCheckout() {
    if (!state.currentProduct) return;
    
    const modalBody = document.getElementById('modalBody');
    const modalFooter = document.getElementById('modalFooter');
    const modalTitle = document.getElementById('modalTitle');
    
    modalTitle.textContent = 'Select Shipping';
    
    modalBody.innerHTML = `
        <div style="padding: 20px;">
            <p style="color: #666; font-size: 14px; margin-bottom: 20px;">Creating your order...</p>
            <div style="display: flex; justify-content: center; padding: 40px;">
                <div class="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        </div>
    `;
    
    modalFooter.innerHTML = '';
    
    try {
        // Create checkout
        const items = [{ id: state.currentProduct.id, quantity: state.modalQuantity }];
        
        const checkoutData = {
            items,
            buyer: DEFAULT_BUYER,
            fulfillment_address: DEFAULT_SHIPPING_ADDRESS
        };
        
        const response = await fetch(`${API_BASE_URL}/checkout/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(checkoutData)
        });
        
        const checkout = await response.json();
        state.currentCheckout = checkout;
        
        showShippingSelectionModal(checkout);
    } catch (error) {
        modalBody.innerHTML = `
            <div style="padding: 40px; text-align: center;">
                <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
                <p style="color: #666;">Error creating checkout. Please try again.</p>
            </div>
        `;
        modalFooter.innerHTML = `
            <button class="modal-secondary-btn" onclick="closeModal()">Close</button>
        `;
    }
}

function showShippingSelectionModal(checkout) {
    const modalBody = document.getElementById('modalBody');
    const modalFooter = document.getElementById('modalFooter');
    const modalTitle = document.getElementById('modalTitle');
    
    modalTitle.textContent = 'Select Shipping';
    
    let shippingHtml = '<div style="padding: 20px;">';
    shippingHtml += '<p style="color: #666; font-size: 14px; margin-bottom: 20px;">Choose your preferred shipping method</p>';
    
    checkout.fulfillment_options.forEach(option => {
        const isSelected = option.id === checkout.fulfillment_option_id;
        shippingHtml += `
            <div class="shipping-option ${isSelected ? 'selected' : ''}" onclick="selectModalShipping('${option.id}')">
                <div class="shipping-option-header">
                    <span class="shipping-option-name">${option.title}</span>
                    <span class="shipping-option-price">$${(option.total / 100).toFixed(2)}</span>
                </div>
                <div class="shipping-option-details">
                    ${option.subtitle || ''} ${option.carrier ? `• ${option.carrier}` : ''}
                </div>
            </div>
        `;
    });
    
    shippingHtml += '</div>';
    modalBody.innerHTML = shippingHtml;
    
    modalFooter.innerHTML = `
        <button class="modal-primary-btn" onclick="proceedToReview()">Continue to Review</button>
        <button class="modal-secondary-btn" onclick="closeModal()">Cancel</button>
    `;
}

async function selectModalShipping(optionId) {
    // Remove selected class from all
    document.querySelectorAll('.shipping-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    // Add selected class to clicked option
    event.target.closest('.shipping-option').classList.add('selected');
    
    // Update checkout
    try {
        const response = await fetch(`${API_BASE_URL}/checkout/${state.currentCheckout.id}/update`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fulfillment_option_id: optionId })
        });
        
        const updatedCheckout = await response.json();
        state.currentCheckout = updatedCheckout;
    } catch (error) {
        console.error('Error updating shipping:', error);
    }
}

function proceedToReview() {
    const modalBody = document.getElementById('modalBody');
    const modalFooter = document.getElementById('modalFooter');
    const modalTitle = document.getElementById('modalTitle');
    
    modalTitle.textContent = 'Review Order';
    
    const checkout = state.currentCheckout;
    const subtotal = checkout.totals.find(t => t.type === 'subtotal');
    const shipping = checkout.totals.find(t => t.type === 'fulfillment');
    const tax = checkout.totals.find(t => t.type === 'tax');
    const total = checkout.totals.find(t => t.type === 'total');
    const selectedShipping = checkout.fulfillment_options.find(opt => opt.id === checkout.fulfillment_option_id);
    
    modalBody.innerHTML = `
        <div style="padding: 20px;">
            <div class="checkout-step">
                <div class="checkout-step-title">
                    <span class="checkout-step-icon">📦</span>
                    Items
                    <button style="margin-left: auto; background: none; border: 1px solid #d0d0d0; border-radius: 6px; padding: 4px 12px; font-size: 12px; cursor: pointer; color: #666;" onclick="showModalQuantityAdjust()">
                        Edit
                    </button>
                </div>
                ${checkout.line_items.map(item => `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding: 12px; background: #f9f9f9; border-radius: 8px;">
                        <div style="flex: 1;">
                            <div style="color: #1a1a1a; font-size: 14px; font-weight: 600;">${state.currentProduct.name}</div>
                            <div style="color: #666; font-size: 13px; margin-top: 4px;">Quantity: ${item.item.quantity}</div>
                        </div>
                        <span style="color: #1a1a1a; font-size: 15px; font-weight: 700;">$${(item.total / 100).toFixed(2)}</span>
                    </div>
                `).join('')}
            </div>
            
            <div class="checkout-step">
                <div class="checkout-step-title">
                    <span class="checkout-step-icon">🚚</span>
                    Shipping
                    <button style="margin-left: auto; background: none; border: 1px solid #d0d0d0; border-radius: 6px; padding: 4px 12px; font-size: 12px; cursor: pointer; color: #666;" onclick="showShippingSelectionModal(${JSON.stringify(checkout).replace(/"/g, '&quot;')})">
                        Change
                    </button>
                </div>
                <div style="margin-top: 8px;">
                    <div style="font-size: 14px; color: #1a1a1a; font-weight: 600;">${selectedShipping.title}</div>
                    <div style="font-size: 13px; color: #666;">${selectedShipping.subtitle || ''}</div>
                    <div style="font-size: 14px; color: #1a1a1a; font-weight: 600; margin-top: 4px;">$${(selectedShipping.total / 100).toFixed(2)}</div>
                </div>
            </div>
            
            <div class="checkout-step">
                <div class="checkout-step-title">
                    <span class="checkout-step-icon">📍</span>
                    Delivery Address
                </div>
                <div style="margin-top: 8px; font-size: 14px; color: #666; line-height: 1.6;">
                    ${checkout.fulfillment_address.name}<br>
                    ${checkout.fulfillment_address.line_one}<br>
                    ${checkout.fulfillment_address.city}, ${checkout.fulfillment_address.state} ${checkout.fulfillment_address.postal_code}
                </div>
            </div>
            
            <div class="order-summary" style="margin-top: 20px;">
                <div class="order-summary-row">
                    <span class="order-summary-label">Subtotal</span>
                    <span class="order-summary-value">$${(subtotal.amount / 100).toFixed(2)}</span>
                </div>
                <div class="order-summary-row">
                    <span class="order-summary-label">Shipping</span>
                    <span class="order-summary-value">$${(shipping.amount / 100).toFixed(2)}</span>
                </div>
                <div class="order-summary-row">
                    <span class="order-summary-label">Tax</span>
                    <span class="order-summary-value">$${(tax.amount / 100).toFixed(2)}</span>
                </div>
                <div class="order-summary-row order-summary-total">
                    <span class="order-summary-label">Total</span>
                    <span class="order-summary-value">$${(total.amount / 100).toFixed(2)}</span>
                </div>
            </div>
        </div>
    `;
    
    modalFooter.innerHTML = `
        <button class="modal-primary-btn" onclick="completeModalCheckout()">Complete Purchase</button>
        <button class="modal-secondary-btn" onclick="closeModal()">Cancel</button>
    `;
}

async function completeModalCheckout() {
    const modalBody = document.getElementById('modalBody');
    const modalFooter = document.getElementById('modalFooter');
    
    modalBody.innerHTML = `
        <div style="padding: 40px 20px; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 16px;">💳</div>
            <p style="color: #666; font-size: 14px;">Processing payment...</p>
        </div>
    `;
    modalFooter.innerHTML = '';
    
    try {
        const paymentData = {
            payment_token: DEFAULT_PAYMENT_METHOD.payment_method,
            payment_provider: 'stripe'
        };
        
        const response = await fetch(`${API_BASE_URL}/checkout/${state.currentCheckout.id}/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(paymentData)
        });
        
        const result = await response.json();
        
        if (result.status === 'completed') {
            showSuccessScreen(result);
        } else {
            throw new Error('Payment failed');
        }
    } catch (error) {
        modalBody.innerHTML = `
            <div style="padding: 40px; text-align: center;">
                <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
                <p style="color: #666;">Payment failed. Please try again.</p>
            </div>
        `;
        modalFooter.innerHTML = `
            <button class="modal-secondary-btn" onclick="closeModal()">Close</button>
        `;
    }
}

function showSuccessScreen(checkout) {
    const modalBody = document.getElementById('modalBody');
    const modalFooter = document.getElementById('modalFooter');
    const modalTitle = document.getElementById('modalTitle');
    
    modalTitle.textContent = 'Purchase Complete';
    
    const total = checkout.totals.find(t => t.type === 'total');
    
    modalBody.innerHTML = `
        <div class="success-screen">
            <div class="success-icon">✓</div>
            <h2 class="success-title">Purchase complete</h2>
            <p class="success-message">Your order has been confirmed. You'll receive a confirmation email at ${DEFAULT_BUYER.email} shortly.</p>
            
            <div class="success-details">
                <div class="success-detail-row">
                    <span style="color: #666; font-size: 14px;">Order ID</span>
                    <span style="color: #1a1a1a; font-size: 14px; font-weight: 600;">${checkout.id}</span>
                </div>
                <div class="success-detail-row">
                    <span style="color: #666; font-size: 14px;">Total Paid</span>
                    <span style="color: #1a1a1a; font-size: 14px; font-weight: 600;">$${(total.amount / 100).toFixed(2)}</span>
                </div>
                <div class="success-detail-row">
                    <span style="color: #666; font-size: 14px;">Estimated Delivery</span>
                    <span style="color: #1a1a1a; font-size: 14px; font-weight: 600;">3-5 business days</span>
                </div>
            </div>
        </div>
    `;
    
    modalFooter.innerHTML = `
        <button class="modal-primary-btn" onclick="closeModal()">Done</button>
    `;
    
    // Reset state
    state.currentCheckout = null;
    state.currentProduct = null;
}

function showModalQuantityAdjust() {
    const modalBody = document.getElementById('modalBody');
    const modalFooter = document.getElementById('modalFooter');
    const modalTitle = document.getElementById('modalTitle');
    
    modalTitle.textContent = 'Adjust Quantity';
    
    const checkout = state.currentCheckout;
    const currentItem = checkout.line_items[0];
    const currentQty = currentItem.item.quantity;
    
    const imageContent = state.currentProduct.image
        ? `<img src="${escapeHtml(state.currentProduct.image)}" alt="${escapeHtml(state.currentProduct.name)}" style="width: 80px; height: 80px; border-radius: 12px; object-fit: cover; margin: 0 auto 20px; display: block;">`
        : `<div style="width: 80px; height: 80px; background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 40px;">🏺</div>`;
    
    modalBody.innerHTML = `
        <div style="padding: 40px 20px; text-align: center;">
            ${imageContent}
            
            <h3 style="font-size: 18px; font-weight: 600; color: #1a1a1a; margin-bottom: 8px;">
                ${state.currentProduct.name}
            </h3>
            
            <p style="font-size: 14px; color: #666; margin-bottom: 24px;">
                $${(state.currentProduct.price / 100).toFixed(2)} each
            </p>
            
            <div style="margin: 32px 0;">
                <div style="font-size: 13px; color: #999; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
                    Quantity
                </div>
                <div style="display: flex; justify-content: center; align-items: center; gap: 20px;">
                    <button class="quantity-btn" onclick="updateModalCheckoutQuantity(${currentQty - 1})" ${currentQty <= 1 ? 'disabled' : ''} style="width: 48px; height: 48px; font-size: 24px; background: #f0f0f0; border: 1px solid #d0d0d0; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                        −
                    </button>
                    <span style="font-size: 32px; font-weight: 700; color: #1a1a1a; min-width: 60px; text-align: center;" id="modalQtyDisplay">
                        ${currentQty}
                    </span>
                    <button class="quantity-btn" onclick="updateModalCheckoutQuantity(${currentQty + 1})" ${currentQty >= state.currentProduct.stock ? 'disabled' : ''} style="width: 48px; height: 48px; font-size: 24px; background: #f0f0f0; border: 1px solid #d0d0d0; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                        +
                    </button>
                </div>
            </div>
            
            <div style="background: #f9f9f9; border-radius: 12px; padding: 16px; margin-top: 24px;">
                <div style="display: flex; justify-content: space-between; font-size: 14px;">
                    <span style="color: #666;">Subtotal</span>
                    <span style="color: #1a1a1a; font-weight: 700;" id="modalQtySubtotal">
                        $${((state.currentProduct.price * currentQty) / 100).toFixed(2)}
                    </span>
                </div>
            </div>
        </div>
    `;
    
    modalFooter.innerHTML = `
        <button class="modal-primary-btn" onclick="proceedToReview()">Continue to Review</button>
        <button class="modal-secondary-btn" onclick="proceedToReview()">Back</button>
    `;
}

async function updateModalCheckoutQuantity(newQty) {
    if (newQty < 1 || newQty > state.currentProduct.stock) return;
    
    const checkout = state.currentCheckout;
    const currentItem = checkout.line_items[0];
    
    // Update via API
    try {
        const updatedItems = [{
            id: state.currentProduct.id,
            quantity: newQty
        }];
        
        const response = await fetch(`${API_BASE_URL}/checkout/${checkout.id}/update`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: updatedItems })
        });
        
        const updatedCheckout = await response.json();
        state.currentCheckout = updatedCheckout;
        
        // Update display
        document.getElementById('modalQtyDisplay').textContent = newQty;
        document.getElementById('modalQtySubtotal').textContent = `$${((state.currentProduct.price * newQty) / 100).toFixed(2)}`;
        
        // Update buttons
        const decreaseBtn = document.querySelector('.quantity-btn:first-of-type');
        const increaseBtn = document.querySelector('.quantity-btn:last-of-type');
        if (decreaseBtn) decreaseBtn.disabled = newQty <= 1;
        if (increaseBtn) increaseBtn.disabled = newQty >= state.currentProduct.stock;
        
    } catch (error) {
        console.error('Error updating quantity:', error);
    }
}

window.closeModal = closeModal;
window.openProductModal = openProductModal;
window.updateModalQuantity = updateModalQuantity;
window.startModalCheckout = startModalCheckout;
window.selectModalShipping = selectModalShipping;
window.proceedToReview = proceedToReview;
window.completeModalCheckout = completeModalCheckout;
window.showModalQuantityAdjust = showModalQuantityAdjust;
window.updateModalCheckoutQuantity = updateModalCheckoutQuantity;

