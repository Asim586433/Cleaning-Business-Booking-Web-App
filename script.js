// ============================================================================
// SPARKLECLEAN BOOKING WEB APP - MAIN JAVASCRIPT FILE
// ============================================================================

// Application State
const appState = {
    currentPage: 'home',
    bookings: JSON.parse(localStorage.getItem('sparkleCleanBookings')) || [],
    currentBooking: null,
    isXeroSynced: false
};

// DOM Elements
const pages = {
    home: document.getElementById('home'),
    booking: document.getElementById('booking'),
    payment: document.getElementById('payment'),
    admin: document.getElementById('admin')
};

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    loadSampleBookings();
    updateAdminDashboard();
    setupEventListeners();
});

function initializeApp() {
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('bookingDate').min = today;
    
    // Set active page based on URL hash or default to home
    const hash = window.location.hash.substring(1) || 'home';
    navigateToPage(hash);
}

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('href').substring(1);
            navigateToPage(page);
        });
    });
    
    document.getElementById('bookNowHero').addEventListener('click', () => {
        navigateToPage('booking');
    });
    
    document.getElementById('viewBookingsBtn').addEventListener('click', () => {
        navigateToPage('admin');
    });
    
    document.getElementById('backToHome').addEventListener('click', () => {
        navigateToPage('home');
    });
    
    document.getElementById('backToBooking').addEventListener('click', () => {
        navigateToPage('booking');
    });
    
    // Menu Toggle
    document.querySelector('.menu-toggle').addEventListener('click', () => {
        document.querySelector('.nav-links').classList.toggle('active');
    });
    
    // Booking Form
    document.getElementById('bookingForm').addEventListener('submit', handleBookingSubmit);
    
    // Payment Form
    document.getElementById('paymentForm').addEventListener('submit', handlePaymentSubmit);
    
    // Admin Controls
    document.getElementById('syncXeroBtn').addEventListener('click', syncWithXero);
    document.getElementById('searchBookings').addEventListener('input', filterBookings);
    
    // Navigation buttons
    document.getElementById('proceedToPayment').addEventListener('click', () => {
        navigateToPage('payment');
        updatePaymentSummary();
    });
    
    document.getElementById('returnHome').addEventListener('click', () => {
        navigateToPage('home');
    });
    
    // Real-time booking summary updates
    document.getElementById('serviceType').addEventListener('change', updateBookingSummary);
    document.getElementById('bookingDate').addEventListener('change', updateBookingSummary);
    document.getElementById('customerName').addEventListener('input', updateBookingSummary);
    document.getElementById('customerEmail').addEventListener('input', updateBookingSummary);
    document.getElementById('customerPhone').addEventListener('input', updateBookingSummary);
    document.getElementById('address').addEventListener('input', updateBookingSummary);
    
    // Time slot selection
    document.querySelectorAll('input[name="timeSlot"]').forEach(radio => {
        radio.addEventListener('change', updateBookingSummary);
    });
}

// ============================================================================
// PAGE NAVIGATION
// ============================================================================

function navigateToPage(pageId) {
    // Update active state
    Object.values(pages).forEach(page => page.classList.remove('active'));
    if (pages[pageId]) {
        pages[pageId].classList.add('active');
        appState.currentPage = pageId;
        
        // Update URL hash
        window.location.hash = pageId;
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    // Close mobile menu if open
    document.querySelector('.nav-links').classList.remove('active');
}

// ============================================================================
// BOOKING SYSTEM
// ============================================================================

function handleBookingSubmit(e) {
    e.preventDefault();
    
    // Get form data
    const formData = {
        serviceType: document.getElementById('serviceType').value,
        bookingDate: document.getElementById('bookingDate').value,
        timeSlot: document.querySelector('input[name="timeSlot"]:checked')?.value,
        customerName: document.getElementById('customerName').value.trim(),
        customerEmail: document.getElementById('customerEmail').value.trim(),
        customerPhone: document.getElementById('customerPhone').value.trim(),
        address: document.getElementById('address').value.trim(),
        instructions: document.getElementById('instructions').value.trim(),
        status: 'pending',
        paymentStatus: 'pending',
        id: Date.now(), // Simple ID generation
        createdAt: new Date().toISOString()
    };
    
    // Validation
    if (!validateBooking(formData)) {
        return;
    }
    
    // Set price based on service
    formData.price = getServicePrice(formData.serviceType);
    
    // Save booking to app state
    appState.currentBooking = formData;
    
    // Show confirmation message
    showBookingConfirmation(formData);
    
    // Update summary with confirmed details
    updateConfirmedSummary(formData);
}

function validateBooking(formData) {
    const errors = [];
    
    if (!formData.serviceType) errors.push('Please select a service type');
    if (!formData.bookingDate) errors.push('Please select a date');
    if (!formData.timeSlot) errors.push('Please select a time slot');
    if (!formData.customerName) errors.push('Please enter your name');
    if (!formData.customerEmail) errors.push('Please enter your email');
    if (!formData.customerPhone) errors.push('Please enter your phone number');
    if (!formData.address) errors.push('Please enter your address');
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.customerEmail && !emailRegex.test(formData.customerEmail)) {
        errors.push('Please enter a valid email address');
    }
    
    // Date validation
    const selectedDate = new Date(formData.bookingDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
        errors.push('Please select a future date');
    }
    
    if (errors.length > 0) {
        alert('Please fix the following errors:\n' + errors.join('\n'));
        return false;
    }
    
    return true;
}

