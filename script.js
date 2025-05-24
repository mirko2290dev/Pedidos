class OrderManager {
    constructor() {
        this.orders = JSON.parse(localStorage.getItem('orders')) || [];
        this.hiddenOrders = JSON.parse(localStorage.getItem('hiddenOrders')) || [];
        this.form = document.getElementById('orderForm');
        this.ordersList = document.getElementById('ordersList');
        this.configBtn = document.getElementById('configBtn');
        this.configModal = document.getElementById('configModal');
        this.closeConfigBtn = document.getElementById('closeConfigBtn');
        this.themeSelect = document.getElementById('themeSelect');
        this.hiddenOrdersList = document.getElementById('hiddenOrdersList');

        // Inicializar tema
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.setTheme(savedTheme);
        this.themeSelect.value = savedTheme;

        // Event Listeners
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.configBtn.addEventListener('click', () => this.openConfig());
        this.closeConfigBtn.addEventListener('click', () => this.closeConfig());
        this.themeSelect.addEventListener('change', (e) => this.setTheme(e.target.value));

        // Cerrar modal al hacer clic fuera
        window.addEventListener('click', (e) => {
            if (e.target === this.configModal) {
                this.closeConfig();
            }
        });

        this.loadOrders();
        this.cleanupOldOrders();
        setInterval(() => this.cleanupOldOrders(), 24 * 60 * 60 * 1000);
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }

    openConfig() {
        this.configModal.style.display = 'block';
        this.loadHiddenOrders();
    }

    closeConfig() {
        this.configModal.style.display = 'none';
    }

    loadHiddenOrders() {
        this.hiddenOrdersList.innerHTML = '';
        const hiddenOrders = this.orders.filter(order => this.hiddenOrders.includes(order.id));
        
        hiddenOrders.forEach(order => {
            const orderDiv = document.createElement('div');
            orderDiv.className = 'hidden-order-card';
            orderDiv.innerHTML = `
                <span>${order.customerName} - ${order.productType}</span>
                <button class="restore-btn" onclick="orderManager.restoreOrder(${order.id})">Restaurar</button>
            `;
            this.hiddenOrdersList.appendChild(orderDiv);
        });

        if (hiddenOrders.length === 0) {
            this.hiddenOrdersList.innerHTML = '<p>No hay pedidos ocultos</p>';
        }
    }

    restoreOrder(orderId) {
        this.hiddenOrders = this.hiddenOrders.filter(id => id !== orderId);
        localStorage.setItem('hiddenOrders', JSON.stringify(this.hiddenOrders));
        this.loadHiddenOrders();
        this.loadOrders();
    }

    handleSubmit(e) {
        e.preventDefault();
        
        const order = {
            id: Date.now(),
            customerName: document.getElementById('customerName').value,
            phoneNumber: document.getElementById('phoneNumber').value,
            productType: document.getElementById('productType').value,
            observations: document.getElementById('observations').value,
            paid: document.getElementById('paid').checked,
            delivered: false,
            createdAt: new Date().toISOString(),
            deliveredAt: null
        };

        this.orders.push(order);
        this.saveOrders();
        this.loadOrders();
        this.form.reset();
    }

    loadOrders() {
        this.ordersList.innerHTML = '';
        this.orders
            .filter(order => !this.hiddenOrders.includes(order.id))
            .forEach(order => {
                const orderElement = this.createOrderElement(order);
                this.ordersList.appendChild(orderElement);
            });
    }

    createOrderElement(order) {
        const orderDiv = document.createElement('div');
        orderDiv.className = `order-card ${order.delivered ? 'delivered' : ''} ${order.paid ? 'paid' : ''}`;

        const createdDate = new Date(order.createdAt).toLocaleString();
        const deliveredDate = order.deliveredAt ? new Date(order.deliveredAt).toLocaleString() : 'No entregado';

        orderDiv.innerHTML = `
            <div class="order-header">
                <h3>${order.customerName}</h3>
                <span>Creado: ${createdDate}</span>
            </div>
            <p><strong>Teléfono:</strong> ${order.phoneNumber}</p>
            <p><strong>Producto:</strong> ${order.productType}</p>
            <p><strong>Observaciones:</strong> ${order.observations || 'Ninguna'}</p>
            <p><strong>Entregado:</strong> ${deliveredDate}</p>
            <div class="order-status">
                <label class="status-label">
                    <input type="checkbox" 
                           ${order.paid ? 'checked' : ''}
                           onchange="orderManager.togglePaid(${order.id})"> Pagado
                </label>
                <label class="status-label">
                    <input type="checkbox" 
                           ${order.delivered ? 'checked' : ''}
                           onchange="orderManager.toggleDelivered(${order.id})"> Entregado
                </label>
                <button class="delete-btn" onclick="orderManager.hideOrder(${order.id})">Ocultar Pedido</button>
            </div>
        `;

        return orderDiv;
    }

    hideOrder(orderId) {
        if (!this.hiddenOrders.includes(orderId)) {
            this.hiddenOrders.push(orderId);
            localStorage.setItem('hiddenOrders', JSON.stringify(this.hiddenOrders));
            this.loadOrders();
        }
    }

    togglePaid(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (order) {
            order.paid = !order.paid;
            this.saveOrders();
            this.loadOrders();
        }
    }

    toggleDelivered(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (order) {
            order.delivered = !order.delivered;
            order.deliveredAt = order.delivered ? new Date().toISOString() : null;
            this.saveOrders();
            this.loadOrders();
        }
    }

    saveOrders() {
        localStorage.setItem('orders', JSON.stringify(this.orders));
    }

    cleanupOldOrders() {
        const tenDaysAgo = new Date();
        tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

        this.orders = this.orders.filter(order => {
            if (order.delivered) {
                const deliveredDate = new Date(order.deliveredAt);
                return deliveredDate > tenDaysAgo;
            }
            return true;
        });

        this.saveOrders();
        this.loadOrders();
    }
}

const orderManager = new OrderManager();