const list = document.getElementById('tickets');
const emptyState = document.getElementById('empty-state');
const addTicketEmpty = document.getElementById('add-ticket-empty');
const addTicketSidebar = document.getElementById('add-ticket-sidebar');
const ticketFormPopup = document.getElementById('ticket-form-popup');
const closePopup = document.getElementById('close-popup');
const addManual = document.getElementById('add-ticket-manual');
const addAuto = document.getElementById('add-ticket-auto');
const contextMenu = document.getElementById('context-menu');
const editTicketBtn = document.getElementById('edit-ticket');
const deleteTicketBtn = document.getElementById('delete-ticket');

//inputs
const jiraLink = document.getElementById('jira-link');
const ticketIdInput = document.getElementById('ticket-id');
const ticketName = document.getElementById('ticket-name');
const veevaBinderLink = document.getElementById('veeva-binder-link');
const veevaPMLink = document.getElementById('veeva-pm-link');
const folderPath = document.getElementById('folder-path');
const folderButton = document.getElementById('select-folder');

let tickets = [];
let selectedTicketIndex = null;

window.addEventListener('DOMContentLoaded', async () => {
    tickets = await window.electronAPI.loadTickets();
    renderTicketList();
    updateView();

    addTicketEmpty.addEventListener('click', showPopup);
    closePopup.addEventListener('click', hidePopup);
    addManual.addEventListener("click", showManual);
    addTicketSidebar.addEventListener('click', showPopup);
    document.getElementById('cancel-ticket').addEventListener('click', hidePopup);
    // addAuto.onclick = autoAdd();
});

function showPopup() {
    ticketFormPopup.style.display = 'flex';
    document.getElementById('jira-link').focus();
    addManual.addEventListener("click", showManual);
}

function hidePopup() {
    ticketFormPopup.style.display = 'none';
    hideManual();
    clearForm();
    addManual.removeEventListener('click', manualAdd);
    selectedTicketIndex = null;
}

function showManual() {
    document.querySelectorAll(".manual-fields").forEach(el => {
        el.classList.remove("hidden");
    });

    addAuto.style.display = 'none';
    addManual.textContent = 'Enter';
    addManual.addEventListener('click', manualAdd);
}

folderButton.addEventListener("click", async () => {
    const folderPath = await window.electronAPI.selectFolder();
    if (folderPath) {
      document.getElementById("folder-path").value = folderPath;
    }
  });
  

function hideManual() {
    document.querySelectorAll(".manual-fields").forEach(el => {
        el.classList.add("hidden");
    });
    addAuto.style.display = 'flex';
    addManual.textContent = 'Enter manually';
}

function clearForm() {
    document.querySelectorAll("input").forEach(input => input.value = "");
  }

function updateView() {
    if (tickets.length === 0) {
        emptyState.style.display = 'flex';
        addTicketSidebar.style.display = 'none';
    } else {
        emptyState.style.display = 'none';
        addTicketSidebar.style.display = 'inline-block';
    }
}

async function manualAdd() {
    const ticket = {
        jiraLink: jiraLink.value.trim(),
        id: ticketIdInput.value.trim(),
        name: ticketName.value.trim(),
        veevaPMLink: veevaPMLink.value.trim(),
        veevaBinderLink: veevaBinderLink.value.trim(),
        folderPath: folderPath.value.trim(),
        manual: true,
    };

    if(!ticket.id || !ticket.name) {
        alert("At least the ticket ID and name are required!");
        return;
    }

    if (selectedTicketIndex !== null) {
        tickets[selectedTicketIndex] = ticket;
      } else {
        tickets.push(ticket);
      }

    await window.electronAPI.saveTickets(tickets);
    renderTicketList();
    hidePopup();
    if (selectedTicketIndex !== null) {
        highlightTicket(selectedTicketIndex);
      }
    updateView();
}

function showContextMenu(event, index) {
    event.preventDefault();
    selectedTicketIndex = index;
    contextMenu.style.display = 'block';
    contextMenu.style.left = `${event.pageX}px`;
    contextMenu.style.top = `${event.pageY}px`;
}

function hideContextMenu() {
    contextMenu.style.display = 'none';
}

function editTicket(index) {
    const currticket = tickets[index];
    ticketIdInput.value = currticket.id;
    ticketName.value = currticket.name;
    jiraLink.value = currticket.jiraLink || '';
    veevaPMLink.value = currticket.veevaPMLink || '';
    veevaBinderLink.value = currticket.veevaBinderLink || '';
    folderPath.value = currticket.folderPath || '';
    selectedTicketIndex = index;
    showPopup();
    if (currticket.manual === true) {
        showManual();
    }
}

