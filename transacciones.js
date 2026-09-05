function registrarMovimiento(usuario, tipo, valor) {
  const movimiento = {
    fecha: obtenerFechaHoraActual(),
    tipo: tipo,       
    valor: valor,
    saldo: usuario.saldo 
  };
 
  usuario.movimientos.push(movimiento);
}
 

function retirarDinero(usuario) {
  const monto = leerNumeroValido("¿Cuánto deseas retirar?", true);
  if (monto === null) return;
 
  if (monto > usuario.saldo) {
    alert(`Fondos insuficientes. Tu saldo actual es de $${usuario.saldo}.`);
    return;
  }
 
  usuario.saldo -= monto;
  registrarMovimiento(usuario, "Retiro", monto);
  actualizarUsuario(usuario);
 
  alert(`Retiro exitoso. Nuevo saldo: $${usuario.saldo}`);
}
 
function consignarDinero(usuario) {
  const monto = leerNumeroValido("¿Cuánto deseas consignar?", true);
  if (monto === null) return;
 
  usuario.saldo += monto;
  registrarMovimiento(usuario, "Consignación", monto);
  actualizarUsuario(usuario);
 
  alert(`Consignación exitosa. Nuevo saldo: $${usuario.saldo}`);
}
 

function consultarSaldo(usuario) {
  alert(`Tu saldo actual es: $${usuario.saldo}`);
}

function consultarMovimientos(usuario) {
  if (usuario.movimientos.length === 0) {
    alert("Todavía no tienes movimientos registrados.");
    return;
  }
 
  let textoHistorial = "=== Historial de movimientos ===\n\n";
 
  for (let i = 0; i < usuario.movimientos.length; i++) {
    const m = usuario.movimientos[i];
    textoHistorial += `${m.fecha} | ${m.tipo} | $${m.valor} | Saldo: $${m.saldo}\n`;
  }
 
  alert(textoHistorial);
 
  console.table(usuario.movimientos);
}