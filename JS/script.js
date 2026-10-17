/* =====================================================
   MI PLATA FINANCIAL BANK
   Parte 1: Clases (abstracción, encapsulamiento, herencia, polimorfismo)
   Parte 2: Datos (localStorage) y funciones de ayuda
   Parte 3: Lógica de negocio
   Parte 4: Interfaz (DOM)
   ===================================================== */


/* =====================================================
   PARTE 1: CLASES (POO)
   ===================================================== */

// Reglas del banco (si cambian, se cambian aquí una sola vez)
const TASA_AHORROS = 0.015;      // 1,5% mensual
const SOBREGIRO = 0.20;          // 20% adicional sobre el saldo
const CUPO_TARJETA = 5000000;    // cupo asignado por el banco
const MAX_CUOTAS = 36;

const NOMBRES = {
  Ahorros: 'Cuenta de Ahorros',
  Corriente: 'Cuenta Corriente',
  Tarjeta: 'Tarjeta de Crédito'
};


// ---------- Cuenta: clase ABSTRACTA (abstracción) ----------
// Define lo esencial de cualquier producto bancario. No se puede usar directamente.
class Cuenta {
  // ENCAPSULAMIENTO: los "#" hacen los atributos privados (solo se tocan desde la clase)
  #numero;
  #saldo;
  #movimientos;

  constructor(numero, saldo = 0, movimientos = []) {
    if (new.target === Cuenta) {
      throw new TypeError('Cuenta es abstracta: usa CuentaAhorros, CuentaCorriente o TarjetaCredito.');
    }
    this.#numero = numero;
    this.#saldo = saldo;
    this.#movimientos = movimientos;
  }

