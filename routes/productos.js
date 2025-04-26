const express = require("express");
const app = express();
const bcrypt = require("bcryptjs");

const dotenv = require("dotenv");
dotenv.config();

//archivos pa los token xd
const {verifyToken}=require("../middleware/auth");


// conexión con la base de datos
const { connection } = require("../config/config.db");

//GET XD

const getProducts= (request, response)=>{
    const query="SELECT * FROM productos ORDER BY id_producto;";

    connection.query(query, (error, results)=>{
        if(error){
            console.error(error);
            return response.status(500).json({error: "error en el servidor"});
        }
        if(results.length==0){
            return response.status(404).json({message: "no hay nada vv"});
        }
        response.status(200).json(results);
    });
};

const getProductsbyID = (request, response) => {
    const{id_producto}= request.params;
    const query= "SELECT * FROM productos WHERE id_producto=?;";
    
    connection.query(query, [id_producto], (error, results)=>{
        if(error){
            console.error("error vv en:", error);
            return response.status(500).json({error: "error en el server vv"});
        }
        if(results.length==0){
            return response.status(404).json({message: "no hay nada vv"});
        }
        response.status(200).json(results);
    });
};

const categoryTree = (request, response) => {
    const query = `
        SELECT id_categoria, nombre_categoria, id_categoria_padre 
        FROM categorias
        ORDER BY id_categoria_padre, id_categoria;
    `;

    // Ejecutar la consulta
    connection.query(query, (error, results) => {
        if (error) {
            // Enviar respuesta en caso de error
            return response.status(500).json({ error: 'Error en la consulta a la base de datos' });
        }

        // Inicializar el objeto tree
        let tree = {};

        // Recorrer los resultados y construir la jerarquía
        results.forEach(category => {
            if (!category.id_categoria_padre) {
                // Si no tiene un padre, es una categoría principal
                tree[category.id_categoria] = {
                    name: category.nombre_categoria,
                    children: []
                };
            } else {
                // Si tiene un padre, agregarlo como hijo del padre correspondiente
                if (!tree[category.id_categoria_padre]) {
                    tree[category.id_categoria_padre] = { children: [] };
                }
                tree[category.id_categoria_padre].children.push({
                    id: category.id_categoria,
                    name: category.nombre_categoria
                });
            }
        });

        // Enviar la respuesta con el árbol de categorías
        response.json(tree);
    });
};

const getFilteredProducts= async(request, response)=>{
    try{
        const{
            min_price= null,
            max_price= null,
            category_id= null,
            state=1,
            rating_min= null,
            limit= 40,
            offset=0,
            q= null //parametro de busqueda
        }=request.query;

        let sql=`
            SELECT
                p.id_producto,
                p.nombre,
                p.descripcion,
                p.precio,
                p.stock,
                v.url_imagen,
                v.id_categoria_hija,
                v.categoria_hija,
                v.id_categoria_padre,
                v.categoria_padre,
                COALESCE(CAST(AVG(t.calificacion) AS DECIMAL(10,1)), 0) AS promedio_calificacion,
                COUNT(t.id_testimonio) AS numero_testimonios
            FROM productos p
            LEFT JOIN categorias c ON p.id_categoria=c.id_categoria
            LEFT JOIN testimonios t ON p.id_producto=t.id_producto
            LEFT JOIN vista_productos v ON p.id_producto=v.id_producto
            WHERE p.estado=?
        `;

        let params=[state];

        if(q !== null){
            sql += `AND (p.nombre LIKE ? OR p.descripcion LIKE ?)`;
            params.push(`%${q}%`, `%${q}%`);
        }
        if(min_price !== null){
            sql += `AND p.precio>=?`;
            params.push(min_price);
        }
        if(max_price!==null){
            sql+= `AND p.precio <=?`;
            params.push(max_price);
        }
        if(category_id!==null){
            sql += `AND p.id_categoria=?`;
            params.push(category_id);
        }

        sql+=`
            GROUP BY p.id_producto, p.nombre, p.descripcion, p.precio, p.stock, v.url_imagen,
            v.id_categoria_hija, v.categoria_hija, v.id_categoria_padre, v.categoria_padre
        `;

        if(rating_min!==null){
            sql+=`HAVING promedio_calificacion >= ?`;
            params.push(rating_min);
        }

        sql+=`ORDER BY p.precio ASC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        connection.query(sql, params, (error, rows)=>{
            if(error){
                console.error('error en la consulta: ', error);
                return response.status(500).json({error: 'error al filtrar'});
            }
            response.json({products: rows, count: rows.length});
        });

        
    }
    catch(error){
        console.error('error en el filtrado: ', error);
        response.status(500).json({error: 'error al filtrar'});
    }
};

const searchProducts= async(request, response)=>{
    try{
        const query= request.query.q;

        if(!query){
            return response.status(400).json({error: "se requiere el parametro de busqueda vv"});
        }

        const buscar=`
            SELECT id_producto, nombre, url_imagen, categoria_padre
            FROM vista_productos
            WHERE nombre LIKE ?
            LIMIT 10
        `;

        connection.query(buscar, [`%${query}%`], (error, rows)=>{
            if(error){
                console.error('error en la consulta: ', error);
                return response.status(500).json({error: 'error en el server'});
            }
            response.json({products: rows});

        });
    }
    catch(error){
        console.error('error en la busqueda vv: ', error);
        response.status(500).json({error: 'error en el server vv'});
    }
};



//POST 
const insertProduct=(request, response)=>{
    const{nombre, descripcion, precio, stock, estado, id_categoria}=request.body;

    connection.query("INSERT INTO productos(nombre, descripcion, precio, stock, estado, id_categoria) VALUES(?,?,?,?,?,?)",
    [nombre, descripcion, precio, stock, estado, id_categoria],
    (error, results)=>{
        if(error)
            throw error;
        response.status(201).json({"item potaxie añadido, filas afectadas":
        results.affectedRows});
    });
};

const insertProductImage=(request, respone)=>{

};


//DELETE :3
const deleteProduct=(request, response)=>{
    const { id } = request.params;

    const query = `
       UPDATE productos
        SET estado= 0
        WHERE id_producto= ?;
    `;

    connection.query(query, [id],(error, results) => {
        if (error) {
            console.error("Error en la consulta:", error);
            return response.status(500).json({ error: "Error en el servidor" });
        }
        if (results.length === 0) {
            return response.status(404).json({ message: "No se encontró el producto" });
        }
        response.status(200).json({message: "producto no disponible"});
    });
};


// rutas GET
app.route("/products").get(getProducts);
app.route("/products/:id_producto").get(getProductsbyID);
app.route("/categories").get(categoryTree);
app.route("/filter").get(getFilteredProducts);
app.route("/search").get(searchProducts);

//rutas POST
app.route("/newproduct").post(verifyToken, insertProduct);
app.route("/newProductImages").post(verifyToken, insertProductImage);

//rutas DELETE
app.route("/deleteproduct/:id").delete(verifyToken, deleteProduct);

module.exports = app;


/*
-crear variables de entorno
-crear auth.js  con funcion generarToken 
-middleware con funcion verificarToken
-crear ruta login
-proteger las rutas con verificar token
*/

/*
primero productos, categorias, comentarios, porcentaje de las calificaciones, 

*/