const jwt=require('jsonwebtoken');
require('dotenv').config();


const generateToken = (user)=>{
    return jwt.sign(
       {id: user.id_cliente, usuario: user.usuario}, 
       process.env.JWT_SECRET,
       {expiresIn: '1h'}  
    );
 };

 const verifyToken = (request, response, next) => {
    const token = request.headers['authorization'];

    if (!token) {
        return response.status(403).json({ message: "y el token vv?" });
    }
    if(!token.startsWith("Bearer ")){
        return response.status(401).json({message: "formato incorrecto"});
    }

    const tokenWithoutBearer= token.split(" ")[1];

    jwt.verify(tokenWithoutBearer, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return response.status(401).json({ message: "Token inválido" });
        }

        request.userId = decoded.id;
        next();
    });
};
 
 module.exports= {generateToken, verifyToken};