  // Getters: permiten LEER, pero no modificar desde afuera
  get numero() { return this.#numero; }
  get saldo() { return this.#saldo; }
  get movimientos() { return [...this.#movimientos]; } // devuelve una copia
  get tipo() { return 'Cuenta'; }
  get etiquetaSaldo() { return 'Saldo disponible'; }

  // --- Métodos que las hijas SOBRESCRIBEN (polimorfismo) ---
  limiteRetiro() { return this.#saldo; }
  mensajeLimite(limite) { return `Fondos insuficientes. Tu saldo disponible es ${formatoPeso(limite)}.`; }
  aplicarInteres() { return 0; }          // por defecto no genera intereses
  puedeRecibir(monto) { return true; }    // por defecto acepta cualquier abono

  // --- Métodos de apoyo para las clases hijas (no usar desde la interfaz) ---
  _aumentarSaldo(valor) { this.#saldo += valor; }
  _disminuirSaldo(valor) { this.#saldo -= valor; }

  _registrar(tipo, detalle, valor, entra) {
    this.#movimientos.push({
      fecha: new Date().toISOString(),
      tipo: tipo,
      detalle: detalle,
      valor: valor,
      entra: entra,        // true = entró dinero, false = salió
      saldo: this.saldo    // saldo después del movimiento
    });
    console.log(`[Mi Plata] ${this.tipo} ${this.#numero} | ${tipo}: ${valor} | Saldo: ${this.saldo}`);
  }

  // --- Operaciones comunes ---
  consignar(monto, opciones = {}) {
    const { tipoMov = 'Consignación', detalle = '' } = opciones;
    this._aumentarSaldo(monto);
    this._registrar(tipoMov, detalle, monto, true);
    return this.saldo;
  }

  retirar(monto, opciones = {}) {
    const { tipoMov = 'Retiro', detalle = '', conInteres = true } = opciones;

    const limite = this.limiteRetiro();           // cada tipo de cuenta calcula el suyo
    if (monto > limite) {
      throw new Error(this.mensajeLimite(limite));
    }
    const interes = conInteres ? this.aplicarInteres() : 0; // solo Ahorros genera interés

    this._disminuirSaldo(monto);
    this._registrar(tipoMov, detalle, monto, false);
    return { saldo: this.saldo, interes: interes };
  }

  // Convierte la cuenta en un objeto simple para guardarlo en localStorage
  toPlano() {
    return { tipo: this.tipo, numero: this.#numero, saldo: this.#saldo, movimientos: this.#movimientos };
  }

  // Reconstruye el objeto correcto (Ahorros, Corriente o Tarjeta) desde localStorage
  static desdePlano(p) {
    if (p.tipo === 'Corriente') return new CuentaCorriente(p.numero, p.saldo, p.movimientos);
    if (p.tipo === 'Tarjeta') return new TarjetaCredito(p.numero, p.cupo, p.deuda, p.compras, p.movimientos);
    return new CuentaAhorros(p.numero, p.saldo, p.movimientos);
  }
}


// ---------- CuentaAhorros (HERENCIA: hereda de Cuenta) ----------
class CuentaAhorros extends Cuenta {
  get tipo() { return 'Ahorros'; }

  // POLIMORFISMO: Ahorros SÍ genera interés, y se aplica al retirar
  aplicarInteres() {
    const interes = Math.round(this.saldo * TASA_AHORROS);
    if (interes > 0) {
      this._aumentarSaldo(interes);
      this._registrar('Interés', 'Rendimiento 1,5% mensual', interes, true);
    }
    return interes;
  }
}


// ---------- CuentaCorriente (HERENCIA) ----------
class CuentaCorriente extends Cuenta {
  get tipo() { return 'Corriente'; }

  // POLIMORFISMO: la Corriente permite retirar hasta el saldo + 20% de sobregiro
  limiteRetiro() {
    return Math.floor(Math.max(0, this.saldo) * (1 + SOBREGIRO));
  }

  mensajeLimite(limite) {
    return `Superas tu límite de retiro (saldo + 20% de sobregiro): ${formatoPeso(limite)}.`;
  }
}


// ---------- TarjetaCredito (HERENCIA) ----------
class TarjetaCredito extends Cuenta {
  #cupo;
  #deuda;
  #compras;

  constructor(numero, cupo = CUPO_TARJETA, deuda = 0, compras = [], movimientos = []) {
    super(numero, 0, movimientos);
    this.#cupo = cupo;
    this.#deuda = deuda;
    this.#compras = compras;
  }

  get tipo() { return 'Tarjeta'; }
  get etiquetaSaldo() { return 'Cupo disponible'; }
  get cupo() { return this.#cupo; }
  get deuda() { return this.#deuda; }
  get compras() { return [...this.#compras]; }

  // POLIMORFISMO: en la tarjeta el "saldo" es el cupo que aún puedes usar
  get saldo() { return this.#cupo - this.#deuda; }

  // Suma de las cuotas mensuales de las compras (mientras haya deuda)
  get pagoMensualTotal() {
    if (this.#deuda <= 0) return 0;
    return this.#compras.reduce((suma, c) => suma + c.cuota, 0);
  }

  // La tarjeta no permite retiros
  limiteRetiro() { return 0; }
  mensajeLimite() { return 'La tarjeta de crédito no permite retiros. Usa "Comprar con tarjeta".'; }

  // POLIMORFISMO: "recibir dinero" en la tarjeta significa abonar a la deuda
  puedeRecibir(monto) {
    if (this.#deuda <= 0) {
      throw new Error('Tu tarjeta no tiene deuda pendiente.');
    }
    if (monto > this.#deuda) {
      throw new Error(`El abono no puede superar la deuda actual (${formatoPeso(this.#deuda)}).`);
    }
    return true;
  }

  consignar(monto, opciones = {}) {
    this.puedeRecibir(monto);
    this.#deuda -= monto;
    this._registrar('Pago tarjeta', opciones.detalle || 'Abono a la deuda', monto, true);
    return this.saldo;
  }

  // Tasa mensual según el número de cuotas (tabla del enunciado)
  static tasaPorCuotas(cuotas) {
    if (cuotas <= 2) return 0;       // sin interés
    if (cuotas <= 6) return 0.019;   // 1,9% mensual
    return 0.023;                    // 2,3% mensual
  }

  // Cuota mensual = (Capital × tasa) / (1 − (1 + tasa)^(−n))
  static calcularCuota(capital, cuotas) {
    const tasa = TarjetaCredito.tasaPorCuotas(cuotas);
    const cuota = tasa === 0
      ? capital / cuotas
      : (capital * tasa) / (1 - Math.pow(1 + tasa, -cuotas));
    const cuotaRedondeada = Math.round(cuota);
    return { tasa: tasa, cuota: cuotaRedondeada, total: cuotaRedondeada * cuotas };
  }

  comprar(valor, cuotas, descripcion) {
    const calculo = TarjetaCredito.calcularCuota(valor, cuotas);
    if (calculo.total > this.saldo) {
      throw new Error(`Cupo insuficiente. Esta compra suma ${formatoPeso(calculo.total)} y tu cupo disponible es ${formatoPeso(this.saldo)}.`);
    }
    this.#deuda += calculo.total;
    this.#compras.push({ descripcion: descripcion, capital: valor, cuotas: cuotas, cuota: calculo.cuota });
    this._registrar('Compra tarjeta', `${descripcion} · ${cuotas} cuota(s) de ${formatoPeso(calculo.cuota)}`, valor, false);
    return calculo;
  }

  toPlano() {
    return { ...super.toPlano(), cupo: this.#cupo, deuda: this.#deuda, compras: this.#compras };
  }
}


// ---------- Cliente ----------
class Cliente {
  #identificacion;
  #nombre;
  #celular;
  #usuario;
  #clave;
  #rol;
  #productos;   // { Ahorros, Corriente, Tarjeta }

  constructor(identificacion, nombre, celular, usuario, clave, rol, productos) {
    this.#identificacion = identificacion;
    this.#nombre = nombre;
    this.#celular = celular;
    this.#usuario = usuario;
    this.#clave = clave;
    this.#rol = rol;
    this.#productos = productos;
  }

  get identificacion() { return this.#identificacion; }
  get nombre() { return this.#nombre; }
  get celular() { return this.#celular; }
  get usuario() { return this.#usuario; }
  get rol() { return this.#rol; }
  get esAdmin() { return this.#rol === 'admin'; }
  get listaProductos() { return [this.#productos.Ahorros, this.#productos.Corriente, this.#productos.Tarjeta]; }

  producto(tipo) { return this.#productos[tipo]; }

  validarClave(clave) { return this.#clave === clave; }

  cambiarClave(actual, nueva) {
    if (!this.validarClave(actual)) {
      throw new Error('La contraseña actual no es correcta.');
    }
    this.#clave = nueva;
  }

  establecerClave(nueva) { this.#clave = nueva; }

  actualizarDatos(datos) {
    validarDatosPersona(datos); // el cliente se protege a sí mismo de datos inválidos
    this.#identificacion = datos.identificacion;
    this.#nombre = datos.nombre;
    this.#celular = datos.celular;
    this.#usuario = datos.usuario;
  }

  establecerRol(rol) { this.#rol = rol; }

  toPlano() {
    return {
      identificacion: this.#identificacion,
      nombre: this.#nombre,
      celular: this.#celular,
      usuario: this.#usuario,
      clave: this.#clave,
      rol: this.#rol,
      productos: {
        Ahorros: this.#productos.Ahorros.toPlano(),
        Corriente: this.#productos.Corriente.toPlano(),
        Tarjeta: this.#productos.Tarjeta.toPlano()
      }
    };
  }

  static desdePlano(p) {
    return new Cliente(p.identificacion, p.nombre, p.celular, p.usuario, p.clave, p.rol, {
      Ahorros: Cuenta.desdePlano(p.productos.Ahorros),
      Corriente: Cuenta.desdePlano(p.productos.Corriente),
      Tarjeta: Cuenta.desdePlano(p.productos.Tarjeta)
    });
  }
}


/* =====================================================
   PARTE 2: DATOS (localStorage) Y AYUDAS
   ===================================================== */

const LLAVE_CLIENTES = 'miplata_clientes_v2';
const LLAVE_INTENTOS = 'miplata_intentos_v2';
const MAX_INTENTOS = 3;
const HORAS_BLOQUEO = 24;

function leerStorage(llave, valorPorDefecto) {
  try {
    const texto = localStorage.getItem(llave);
    return texto ? JSON.parse(texto) : valorPorDefecto;
  } catch (error) {
    console.error('No se pudo leer localStorage:', error);
    return valorPorDefecto;
  }
}

function guardarStorage(llave, valor) {
  try {
    localStorage.setItem(llave, JSON.stringify(valor));
  } catch (error) {
    console.error('No se pudo guardar en localStorage:', error);
    throw new Error('No se pudieron guardar los datos en el navegador.');
  }
}

function cargarClientes() {
  try {
    return leerStorage(LLAVE_CLIENTES, []).map(p => Cliente.desdePlano(p));
  } catch (error) {
    console.error('Datos guardados dañados, se reinician:', error);
    return [];
  }
}

function guardarClientes() {
  guardarStorage(LLAVE_CLIENTES, clientes.map(c => c.toPlano()));
}

// Intentos de login: { usuario: { n: 2, bloqueadoHasta: 0 } }
function obtenerIntentos(usuario) {
  const todos = leerStorage(LLAVE_INTENTOS, {});
  return todos[usuario] || { n: 0, bloqueadoHasta: 0 };
}

function guardarIntentos(usuario, registro) {
  const todos = leerStorage(LLAVE_INTENTOS, {});
  if (registro.n === 0 && registro.bloqueadoHasta === 0) {
    delete todos[usuario];
  } else {
    todos[usuario] = registro;
  }
  guardarStorage(LLAVE_INTENTOS, todos);
}

function estaBloqueado(usuario) {
  return obtenerIntentos(usuario).bloqueadoHasta > Date.now();
}

function formatoPeso(valor) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0
  }).format(valor);
}

function formatoFecha(iso) {
  return new Date(iso).toLocaleString('es-CO');
}

// Evita que lo escrito por el usuario se interprete como HTML
function escapar(texto) {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML.replace(/"/g, '&quot;');
}

// ---------- Validaciones ----------

function validarMonto(valor) {
  if (valor === '' || valor === null || isNaN(Number(valor))) {
    throw new Error('Ingresa un valor numérico.');
  }
  const monto = Number(valor);
  if (!Number.isInteger(monto) || monto <= 0) {
    throw new Error('El monto debe ser un número entero mayor a cero.');
  }
  return monto;
}

function validarDatosPersona(d) {
  if (!/^[A-Za-z0-9]{5,15}$/.test(d.identificacion)) {
    throw new Error('La identificación debe tener entre 5 y 15 letras o números.');
  }
  if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s.'-]{3,60}$/.test(d.nombre)) {
    throw new Error('Escribe tu nombre completo (solo letras, mínimo 3).');
  }
  if (!/^\d{10}$/.test(d.celular)) {
    throw new Error('El celular debe tener 10 dígitos.');
  }
  if (!/^[a-zA-Z0-9_]{3,15}$/.test(d.usuario)) {
    throw new Error('El usuario debe tener entre 3 y 15 caracteres (letras, números o guion bajo).');
  }
}

function validarClaveNueva(clave, clave2) {
  if (clave.length < 4) {
    throw new Error('La contraseña debe tener mínimo 4 caracteres.');
  }
  if (clave !== clave2) {
    throw new Error('Las contraseñas no coinciden.');
  }
}


/* =====================================================
   PARTE 3: LÓGICA DE NEGOCIO
   (lanzan errores con "throw"; la interfaz los atrapa con "try/catch")
   ===================================================== */

let clientes = cargarClientes();

// Genera un número de cuenta de 10 dígitos que no exista (usa ciclos)
function generarNumeroCuenta(usados) {
  let numero;
  do {
    numero = '';
    for (let i = 0; i < 10; i++) {
      numero += Math.floor(Math.random() * 10);
    }
  } while (usados.includes(numero) || clientes.some(c => c.listaProductos.some(p => p.numero === numero)));
  usados.push(numero);
  return numero;
}

function nuevosProductos() {
  const usados = [];
  return {
    Ahorros: new CuentaAhorros(generarNumeroCuenta(usados)),
    Corriente: new CuentaCorriente(generarNumeroCuenta(usados)),
    Tarjeta: new TarjetaCredito(generarNumeroCuenta(usados))
  };
}

function buscarCliente(usuario) {
  return clientes.find(c => c.usuario === usuario);
}

// Revisa que usuario e identificación no estén repetidos (ignorando al cliente que se edita)
function verificarUnicos(datos, cliente) {
  const repetidoUsuario = clientes.some(c => c !== cliente && c.usuario.toLowerCase() === datos.usuario.toLowerCase());
  if (repetidoUsuario) throw new Error('Ese usuario ya existe. Elige otro.');

  const repetidoId = clientes.some(c => c !== cliente && c.identificacion === datos.identificacion);
  if (repetidoId) throw new Error('Ya hay un cliente registrado con esa identificación.');
}

// CREATE
function crearCliente(datos, rol = 'cliente') {
  validarDatosPersona(datos);
  validarClaveNueva(datos.clave, datos.clave2);
  verificarUnicos(datos, null);

  const cliente = new Cliente(
    datos.identificacion, datos.nombre, datos.celular, datos.usuario, datos.clave, rol, nuevosProductos()
  );
  clientes.push(cliente);
  guardarClientes();
  return cliente;
}

// UPDATE (sirve para el Perfil y para la Administración)
function editarCliente(cliente, datos, extra = {}) {
  validarDatosPersona(datos);
  verificarUnicos(datos, cliente);
  if (extra.clave) {
    validarClaveNueva(extra.clave, extra.clave2 || '');
  }

  cliente.actualizarDatos(datos);
  if (extra.clave) cliente.establecerClave(extra.clave);
  if (extra.rol) cliente.establecerRol(extra.rol);
  guardarClientes();
}

// DELETE
function eliminarCliente(usuario) {
  clientes = clientes.filter(c => c.usuario !== usuario);
  guardarIntentos(usuario, { n: 0, bloqueadoHasta: 0 });
  guardarClientes();
}

function iniciarSesion(usuario, clave) {
  if (usuario === '' || clave === '') {
    throw new Error('Escribe tu usuario y tu contraseña.');
  }

  const registro = obtenerIntentos(usuario);

  if (registro.bloqueadoHasta > Date.now()) {
    throw new Error('Cuenta bloqueada por 24 horas, comunícate con tu banco.');
  }
  if (registro.bloqueadoHasta !== 0) { // el bloqueo ya venció
    registro.n = 0;
    registro.bloqueadoHasta = 0;
  }

  const cliente = buscarCliente(usuario);

  if (cliente && cliente.validarClave(clave)) {
    guardarIntentos(usuario, { n: 0, bloqueadoHasta: 0 });
    return cliente;
  }

  registro.n++;
  if (registro.n >= MAX_INTENTOS) {
    registro.bloqueadoHasta = Date.now() + HORAS_BLOQUEO * 60 * 60 * 1000;
    guardarIntentos(usuario, registro);
    throw new Error('Tercer intento fallido: tu cuenta quedó bloqueada por 24 horas. Comunícate con tu banco.');
  }
  guardarIntentos(usuario, registro);
  throw new Error(`Usuario o contraseña incorrectos. Intento ${registro.n} de ${MAX_INTENTOS}.`);
}

function transferir(clienteOrigen, tipoOrigen, clienteDestino, tipoDestino, monto) {
  if (!clienteDestino) {
    throw new Error('El usuario destino no existe.');
  }
  // Restricción: no se transfiere al mismo producto del mismo usuario
  if (clienteOrigen === clienteDestino && tipoOrigen === tipoDestino) {
    throw new Error('No puedes transferir al mismo producto.');
  }

  const origen = clienteOrigen.producto(tipoOrigen);
  const destino = clienteDestino.producto(tipoDestino);

  destino.puedeRecibir(monto); // si el destino rechaza, no se toca el origen (polimorfismo)

  const resultado = origen.retirar(monto, {
    tipoMov: 'Transferencia enviada',
    detalle: `a ${clienteDestino.usuario} · ${NOMBRES[tipoDestino]}`,
    conInteres: false
  });
  destino.consignar(monto, {
    tipoMov: 'Transferencia recibida',
    detalle: `de ${clienteOrigen.usuario} · ${NOMBRES[tipoOrigen]}`
  });

  guardarClientes();
  return resultado;
}

// ---------- Datos de prueba (solo la primera vez) ----------
if (clientes.length === 0) {
  const demo = new Cliente('12345678', 'Cliente Demo', '3001234567', 'demo', '1234', 'cliente', nuevosProductos());
  demo.producto('Ahorros').consignar(2000000, { tipoMov: 'Saldo inicial' });
  demo.producto('Corriente').consignar(1000000, { tipoMov: 'Saldo inicial' });

  const admin = new Cliente('1000000', 'Administrador Mi Plata', '3000000000', 'admin', 'admin123', 'admin', nuevosProductos());
  admin.producto('Ahorros').consignar(500000, { tipoMov: 'Saldo inicial' });

  clientes.push(demo, admin);
  guardarClientes();
}


/* =====================================================
   PARTE 4: INTERFAZ (DOM)
   ===================================================== */

const $ = (id) => document.getElementById(id);

let clienteActual = null;
let productoSel = 'Ahorros';   // producto elegido en el panel
let opActual = 'saldo';
let adminForm = null;          // null | { modo: 'nuevo' } | { modo: 'editar', usuario }

// ---------- Mensajes ----------

// Mensaje dentro de un formulario. tipo: 'ok' | 'error' | 'aviso'
function escribirMensaje(elemento, texto, tipo) {
  elemento.textContent = texto;
  elemento.className = 'msg ' + (tipo || '');
}

// Aviso flotante (éxito, error o advertencia)
function notificar(texto, tipo = 'ok') {
  const contenedor = $('avisos');
  const item = document.createElement('div');
  item.className = 'aviso-item ' + tipo;
  item.textContent = texto;
  contenedor.appendChild(item);
  setTimeout(() => item.remove(), 3500);
}


// ---------- Navegación del sitio público ----------

function mostrarVista(nombre) {
  ['inicio', 'login', 'registro'].forEach(v => {
    $('vista-' + v).classList.toggle('oculto', v !== nombre);
  });
  window.scrollTo(0, 0);
  if (nombre === 'login') actualizarContador();
}

document.addEventListener('click', (e) => {
  const destino = e.target.closest('[data-ir]');
  if (destino) mostrarVista(destino.dataset.ir);
});


// ---------- Registro ----------

$('form-registro').addEventListener('submit', (e) => {
  e.preventDefault();
  const mensaje = $('msg-registro');

  try {
    crearCliente({
      identificacion: $('reg-id').value.trim(),
      nombre: $('reg-nombre').value.trim(),
      celular: $('reg-celular').value.trim(),
      usuario: $('reg-usuario').value.trim(),
      clave: $('reg-clave').value,
      clave2: $('reg-clave2').value
    });

    $('form-registro').reset();
    escribirMensaje(mensaje, '', '');
    mostrarVista('login');
    escribirMensaje($('msg-login'), 'Registro exitoso. Ya puedes iniciar sesión.', 'ok');
  } catch (error) {
    escribirMensaje(mensaje, error.message, 'error');
  }
});


// ---------- Login con contador de intentos ----------

function actualizarContador() {
  const usuario = $('login-usuario').value.trim();
  const registro = usuario ? obtenerIntentos(usuario) : { n: 0, bloqueadoHasta: 0 };
  const bloqueada = registro.bloqueadoHasta > Date.now();
  const intentos = bloqueada ? MAX_INTENTOS : (registro.bloqueadoHasta !== 0 ? 0 : registro.n);

  $('contador-intentos').textContent = `Intentos fallidos: ${intentos} de ${MAX_INTENTOS}`;
  $('contador-intentos').className = 'contador' + (bloqueada ? ' bloqueo' : (intentos > 0 ? ' alerta' : ''));
  $('btn-ingresar').disabled = bloqueada;

  if (bloqueada) {
    escribirMensaje($('msg-login'), 'Cuenta bloqueada por 24 horas, comunícate con tu banco.', 'error');
  }
}

$('login-usuario').addEventListener('input', () => {
  escribirMensaje($('msg-login'), '', '');
  actualizarContador();
});

$('form-login').addEventListener('submit', (e) => {
  e.preventDefault();
  const mensaje = $('msg-login');

  try {
    const cliente = iniciarSesion($('login-usuario').value.trim(), $('login-clave').value);
    $('form-login').reset();
    escribirMensaje(mensaje, '', '');
    entrarAlPanel(cliente);
  } catch (error) {
    $('login-clave').value = '';
    actualizarContador();
    escribirMensaje(mensaje, error.message, 'error'); // el error real se muestra al final
  }
});


// ---------- Entrar y salir del panel ----------

function entrarAlPanel(cliente) {
  clienteActual = cliente;
  productoSel = 'Ahorros';
  adminForm = null;

  $('sitio').classList.add('oculto');
  $('app').classList.remove('oculto');
  $('btn-admin').classList.toggle('oculto', !cliente.esAdmin);
  actualizarSaludo();
  dibujarProductos();
  mostrarOperacion('saldo');
  window.scrollTo(0, 0);
}

function actualizarSaludo() {
  $('saludo').innerHTML = `Hola, <strong>${escapar(clienteActual.nombre)}</strong> · @${escapar(clienteActual.usuario)}`;
}

function cerrarSesion() {
  clienteActual = null;
  $('area').innerHTML = '';
  $('app').classList.add('oculto');
  $('sitio').classList.remove('oculto');
  mostrarVista('inicio');
  notificar('Sesión cerrada. ¡Hasta pronto!', 'ok');
}


// ---------- Menú de operaciones ----------

document.querySelectorAll('.op[data-op]').forEach(boton => {
  boton.addEventListener('click', () => mostrarOperacion(boton.dataset.op));
});

function productoActual() {
  return clienteActual.producto(productoSel);
}

// Tarjetas con los 3 productos del cliente (sirven para elegir con cuál operar)
function dibujarProductos() {
  let html = '';
  for (const p of clienteActual.listaProductos) {
    const negativo = p.saldo < 0;
    html += `
      <button class="prod ${p.tipo === productoSel ? 'activo' : ''}" data-tipo="${p.tipo}" aria-pressed="${p.tipo === productoSel}">
        <div class="prod-tipo">${NOMBRES[p.tipo]}</div>
        <div class="prod-num">N.º ${p.numero}</div>
        <div class="prod-etq">${p.etiquetaSaldo}</div>
        <div class="prod-valor ${negativo ? 'neg' : ''}">${formatoPeso(p.saldo)}</div>
      </button>`;
  }
  $('productos').innerHTML = html;
}

$('productos').addEventListener('click', (e) => {
  const tarjeta = e.target.closest('.prod');
  if (!tarjeta) return;
  productoSel = tarjeta.dataset.tipo;
  dibujarProductos();
  mostrarOperacion(opActual === 'comprar' ? 'saldo' : opActual);
});

function mostrarOperacion(op) {
  if (op === 'salir') { cerrarSesion(); return; }
  if (op === 'admin' && !clienteActual.esAdmin) return;

  opActual = op;
  if (op === 'admin') adminForm = null;
  document.querySelectorAll('.op[data-op]').forEach(b => b.classList.toggle('activa', b.dataset.op === op));

  const sinProductos = (op === 'perfil' || op === 'admin');
  $('productos').classList.toggle('oculto', sinProductos);

  if (op === 'comprar' && productoSel !== 'Tarjeta') {
    productoSel = 'Tarjeta';
    dibujarProductos();
  }

  $('area').innerHTML = plantilla(op);

  if (op === 'transferir') actualizarDestinos();
  if (op === 'comprar') actualizarPrevia();
}


// ---------- Plantillas de cada operación ----------

function botonesRapidos() {
  let html = '<div class="rapidos">';
  for (const m of [20000, 50000, 100000, 200000]) {
    html += `<button type="button" class="rapido" data-monto="${m}">${formatoPeso(m)}</button>`;
  }
  return html + '</div>';
}

function plantilla(op) {
  const p = productoActual();
  const esTarjeta = p.tipo === 'Tarjeta';

  switch (op) {

    case 'saldo': {
      let extra = '';
      if (p.tipo === 'Ahorros') {
        extra = `<p class="suave">Al retirar se abona un rendimiento del 1,5% mensual sobre tu saldo.</p>`;
      } else if (p.tipo === 'Corriente') {
        extra = `<dl class="datos"><dt>Límite de retiro (con sobregiro 20%)</dt><dd>${formatoPeso(p.limiteRetiro())}</dd></dl>`;
      } else {
        extra = `<dl class="datos">
          <dt>Cupo total</dt><dd>${formatoPeso(p.cupo)}</dd>
          <dt>Deuda actual</dt><dd>${formatoPeso(p.deuda)}</dd>
          <dt>Pago mensual total</dt><dd>${formatoPeso(p.pagoMensualTotal)}</dd>
        </dl>`;
      }
      return `
        <h2>Consultar saldo</h2>
        <p class="suave">${NOMBRES[p.tipo]} · N.º ${p.numero}</p>
        <p class="suave" style="margin-top:14px">${p.etiquetaSaldo}</p>
        <p class="monto-grande ${p.saldo < 0 ? 'neg' : ''}">${formatoPeso(p.saldo)}</p>
        ${p.saldo < 0 ? '<p class="msg aviso">Estás usando sobregiro. Consigna para regularizar tu cuenta.</p>' : ''}
        ${extra}`;
    }

    case 'consignar':
      return `
        <h2>${esTarjeta ? 'Pagar tarjeta' : 'Consignar dinero'}</h2>
        <p class="suave">${NOMBRES[p.tipo]} · N.º ${p.numero}${esTarjeta ? ` · Deuda: ${formatoPeso(p.deuda)}` : ''}</p>
        <form id="f-consignar" novalidate>
          <label for="monto">${esTarjeta ? '¿Cuánto vas a abonar?' : '¿Cuánto deseas consignar?'}</label>
          <input type="number" id="monto" min="1" step="1" placeholder="Ej: 100000">
          ${botonesRapidos()}
          <p class="msg" id="msg-op" role="alert"></p>
          <button type="submit" class="btn btn-azul">${esTarjeta ? 'Pagar' : 'Consignar'}</button>
        </form>`;

    case 'retirar':
      if (esTarjeta) {
        return `
          <h2>Retirar dinero</h2>
          <div class="alerta-caja">La tarjeta de crédito no permite retiros. Para usarla, haz una compra a cuotas.</div>
          <button class="btn btn-azul" data-salto="comprar" style="margin-top:16px">Comprar con tarjeta</button>`;
      }
      return `
        <h2>Retirar dinero</h2>
        <p class="suave">${NOMBRES[p.tipo]} · N.º ${p.numero} · Máximo a retirar: ${formatoPeso(p.limiteRetiro())}</p>
        <form id="f-retirar" novalidate>
          <label for="monto">¿Cuánto deseas retirar?</label>
          <input type="number" id="monto" min="1" step="1" placeholder="Ej: 50000">
          ${botonesRapidos()}
          <p class="msg" id="msg-op" role="alert"></p>
          <button type="submit" class="btn btn-azul">Retirar</button>
        </form>`;

    case 'movimientos':
      return tablaMovimientos(p);

    case 'transferir':
      return `
        <h2>Transferir</h2>
        <p class="suave">Entre tus productos o hacia otros usuarios de Mi Plata.</p>
        <form id="f-transferir" novalidate>
          <label for="t-origen">Desde</label>
          <select id="t-origen">
            ${['Ahorros', 'Corriente'].map(t => {
              const prod = clienteActual.producto(t);
              return `<option value="${t}" ${t === productoSel ? 'selected' : ''}>${NOMBRES[t]} · ${formatoPeso(prod.saldo)}</option>`;
            }).join('')}
          </select>

          <label for="t-destino">Hacia</label>
          <select id="t-destino"></select>

          <div id="bloque-otro" class="oculto">
            <label for="t-usuario">Usuario destino</label>
            <input type="text" id="t-usuario" autocomplete="off">
            <label for="t-tipo">Producto destino</label>
            <select id="t-tipo">
              <option value="Ahorros">Cuenta de Ahorros</option>
              <option value="Corriente">Cuenta Corriente</option>
              <option value="Tarjeta">Tarjeta de Crédito (pagar deuda)</option>
            </select>
          </div>

          <label for="monto">Valor a transferir</label>
          <input type="number" id="monto" min="1" step="1">
          <p class="msg" id="msg-op" role="alert"></p>
          <button type="submit" class="btn btn-azul">Transferir</button>
        </form>`;

    case 'comprar': {
      const t = clienteActual.producto('Tarjeta');
      return `
        <h2>Comprar con tarjeta</h2>
        <p class="suave">Cupo disponible: ${formatoPeso(t.saldo)} · Deuda actual: ${formatoPeso(t.deuda)}</p>
        <form id="f-comprar" novalidate>
          <label for="c-desc">¿Qué vas a comprar?</label>
          <input type="text" id="c-desc" maxlength="40" placeholder="Ej: Celular">

          <div class="dos-col">
            <div>
              <label for="c-valor">Valor de la compra</label>
              <input type="number" id="c-valor" min="1" step="1">
            </div>
            <div>
              <label for="c-cuotas">Número de cuotas (1 a ${MAX_CUOTAS})</label>
              <input type="number" id="c-cuotas" min="1" max="${MAX_CUOTAS}" step="1" value="1">
            </div>
          </div>

          <div id="previa" class="previa"></div>
          <p class="msg" id="msg-op" role="alert"></p>
          <button type="submit" class="btn btn-azul">Confirmar compra</button>
        </form>`;
    }

    case 'perfil':
      return `
        <h2>Perfil y seguridad</h2>
        <div class="bloques">
          <form id="f-perfil" novalidate>
            <h3>Mis datos</h3>
            <label for="p-id">Identificación</label>
            <input type="text" id="p-id" value="${escapar(clienteActual.identificacion)}">
            <label for="p-nombre">Nombre completo</label>
            <input type="text" id="p-nombre" value="${escapar(clienteActual.nombre)}">
            <label for="p-celular">Celular</label>
            <input type="tel" id="p-celular" value="${escapar(clienteActual.celular)}">
            <label for="p-usuario">Usuario</label>
            <input type="text" id="p-usuario" value="${escapar(clienteActual.usuario)}">
            <p class="msg" id="msg-perfil" role="alert"></p>
            <button type="submit" class="btn btn-azul">Guardar cambios</button>
          </form>

          <form id="f-clave" novalidate>
            <h3>Cambiar contraseña</h3>
            <label for="k-usuario">Usuario</label>
            <input type="text" id="k-usuario" autocomplete="off">
            <label for="k-actual">Contraseña actual</label>
            <input type="password" id="k-actual" autocomplete="current-password">
            <label for="k-nueva">Nueva contraseña</label>
            <input type="password" id="k-nueva" autocomplete="new-password">
            <label for="k-nueva2">Confirmar nueva contraseña</label>
            <input type="password" id="k-nueva2" autocomplete="new-password">
            <p class="msg" id="msg-clave" role="alert"></p>
            <button type="submit" class="btn btn-azul">Guardar contraseña</button>
          </form>
        </div>`;

    case 'admin':
      return plantillaAdmin();
  }
  return '';
}

// Historial: el más reciente primero (fecha descendente)
function tablaMovimientos(p) {
  const movs = p.movimientos;
  const encabezado = `<h2>Ver movimientos</h2><p class="suave">${NOMBRES[p.tipo]} · N.º ${p.numero}</p>`;

  if (movs.length === 0) {
    return encabezado + '<p style="margin-top:16px">Aún no tienes movimientos en este producto.</p>';
  }

  let filas = '';
  for (let i = movs.length - 1; i >= 0; i--) {
    const m = movs[i];
    filas += `
      <tr>
        <td>${formatoFecha(m.fecha)}</td>
        <td>${escapar(m.tipo)}</td>
        <td>${escapar(m.detalle || '—')}</td>
        <td class="num ${m.entra ? 'entra' : 'sale'}">${m.entra ? '+' : '−'}${formatoPeso(m.valor)}</td>
        <td class="num">${formatoPeso(m.saldo)}</td>
      </tr>`;
  }

  return `
    ${encabezado}
    <div class="tabla-caja">
      <table class="tabla">
        <thead><tr><th>Fecha y hora</th><th>Tipo</th><th>Detalle</th><th class="num">Valor</th><th class="num">${p.tipo === 'Tarjeta' ? 'Cupo' : 'Saldo'}</th></tr></thead>
        <tbody>${filas}</tbody>
      </table>
    </div>`;
}

// ---------- Administración de usuarios (CRUD) ----------

function plantillaAdmin() {
  let filas = '';
  for (const c of clientes) {
    const bloq = estaBloqueado(c.usuario);
    const esYo = c === clienteActual;
    filas += `
      <tr>
        <td>${escapar(c.identificacion)}</td>
        <td>${escapar(c.nombre)}</td>
        <td>${escapar(c.usuario)}</td>
        <td>${escapar(c.celular)}</td>
        <td>${c.esAdmin ? 'Administrador' : 'Cliente'}</td>
        <td><span class="etiqueta-estado ${bloq ? 'bloq' : ''}">${bloq ? 'Bloqueado' : 'Activo'}</span></td>
        <td class="acciones">
          <button class="btn btn-borde btn-chico" data-accion="editar" data-usuario="${escapar(c.usuario)}">Editar</button>
          ${bloq ? `<button class="btn btn-borde btn-chico" data-accion="desbloquear" data-usuario="${escapar(c.usuario)}">Desbloquear</button>` : ''}
          ${esYo ? '' : `<button class="btn btn-peligro btn-chico" data-accion="eliminar" data-usuario="${escapar(c.usuario)}">Eliminar</button>`}
        </td>
      </tr>`;
  }

  return `
    <div class="barra-admin">
      <div><h2>Administración de usuarios</h2><p class="suave">${clientes.length} usuario(s) registrados</p></div>
      <button class="btn btn-azul" data-accion="nuevo">Agregar usuario</button>
    </div>
    ${formularioAdmin()}
    <div class="tabla-caja">
      <table class="tabla">
        <thead><tr><th>Identificación</th><th>Nombre</th><th>Usuario</th><th>Celular</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>${filas}</tbody>
      </table>
    </div>`;
}

function formularioAdmin() {
  if (!adminForm) return '';

  const editando = adminForm.modo === 'editar';
  const c = editando ? buscarCliente(adminForm.usuario) : null;
  if (editando && !c) return '';

  const esYo = c === clienteActual;
  const v = (valor) => c ? escapar(valor) : '';

  return `
    <form id="f-admin" class="form-ancho" novalidate>
      <h3>${editando ? 'Editar usuario' : 'Nuevo usuario'}</h3>
      <div class="dos-col">
        <div><label for="ad-id">Identificación</label><input type="text" id="ad-id" value="${v(c && c.identificacion)}"></div>
        <div><label for="ad-nombre">Nombre completo</label><input type="text" id="ad-nombre" value="${v(c && c.nombre)}"></div>
      </div>
      <div class="dos-col">
        <div><label for="ad-celular">Celular</label><input type="tel" id="ad-celular" value="${v(c && c.celular)}"></div>
        <div><label for="ad-usuario">Usuario</label><input type="text" id="ad-usuario" value="${v(c && c.usuario)}"></div>
      </div>
      <div class="dos-col">
        <div><label for="ad-clave">Contraseña${editando ? ' (vacía = no cambiar)' : ''}</label><input type="password" id="ad-clave" autocomplete="new-password"></div>
        <div><label for="ad-clave2">Confirmar contraseña</label><input type="password" id="ad-clave2" autocomplete="new-password"></div>
      </div>
      <label for="ad-rol">Rol</label>
      <select id="ad-rol" ${esYo ? 'disabled' : ''}>
        <option value="cliente" ${c && !c.esAdmin ? 'selected' : ''}>Cliente</option>
        <option value="admin" ${c && c.esAdmin ? 'selected' : ''}>Administrador</option>
      </select>
      <p class="msg" id="msg-admin" role="alert"></p>
      <button type="submit" class="btn btn-azul">${editando ? 'Guardar cambios' : 'Crear usuario'}</button>
      <button type="button" class="btn btn-borde" data-accion="cancelar">Cancelar</button>
    </form>`;
}

function redibujarAdmin() {
  $('area').innerHTML = plantillaAdmin();
}


// ---------- Transferencias: opciones dinámicas ----------

function actualizarDestinos() {
  const origen = $('t-origen').value;
  let html = '';
  for (const p of clienteActual.listaProductos) {
    if (p.tipo === origen) continue; // no se transfiere al mismo producto
    const nota = p.tipo === 'Tarjeta' ? ' (pagar deuda)' : '';
    html += `<option value="propio:${p.tipo}">Mi ${NOMBRES[p.tipo]}${nota} · N.º ${p.numero}</option>`;
  }
  html += '<option value="otro">A otro usuario…</option>';
  $('t-destino').innerHTML = html;
  $('bloque-otro').classList.add('oculto');
}


// ---------- Compra con tarjeta: pago mensual en vivo ----------

function actualizarPrevia() {
  const caja = $('previa');
  if (!caja) return;
  const valor = Number($('c-valor').value);
  const cuotas = Number($('c-cuotas').value);

  if (!Number.isInteger(valor) || valor <= 0 || !Number.isInteger(cuotas) || cuotas < 1 || cuotas > MAX_CUOTAS) {
    caja.innerHTML = 'Ingresa el valor y las cuotas para ver tu pago mensual.';
    return;
  }
  const c = TarjetaCredito.calcularCuota(valor, cuotas);
  caja.innerHTML = `
    Tasa: <strong>${(c.tasa * 100).toFixed(1).replace('.', ',')}% mensual</strong>
    ${c.tasa === 0 ? '(sin interés)' : ''}<br>
    Pago mensual: <strong>${formatoPeso(c.cuota)}</strong> × ${cuotas} cuota(s)<br>
    Total a pagar: ${formatoPeso(c.total)}`;
}


// ---------- Eventos dentro del área de trabajo (delegación) ----------

$('area').addEventListener('click', (e) => {
  // Montos rápidos
  const rapido = e.target.closest('.rapido');
  if (rapido) {
    $('monto').value = rapido.dataset.monto;
    return;
  }

  // Salto a otra operación
  const salto = e.target.closest('[data-salto]');
  if (salto) {
    mostrarOperacion(salto.dataset.salto);
    return;
  }

  // Acciones del CRUD
  const boton = e.target.closest('[data-accion]');
  if (!boton) return;
  const usuario = boton.dataset.usuario;

  switch (boton.dataset.accion) {
    case 'nuevo':
      adminForm = { modo: 'nuevo' };
      redibujarAdmin();
      break;
    case 'editar':
      adminForm = { modo: 'editar', usuario: usuario };
      redibujarAdmin();
      break;
    case 'cancelar':
      adminForm = null;
      redibujarAdmin();
      break;
    case 'desbloquear':
      guardarIntentos(usuario, { n: 0, bloqueadoHasta: 0 });
      redibujarAdmin();
      notificar(`Usuario ${usuario} desbloqueado.`, 'ok');
      break;
    case 'eliminar':
      // Eliminar con confirmación
      if (confirm(`¿Seguro que deseas eliminar al usuario "${usuario}"? Esta acción no se puede deshacer.`)) {
        try {
          eliminarCliente(usuario);
          adminForm = null;
          redibujarAdmin();
          notificar(`Usuario ${usuario} eliminado.`, 'aviso');
        } catch (error) {
          notificar(error.message, 'error');
        }
      }
      break;
  }
});

$('area').addEventListener('input', (e) => {
  if (e.target.id === 'c-valor' || e.target.id === 'c-cuotas') actualizarPrevia();
});

$('area').addEventListener('change', (e) => {
  if (e.target.id === 't-origen') actualizarDestinos();
  if (e.target.id === 't-destino') {
    $('bloque-otro').classList.toggle('oculto', e.target.value !== 'otro');
  }
});

// Todos los formularios del panel
$('area').addEventListener('submit', (e) => {
  e.preventDefault();
  const formulario = e.target.id;
  const mensaje = e.target.querySelector('.msg');

  try {
    switch (formulario) {

      case 'f-consignar': {
        const p = productoActual();
        const monto = validarMonto($('monto').value);
        const nuevo = p.consignar(monto);
        guardarClientes();
        dibujarProductos();
        const texto = p.tipo === 'Tarjeta'
          ? `Pago exitoso. Cupo disponible: ${formatoPeso(nuevo)}.`
          : `Consignación exitosa. Nuevo saldo: ${formatoPeso(nuevo)}.`;
        escribirMensaje(mensaje, texto, 'ok');
        $('monto').value = '';
        break;
      }

      case 'f-retirar': {
        const p = productoActual();
        const monto = validarMonto($('monto').value);
        const r = p.retirar(monto);
        guardarClientes();
        dibujarProductos();

        let texto = `Retiro exitoso de ${formatoPeso(monto)}.`;
        if (r.interes > 0) texto += ` Se abonó un interés de ${formatoPeso(r.interes)} (1,5% mensual).`;
        texto += ` Nuevo saldo: ${formatoPeso(r.saldo)}.`;
        if (r.saldo < 0) {
          texto += ' Estás usando sobregiro.';
          escribirMensaje(mensaje, texto, 'aviso');
        } else {
          escribirMensaje(mensaje, texto, 'ok');
        }
        $('monto').value = '';
        break;
      }

      case 'f-transferir': {
        const monto = validarMonto($('monto').value);
        const tipoOrigen = $('t-origen').value;
        const destino = $('t-destino').value;
        let clienteDestino, tipoDestino;

        if (destino === 'otro') {
          const usuario = $('t-usuario').value.trim();
          if (usuario === '') throw new Error('Escribe el usuario destino.');
          clienteDestino = buscarCliente(usuario);
          tipoDestino = $('t-tipo').value;
        } else {
          clienteDestino = clienteActual;
          tipoDestino = destino.split(':')[1];
        }

        const r = transferir(clienteActual, tipoOrigen, clienteDestino, tipoDestino, monto);
        productoSel = tipoOrigen;
        dibujarProductos();
        notificar(`Transferencia de ${formatoPeso(monto)} realizada.`, 'ok');
        mostrarOperacion('transferir');
        const msg = $('msg-op');
        if (r.saldo < 0) {
          escribirMensaje(msg, `Transferencia exitosa. Saldo: ${formatoPeso(r.saldo)}. Estás usando sobregiro.`, 'aviso');
        } else {
          escribirMensaje(msg, `Transferencia exitosa. Nuevo saldo de origen: ${formatoPeso(r.saldo)}.`, 'ok');
        }
        break;
      }

      case 'f-comprar': {
        const t = clienteActual.producto('Tarjeta');
        const descripcion = $('c-desc').value.trim();
        if (descripcion === '') throw new Error('Describe qué vas a comprar.');
        const valor = validarMonto($('c-valor').value);
        const cuotas = Number($('c-cuotas').value);
        if (!Number.isInteger(cuotas) || cuotas < 1 || cuotas > MAX_CUOTAS) {
          throw new Error(`Las cuotas deben ser un número entre 1 y ${MAX_CUOTAS}.`);
        }

        const c = t.comprar(valor, cuotas, descripcion);
        guardarClientes();
        dibujarProductos();

        let texto = `Compra aprobada. Pago mensual: ${formatoPeso(c.cuota)} durante ${cuotas} cuota(s).`;
        const usoCupo = t.deuda / t.cupo;
        if (usoCupo >= 0.8) {
          texto += ` Ojo: ya usaste el ${Math.round(usoCupo * 100)}% de tu cupo.`;
        }
        $('area').innerHTML = plantilla('comprar');
        actualizarPrevia();
        escribirMensaje($('msg-op'), texto, usoCupo >= 0.8 ? 'aviso' : 'ok');
        break;
      }

      case 'f-perfil': {
        editarCliente(clienteActual, {
          identificacion: $('p-id').value.trim(),
          nombre: $('p-nombre').value.trim(),
          celular: $('p-celular').value.trim(),
          usuario: $('p-usuario').value.trim()
        });
        actualizarSaludo();
        escribirMensaje(mensaje, 'Datos actualizados correctamente.', 'ok');
        notificar('Perfil actualizado.', 'ok');
        break;
      }

      case 'f-clave': {
        // Proceso: usuario → clave actual → clave nueva → confirmación
        if ($('k-usuario').value.trim() !== clienteActual.usuario) {
          throw new Error('El usuario no coincide con el de tu sesión.');
        }
        validarClaveNueva($('k-nueva').value, $('k-nueva2').value);
        clienteActual.cambiarClave($('k-actual').value, $('k-nueva').value);
        guardarClientes();
        $('f-clave').reset();
        escribirMensaje(mensaje, 'Contraseña cambiada correctamente.', 'ok');
        notificar('Contraseña actualizada.', 'ok');
        break;
      }

      case 'f-admin': {
        const datos = {
          identificacion: $('ad-id').value.trim(),
          nombre: $('ad-nombre').value.trim(),
          celular: $('ad-celular').value.trim(),
          usuario: $('ad-usuario').value.trim(),
          clave: $('ad-clave').value,
          clave2: $('ad-clave2').value
        };
        const rol = $('ad-rol').value;

        if (adminForm.modo === 'nuevo') {
          crearCliente(datos, rol);
          notificar(`Usuario ${datos.usuario} creado.`, 'ok');
        } else {
          const c = buscarCliente(adminForm.usuario);
          const esYo = c === clienteActual;
          editarCliente(c, datos, { clave: datos.clave, clave2: datos.clave2, rol: esYo ? null : rol });
          if (esYo) actualizarSaludo();
          notificar(`Usuario ${datos.usuario} actualizado.`, 'ok');
        }
        adminForm = null;
        redibujarAdmin();
        break;
      }
    }
  } catch (error) {
    if (mensaje) {
      escribirMensaje(mensaje, error.message, 'error');
    } else {
      notificar(error.message, 'error');
    }
  }
});

// Al cargar la página
actualizarContador();