function getServicePrice(serviceType) {
    const prices = {
        'home': 89,
        'office': 149,
        'deep': 199
    };
    
    return prices[serviceType] || 89;
}

function getServiceName(serviceType) {
    const names = {
        'home': 'Home Cleaning',
        'office': 'Office Cleaning',
        'deep': 'Deep Cleaning'
    };
    
    return names[serviceType] || 'Home Cleaning';
}

function showBookingConfirmation(booking) {
    document.getElementById('confirmationMessage').classList.remove('hidden');
    document.getElementById('confirmEmail').textContent = booking.customerEmail;
}

// ============================================================================
// PAYMENT SYSTEM
// ============================================================================

function handlePaymentSubmit(e) {
    e.preventDefault();
    
    // Get payment form data
    const paymentData = {
        cardNumber: document.getElementById('cardNumber').value.trim(),
        expiryDate: document.getElementById('expiryDate').value.trim(),
        cvv: document.getElementById('cvv').value.trim(),
        cardName: document.getElementById('cardName').value.trim()
    };
    
    // Simple validation
    if (!validatePayment(paymentData)) {
        return;
    }
    
    // Process payment (simulated)
    if (processPaymentSimulation(paymentData)) {
        // Update booking status
        if (appState.currentBooking) {
            appState.currentBooking.paymentStatus = 'paid';
            appState.currentBooking.status = 'confirmed';
            
            // Add to bookings list
            appState.bookings.push(appState.currentBooking);
            
            // Save to localStorage
            localStorage.setItem('sparkleCleanBookings', JSON.stringify(appState.bookings));
            
            // Send invoice to Xero (simulated)
            sendInvoiceToXero(appState.currentBooking);
            
            // Show success message
            document.getElementById('paymentSuccess').classList.remove('hidden');
            document.getElementById('paymentForm').classList.add('hidden');
            
            // Update admin dashboard
            updateAdminDashboard();
        }
    }
}

function validatePayment(paymentData) {
    const errors = [];
    
    // Simple card validation
    const cardNumber = paymentData.cardNumber.replace(/\s/g, '');
    if (!/^\d{16}$/.test(cardNumber)) {
        errors.push('Please enter a valid 16-digit card number');
    }
    
    // Expiry date validation
    const expiryRegex = /^(0[1-9]|1[0-2])\/\d{2}$/;
    if (!expiryRegex.test(paymentData.expiryDate)) {
        errors.push('Please enter expiry date in MM/YY format');
    }
    
    // CVV validation
    if (!/^\d{3}$/.test(paymentData.cvv)) {
        errors.push('Please enter a valid 3-digit CVV');
    }
    
    // Card name validation
    if (paymentData.cardName.length < 3) {
        errors.push('Please enter the name on card');
    }
    
    if (errors.length > 0) {
        alert('Payment Error:\n' + errors.join('\n'));
        return false;
    }
    
    return true;
}

function processPaymentSimulation(paymentData) {
    // Simulate API call with delay
    showLoading('Processing payment...');
    
    return new Promise((resolve) => {
        setTimeout(() => {
            hideLoading();
            // Simulate random success/failure (90% success rate for demo)
            const isSuccess = Math.random() < 0.9;
            
            if (isSuccess) {
                resolve(true);
            } else {
                alert('Payment failed. Please try again or use a different card.');
                resolve(false);
            }
        }, 1500);
    });
}

// ============================================================================
// XERO INTEGRATION SIMULATION
// ============================================================================

