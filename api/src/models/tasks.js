const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tarefa: {
      type: String,
      required: [true, 'Nome da tarefa é obrigatório'],
      trim: true,
    },
    descricao: {
      type: String,
      trim: true,
      default: '',
    },
    categoria: {
      type: String,
      enum: ['Escrevendo Código', 'Cursos', 'Debugging', 'Outras Demandas'],
      default: 'Outras Demandas',
    },
    status: {
      type: String,
      enum: ['a_fazer', 'em_progresso', 'em_revisao', 'concluido'],
      default: 'a_fazer',
    },
    prioridade: {
      type: String,
      enum: ['alta', 'media', 'baixa'],
      default: 'media',
    },
    tempo_gasto: {
      type: Number, // em horas
      default: 0,
      min: 0,
    },
    data_limite: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Índices para consultas frequentes
taskSchema.index({ usuario: 1, status: 1 });
taskSchema.index({ usuario: 1, deadline: 1 });

module.exports = mongoose.model('Task', taskSchema);