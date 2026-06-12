function verificarRol(...rolesPermitidos) {

  return (req, res, next) => {

    if (!req.session.usuario) {
      return res.redirect('/login');
    }

    if (!rolesPermitidos.includes(req.session.usuario.rol)) {
      return res.status(403).send('Acceso denegado');
    }

    next();
  };
}

module.exports = verificarRol;