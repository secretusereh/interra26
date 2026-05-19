import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

export function initInterraBalance(containerId, tripId, tripData, db, userNamesCache, currentUserUid) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Aseguramos que existe el array de gastos en el viaje
    if (!tripData.gastos) tripData.gastos = [];

    // Lógica Matemática de Saldos
    function calcularSaldos() {
        const uids = Object.keys(tripData.miembros || {});
        let totalGastado = 0;
        const pagosPorUsuario = {};
        uids.forEach(uid => pagosPorUsuario[uid] = 0);

        tripData.gastos.forEach(g => {
            const cantidad = parseFloat(g.cantidad) || 0;
            totalGastado += cantidad;
            if (pagosPorUsuario[g.pagador] !== undefined) {
                pagosPorUsuario[g.pagador] += cantidad;
            }
        });

        const cuotaPorPersona = uids.length > 0 ? (totalGastado / uids.length) : 0;
        
        const saldos = [];
        uids.forEach(uid => {
            const balance = pagosPorUsuario[uid] - cuotaPorPersona;
            saldos.push({
                uid: uid,
                nombre: userNamesCache[uid] || 'Usuario',
                pagado: pagosPorUsuario[uid],
                balance: balance
            });
        });

        return { totalGastado, cuotaPorPersona, saldos };
    }

    // Renderizado de la Interfaz
    function render() {
        const { totalGastado, cuotaPorPersona, saldos } = calcularSaldos();
        
        // Generar opciones del selector de pagador
        let opcionesPagador = '';
        Object.keys(tripData.miembros || {}).forEach(uid => {
            const nombre = userNamesCache[uid] || 'Usuario';
            opcionesPagador += `<option value="${uid}" ${uid === currentUserUid ? 'selected' : ''}>${nombre}</option>`;
        });

        // Generar lista de saldos
        let htmlSaldos = '';
        saldos.forEach(s => {
            const colorBalance = s.balance > 0.01 ? 'var(--success)' : (s.balance < -0.01 ? 'var(--accent)' : 'var(--text-muted)');
            const textoBalance = s.balance > 0.01 ? `Le deben ${s.balance.toFixed(2)}€` : (s.balance < -0.01 ? `Debe ${Math.abs(s.balance).toFixed(2)}€` : `En paz`);
            htmlSaldos += `
                <div style="display: flex; justify-content: space-between; padding: 0.8rem 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <div style="font-weight: 600;">${s.nombre}</div>
                    <div style="text-align: right;">
                        <div style="font-size: 0.8rem; color: var(--text-muted);">Pagó: ${s.pagado.toFixed(2)}€</div>
                        <div style="font-weight: 800; color: ${colorBalance};">${textoBalance}</div>
                    </div>
                </div>
            `;
        });

        // Generar lista de gastos
        let htmlGastos = '';
        if (tripData.gastos.length === 0) {
            htmlGastos = `<p style="color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 2rem 0; font-style: italic;">Aún no hay gastos registrados en esta aventura.</p>`;
        } else {
            // Ordenar de más reciente a más antiguo
            const gastosOrdenados = [...tripData.gastos].reverse();
            gastosOrdenados.forEach(g => {
                const nombrePagador = userNamesCache[g.pagador] || 'Alguien';
                htmlGastos += `
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 1rem; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-weight: 600; font-size: 1.05rem;">${g.concepto}</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">Pagado por <strong style="color:white;">${nombrePagador}</strong></div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <div style="font-weight: 800; font-size: 1.2rem; color: var(--accent-blue);">${parseFloat(g.cantidad).toFixed(2)}€</div>
                            <button class="btn-borrar-gasto" data-id="${g.id}" style="background: rgba(255,77,77,0.1); color: var(--accent); border: none; width: 30px; height: 30px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                                <i data-lucide="trash-2" style="width: 14px;"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
        }

        container.innerHTML = `
            <style>
                .balance-grid { display: grid; grid-template-columns: 1fr; gap: 2rem; }
                @media(min-width: 768px) { .balance-grid { grid-template-columns: 1fr 1.5fr; } }
                .balance-panel { background: var(--surface); border: 1px solid var(--border-subtle); border-radius: 16px; padding: 2rem; }
                .input-gasto { width: 100%; padding: 1rem; background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); border-radius: 12px; color: white; outline: none; font-size: 1rem; font-family: 'Sora', sans-serif; transition: 0.3s; margin-top: 0.5rem; }
                .input-gasto:focus { border-color: var(--primary); background: rgba(255,255,255,0.05); }
                .btn-add-gasto { width: 100%; background: var(--primary); color: var(--bg-color); border: none; padding: 1rem; border-radius: 12px; font-weight: 800; font-size: 1rem; cursor: pointer; margin-top: 1.5rem; transition: 0.3s; }
                .btn-add-gasto:hover { transform: scale(0.98); }
            </style>

            <div class="balance-grid">
                <div>
                    <div class="balance-panel" style="margin-bottom: 2rem; background: rgba(77, 166, 255, 0.05); border-color: rgba(77, 166, 255, 0.2);">
                        <h3 style="color: var(--accent-blue); margin-bottom: 1.5rem; display: flex; align-items: center; gap: 8px;"><i data-lucide="pie-chart"></i> Resumen de Cuentas</h3>
                        <div style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 5px;">Gasto total del viaje</div>
                        <div style="font-size: 2.5rem; font-weight: 800; color: var(--primary); margin-bottom: 1.5rem; letter-spacing: -1px;">${totalGastado.toFixed(2)}€</div>
                        
                        <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 15px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 10px;">
                            Cuota ideal por persona: <strong style="color:white;">${cuotaPorPersona.toFixed(2)}€</strong>
                        </div>
                        
                        <div id="lista-saldos">
                            ${htmlSaldos}
                        </div>
                    </div>

                    <div class="balance-panel">
                        <h3 style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 8px;"><i data-lucide="plus-circle"></i> Añadir Gasto</h3>
                        <form id="form-nuevo-gasto">
                            <div style="margin-bottom: 1rem;">
                                <label style="font-size: 0.85rem; color: var(--text-muted);">Concepto (Ej. Cervezas, Tren)</label>
                                <input type="text" id="gasto-concepto" class="input-gasto" required placeholder="¿En qué se ha gastado?">
                            </div>
                            <div style="margin-bottom: 1rem;">
                                <label style="font-size: 0.85rem; color: var(--text-muted);">Cantidad (€)</label>
                                <input type="number" id="gasto-cantidad" class="input-gasto" required placeholder="0.00" step="0.01" min="0.01">
                            </div>
                            <div style="margin-bottom: 1rem;">
                                <label style="font-size: 0.85rem; color: var(--text-muted);">¿Quién lo ha pagado?</label>
                                <select id="gasto-pagador" class="input-gasto" required>
                                    ${opcionesPagador}
                                </select>
                            </div>
                            <button type="submit" class="btn-add-gasto" id="btn-submit-gasto">Registrar Gasto</button>
                        </form>
                    </div>
                </div>

                <div class="balance-panel">
                    <h3 style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 8px;"><i data-lucide="receipt"></i> Historial de Gastos</h3>
                    <div id="lista-gastos">
                        ${htmlGastos}
                    </div>
                </div>
            </div>
        `;

        if (window.lucide) window.lucide.createIcons();
        attachEvents();
    }

    function attachEvents() {
        const form = document.getElementById('form-nuevo-gasto');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const btn = document.getElementById('btn-submit-gasto');
                btn.innerText = "Guardando..."; btn.style.opacity = '0.5';

                const nuevoGasto = {
                    id: Date.now().toString(36) + Math.random().toString(36).substr(2),
                    concepto: document.getElementById('gasto-concepto').value,
                    cantidad: parseFloat(document.getElementById('gasto-cantidad').value),
                    pagador: document.getElementById('gasto-pagador').value,
                    fechaCreacion: new Date().toISOString()
                };

                tripData.gastos.push(nuevoGasto);

                try {
                    const tripRef = doc(db, "viajes", tripId);
                    await updateDoc(tripRef, { gastos: tripData.gastos });
                    render(); // Re-renderizar módulo localmente sin recargar página
                } catch (error) {
                    console.error("Error al guardar gasto:", error);
                    alert("Hubo un error al guardar el gasto.");
                }
            });
        }

        const deleteBtns = document.querySelectorAll('.btn-borrar-gasto');
        deleteBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const idBorrar = e.currentTarget.getAttribute('data-id');
                if(confirm("¿Seguro que quieres eliminar este gasto?")) {
                    tripData.gastos = tripData.gastos.filter(g => g.id !== idBorrar);
                    try {
                        const tripRef = doc(db, "viajes", tripId);
                        await updateDoc(tripRef, { gastos: tripData.gastos });
                        render();
                    } catch (error) {
                        alert("Error al borrar el gasto.");
                    }
                }
            });
        });
    }

    // Iniciar renderizado
    render();
}
