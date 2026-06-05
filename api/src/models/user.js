const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    nome: {
      type: String,
      required: [true, 'Nome é obrigatório'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'E-mail é obrigatório'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    senha: {
      type: String,
      required: [true, 'Senha é obrigatória'],
      minlength: 8,
      select: false,
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function () {
  if (!this.isModified('senha')) return;
  this.senha = await bcrypt.hash(this.senha, 12);
});

userSchema.methods.verificarSenha = async function (senhaDigitada, senhaHash) {
  return bcrypt.compare(senhaDigitada, senhaHash);
};

module.exports = mongoose.model('User', userSchema);
