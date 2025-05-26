class OrderManager {
    constructor() {
        this.orders = [];
        this.hiddenOrders = [];
        this.loadFromLocalStorage();
        this.setupEventListeners();
        this.setupThemeSelector();
        this.renderOrders();
        this.cleanupOldOrders();
        this.syncFromGitHub(); // Cargar datos iniciales
        setInterval(() => this.cleanupOldOrders(), 24 * 60 * 60 * 1000); // Check daily
    }

    async syncFromGitHub() {
        try {
            const response = await fetch('https://raw.githubusercontent.com/mirko2290dec/Pedidos/main/orders.json');
            if (!response.ok) return;
            const data = await response.json();
            if (data.orders) this.orders = [...data.orders];
            if (data.hiddenOrders) this.hiddenOrders = [...data.hiddenOrders];
            this.saveToLocalStorage();
            this.renderOrders();
            this.renderHiddenOrders();
        } catch (error) {
            console.error('Error al sincronizar con GitHub:', error);
        }
    }

    setupEventListeners() {
        const configBtn = document.getElementById('configBtn');
        const closeConfigBtn = document.getElementById('closeConfigBtn');
        const configModal = document.getElementById('configModal');

        configBtn.onclick = () => {
            configModal.style.display = 'block';
            this.renderHiddenOrders();
        };

        closeConfigBtn.onclick = () => {
            configModal.style.display = 'none';
        };

        window.onclick = (event) => {
            if (event.target === configModal) {
                configModal.style.display = 'none';
            }
        };

        const orderForm = document.getElementById('orderForm');
        orderForm.onsubmit = (e) => {
            e.preventDefault();
            this.addOrder();
        };
    }

    setupThemeSelector() {
        const themeSelect = document.getElementById('themeSelect');
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        themeSelect.value = savedTheme;

        themeSelect.onchange = (e) => {
            const theme = e.target.value;
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
        };
    }

    loadFromLocalStorage() {
        const savedOrders = localStorage.getItem('orders');
        const savedHiddenOrders = localStorage.getItem('hiddenOrders');
        if (savedOrders) this.orders = JSON.parse(savedOrders);
        if (savedHiddenOrders) this.hiddenOrders = JSON.parse(savedHiddenOrders);
    }

    saveToLocalStorage() {
        localStorage.setItem('orders', JSON.stringify(this.orders));
        localStorage.setItem('hiddenOrders', JSON.stringify(this.hiddenOrders));
    }

    addOrder() {
        const customerName = document.getElementById('customerName').value;
        const phoneNumber = document.getElementById('phoneNumber').value;
        const productType = document.getElementById('productType').value;
        const observations = document.getElementById('observations').value;
        const paid = document.getElementById('paid').checked;

        if (!customerName || !phoneNumber || !productType) {
            alert('Por favor complete todos los campos requeridos');
            return;
        }

        const order = {
            id: Date.now().toString(),
            customerName,
            phoneNumber,
            productType,
            observations,
            date: new Date().toISOString(),
            paid,
            delivered: false,
            lastModified: Date.now()
        };

        this.orders.push(order);
        this.saveToLocalStorage();
        this.renderOrders();

        // Limpiar formulario
        document.getElementById('orderForm').reset();
    }

    toggleOrderStatus(orderId, status) {
        const order = this.orders.find(o => o.id === orderId);
        if (order) {
            order[status] = !order[status];
            order.lastModified = Date.now();
            this.saveToLocalStorage();
            this.renderOrders();
        }
    }

    hideOrder(orderId) {
        const orderIndex = this.orders.findIndex(o => o.id === orderId);
        if (orderIndex !== -1) {
            const order = this.orders.splice(orderIndex, 1)[0];
            order.lastModified = Date.now();
            this.hiddenOrders.push(order);
            this.saveToLocalStorage();
            this.renderOrders();
        }
    }

    restoreOrder(orderId) {
        const orderIndex = this.hiddenOrders.findIndex(o => o.id === orderId);
        if (orderIndex !== -1) {
            const order = this.hiddenOrders.splice(orderIndex, 1)[0];
            order.lastModified = Date.now();
            this.orders.push(order);
            this.saveToLocalStorage();
            this.renderHiddenOrders();
            this.renderOrders();
        }
    }

    cleanupOldOrders() {
        const now = new Date();
        this.orders = this.orders.filter(order => {
            if (order.delivered) {
                const orderDate = new Date(order.date);
                const daysSinceOrder = (now - orderDate) / (1000 * 60 * 60 * 24);
                return daysSinceOrder <= 10;
            }
            return true;
        });
        this.saveToLocalStorage();
        this.renderOrders();
    }

    createOrderCard(order, isHidden = false) {
        const card = document.createElement('div');
        card.className = 'order-card' + (isHidden ? ' hidden-order' : '');
        
        const date = new Date(order.date);
        const formattedDate = date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        card.innerHTML = `
            <h3>${order.customerName}</h3>
            <p><strong>Teléfono:</strong> ${order.phoneNumber}</p>
            <p><strong>Tipo de Producto:</strong> ${order.productType}</p>
            <p><strong>Fecha:</strong> ${formattedDate}</p>
            ${order.observations ? `<p><strong>Observaciones:</strong> ${order.observations}</p>` : ''}
            <p><strong>Estado:</strong> 
                ${order.paid ? 'Pagado' : 'Pendiente de pago'} | 
                ${order.delivered ? 'Entregado' : 'Pendiente de entrega'}
            </p>
            <div class="order-actions">
                ${isHidden ?
                    `<button onclick="orderManager.restoreOrder('${order.id}')">Restaurar Pedido</button>` :
                    `<button onclick="orderManager.toggleOrderStatus('${order.id}', 'paid')">
                        ${order.paid ? 'Marcar No Pagado' : 'Marcar Pagado'}
                    </button>
                    <button onclick="orderManager.toggleOrderStatus('${order.id}', 'delivered')">
                        ${order.delivered ? 'Marcar No Entregado' : 'Marcar Entregado'}
                    </button>
                    <button onclick="orderManager.hideOrder('${order.id}')">Ocultar Pedido</button>`
                }
            </div>
        `;

        return card;
    }

    renderOrders() {
        const container = document.getElementById('ordersList');
        container.innerHTML = '';
        this.orders.forEach(order => {
            const card = this.createOrderCard(order);
            container.appendChild(card);
        });
    }

    renderHiddenOrders() {
        const container = document.getElementById('hiddenOrdersList');
        container.innerHTML = '';
        if (this.hiddenOrders.length === 0) {
            container.innerHTML = '<p>No hay pedidos ocultos</p>';
            return;
        }
        this.hiddenOrders.forEach(order => {
            const card = this.createOrderCard(order, true);
            container.appendChild(card);
        });
    }
}

const orderManager = new OrderManager();
