const express = require("express");
const app = express();

const dotenv = require("dotenv");
dotenv.config();

const {verifyToken}=require("../middleware/auth");
const { connection } = require("../config/config.db"); // conexión con la base de datos

//rutas GET
const getCart = (request, response) =>{
    const{id}=request.params;
    const query=`
        SELECT c.id_carrito, c.id_producto, p.nombre AS producto_nombre, c.cantidad,
        p.precio, (c.cantidad * p.precio) AS subtotal, p.url_imagen, p.stock
        FROM carrito c
        JOIN vista_productos p ON c.id_producto=p.id_producto
        WHERE c.id_cliente=?;
    `;

    connection.query(query, [id], (error, results)=>{
        if(error){
            return response.status(500).json({message: "error en el server vv", error});
        }
        if(results.length==0){
            return response.status(404).json({message: "no hay nada vv"});
        }
        response.status(200).json(results);
    });
}; 

const getOrdersByClient=(request, response)=>{
  const{cliente_id}= request.params;

  const query= `
    SELECT * 
    FROM vista_ordenes_detalle
    WHERE ClienteID = ?
    ORDER BY FechaOrden DESC
  `;

  connection.query(query, [cliente_id], (error, results)=>{
    if(error){
      console.error("error vv en:", error);
      return response.status(500).json({error: "error en el server vv"});
    }
    if(results.length==0){
      return response.status(404).json({message: "no se encontraron ordenes para este cliente"});
    }
    response.status(200).json(results);
  });
};

const calculateCartSummary= (request, response)=>{
  const{id_cliente}=request.params;

  if(!id_cliente){
    return response.status(400).json({ error: "Faltan parámetros: id_cliente es obligatorio" });
  }

  const getCartTotalQuery=`
    SELECT SUM(subtotal) AS cart_total
    FROM vista_carrito_cliente
    WHERE id_cliente = ?
  `;

  connection.query(getCartTotalQuery, [id_cliente], (error, result)=>{
    if(error){
      console.error("Error al obtener el total del carrito:", error);
      return response.status(500).json({ error: "Error al calcular el subtotal del carrito" });
    }

    const cart_total= result[0]?.cart_total || 0;

    const shipping= cart_total>=50 ? 0 : 10;

    const final_total= cart_total + shipping;

    return response.status(200).json({
      subtotal: parseFloat(cart_total.toFixed(2)),
      shipping: parseFloat(shipping.toFixed(2)),
      total: parseFloat(final_total.toFixed(2)),
    });
  });
};

//rutas POST
const insertCart = (request, response) => {
  const { id_cliente, id_producto, cantidad } = request.body;

  if (!id_cliente || !id_producto || !cantidad) {
    return response.status(400).json({ error: "Faltan parámetros" });
  }

  // Obtener precio del producto antes de insertar o actualizar
  const getPriceQuery = `
    SELECT precio FROM productos
    WHERE id_producto = ?;
  `;

  connection.query(getPriceQuery, [id_producto], (err, result) => {
    if (err) {
      console.error("Error al obtener el precio del producto:", err);
      return response
        .status(500)
        .json({ error: "Error al obtener el precio del producto" });
    }

    if (result.length === 0) {
      return response.status(404).json({ error: "Producto no encontrado" });
    }

    // ✅ Obtenemos el precio del producto
    const precio_unitario = result[0].precio;
    const precio_total = precio_unitario * parseInt(cantidad); // Precio total según cantidad

    // Consulta para verificar si el producto ya está en el carrito
    const checkQuery = `
      SELECT cantidad FROM carrito
      WHERE id_cliente = ? AND id_producto = ?;
    `;

    connection.query(
      checkQuery,
      [id_cliente, id_producto],
      (err, cartResult) => {
        if (err) {
          console.error("Error al verificar producto en carrito:", err);
          return response
            .status(500)
            .json({ error: "Error al verificar producto en carrito" });
        }

        if (cartResult.length > 0) {
          // ✅ Producto encontrado, actualizar cantidad y precio_unitario
          const newQuantity =
            parseInt(cartResult[0].cantidad) + parseInt(cantidad);
          const newPrice = precio_unitario * newQuantity;

          const updateQuery = `
            UPDATE carrito
            SET cantidad = ?, precio_unitario = ?
            WHERE id_cliente = ? AND id_producto = ?;
          `;

          connection.query(
            updateQuery,
            [newQuantity, newPrice, id_cliente, id_producto],
            (err, updateResult) => {
              if (err) {
                console.error("Error al actualizar cantidad y precio:", err);
                return response
                  .status(500)
                  .json({ error: "Error al actualizar producto en carrito" });
              }
              return response
                .status(200)
                .json({ message: "Cantidad actualizada correctamente" });
            }
          );
        } else {
          // ➕ Producto no encontrado, insertar nuevo registro con precio_unitario actualizado
          const insertQuery = `
            INSERT INTO carrito (id_cliente, id_producto, cantidad, precio_unitario)
            VALUES (?, ?, ?, ?);
          `;

          connection.query(
            insertQuery,
            [id_cliente, id_producto, cantidad, precio_total],
            (err, insertResult) => {
              if (err) {
                console.error("Error al insertar producto en carrito:", err);
                return response
                  .status(500)
                  .json({ error: "Error al insertar producto en carrito" });
              }
              return response
                .status(201)
                .json({ message: "Producto agregado al carrito correctamente" });
            }
          );
        }
      }
    );
  });
};

