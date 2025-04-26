const express = require("express");
const app = express();

const dotenv = require("dotenv");
dotenv.config();

const {verifyToken}=require("../middleware/auth");
const { connection } = require("../config/config.db"); 


const getReviewsbyID = (request, response) => {
    const{id_producto}= request.params; //id_producto

    const query= `
        SELECT t.id_testimonio, c.usuario, t.comentario, t.calificacion,
        t.fecha_testimonio, t.id_producto, c.foto_perfil
        FROM testimonios t
        JOIN 
        clientes c ON t.id_cliente= c.id_cliente
        WHERE
        t.id_producto=?
        ORDER BY
        t.fecha_testimonio DESC;
    `;
    
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

const reviewPercentages=(request, response)=>{
    const{id_producto}=request.params;

    const query=`
        WITH star_ratings AS (
        SELECT 1 AS rating
        UNION SELECT 2
        UNION SELECT 3
        UNION SELECT 4
        UNION SELECT 5
        )
        SELECT 
        star_ratings.rating,
        COALESCE(review_counts.review_count, 0) AS review_count,
        COALESCE(review_counts.percentage, 0) AS percentage
        FROM star_ratings
        LEFT JOIN (
            SELECT 
            calificacion AS rating,
            COUNT(*) AS review_count,
            ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM testimonios WHERE id_producto = ?), 0) AS percentage
            FROM testimonios
            WHERE id_producto = ?
            GROUP BY calificacion
        ) AS review_counts ON star_ratings.rating = review_counts.rating
        ORDER BY star_ratings.rating DESC;
    `;

    connection.query(query, [id_producto, id_producto], (error, results)=>{
        if(error){
            return response.status(500).json({message: "error en el server vv", error});
        }
        if(results.length==0){
            return response.status(404).json({message: "no hay nada vv"});
        }
        response.status(200).json(results);
    });
};



//rutas GET
app.route("/reviews/:id_producto").get(getReviewsbyID);
app.route("/reviews/:id/percentages").get(reviewPercentages);



module.exports=app;