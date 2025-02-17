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
    const chartContainer = document.querySelector('.chart-container');
    const taskChartCanvas = document.getElementById('task-chart');

    // Carregar tarefas do LocalStorage ao iniciar
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    let activeFilter = 'all'; // Variável para armazenar o filtro ativo

    // Inicializar o gráfico
    let taskChart;

    function initializeChart() {
        if (taskChart) taskChart.destroy(); // Destruir o gráfico anterior, se existir

        taskChart = new Chart(taskChartCanvas.getContext('2d'), {
            type: 'pie',
            data: {
                labels: ['Concluídas', 'Pendentes', 'Expiradas'],
                datasets: [{
                    label: 'Estatísticas de Tarefas',
                    data: [0, 0, 0],
                    backgroundColor: ['#4caf50', '#ff9800', '#f44336'],
                    borderColor: 'transparent',
                    borderWidth: 0,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#fff',
                            font: { size: 12 },
                        },
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.label}: ${context.raw}`,
                        },
                        backgroundColor: '#333',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                    },
                },
            },
        });
    }

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

    // Função para renderizar as tarefas
    function renderTasks(filter = activeFilter) {
        taskList.innerHTML = '';
        const filteredTasks = tasks.filter(task => {
            if (filter === 'completed') return task.completed && !task.expired;
            if (filter === 'pending') return !task.completed && !task.expired;
            if (filter === 'expired') return task.expired;
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
            if (task.timer && task.startTime && !task.expired) {
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

            const expiredText = task.expired ? ' (Expirada)' : '';

            const li = document.createElement('li');
            li.className = 'task-item';
            li.setAttribute('data-index', index);
            li.setAttribute('draggable', true); // Habilitar drag and drop
            if (task.completed) li.classList.add('completed');
            if (task.expired) li.classList.add('expired');

            // Checkbox adicionada novamente
            li.innerHTML = `
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                <span>${task.text} (${formattedTime})${timeRemaining}${expiredText}</span>
                <button class="delete-btn">Excluir</button>
            `;
            taskList.appendChild(li);

            setTimeout(() => {
                li.classList.add('animate');
            }, 10);
        });

        setupDragAndDrop(); // Configurar drag and drop após renderizar as tarefas
        updateStatistics();
    }

    // Função para verificar tarefas expiradas
    function checkExpiredTasks() {
        tasks.forEach((task, index) => {
            if (!task.completed && task.timer && task.startTime) {
                const expirationTime = task.startTime + (task.timer * getMilliseconds(task.unit));
                const currentTime = Date.now();

                // Verificar se a tarefa está prestes a expirar (5 minutos antes)
                const warningTime = expirationTime - (5 * 60 * 1000);
                if (currentTime >= warningTime && currentTime < expirationTime && !task.warned) {
                    showModal(`Atenção: A tarefa "${task.text}" expira em breve!`);
                    tasks[index].warned = true;
                }

                // Verificar se a tarefa expirou
                if (currentTime >= expirationTime && !task.expired) {
                    showModal(`A tarefa "${task.text}" expirou!`);
                    tasks[index].expired = true;

                    // Adicionar animação de pulso à tarefa expirada
                    setTimeout(() => {
                        const expiredTask = document.querySelector(`.task-item[data-index="${index}"]`);
                        if (expiredTask) {
                            expiredTask.classList.add('pulse');
                        }
                    }, 10);
                }
            }
        });

        saveTasksToLocalStorage();
        renderTasks(activeFilter);
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

    // Adicionar tarefa
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
            renderTasks(activeFilter);

            // Reproduzir som ao adicionar uma nova tarefa
            const addTaskSound = document.getElementById('add-task-sound');
            if (addTaskSound) {
                addTaskSound.play().catch((error) => {
                    console.warn('Erro ao reproduzir o som de adicionar tarefa:', error);
                });
            }

            // Adicionar animação à nova tarefa
            const newTask = document.querySelector('.task-item:last-child');
            if (newTask) {
                setTimeout(() => {
                    newTask.classList.add('animate-add');
                }, 50);
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
            const index = e.target.closest('li').dataset.index;
            tasks[index].completed = !tasks[index].completed;
            saveTasksToLocalStorage();
            renderTasks(activeFilter);

            if (tasks[index].completed) {
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 },
                });

                // Reproduzir som de conclusão
                const completedSound = document.getElementById('completed-sound');
                if (completedSound) {
                    completedSound.play().catch((error) => {
                        console.warn('Erro ao reproduzir o som de conclusão:', error);
                    });
                }
            }
        } else if (e.target.tagName === 'BUTTON' || e.target.tagName === 'I') {
            const index = e.target.closest('li').dataset.index;

            // Reproduzir som ao excluir uma tarefa
            const deleteTaskSound = document.getElementById('delete-task-sound');
            if (deleteTaskSound) {
                deleteTaskSound.play().catch((error) => {
                    console.warn('Erro ao reproduzir o som de exclusão:', error);
                });
            }

            // Adicionar animação de fade-out antes de excluir
            const taskToRemove = document.querySelector(`.task-item[data-index="${index}"]`);
            if (taskToRemove) {
                taskToRemove.classList.add('fade-out');

                taskToRemove.addEventListener('animationend', () => {
                    tasks.splice(index, 1);
                    saveTasksToLocalStorage();
                    renderTasks(activeFilter);
                }, { once: true });
            }
        }
    });

    // Filtrar tarefas
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            activeFilter = button.dataset.filter;
            renderTasks(activeFilter);
        });
    });

    // Alternar modo escuro
    darkModeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
    });

    // Função para atualizar as estatísticas e o gráfico
    function updateStatistics() {
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(task => task.completed && !task.expired).length;
        const pendingTasks = tasks.filter(task => !task.completed && !task.expired).length;
        const expiredTasks = tasks.filter(task => task.expired).length;

        // Atualizar os elementos no DOM
        document.getElementById('total-tasks').textContent = totalTasks;
        document.getElementById('completed-tasks').textContent = completedTasks;
        document.getElementById('pending-tasks').textContent = pendingTasks;
        document.getElementById('expired-tasks').textContent = expiredTasks;

        // Atualizar o gráfico
        if (taskChart) {
            taskChart.data.datasets[0].data = [completedTasks, pendingTasks, expiredTasks];
            taskChart.update();
        }
    }

    // Função para configurar o drag and drop
    function setupDragAndDrop() {
        const taskItems = document.querySelectorAll('.task-item');

        let draggedItem = null;

        taskItems.forEach(item => {
            item.addEventListener('dragstart', () => {
                draggedItem = item;
                setTimeout(() => {
                    item.classList.add('dragging');
                }, 0);
            });

            item.addEventListener('dragend', () => {
                draggedItem = null;
                item.classList.remove('dragging');
            });
        });

        taskList.addEventListener('dragover', (e) => {
            e.preventDefault();
            const afterElement = getDragAfterElement(taskList, e.clientY);
            const currentItem = document.querySelector('.dragging');

            if (afterElement == null) {
                taskList.appendChild(currentItem);
            } else {
                taskList.insertBefore(currentItem, afterElement);
            }
        });

        taskList.addEventListener('drop', () => {
            const newOrder = Array.from(taskList.querySelectorAll('.task-item')).map(item => {
                return tasks[parseInt(item.getAttribute('data-index'))];
            });
            tasks = newOrder;
            saveTasksToLocalStorage();
            renderTasks(activeFilter);
        });
    }

    // Função auxiliar para determinar onde inserir a tarefa durante o drag
    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.task-item:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // Inicializar o gráfico e renderizar as tarefas
    initializeChart();
    renderTasks(activeFilter);

    // Iniciar verificação periódica de tarefas expiradas
    setInterval(checkExpiredTasks, 10000);
});
