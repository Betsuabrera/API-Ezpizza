const express = require("express");
const cors = require("cors");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


var whitelist = ['https://ezpizza.store/'];
var corsOptions = {
 origin: function (origin, callback) { //origin revisa el origen de la peticion
if (whitelist.indexOf(origin) !== -1 || !origin) {
 callback(null, true)
 } else {
 callback(new Error('Estás en la BLACK LIST'))
 }
 }
 }
 app.use(cors(corsOptions));// aplica cors config al server



 //cargamos el archivo de rutas
app.use(require("./routes/productos")); //archivo de la carpeta routes
app.use(require("./routes/carrito"));
app.use(require("./routes/clientes"));
app.use(require("./routes/imagenes"));
app.use(require("./routes/reseñas"));

const PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log("El servidor potaxie escucha en el puerto " + PORT);
});

module.exports = app;

/* Nota: para inicializar con nodemon escribe
   npm run dev, oki? :3 


.env (environment): archivo de configuracion que
almacena variables de entorno para una app.

separa credenciales sensibles del codigo fuente
buena practica para proteger info :3

dotenv: permite cargar varoabñes de entorno desde
un archivo .env
*/

