const tasks = require("../data/tasks");

exports.getTasks = (req, res) => {

  return res.status(200).json({
    success: true,
    tasks
  });

};

exports.createTask = (req, res) => {

  const { title, description } = req.body;

  if (!title) {
    return res.status(400).json({
      success: false,
      message: "Título obrigatório"
    });
  }

  const newTask = {
    id: tasks.length + 1,
    title,
    description,
    status: false
  };

  tasks.push(newTask);

  return res.status(201).json({
    success: true,
    message: "Task criada",
    task: newTask
  });

};

exports.updateTask = (req, res) => {

  const { id } = req.params;

  const task = tasks.find(
    task => task.id == id
  );

  if (!task) {
    return res.status(404).json({
      success: false,
      message: "Task não encontrada"
    });
  }

  task.status = !task.status;

  return res.status(200).json({
    success: true,
    message: "Task atualizada",
    task
  });

};

exports.deleteTask = (req, res) => {

  const { id } = req.params;

  const taskIndex = tasks.findIndex(
    task => task.id == id
  );

  if (taskIndex === -1) {
    return res.status(404).json({
      success: false,
      message: "Task não encontrada"
    });
  }

  const deletedTask = tasks.splice(taskIndex, 1);

  return res.status(200).json({
    success: true,
    message: "Task removida",
    deletedTask
  });

};