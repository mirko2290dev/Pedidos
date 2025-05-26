class OrderManager {
    constructor() {
        this.orders = JSON.parse(localStorage.getItem('orders')) || [];
        this.hiddenOrders = JSON.parse(localStorage.getItem('hiddenOrders')) || [];
        this.GITHUB_TOKEN = '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';
        this.REPO_OWNER = 'mirko2290dev';
        this.REPO_NAME = 'Pedios';
        this.loadOrders();
        this.setupThemeSelector();
    }

    async syncWithGitHub() {
        try {
            const allOrders = [...this.orders, ...this.hiddenOrders];
            const content = btoa(JSON.stringify(allOrders, null, 2));
            
            const response = await fetch(`https://api.github.com/repos/${this.REPO_OWNER}/${this.REPO_NAME}/contents/orders.json`, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${this.GITHUB_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: 'Actualizar pedidos',
                    content: content,
                    sha: await this.getFileSHA()
                })
            });

            if (!response.ok) {
                throw new Error('Error al sincronizar con GitHub');
            }
        } catch (error) {
            console.error('Error de sincronización:', error);
        }
    }

    async getFileSHA() {
        try {
            const response = await fetch(`https://api.github.com/repos/${this.REPO_OWNER}/${this.REPO_NAME}/contents/orders.json`, {
                headers: {
                    'Authorization': `token ${this.GITHUB_TOKEN}`,
                }
            });
            if (response.ok) {
                const data = await response.json();
                return data.sha;
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    setupThemeSelector() {
        const themeSelector = document.getElementById('themeSelector');
        themeSelector.addEventListener('change', (e) => {
            this.setTheme(e.target.value);
        });

        // Cargar tema guardado o usar el predeterminado
        const savedTheme = localStorage.getItem('theme') || 'light';
        themeSelector.value = savedTheme;
        this.setTheme(savedTheme);
    }

    setTheme(theme) {
        document.body.className = theme;
        localStorage.setItem('theme', theme);
    }

    addOrder(event) {
        event.preventDefault();
        const customerName = document.getElementById('customerName').value;
        const phoneNumber = document.getElementById('phoneNumber').value;
        const orderType = document.getElementById('orderType').value;
        const observations = document.getElementById('observations').value;

        const order = {
            id: Date.now().toString(),
            customerName,
            phoneNumber,
            orderType,
            observations,
            creationDate: new Date().toISOString(),
            deliveryDate: null,
            paid: false,
            delivered: false
        };

        this.orders.push(order);
        this.saveOrders();
        this.loadOrders();
        event.target.reset();
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
            order.deliveryDate = order.delivered ? new Date().toISOString() : null;
            this.saveOrders();
            this.loadOrders();
        }
    }

    hideOrder(orderId) {
        const orderIndex = this.orders.findIndex(o => o.id === orderId);
        if (orderIndex !== -1) {
            const [order] = this.orders.splice(orderIndex, 1);
            this.hiddenOrders.push(order);
            this.saveOrders();
            this.loadOrders();
        }
    }

    restoreOrder(orderId) {
        const orderIndex = this.hiddenOrders.findIndex(o => o.id === orderId);
        if (orderIndex !== -1) {
            const [order] = this.hiddenOrders.splice(orderIndex, 1);
            this.orders.push(order);
            this.saveOrders();
            this.loadOrders();
            this.loadHiddenOrders();
        }
    }

    saveOrders() {
        localStorage.setItem('orders', JSON.stringify(this.orders));
        localStorage.setItem('hiddenOrders', JSON.stringify(this.hiddenOrders));
        this.syncWithGitHub();

        // Limpiar pedidos entregados después de 10 días
        const tenDaysAgo = new Date();
        tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

        this.orders = this.orders.filter(order => {
            if (order.delivered && order.deliveryDate) {
                const deliveryDate = new Date(order.deliveryDate);
                return deliveryDate > tenDaysAgo;
            }
            return true;
        });
    }

    loadOrders() {
        const ordersList = document.getElementById('ordersList');
        ordersList.innerHTML = '';

        this.orders.forEach(order => {
            const orderElement = this.createOrderElement(order);
            ordersList.appendChild(orderElement);
        });
    }

    loadHiddenOrders() {
        const hiddenOrdersList = document.getElementById('hiddenOrdersList');
        if (hiddenOrdersList) {
            hiddenOrdersList.innerHTML = '';
            this.hiddenOrders.forEach(order => {
                const orderElement = this.createHiddenOrderElement(order);
                hiddenOrdersList.appendChild(orderElement);
            });
        }
    }

    createOrderElement(order) {
        const div = document.createElement('div');
        div.className = 'order-card';
        
        const creationDate = new Date(order.creationDate);
        const formattedDate = creationDate.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        div.innerHTML = `
            <h3>${order.customerName}</h3>
            <p><strong>Teléfono:</strong> ${order.phoneNumber}</p>
            <p><strong>Tipo de Pedido:</strong> ${order.orderType}</p>
            <p><strong>Fecha:</strong> ${formattedDate}</p>
            ${order.observations ? `<p><strong>Observaciones:</strong> ${order.observations}</p>` : ''}
            <p><strong>Estado:</strong> 
                ${order.paid ? 'Pagado' : 'Pendiente de pago'} | 
                ${order.delivered ? 'Entregado' : 'Pendiente de entrega'}
            </p>
            <div class="order-actions">
                <button onclick="orderManager.togglePaid('${order.id}')">
                    ${order.paid ? 'Marcar como No Pagado' : 'Marcar como Pagado'}
                </button>
                <button onclick="orderManager.toggleDelivered('${order.id}')">
                    ${order.delivered ? 'Marcar como No Entregado' : 'Marcar como Entregado'}
                </button>
                <button onclick="orderManager.hideOrder('${order.id}')">Ocultar Pedido</button>
            </div>
        `;

        return div;
    }

    createHiddenOrderElement(order) {
        const div = document.createElement('div');
        div.className = 'order-card hidden-order';

        const creationDate = new Date(order.creationDate);
        const formattedDate = creationDate.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        div.innerHTML = `
            <h3>${order.customerName}</h3>
            <p><strong>Teléfono:</strong> ${order.phoneNumber}</p>
            <p><strong>Tipo de Pedido:</strong> ${order.orderType}</p>
            <p><strong>Fecha:</strong> ${formattedDate}</p>
            ${order.observations ? `<p><strong>Observaciones:</strong> ${order.observations}</p>` : ''}
            <p><strong>Estado:</strong> 
                ${order.paid ? 'Pagado' : 'Pendiente de pago'} | 
                ${order.delivered ? 'Entregado' : 'Pendiente de entrega'}
            </p>
            <div class="order-actions">
                <button onclick="orderManager.restoreOrder('${order.id}')">Restaurar Pedido</button>
            </div>
        `;

        return div;
    }
}

const orderManager = new OrderManager();

// Configurar el formulario
document.getElementById('orderForm').addEventListener('submit', (e) => orderManager.addOrder(e));
