class OrderManager {
    constructor() {
        this.orders = JSON.parse(localStorage.getItem('orders')) || [];
        this.hiddenOrders = JSON.parse(localStorage.getItem('hiddenOrders')) || [];
        this.loadOrders();
        this.setupThemeSelector();
        this.syncFromGitHub(); // Sincronizar al inicio
    }

    async syncFromGitHub() {
        try {
            const response = await fetch('https://api.github.com/repos/mirko2290dec/Pedidos/contents/orders.json', {
                headers: {
                    'Accept': 'application/vnd.github.v3.raw'
                }
            });

            if (response.ok) {
                const data = await response.json();
                // Combinar datos remotos con locales
                this.mergeOrders(data);
                this.loadOrders();
            }
        } catch (error) {
            console.log('Usando datos locales:', error);
        }
    }

    mergeOrders(remoteOrders) {
        // Crear un mapa de órdenes locales por ID
        const localOrdersMap = new Map();
        this.orders.forEach(order => localOrdersMap.set(order.id, order));
        this.hiddenOrders.forEach(order => localOrdersMap.set(order.id, order));

        // Actualizar con órdenes remotas más recientes
        remoteOrders.forEach(remoteOrder => {
            const localOrder = localOrdersMap.get(remoteOrder.id);
            if (!localOrder || new Date(remoteOrder.lastModified) > new Date(localOrder.lastModified)) {
                if (remoteOrder.hidden) {
                    this.hiddenOrders = this.hiddenOrders.filter(o => o.id !== remoteOrder.id);
                    this.hiddenOrders.push(remoteOrder);
                } else {
                    this.orders = this.orders.filter(o => o.id !== remoteOrder.id);
                    this.orders.push(remoteOrder);
                }
            }
        });

        this.saveOrders();
    }

    setupThemeSelector() {
        const themeSelector = document.getElementById('themeSelector');
        themeSelector.addEventListener('change', (e) => {
            this.setTheme(e.target.value);
        });

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
        const order = {
            id: Date.now().toString(),
            customerName: document.getElementById('customerName').value,
            phoneNumber: document.getElementById('phoneNumber').value,
            orderType: document.getElementById('orderType').value,
            observations: document.getElementById('observations').value,
            creationDate: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            deliveryDate: null,
            paid: false,
            delivered: false,
            hidden: false
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
            order.lastModified = new Date().toISOString();
            this.saveOrders();
            this.loadOrders();
        }
    }

    toggleDelivered(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (order) {
            order.delivered = !order.delivered;
            order.deliveryDate = order.delivered ? new Date().toISOString() : null;
            order.lastModified = new Date().toISOString();
            this.saveOrders();
            this.loadOrders();
        }
    }

    hideOrder(orderId) {
        const orderIndex = this.orders.findIndex(o => o.id === orderId);
        if (orderIndex !== -1) {
            const [order] = this.orders.splice(orderIndex, 1);
            order.hidden = true;
            order.lastModified = new Date().toISOString();
            this.hiddenOrders.push(order);
            this.saveOrders();
            this.loadOrders();
        }
    }

    restoreOrder(orderId) {
        const orderIndex = this.hiddenOrders.findIndex(o => o.id === orderId);
        if (orderIndex !== -1) {
            const [order] = this.hiddenOrders.splice(orderIndex, 1);
            order.hidden = false;
            order.lastModified = new Date().toISOString();
            this.orders.push(order);
            this.saveOrders();
            this.loadOrders();
            this.loadHiddenOrders();
        }
    }

    saveOrders() {
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

        localStorage.setItem('orders', JSON.stringify(this.orders));
        localStorage.setItem('hiddenOrders', JSON.stringify(this.hiddenOrders));

        // No intentamos sincronizar con GitHub aquí, ya que necesitaríamos el token
        // Los datos se mantienen localmente
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
        div.innerHTML = `
            <h3>${order.customerName}</h3>
            <p>Teléfono: ${order.phoneNumber}</p>
            <p>Tipo: ${order.orderType}</p>
            <p>Observaciones: ${order.observations}</p>
            <p>Fecha de creación: ${new Date(order.creationDate).toLocaleString()}</p>
            ${order.deliveryDate ? `<p>Fecha de entrega: ${new Date(order.deliveryDate).toLocaleString()}</p>` : ''}
            <div class="order-actions">
                <label class="checkbox-label">
                    <input type="checkbox" ${order.paid ? 'checked' : ''} onchange="orderManager.togglePaid('${order.id}')"> Pagado
                </label>
                <label class="checkbox-label">
                    <input type="checkbox" ${order.delivered ? 'checked' : ''} onchange="orderManager.toggleDelivered('${order.id}')"> Entregado
                </label>
                <button onclick="orderManager.hideOrder('${order.id}')">Ocultar Pedido</button>
            </div>
        `;
        return div;
    }

    createHiddenOrderElement(order) {
        const div = document.createElement('div');
        div.className = 'order-card hidden';
        div.innerHTML = `
            <h3>${order.customerName}</h3>
            <p>Teléfono: ${order.phoneNumber}</p>
            <p>Tipo: ${order.orderType}</p>
            <p>Observaciones: ${order.observations}</p>
            <p>Fecha de creación: ${new Date(order.creationDate).toLocaleString()}</p>
            ${order.deliveryDate ? `<p>Fecha de entrega: ${new Date(order.deliveryDate).toLocaleString()}</p>` : ''}
            <div class="order-actions">
                <button onclick="orderManager.restoreOrder('${order.id}')">Restaurar Pedido</button>
            </div>
        `;
        return div;
    }

    toggleHiddenOrders() {
        const hiddenOrdersSection = document.getElementById('hiddenOrdersSection');
        if (hiddenOrdersSection.style.display === 'none') {
            hiddenOrdersSection.style.display = 'block';
            this.loadHiddenOrders();
        } else {
            hiddenOrdersSection.style.display = 'none';
        }
    }
}

const orderManager = new OrderManager();

document.getElementById('orderForm').addEventListener('submit', (e) => orderManager.addOrder(e));
document.getElementById('toggleHiddenOrders').addEventListener('click', () => orderManager.toggleHiddenOrders());
