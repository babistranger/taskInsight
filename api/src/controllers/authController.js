const jwt = require("jsonwebtoken");

exports.register = (req, res) => {
  res.json({
    success: true,
    message: "Usuário cadastrado"
  });
};

exports.login = (req, res) => {

  const user = {
    id: 1,
    email: "teste@email.com"
  };

  const token = jwt.sign(
    user,
    process.env.JWT_SECRET,
    {
      expiresIn: "1d"
    }
  );

  res.json({
    success: true,
    token
  });

};