const express = require("express");
const app = express();
const bcrypt = require("bcryptjs");

const dotenv = require("dotenv");
dotenv.config();

const {generateToken, verifyToken}=require("../middleware/auth");
const { connection } = require("../config/config.db"); 

//ruta LOGIN
const login = (request, response) => {
    const { usuario, Contraseña } = request.body;
  
    connection.query("SELECT * FROM clientes WHERE usuario=?", [usuario], (error, results) => {
        if (error) {
          return response.status(500).json({ error: "Error en el servidor" });
        }
        if (results.length === 0) {
          return response.status(404).json({ message: "Usuario no encontrado" });
        }
  
        const user = results[0];

        bcrypt.compare(Contraseña, user.Contraseña, (error, isMatch)=>{
            if(error){
                return response.status(500).json({message:"error al comparar contraseñas"});
            }
            if(isMatch){
                const token=generateToken(user);
                return response.status(200).json({token});
            }else{
                return response.status(401).json({message:"contraseña incorrecta"});
            }
        });
    });
};

//GET
const getClienteRevenueData= (request, response)=>{
    const query="SELECT * FROM cliente_revenue_data";
       
    connection.query(query, (error, result)=>{
        if(error){
            console.error(error);
            return response.status(500).json({error: "error en el server"});
        }
        if(result.length===0){
            return response.status(404).json({message: "no encontrado"});
        }
        response.status(200).json(result);
    });
};

const getClienteRevenueById= (request, response)=>{
    const {id_cliente}= request.params;

    const query="SELECT * FROM cliente_revenue_data WHERE id_cliente=?";
       
    connection.query(query, [id_cliente], (error, result)=>{
        if(error){
            console.error(error);
            return response.status(500).json({error: "error en el server"});
        }
        if(result.length===0){
            return response.status(404).json({message: "no encontrado"});
        }
        response.status(200).json(result);
    });
};

const isAdmin=(request, response)=>{
    const {id_cliente}=request.params;
    const query=`
        SELECT is_admin FROM clientes
        WHERE id_cliente=?;
    `;

    connection.query(query, [id_cliente], (error, results)=>{
        if(error){
            console.error("error vv en:", error);
            return response.status(500).json({error: "error en el server vv"});
        }
        if(results.length===0){
            return response.status(404).json({message: "cliente no encontrado"});
        }
        const isAdmin=results[0].is_admin===1;
        response.status(200).json({is_admin:isAdmin});
    });

};


const getClientByUsername= (request, response)=>{
    const {username}=request.body;

    if(!username){
        return response.status(400).json({error: "se requiere username"});
    }

    const query=`
        SELECT id_cliente, nombre, email, direccion, telefono, estado, fecha_registro, foto_perfil, usuario
        FROM clientes 
        WHERE usuario=?
    `;

    connection.query(query, [username], (error, results)=>{
        if(error){
            console.error("error al buscar cliente: ", error);
            return response.status(500).json({error: "error en el server"});
        }

        if(results.length===0){
            return response.status(404).json({message: "cliente no encontrado"});
        }
        response.json(results[0]);
    });
};

const getClientByEmail= (request, response)=>{
    const {email}=request.body;

    if(!email){
        return response.status(400).json({error: "se requiere email"});
    }

    const query=`
        SELECT id_cliente, nombre, email, direccion, telefono, estado, fecha_registro, foto_perfil, usuario
        FROM clientes 
        WHERE email=?
    `;

    connection.query(query, [email], (error, results)=>{
        if(error){
            console.error("error al buscar cliente: ", error);
            return response.status(500).json({error: "error en el server"});
        }

        if(results.length===0){
            return response.status(404).json({message: "cliente no encontrado"});
        }
        response.json(results[0]);
    });
};



