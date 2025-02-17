document.addEventListener('DOMContentLoaded', () => {
    // Selecionar elementos
    const taskInput = document.getElementById('task-input');
    const taskTimer = document.getElementById('task-timer');
    const timeUnitSelect = document.getElementById('time-unit');
    const addTaskBtn = document.getElementById('add-task-btn');
    const taskList = document.getElementById('task-list');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const darkModeToggle = document.getElementById('dark-mode-toggle');

    const modal = document.getElementById('notification-modal');
    const modalMessage = document.getElementById('modal-message');
    const closeBtn = document.querySelector('.close-btn');
  
    // Carregar tarefas do LocalStorage ao iniciar
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
  
    // Função para salvar tarefas no LocalStorage
    function saveTasksToLocalStorage() {
      localStorage.setItem('tasks', JSON.stringify(tasks));
    }
  
    // Função para converter unidades de tempo em milissegundos
    function getMilliseconds(unit) {
      switch (unit) {
        case 'minutes': return 1000 * 60;
        case 'hours': return 1000 * 60 * 60;
        case 'days': return 1000 * 60 * 60 * 24;
        default: return 0;
      }
    }
  
    function renderTasks(filter = 'all') {
      taskList.innerHTML = '';
      const filteredTasks = tasks.filter(task => {
        if (filter === 'completed') return task.completed;
        if (filter === 'pending') return !task.completed;
        return true;
      });
  
      filteredTasks.forEach((task, index) => {
        const translatedUnit = task.unit === 'minutes' ? 'minuto' :
                               task.unit === 'hours' ? 'hora' :
                               task.unit === 'days' ? 'dia' : '';
  
        const formattedTime = task.timer
          ? `${parseInt(task.timer).toLocaleString()} ${translatedUnit}${task.timer > 1 ? 's' : ''}`
          : 'Sem tempo limite';
  
        let timeRemaining = '';
        if (task.timer && task.startTime) {
          const currentTime = Date.now();
          const expirationTime = task.startTime + (task.timer * getMilliseconds(task.unit));
          const remainingMs = expirationTime - currentTime;
  
          if (remainingMs > 0) {
            const remainingMinutes = Math.ceil(remainingMs / (1000 * 60));
            timeRemaining = ` (${remainingMinutes} minuto${remainingMinutes > 1 ? 's' : ''} restante${remainingMinutes > 1 ? 's' : ''})`;
          } else {
            timeRemaining = ' (Expirado)';
          }
        }
  
        const li = document.createElement('li');
        li.className = 'task-item';
        if (task.completed) li.classList.add('completed');
        li.innerHTML = `
          <input type="checkbox" ${task.completed ? 'checked' : ''} data-index="${index}">
          <span>${task.text} (${formattedTime})${timeRemaining}</span>
          <button class="delete-btn" data-index="${index}"><i class="fas fa-trash"></i></button>
        `;
        taskList.appendChild(li);
  
        setTimeout(() => {
          li.classList.add('animate');
        }, 10);
      });
    }
  
    // Função para verificar tarefas expiradas
    function checkExpiredTasks() {
      tasks.forEach((task, index) => {
        if (!task.completed && task.timer && task.startTime) {
          const expirationTime = task.startTime + (task.timer * getMilliseconds(task.unit));
          const currentTime = Date.now();
  
          // Verificar se a tarefa está prestes a expirar (5 minutos antes)
          const warningTime = expirationTime - (5 * 60 * 1000); // 5 minutos antes
          if (currentTime >= warningTime && currentTime < expirationTime && !task.warned) {
            showModal(`Atenção: A tarefa "${task.text}" expira em breve!`);
            tasks[index].warned = true; // Marcar como avisado
          }
  
          // Verificar se a tarefa expirou
          if (currentTime >= expirationTime && !task.expired) {
            showModal(`A tarefa "${task.text}" expirou!`);
            tasks[index].expired = true; // Marcar como expirado
          }
        }
      });
  
      saveTasksToLocalStorage();
      renderTasks();
    }
  
    // Função para exibir o modal
    function showModal(message) {
      modalMessage.textContent = message;
      modal.style.display = 'block';
    }
  
    // Fechar o modal ao clicar no botão "X"
    closeBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });
  
    // Fechar o modal ao clicar fora dele
    window.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  
    function addTask() {
      const taskText = taskInput.value.trim();
      const taskTime = taskTimer.value.trim();
      const taskUnit = timeUnitSelect.value;
  
      if (taskText !== '') {
        tasks.push({
          text: taskText,
          completed: false,
          timer: taskTime || null,
          unit: taskUnit,
          startTime: taskTime ? Date.now() : null,
          warned: false,
          expired: false,
        });
        taskInput.value = '';
        taskTimer.value = '';
        saveTasksToLocalStorage();
        renderTasks();
  
        // Adicionar animação à nova tarefa
        const newTask = document.querySelector('.task-item:last-child');
        if (newTask) {
          newTask.classList.add('new-task-animation');
        }
      }
    }
  
    taskInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addTask();
    });
  
    addTaskBtn.addEventListener('click', addTask);
  
    // Marcar como concluída ou excluir tarefa
    taskList.addEventListener('click', (e) => {
      if (e.target.tagName === 'INPUT') {
        const index = e.target.dataset.index;
        tasks[index].completed = !tasks[index].completed;
        saveTasksToLocalStorage();
        renderTasks();
  
        if (tasks[index].completed) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
          });
        }
      } else if (e.target.tagName === 'BUTTON' || e.target.tagName === 'I') {
        const index = e.target.closest('button').dataset.index;
        tasks.splice(index, 1);
        saveTasksToLocalStorage();
        renderTasks();
      }
    });

    filterButtons.forEach(button => {
      button.addEventListener('click', () => {
        filterButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        renderTasks(button.dataset.filter);
      });
    });

    darkModeToggle.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
    });
  
    // Iniciar verificação periódica de tarefas expiradas
    setInterval(checkExpiredTasks, 10000); // Verificar a cada 10 segundos
  
    renderTasks();
  
    // Habilitar drag-and-drop usando SortableJS
    const sortable = new Sortable(taskList, {
      animation: 150, // Duração da animação em milissegundos
      onEnd: (event) => {
        // Obter a nova ordem dos índices
        const newOrder = Array.from(taskList.children).map(item => {
          const index = item.querySelector('input[type="checkbox"]').dataset.index;
          return tasks[index]; // Mapear para o array de tarefas
        });
  
        // Atualizar o array de tarefas com a nova ordem
        tasks = newOrder;
        saveTasksToLocalStorage();
        renderTasks();
      },
    });
  });