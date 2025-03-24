import dbLocal from 'db-local';
import bcrypt from 'bcrypt'; // libreria para encriptar contraseñas
import crypto from 'crypto'; // libreria para generar id random

const { Schema } = dbLocal({ path: './db' });

const User = Schema('User', {
    _id: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    }
});

class UserRepository {
    static async create({ email, password }) {
        Validation.email(email);
        Validation.password(password);

        // asegurarse que el correo no exista
        const user = User.findOne({ email });
        if (user) {
            throw new Error('El correo ya existe');
        }

        // creamos una id random con crypto
        const id = crypto.randomUUID();
        const hashedpassword = await bcrypt.hash(password, 10); // encriptamos la contraseña, 10 es el número de veces que se encripta
        
        // creamos el usuario
        User.create({
            _id: id,
            email,
            password: hashedpassword // guardamos la contraseña encriptada
        }).save();

        return id;
    }

    static login({ email, password }) {
        Validation.email(email);
        Validation.password(password);

        const user = User.findOne({
            email // buscamos el usuario
        });
        if (!user) {//si el usuario no existe devolvemos un error
            throw new Error('El usuario no existe');
        }

        const isValid = bcrypt.compareSync(password, user.password);//como hemos usado bcrypt para almacenar la contraseña
        //lo que hace es encriptar la contraseña introducida y la compara hasheada para mayor seguridad
        
        //ahora devolvemos el resultado
        if (!isValid) {
            throw new Error('La contraseña no es correcta');
        }

        const { password: _, ...publicuser } = user; // quitamos la contraseña para no devolverla

        return publicuser; // devolvemos solo el usuario
    }
}

class Validation {//clase encargada de validar los datos
    static email(email) {
        if (typeof email !== 'string') {
            throw new Error('El email debe ser un string');
        }
        if (email.length < 4) {
            throw new Error('El email debe tener al menos 4 caracteres');
        }
        //añade alguna validacion para comprobar que es un correo electronico
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Error('El email no es válido');
        }
    }

    static password(password) {
        if (typeof password !== 'string') {
            throw new Error('El password debe ser un string');
        }
        if (password.length < 8) {
            throw new Error('El password debe tener al menos 8 caracteres');
        }
    }
}

export default UserRepository;