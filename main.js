function mostrarMenuTransacciones(usuario) {
  let salir = false;
 
  while (!salir) {
    const opcion = prompt(
      `--- Mi Plata | Hola, ${usuario.usuario} ---\n` +
      `1. Retirar\n` +
      `2. Consignar\n` +
      `3. Consultar Saldo\n` +
      `4. Consultar Movimientos\n` +
      `5. Cerrar sesión\n\n` +
      `Elige una opción:`
    );
 
    if (opcion === null) {
      salir = true;
      break;
    }
 
    switch (opcion.trim()) {
      case "1":
        retirarDinero(usuario);
        break;
      case "2":
        consignarDinero(usuario);
        break;
      case "3":
        consultarSaldo(usuario);
        break;
      case "4":
        consultarMovimientos(usuario);
        break;
      case "5":
        salir = true;
        alert("Sesión cerrada. ¡Hasta pronto!");
        break;
      default:
        alert("Opción inválida. Elige un número del 1 al 5.");
    }
  }
}
 
function iniciarAplicacion() {
  let salirApp = false;
 
  while (!salirApp) {
    const opcion = prompt(
      `=== Bienvenido a Mi Plata ===\n` +
      `1. Iniciar sesion\n` +
      `2. Registrar\n` +
      `3. Salir\n\n` +
      `Elige una opción:`
    );
 
    if (opcion === null) {
      salirApp = true;
      break;
    }
 
    switch (opcion.trim()) {
      case "1": {
        const usuarioLogueado = iniciarSesion();
        if (usuarioLogueado !== null) {
          mostrarMenuTransacciones(usuarioLogueado);
        }
        break;
      }
      case "2":
        registrarUsuario();
        break;
      case "3":
        salirApp = true;
        alert("Gracias por usar Mi Plata.");
        break;
      default:
        alert("Opción inválida. Elige un número del 1 al 3.");
    }
  }
}
 
window.onload = iniciarAplicacion;