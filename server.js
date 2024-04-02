const express = require('express');
const app = express();
const session = require('express-session');
const path = require('path');
const productosController = require('./controllers/productos');
const fs = require('fs'); // Importa el módulo 'fs' para manejar archivos
const bodyParser = require('body-parser');/*Biblioteca que permite analizar el cuerpo de las solicitudes HTTP entrantes en Express.js
"body-parser" puede analizar varios formatos de datos, incluyendo JSON, datos codificados en la URL y datos de formulario.*/

app.use(bodyParser.urlencoded({ extended: true }));/*configura el middleware body-parser 
para analizar los datos codificados en la URL Por el metodo POST*/

// Configurar middleware para manejar sesiones
app.use(session({
  secret: 'secreto', // Clave secreta para firmar la cookie de sesión
  resave: false,
  saveUninitialized: true
}));

app.use((req, res, next) => {
  res.locals.carrito = req.session.carrito || [];
  res.locals.usuarioEncontrado = req.session.usuario; /*Permite utilizar la session para los usuarios del archivo usuarios.js 
  para todas las plantillas pug*/
  next();
});

// Configuración de la plantilla Pug
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Middleware para procesar archivos estáticos en la carpeta 'public'
app.use(express.static('public'));
app.use(express.json());

//Ruta para el login
app.get('/login', (req, res) => {
    res.render('login', {title: 'Iniciar Sesión' });
});

// Función de comparación para buscar usuarios
function findUsuario(usuarios, username, password) {
    return usuarios.find(user => {
        // Realizar una comparación considerando los caracteres especiales
        return user.usuario.toLowerCase() === username.toLowerCase() && user.password === password;
    });
}

// Ruta para Validar el inicio de sesión
app.post('/login', (req, res) => {
    const { usuario, password } = req.body;

    console.log("----Datos Encontrados----");
    console.log("Usuario:", usuario);
    console.log("Contraseña:", password);

    // Importa el archivo de usuarios.js
    const usuarios = require('./usuarios');

    // Busca el usuario por el nombre de usuario y contraseña utilizando la función de comparación personalizada
    const usuarioEncontrado = findUsuario(usuarios, usuario, password);
    
    if (usuarioEncontrado) {
        // Iniciar sesión para el usuario
        req.session.usuario = usuarioEncontrado;
        console.log('Inicio de sesión exitoso:', usuarioEncontrado.usuario);
        res.redirect('/'); // Redirige a la página principal
    } else {
        console.log('Credenciales incorrectas');
        console.log(req.body); // Verifica los datos del formulario en la consola
        res.redirect('/login'); // Redirige de nuevo al formulario de inicio de sesión con un mensaje de error
    }
});

//Ruta para el registro
app.get('/register', (req, res) => {
    res.render('register', {title: 'Registro'});
});

// Ruta para agregar un nuevo usuario, mediante el formulario del registro
app.post('/addUser', (req, res) => {
    console.log(req.body); // Verifica los datos del formulario en la consola
    const { nombres, apellidos, usuario, password } = req.body; // Obtiene los datos del cuerpo de la solicitud
    // Lee el archivo usuarios.js si existe, o crea un array vacío si no existe
    let usuarios = [];
    if (fs.existsSync('usuarios.js')) {
      const rawData = fs.readFileSync('usuarios.js', 'utf-8');
      usuarios = JSON.parse(rawData.replace('module.exports =', ''));
    }
    // Agrega el nuevo usuario al archivo usuarios.js
    usuarios.push({
        nombres,
        apellidos,
        usuario,
        password
    });
    // Guarda el array de usuarios en el archivo usuarios.js
    fs.writeFileSync('usuarios.js', `module.exports = ${JSON.stringify(usuarios, null, 2)}`);

    // Redirige al Inicio de Sesión
    res.redirect('/login'); // Redirige al usuario a la página de inicio de sesión
});

// Ruta para cerrar sesión
app.get('/logout', (req, res) => {
    // Destruir la sesión
    req.session.destroy(err => {
        if (err) {
            console.error('Error al cerrar sesión:', err);
            res.redirect('/');
        } else {
            res.redirect('/');
        }
    });
});

// Se Obtiene el botón por su id
const loginButton = document.getElementById('loginButton');

// Se Agrega el evento de clic al botón
loginButton.addEventListener('click', () => {
    // Redireccionar al usuario a la página de inicio de sesión
    window.location.href = '/login';
});

// Ruta para la página de inicio
app.get('/', (req, res) => {
    res.render('index', { title: 'Página de Bienvenida' });
}); 