const createOrder= (request, response) =>{
  const {id_cliente}= request.params;

  const getCartQuery=`
    SELECT c.id_carrito, c.id_producto, p.nombre AS producto_nombre, c.cantidad,
      p.precio, (c.cantidad * p.precio) AS subtotal, p.url_imagen, p.stock
    FROM carrito c
    JOIN vista_productos p ON c.id_producto = p.id_producto
    WHERE c.id_cliente = ?;
  `;

  connection.query(getCartQuery, [id_cliente], (error, cartItems)=>{
    if(error){
      return response.status(500).json({ message: "Error en el servidor", error });
    }

    if(cartItems.length===0){
      return response.status(404).json({ message: "No hay productos en el carrito" });
    }

    const total= cartItems.reduce((acc, item)=>acc+item.subtotal, 0);

    const orderData={
      id_cliente: id_cliente,
      total: total,
      estado: 'preparation',
      info_adicional: 'Order created successfully.'
    };

    const insertOrderQuery=`
      INSERT INTO ordenes (id_cliente, total, estado, info_adicional)
      VALUES (?, ?, ?, ?);
    `;

    connection.query(insertOrderQuery, [orderData.id_cliente, orderData.total, orderData.estado, orderData.info_adicional], (error, result)=>{
      if(error){
        return response.status(500).json({message: "error al crear orden", error});
      }

      const orderId= result.insertId;

      const insertItemsQuery=`
        INSERT INTO order_items (id_orden, id_producto, cantidad, precio_unitario)
        VALUES ?;
      `;

      const orderItemsData= cartItems.map(item=>[
        orderId,
        item.id_producto,
        item.cantidad,
        item.precio
      ]);

      connection.query(insertItemsQuery, [orderItemsData], (error)=>{
        if(error){
          return response.status(500).json({message: "error al insertar en orden", error});
        }

        const updateStockQuery=`
          UPDATE productos
          SET stock= stock-?
          WHERE id_producto= ?;
        `;

        cartItems.forEach(item=>{
          connection.query(updateStockQuery, [item.cantidad, item.id_producto], (error)=>{
            if(error){
              console.error('error al actualizar stock del producto ${item.id_producto}');
            }
          });
        });

        const deleteCartQuery=`
          DELETE FROM carrito
          WHERE id_cliente=?;
        `;

        connection.query(deleteCartQuery, [id_cliente], (error)=>{
          if(error){
            return response.status(500).json({message: "error al vaciar carrito", error});
          }

          response.status(201).json({message:"orden creada con exito. orden id: ", orderId});
        });
      });
    });
  });
};


//rutas PATCH (UPDATE)(es patch pq na mas cambia uno, no todos xd)
const updateCartItemQuantity=(request, response)=>{
  const {id_carrito, id_producto, cantidad, id_cliente}= request.body;

  if(!id_carrito || !id_producto || !cantidad || !id_cliente){
    return response.status(400).json({success: false, message:"faltan parametros"});
  }

  connection.beginTransaction((error)=>{
    if(error){
      console.error("error al iniciar transaccion: ", error);
      return response.status(500).json({success: false, message: "error al iniciar"});
    }

    const precioProducto=`
      SELECT precio FROM productos
      WHERE id_producto=?
    `;

    connection.query(precioProducto, [id_producto], (error, result)=>{
      if(error){
        console.error("error al obtener precio:", error);
        return connection.rollback(()=>{
          response.status(500).json({success: false, message: "error al obtener precio"});
        });
      }

      if(result.length===0){
        return connection.rollback(()=>{
          response.status(404).json({success: false, message: "producto no encontrado"});
        });
      }
      
      const precio_unitario= parseFloat(result[0].precio);
      const subtotal= precio_unitario * parseInt(cantidad);

      const updateCantidadVista= `
        UPDATE vista_carrito_cliente
        SET cantidad=?
        WHERE
          id_carrito=? AND
          id_producto=? AND
          id_cliente=?
      `;

      connection.query(
        updateCantidadVista,
        [cantidad, id_carrito, id_producto, id_cliente],
        (error, updateResult)=>{
          if(error){
            console.error("error al actualizar cantidad: ", error);
            return connection.rollback(()=>{
              response.status(500).json({success: false, message: "error al actualizar producto en carrito"});
            });
          }

          connection.commit((error)=>{
            if(error){
              console.error("error al confirmar trans: ", error);
              return connection.rollback(()=>{
                response.status(500).json({success: false, message: "error al confirmar trans"});
              });
            }

            //respuesta exitosa
            return response.status(200).json({
              success:true,
              precio: precio_unitario.toFixed(2),
              cantidad: parseInt(cantidad),
              subtotal: subtotal.toFixed(2),
            });
          });
        }
      );
    });
  });
};

//rutas DELETE
const deleteCartItem=(request, response)=>{
    const {id_carrito, id_cliente}=request.params;

    if(!id_carrito || !id_cliente){
        return response.status(400).json({error: "faltan parametros"});
    }

    const query=`
        DELETE FROM carrito
        WHERE id_carrito=? AND id_cliente=?;
    `;

    connection.query(query, [id_carrito, id_cliente], (error, results)=>{
        if(error){
            return response.status(500).json({error: "error al eliminar", error});
        }

        if(results.affectedRows>0){
            response.status(200).json({message: "elemento eliminado"});
        }else{
            response.status(400).json({error: "elemento no encontrado"});
        }
    });
};





//GET
app.route("/cart/:id").get(verifyToken, getCart);
app.route("/orders/:cliente_id").get(verifyToken, getOrdersByClient);
app.route("/cartsummary/:id_cliente").get(verifyToken, calculateCartSummary);

//POST
app.route("/insertcart").post(verifyToken, insertCart);
app.route("/createOrder/:id_cliente").post(verifyToken, createOrder);

//PATCH
app.route("/updateCIquantity").patch(verifyToken, updateCartItemQuantity);

//DELETE
app.route("/deletecartitem/:id_carrito/:id_cliente").delete(verifyToken, deleteCartItem);




module.exports = app;