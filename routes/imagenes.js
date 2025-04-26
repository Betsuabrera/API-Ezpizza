const express = require("express");
const app = express();
const bcrypt = require("bcryptjs");

const dotenv = require("dotenv");
dotenv.config();

//archivos pa los token xd
const {verifyToken}=require("../middleware/auth");


// conexión con la base de datos
const { connection } = require("../config/config.db");

//GET
const getImagesById = (request, response) => {
    const{id}= request.params;

    const query= `
        SELECT url_imagen, is_cover FROM imagenes WHERE id_producto= ?;
    `;
    
    connection.query(query, [id], (error, results)=>{
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

//POST
const insertProductImage= (request, response)=>{
    const {id_producto, url_imagen, descripcion, fecha_creacion, is_cover}= request.body;

    if(!id_producto || !url_imagen || !fecha_creacion){
        return response.status(400).json({error: "faltan parametros"});
    }
    
    const query=`
        INSERT INTO imagenes(id_producto, url_imagen, descripcion, fecha_creacion, is_cover)
        VALUES(?,?,?,?,?)
    `;

    connection.query(query, [id_producto, url_imagen, descripcion, fecha_creacion, is_cover], (error, results)=>{
        if(error){
            console.error("error vv en:", error);
            return response.status(500).json({error: "error en el server vv"});
        }
        if(results.affectedRows === 0){
            return response.status(400).json({message: "no se pudo insertar la imagen vv"});
        }
        response.status(201).json({message: "imagen insertada con exito", imageId: results.insertId});
    });
};

const insertProfileImage=(request, response)=>{
    const {id_cliente}= request.params;
    const {foto_perfil}= request.body;

    const query=`
        UPDATE clientes
        SET foto_perfil=?
        WHERE id_cliente=?
    `;

    connection.query(query, [foto_perfil, id_cliente], (error, results)=>{
        if(error){
            console.error("error vv en:", error);
            return response.status(500).json({error: "error en el server vv"});
        }
        if(results.affectedRows===0){
            return response.status(404).json({message: "cliente no encontrado"});
        }
        response.status(200).json({message: "imagen insertada con exito"});
    });
};




//rutas GET
app.route("/images/:id").get(getImagesById);

//rutas POST
app.route("/insertimage").post(insertProductImage);

//rutas PATCH
app.route("/newImageProfile/:id_cliente").patch(insertProfileImage);

module.exports= app;