const usuarios = [
    {
        nombres: 'Juan',
        apellidos: 'Pérez',
        usuario: 'juanperez',
        contraseña: '123456'
    }
];

module.exports = {
    agregarUsuario: function(usuarioData) {
        usuarios.push(usuarioData);
    },
    obtenerUsuarios: function() {
        return usuarios;
    }
};