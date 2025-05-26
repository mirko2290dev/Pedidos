class OrderManager {
    constructor() {
        this.orders = [];
        this.hiddenOrders = [];
        this.loadFromLocalStorage();
        this.setupThemeSelector();
        this.syncFromGitHub();
        this.cleanupOldOrders();
        setInterval(() => this.cleanupOldOrders(), 24 * 60 * 60 * 1000); // Check daily
    }

    async syncFromGitHub() {
        try {
            const response = await fetch('https://raw.githubusercontent.com/mirko2290dec/Pedidos/main/orders.json');
            if (!response.ok) {
                throw new Error('No se pudo obtener los datos del repositorio');
            }
            const remoteData = await response.json();
            this.mergeOrders(remoteData);
        } catch (error) {
            console.error('Error al sincronizar con GitHub:', error);
        }
    }

    mergeOrders(remoteData) {
        const remoteOrders = remoteData.orders || [];
        const remoteHiddenOrders = remoteData.hiddenOrders || [];

        // Merge visible orders
        remoteOrders.forEach(remoteOrder => {
            const localOrder = this.orders.find(o => o.id === remoteOrder.id);
            if (!localOrder || remoteOrder.lastModified > localOrder.lastModified) {
                if (!localOrder) {
                    this.orders.push(remoteOrder);
                } else {
                    Object.assign(localOrder, remoteOrder);
                }
            }
        });

        // Merge hidden orders
        remoteHiddenOrders.forEach(remoteOrder => {
            const localHiddenOrder = this.hiddenOrders.find(o => o.id === remoteOrder.id);
            if (!localHiddenOrder || remoteOrder.lastModified > localHiddenOrder.lastModified) {
                if (!localHiddenOrder) {
                    this.hiddenOrders.push(remoteOrder);
                } else {
                    Object.assign(localHiddenOrder, remoteOrder);
                }
            }
        });

        this.saveToLocalStorage();
        this.renderOrders();
    }

    setupThemeSelector() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.setTheme(savedTheme);
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }

    toggleConfigPanel() {
        const panel = document.getElementById('configPanel');
        panel.classList.toggle('hidden');
    }

    hideConfigPanel() {
        const panel = document.getElementById('configPanel');
        panel.classList.add('hidden');
    }

    showHiddenOrders() {
        const container = document.getElementById('ordersContainer');
        container.innerHTML = '';

        this.hiddenOrders.forEach(order => {
            const card = this.createOrderCard(order, true);
            container.appendChild(card);
        });

        // Agregar botón para volver a los pedidos normales
        const backButton = document.createElement('button');
        backButton.textContent = 'Volver a Pedidos Activos';
        backButton.onclick = () => this.renderOrders();
        backButton.style.marginTop = '20px';
        container.insertBefore(backButton, container.firstChild);
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
        const orderType = document.getElementById('orderType').value;
        const observations = document.getElementById('observations').value;

        if (!customerName || !phoneNumber || !orderType) {
            alert('Por favor complete todos los campos requeridos');
            return;
        }

        const order = {
            id: Date.now().toString(),
            customerName,
            phoneNumber,
            orderType,
            observations,
            date: new Date().toISOString(),
            paid: false,
            delivered: false,
            lastModified: Date.now()
        };

        this.orders.push(order);
        this.saveToLocalStorage();
        this.renderOrders();

        // Clear form
        document.getElementById('customerName').value = '';
        document.getElementById('phoneNumber').value = '';
        document.getElementById('orderType').value = '';
        document.getElementById('observations').value = '';
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
            this.showHiddenOrders(); // Refresh hidden orders view
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
        card.className = 'order-card';
        
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
            <p><strong>Tipo:</strong> ${order.orderType}</p>
            <p><strong>Fecha:</strong> ${formattedDate}</p>
            ${order.observations ? `<p><strong>Observaciones:</strong> ${order.observations}</p>` : ''}
            <p><strong>Estado:</strong> 
                ${order.paid ? 'Pagado' : 'Pendiente de pago'} | 
                ${order.delivered ? 'Entregado' : 'Pendiente de entrega'}
            </p>
            <div class="status-buttons">
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
        const container = document.getElementById('ordersContainer');
        container.innerHTML = '';
        this.orders.forEach(order => {
            const card = this.createOrderCard(order);
            container.appendChild(card);
        });
    }
}

const orderManager = new OrderManager();