//POST
const createClient=async(request, response)=>{
    try{
        const{nombre, Contraseña, email, direccion, telefono, estado, fecha_registro, usuario, is_admin}=request.body;
        
        const hashedPassword = await bcrypt.hash(Contraseña, 10);
        const query=`
            INSERT INTO clientes(nombre, Contraseña, email, direccion, telefono, estado, fecha_registro, usuario, is_admin)
            VALUES (?,?,?,?,?,?,?,?,?);
        `;

        connection.query(query, [nombre, hashedPassword, email, direccion, telefono, estado, fecha_registro, usuario, is_admin], (error, results)=>{
            if(error){
                console.error("error al registrar cliente:", error);
                return response.status(500).json({error: "error al registrar cliente"});
            }
            response.status(201).json({
                message:"cliente registrado con exito",
                clienteId: results.insertId
            });
        });
    } catch(error){
        console.error("error en el server", error);
        response.status(500).json({error:"error en el server", error});
    }
};

//PATCH
const makeAdmin= (request, response)=>{
    const {id_cliente}= request.params;

    const query=`
        UPDATE clientes
        SET is_admin= 1
        WHERE id_cliente=?
    `;

    connection.query(query, [id_cliente], (error, result)=>{
        if(error){
            console.error(error);
            return response.status(500).json({message: "error en el server", error});
        }
        response.status(200).json({message: "usuario es admin"});
    });
};

const removeAdmin= (request, response)=>{
    const {id_cliente}= request.params;

    const query=`
        UPDATE clientes
        SET is_admin= 0
        WHERE id_cliente=?
    `;

    connection.query(query, [id_cliente], (error, result)=>{
        if(error){
            console.error(error);
            return response.status(500).json({message: "error en el server", error});
        }
        response.status(200).json({message: "usuario YA NO es admin"});
    });
};

const updateProfile=(request, response)=>{
    const{id_cliente}=request.params;
    const {nombre, Contraseña, email, direccion, telefono, usuario}= request.body;

    const updateUserProfile=async()=>{
        try{
            let hashedPassword= Contraseña;

            if(Contraseña){
                const salt= await bcrypt.genSalt(10);
                hashedPassword= await bcrypt.hash(Contraseña, salt);
            }

            const query=`
                UPDATE clientes
                SET 
                    nombre=?,
                    Contraseña=?,
                    email=?,
                    direccion=?,
                    telefono=?,
                    usuario=?
                WHERE id_cliente=?
            `;

            return new Promise((resolve, reject)=>{
                connection.query(query, [nombre, hashedPassword, email, direccion, telefono, usuario, id_cliente], (error, results)=>{
                    if (error) {
                        reject(error);
                    }
                    else{
                        resolve(results);
                    }
                });
            });
        }
        catch(error){
            throw error;
        }
    };
    
    updateUserProfile()
        .then(results =>{
            if(results.affectedRows===0){
                return response.status(404).json({message: "cliente no encontrado"});
            }
            response.status(200).json({message: "perfil cambiado exitosamente"});
        })
        .catch(error=>{
            console.error("error en: ", error);
            return response.status(500).json({error:"error en el server"});
        });
};



//DELETE
const deleteClient= (request, response)=>{
    const {id_cliente}= request.params;

    const query=`
        DELETE FROM clientes
        WHERE id_cliente=?
    `;

    connection.query(query, [id_cliente], (error, result)=>{
        if(error){
            console.error(error);
            return response.status(500).json({message: "error en el server", error});
        }
        response.status(200).json({message: "usuario eliminado"});
    });
};



//ruta LOGIN
app.route("/login").post(login);

//rutas GET
app.route("/clienteRevenue").get(verifyToken, getClienteRevenueData);
app.route("/clienteRevenue/:id_cliente").get(verifyToken, getClienteRevenueById);
app.route("/isadmin/:id_cliente").get(isAdmin);
app.route("/cliente/getByUsername").get(getClientByUsername);
app.route("/cliente/getByEmail").get(getClientByEmail);

//rutas POST
app.route("/signup").post(createClient);

//rutas PATCH
app.route("/makeadmin/:id_cliente").patch(makeAdmin);
app.route("/removeadmin/:id_cliente").patch(removeAdmin);
app.route("/cliente/update/:id_cliente").patch(updateProfile);


//rutas DELETE
app.route("/deleteClient/:id_cliente").delete(deleteClient);


module.exports= app;