async function deleteTicket(index) {
    if(confirm('Are you sure you want to delete this ticket?')) {
        console.log('deleting ticket at index: ', index);
        tickets.splice(index,1);
        renderTicketList();
        updateView();
        
        window.electronAPI.saveTickets(tickets)  // ✅ Persist change
    .catch((err) => {
      console.error("Failed to save after deletion", err);
    });
    }
}

editTicketBtn.addEventListener('click', () => {
    if (selectedTicketIndex !== -1) {
        editTicket(selectedTicketIndex);
        hideContextMenu();
    }
});

deleteTicketBtn.addEventListener('click', () => {
    if (selectedTicketIndex !== -1) {
        deleteTicket(selectedTicketIndex);
        hideContextMenu();
    }
});

document.addEventListener('click', hideContextMenu);

function createLinkIcon(url, title, iconPath) {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.title = `Open ${title}`;

    const img = document.createElement("img");
    img.src = iconPath;
    img.alt = title;
    img.classList.add("link-icon");

    a.appendChild(img);
    return a;
}


function renderTicketList() {
    list.innerHTML = "";

    tickets.forEach((ticket, index) => {
        const li = document.createElement("li");
        li.classList.add("ticket-item");

        // Header wrapper for layout
        const header = document.createElement("div");
        header.classList.add("ticket-header");

        // Title: ID — Name
        const title = document.createElement("span");
        title.textContent = `${ticket.id} — ${ticket.name}`;

        // Icon container
        const icons = document.createElement("div");
        icons.classList.add("icon-container");

        // Add icons if the respective links exist
        if (ticket.jiraLink) {
            const jiraIcon = createLinkIcon(ticket.jiraLink, "JIRA", "assets/icons/jira-icon.png");
            icons.appendChild(jiraIcon);
        }

        if (ticket.veevaPMLink) {
            const pmIcon = createLinkIcon(ticket.veevaPMLink, "Veeva PM", "assets/icons/veeva-icon.png");
            icons.appendChild(pmIcon);
        }

        if (ticket.veevaBinderLink) {
            const binderIcon = createLinkIcon(ticket.veevaBinderLink, "Veeva Binder", "assets/icons/veeva-icon.png");
            icons.appendChild(binderIcon);
        }

        // Assemble header
        header.appendChild(title);
        header.appendChild(icons);
        li.appendChild(header);

        // Interaction events
        li.onclick = () => highlightTicket(index);
        li.addEventListener('contextmenu', (e) => showContextMenu(e, index));

        list.appendChild(li);
    });

    emptyState.style.display = tickets.length > 0 ? 'none' : 'flex';
}


function highlightTicket(index) {
    selectedTicketIndex = index;
    const ticket = tickets[index];
  
    // Show dashboard
    document.getElementById("ticket-dashboard").classList.remove("hidden");
    emptyState.style.display = "none";
  
    // Fill in values
    document.getElementById("dashboard-title").textContent = ticket.name || "(Untitled)";
    document.getElementById("dashboard-id").textContent = ticket.id || "";
    document.getElementById("dashboard-jira").href = ticket.jiraLink || "#";
    document.getElementById("dashboard-pm").href = ticket.veevaPMLink || "#";
    document.getElementById("dashboard-binder").href = ticket.veevaBinderLink || "#";
    document.getElementById("dashboard-folder").textContent = ticket.folderPath || "(none)";
    document.getElementById("open-folder").onclick = () => {
      if (ticket.folderPath) {
        window.electronAPI.openFolder(ticket.folderPath);
      }
    };
  
    // Highlight selected
    document.querySelectorAll("#tickets li").forEach((el, i) => {
      el.classList.toggle("active", i === index);
    });
    const fileListContainer = document.getElementById("file-list");
fileListContainer.innerHTML = "";

if (ticket.folderPath) {
  window.electronAPI.getFolderContents(ticket.folderPath).then(files => {
    if (!files.length) {
      fileListContainer.textContent = "(Empty folder)";
      return;
    }

    files.forEach(file => {
        const el = document.createElement("div");
        el.classList.add("file-list-item");
      
        let icon = "🧾"; // default
      
        if (file.isDir) {
          icon = "📁";
        } else if (file.name.toLowerCase().endsWith(".html")) {
          icon = "🌐";
        } else if (file.name.toLowerCase().endsWith(".pdf")) {
          icon = "📄";
        } else if (file.name.toLowerCase().endsWith(".docx") || file.name.toLowerCase().endsWith(".doc")) {
          icon = "📑";
        }
      
        el.textContent = `${icon} ${file.name}`;
        el.onclick = () => {
          window.electronAPI.openPath(file.fullPath);
        };
      
        fileListContainer.appendChild(el);
      });
      
  });
} else {
  fileListContainer.textContent = "(No folder selected)";
}

  }
  