function sendInvoiceToXero(booking) {
    const invoiceData = {
        invoiceId: 'INV-' + Date.now(),
        customer: {
            name: booking.customerName,
            email: booking.customerEmail,
            phone: booking.customerPhone
        },
        service: getServiceName(booking.serviceType),
        date: booking.bookingDate,
        time: booking.timeSlot,
        amount: booking.price,
        address: booking.address,
        status: 'paid',
        dateSent: new Date().toISOString()
    };
    
    // Log to console (simulating API call)
    console.log('=== XERO INVOICE DATA ===');
    console.log('Invoice ID:', invoiceData.invoiceId);
    console.log('Customer:', invoiceData.customer.name);
    console.log('Service:', invoiceData.service);
    console.log('Amount: $' + invoiceData.amount);
    console.log('Date:', invoiceData.date);
    console.log('Time:', invoiceData.time);
    console.log('=== SENT TO XERO ===');
    
    // Update UI state
    appState.isXeroSynced = true;
    
    // Show notification
    showNotification('Invoice sent to Xero successfully!', 'success');
    
    return invoiceData;
}

function syncWithXero() {
    // Get all unpaid bookings
    const unpaidBookings = appState.bookings.filter(b => b.paymentStatus === 'paid');
    
    if (unpaidBookings.length === 0) {
        showNotification('No new invoices to sync with Xero', 'info');
        return;
    }
    
    showLoading('Syncing with Xero...');
    
    // Simulate API call
    setTimeout(() => {
        unpaidBookings.forEach(booking => {
            console.log('Syncing to Xero:', booking.customerName, '- $' + booking.price);
        });
        
        hideLoading();
        showNotification(`Synced ${unpaidBookings.length} invoices with Xero`, 'success');
        appState.isXeroSynced = true;
    }, 2000);
}

// ============================================================================
// ADMIN DASHBOARD
// ============================================================================

function loadSampleBookings() {
    // Only load sample data if no existing bookings
    if (appState.bookings.length > 0) return;
    
    const sampleBookings = [
        {
            id: 1,
            customerName: 'John Smith',
            serviceType: 'home',
            bookingDate: '2024-12-15',
            timeSlot: '9:00 AM',
            address: '123 Main St, Anytown',
            price: 89,
            status: 'confirmed',
            paymentStatus: 'paid',
            customerEmail: 'john@example.com',
            customerPhone: '555-0101',
            createdAt: '2024-12-01T10:00:00Z'
        },
        {
            id: 2,
            customerName: 'Sarah Johnson',
            serviceType: 'office',
            bookingDate: '2024-12-16',
            timeSlot: '11:00 AM',
            address: '456 Office Blvd, Business Park',
            price: 149,
            status: 'pending',
            paymentStatus: 'pending',
            customerEmail: 'sarah@example.com',
            customerPhone: '555-0102',
            createdAt: '2024-12-02T14:30:00Z'
        },
        {
            id: 3,
            customerName: 'Mike Wilson',
            serviceType: 'deep',
            bookingDate: '2024-12-17',
            timeSlot: '3:00 PM',
            address: '789 Lakeview Dr, Suburbia',
            price: 199,
            status: 'confirmed',
            paymentStatus: 'paid',
            customerEmail: 'mike@example.com',
            customerPhone: '555-0103',
            createdAt: '2024-12-03T09:15:00Z'
        }
    ];
    
    appState.bookings = sampleBookings;
    localStorage.setItem('sparkleCleanBookings', JSON.stringify(appState.bookings));
}