// Ruta para el catálogo de productos
app.get('/catalogo', (req, res) => {
    const productos = productosController.getProductos();
    res.render('catalogo', { title: 'Catálogo de Productos', productos });
});

// Ruta para buscar productos
app.get('/buscar-producto', (req, res) => {
    const query = req.query.q.toLowerCase();
    const productos = productosController.getProductos();
    const productosFiltrados = productos.filter(producto =>
        producto.nombre.toLowerCase().includes(query) || producto.descripcion.toLowerCase().includes(query)
    );
    res.render('catalogo', { title: 'Resultados de la Búsqueda', productos: productosFiltrados });
});


// Ruta para el detalle de producto
app.get('/producto/:id', (req, res) => {
    const idProducto = req.params.id;
    const producto = productosController.getProductoPorId(idProducto);
    res.render('producto', { title: 'Detalle del Producto', producto });
});

// Ruta para el carrito de compra
app.get('/carrito', (req, res) => {
  let carrito = req.session.carrito || []; // Obtiene el carrito de la sesión del usuario, si no existe, crea un nuevo carrito vacío
    res.render('carrito', { title: 'Carrito de Compra', carrito });
});

// Ruta para agregar un producto al carrito
app.post('/agregar-al-carrito/:id', (req, res) => {
  const idProducto = req.params.id;
  const producto = productosController.getProductoPorId(idProducto);
  if (producto && producto.cantidad > 0) {
      let carrito = req.session.carrito || [];
      let productoEnCarrito = carrito.find(item => item.id === idProducto);
      if (productoEnCarrito) {
          productoEnCarrito.cantidad++;
      } else {
          carrito.push({ id: idProducto, nombre: producto.nombre, precio: producto.precio, cantidad: 1 });
      }
      producto.cantidad--;
      req.session.carrito = carrito;
      res.redirect('/catalogo');
  } else {
      res.status(404).send('Producto no encontrado o no disponible');
  }
});

// Ruta para el detalle de compra
app.get('/detalle-compra', (req, res) => {
    let carrito = req.session.carrito || []; // Obtiene el carrito de la sesión del usuario, si no existe, crea un nuevo carrito vacío
    res.render('detalle-compra', { title: 'Detalle de Compra', carrito});
});

// Ruta para actualizar la cantidad de un producto en el carrito
app.post('/actualizar-cantidad/:id/:cantidad', (req, res) => {
    const idProducto = req.params.id;
    const cantidad = parseInt(req.params.cantidad);
    let carrito = req.session.carrito || [];
    const item = carrito.find(item => item.id === idProducto);
    const producto = productosController.getProductoPorId(idProducto);
    if (item) {
        const cantidadNueva = item.cantidad + cantidad;
        if (cantidadNueva > 0 && cantidad <= producto.cantidad) {
            item.cantidad = cantidadNueva;
            item.precio = item.cantidad * producto.precio;
            producto.cantidad -= cantidad;
            if (item.cantidad === 0) {
                carrito = carrito.filter(item => item.id !== idProducto);
            }
        }
    }
    req.session.carrito = carrito;
    res.redirect('/carrito');
});

// Ruta para eliminar un producto del carrito
app.post('/eliminar-del-carrito/:id', (req, res) => {
    const idProducto = req.params.id;
    let carrito = req.session.carrito || []; // Obtiene el carrito de la sesión del usuario, si no existe, crea un nuevo carrito vacío
    const itemIndex = carrito.findIndex(item => item.id === idProducto);
    if (itemIndex !== -1) {
      const removedItem = carrito.splice(itemIndex, 1)[0];
      const producto = productosController.getProductoPorId(idProducto);
      if (producto) {
        producto.cantidad += removedItem.cantidad; // Modifica la cantidad del producto en stock
      }
    }
    req.session.carrito = carrito; // Actualiza el carrito en la sesión
    res.redirect('/carrito');
});

// Middleware para procesar la compra
app.post('/procesar-compra', (req, res) => {
    // Aquí iría la lógica para procesar la compra, por ejemplo, actualizar la base de datos y vaciar el carrito
    const carrito = req.session.carrito || []; // Obtiene el carrito de la sesión del usuario

    // Lógica para procesar la compra...

    // Vaciar el carrito después de procesar la compra
    req.session.carrito = [];
    
    res.render('confirmacion-compra', { title: 'Compra Exitosa' });
});
  
// Puerto en el que escucha el servidor
const port = 3000;
app.listen(port, () => {
    console.log(`Servidor iniciado en http://localhost:${port}`);
});
