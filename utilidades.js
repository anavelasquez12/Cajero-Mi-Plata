function leerNumeroValido(mensaje, soloPositivos = true) {
  let valorTexto;
  let valorNumero;
  let esValido = false;
 
  while (!esValido) {
    valorTexto = prompt(mensaje);
 
    if (valorTexto === null) {
      alert("Operación cancelada.");
      return null;
    }
 
    valorNumero = parseFloat(valorTexto);
 
    if (isNaN(valorNumero)) {
      alert("Por favor ingresa un número válido.");
    } else if (soloPositivos && valorNumero <= 0) {
      alert("El valor debe ser mayor que cero.");
    } else {
      esValido = true;
    }
  }
 
  return valorNumero;
}
 
function leerTextoValido(mensaje) {
  let valor;
  let esValido = false;
 
  while (!esValido) {
    valor = prompt(mensaje);
 
    if (valor === null) {
      alert("Operación cancelada.");
      return null;
    }
 
    valor = valor.trim(); 
 
    if (valor === "") {
      alert("Este campo no puede quedar vacío.");
    } else {
      esValido = true;
    }
  }
 
  return valor;
}
 
function obtenerFechaHoraActual() {
  const ahora = new Date();
 
  const dia = String(ahora.getDate()).padStart(2, "0");
  const mes = String(ahora.getMonth() + 1).padStart(2, "0"); 
  const anio = ahora.getFullYear();
 
  const horas = String(ahora.getHours()).padStart(2, "0");
  const minutos = String(ahora.getMinutes()).padStart(2, "0");
  const segundos = String(ahora.getSeconds()).padStart(2, "0");
 
  return `${dia}/${mes}/${anio} ${horas}:${minutos}:${segundos}`;
}

//autenticación de usuarios

const MAX_INTENTOS = 3;
const HORAS_DE_BLOQUEO_EN_MS = 24 * 60 * 60 * 1000; 
 
function registrarUsuario() {
  const nombreUsuario = leerTextoValido("Ingresa un nombre de usuario:");
  if (nombreUsuario === null) return;
 
  if (existeUsuario(nombreUsuario)) {
    alert("Ese nombre de usuario ya está registrado. Intenta con otro.");
    return;
  }
 
  const clave = leerTextoValido("Crea una clave:");
  if (clave === null) return;
 
  const saldoInicial = leerNumeroValido("Ingresa el saldo inicial de la cuenta:", true);
  if (saldoInicial === null) return;
 
  const nuevoUsuario = {
    usuario: nombreUsuario,
    clave: clave,
    saldo: saldoInicial,
    intentosFallidos: 0,
    bloqueadoHasta: null,
    movimientos: []
  };
 
  const usuarios = obtenerUsuarios();
  usuarios.push(nuevoUsuario);
  guardarUsuarios(usuarios);
 
  alert(`¡Cuenta creada con éxito para "${nombreUsuario}"! Ya puedes iniciar sesión.`);
}
 

function iniciarSesion() {
  const nombreUsuario = leerTextoValido("Usuario:");
  if (nombreUsuario === null) return null;
 
  const usuario = buscarUsuarioPorNombre(nombreUsuario);
 
  if (usuario === undefined) {
    alert("El usuario no existe. Regístrate primero.");
    return null;
  }
 
  
  if (usuario.bloqueadoHasta !== null) {
    const ahora = Date.now();
 
    if (ahora < usuario.bloqueadoHasta) {
      const minutosRestantes = Math.ceil((usuario.bloqueadoHasta - ahora) / 60000);
      alert(`Cuenta bloqueada por 24 horas, comunícate con tu banco.\nTiempo restante: ${minutosRestantes} minuto(s).`);
      return null;
    } else {
     
      usuario.bloqueadoHasta = null;
      usuario.intentosFallidos = 0;
      actualizarUsuario(usuario);
    }
  }
 
  while (usuario.intentosFallidos < MAX_INTENTOS) {
    const claveIngresada = prompt(
      `Clave (Intento ${usuario.intentosFallidos + 1} de ${MAX_INTENTOS}):`
    );
 
    if (claveIngresada === null) {
      alert("Operación cancelada.");
      return null;
    }
 
    if (claveIngresada === usuario.clave) {
      
      usuario.intentosFallidos = 0;
      actualizarUsuario(usuario);
      alert(`¡Bienvenido, ${usuario.usuario}!`);
      return usuario;
    }
 
    
    usuario.intentosFallidos++;
    actualizarUsuario(usuario);
 
    const intentosRestantes = MAX_INTENTOS - usuario.intentosFallidos;
 
    if (intentosRestantes > 0) {
      alert(`Clave incorrecta. Te quedan ${intentosRestantes} intento(s).`);
    } else {
      
      usuario.bloqueadoHasta = Date.now() + HORAS_DE_BLOQUEO_EN_MS;
      actualizarUsuario(usuario);
      alert("Cuenta bloqueada por 24 horas, comunícate con tu banco.");
    }
  }
 
  return null;
}