function updateAdminDashboard() {
    const tableBody = document.getElementById('bookingsTableBody');
    tableBody.innerHTML = '';
    
    appState.bookings.forEach(booking => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${booking.customerName}</td>
            <td>${getServiceName(booking.serviceType)}</td>
            <td>${formatDate(booking.bookingDate)} ${booking.timeSlot}</td>
            <td>${booking.address}</td>
            <td><span class="status-badge ${booking.paymentStatus}">${booking.paymentStatus}</span></td>
            <td>
                <button class="btn-secondary btn-sm" onclick="viewBooking(${booking.id})">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    updateDashboardStats();
}

function updateDashboardStats() {
    const totalBookings = appState.bookings.length;
    const pendingPayments = appState.bookings.filter(b => b.paymentStatus === 'pending').length;
    const totalRevenue = appState.bookings
        .filter(b => b.paymentStatus === 'paid')
        .reduce((sum, booking) => sum + booking.price, 0);
    
    document.getElementById('totalBookings').textContent = totalBookings;
    document.getElementById('pendingPayments').textContent = pendingPayments;
    document.getElementById('totalRevenue').textContent = '$' + totalRevenue;
}

function filterBookings() {
    const searchTerm = document.getElementById('searchBookings').value.toLowerCase();
    const rows = document.querySelectorAll('#bookingsTableBody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

function viewBooking(bookingId) {
    const booking = appState.bookings.find(b => b.id === bookingId);
    if (booking) {
        alert(`Booking Details:\n\n` +
              `Customer: ${booking.customerName}\n` +
              `Service: ${getServiceName(booking.serviceType)}\n` +
              `Date: ${formatDate(booking.bookingDate)}\n` +
              `Time: ${booking.timeSlot}\n` +
              `Address: ${booking.address}\n` +
              `Price: $${booking.price}\n` +
              `Status: ${booking.status}\n` +
              `Payment: ${booking.paymentStatus}\n` +
              `Email: ${booking.customerEmail}\n` +
              `Phone: ${booking.customerPhone}`);
    }
}

// ============================================================================
// UI UPDATES & HELPERS
// ============================================================================

function updateBookingSummary() {
    const service = document.getElementById('serviceType').value;
    const date = document.getElementById('bookingDate').value;
    const time = document.querySelector('input[name="timeSlot"]:checked')?.value;
    const name = document.getElementById('customerName').value;
    const email = document.getElementById('customerEmail').value;
    const phone = document.getElementById('customerPhone').value;
    const address = document.getElementById('address').value;
    
    // Only show summary if we have basic info
    if (service && date && time) {
        const price = getServicePrice(service);
        const serviceName = getServiceName(service);
        
        document.getElementById('summaryService').textContent = serviceName;
        document.getElementById('summaryDate').textContent = formatDate(date);
        document.getElementById('summaryTime').textContent = time;
        document.getElementById('summaryAddress').textContent = address || 'Not provided';
        document.getElementById('summaryPrice').textContent = '$' + price;
        
        document.getElementById('summaryDetails').classList.remove('hidden');
        document.querySelector('.summary-placeholder').classList.add('hidden');
    } else {
        document.getElementById('summaryDetails').classList.add('hidden');
        document.querySelector('.summary-placeholder').classList.remove('hidden');
    }
}

function updateConfirmedSummary(booking) {
    document.getElementById('summaryService').textContent = getServiceName(booking.serviceType);
    document.getElementById('summaryDate').textContent = formatDate(booking.bookingDate);
    document.getElementById('summaryTime').textContent = booking.timeSlot;
    document.getElementById('summaryAddress').textContent = booking.address;
    document.getElementById('summaryPrice').textContent = '$' + booking.price;
    
    document.getElementById('summaryDetails').classList.remove('hidden');
    document.querySelector('.summary-placeholder').classList.add('hidden');
}

function updatePaymentSummary() {
    if (!appState.currentBooking) return;
    
    const paymentDetails = document.getElementById('paymentDetails');
    paymentDetails.innerHTML = `
        <div class="summary-item">
            <span>Service:</span>
            <strong>${getServiceName(appState.currentBooking.serviceType)}</strong>
        </div>
        <div class="summary-item">
            <span>Date:</span>
            <strong>${formatDate(appState.currentBooking.bookingDate)}</strong>
        </div>
        <div class="summary-item">
            <span>Time:</span>
            <strong>${appState.currentBooking.timeSlot}</strong>
        </div>
        <div class="summary-item">
            <span>Customer:</span>
            <strong>${appState.currentBooking.customerName}</strong>
        </div>
        <div class="summary-item">
            <span>Total Amount:</span>
            <strong style="color: var(--secondary-color);">$${appState.currentBooking.price}</strong>
        </div>
    `;
}

function formatDate(dateString) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

function showLoading(message) {
    // Create loading overlay
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loadingOverlay';
    loadingDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.9);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 9999;
    `;
    
    loadingDiv.innerHTML = `
        <div class="spinner" style="
            width: 50px;
            height: 50px;
            border: 5px solid #f3f3f3;
            border-top: 5px solid var(--primary-color);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        "></div>
        <p style="margin-top: 20px; font-size: 1.1rem; color: var(--dark-color);">${message}</p>
    `;
    
    // Add spin animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(loadingDiv);
}

function hideLoading() {
    const loadingDiv = document.getElementById('loadingOverlay');
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#d4edda' : '#fff3cd'};
        color: ${type === 'success' ? '#155724' : '#856404'};
        border: 1px solid ${type === 'success' ? '#c3e6cb' : '#ffeaa7'};
        border-radius: var(--border-radius);
        box-shadow: var(--box-shadow);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}" 
           style="margin-right: 10px;"></i>
        ${message}
    `;
    
    document.body.appendChild(notification);
    
    // Add animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Export app state for debugging (optional)
window.appState = appState;

// Initialize app on load
window.addEventListener('load', () => {
    console.log('SparkleClean Booking App initialized');
    console.log('Total bookings:', appState.bookings.length);
});
