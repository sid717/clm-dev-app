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
const archiveTicketBtn = document.getElementById('archive-ticket');
const generateMessageBtn = document.getElementById('generate-message');
const deleteTicketBtn = document.getElementById('delete-ticket');
const tabBar = document.getElementById('tab-bar');
const tabContent = document.getElementById('tab-content');
const metadataCheckLink = "https://gsk-contentlab.veevavault.com/ui/#reporting/viewer/0RP0000000QS001";
const metadataCustomLink = "https://gsk-contentlab.veevavault.com/ui/#reporting/viewer/0RP0000000QS001?Binder.document_number__v%2C%2C%2CEQ=";

let openTabs = [];
let activeTabId = null;

const jiraLink = document.getElementById('jira-link');
const ticketIdInput = document.getElementById('ticket-id');
const ticketName = document.getElementById('ticket-name');
const veevaBinderLink = document.getElementById('veeva-binder-link');
const veevaPMName = document.getElementById('veeva-pm-name');
const veevaPMID = document.getElementById('veeva-pm-id');
const veevaBinderID = document.getElementById('veeva-binder-id');
const veevaPMLink = document.getElementById('veeva-pm-link');
const folderPath = document.getElementById('folder-path');
const folderButton = document.getElementById('select-folder');
let manual = true;

let tickets = [];
let selectedTicketIndex = null;

window.addEventListener('DOMContentLoaded', async () => {
  tickets = await window.electronAPI.loadTickets();
  await window.electronAPI.registerTicketFolders(tickets);
  renderTicketList();
  updateView();

  addTicketEmpty.addEventListener('click', showPopup);
  closePopup.addEventListener('click', hidePopup);
  addManual.addEventListener("click", showManual);
  addTicketSidebar.addEventListener('click', () => {
    selectedTicketIndex = null;
    showPopup(true);
  });
  document.getElementById('cancel-ticket').addEventListener('click', hidePopup);
});



function showPopup(isnew = false) {
  if (isnew) {
    selectedTicketIndex = null;
    selectedTicketId = null;
    clearForm(); // optional
  }
  manual = false;
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
  manual = true;

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
  manual = false;
}

function clearForm() {
  document.querySelectorAll("input").forEach(input => input.value = "");
}

ticketFormPopup.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    if (document.activeElement.id === 'jira-link' || manual === false) {
      e.preventDefault();
      autoAdd(jiraLink.value.trim());
    } else if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || manual === true) {
      e.preventDefault();
      manualAdd();
    }
  }
});

function updateView() {
  if (tickets.length === 0) {
    emptyState.style.display = 'flex';
    addTicketSidebar.style.display = 'none';
  } else {
    emptyState.style.display = 'none';
    addTicketSidebar.style.display = 'inline-block';
  }
}

addAuto.addEventListener('click', async () => {
  const jiraLink = document.getElementById('jira-link').value.trim();
  if (jiraLink) {
    await autoAdd(jiraLink);
  }
  else {
    showToast("Please enter a JIRA link.");
  }
});
async function getPmIdFromJira(jiraLink) {
  try {
    const response = await fetch(jiraLink, { credentials: "include" });
    const html = await response.text();
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    if (!titleMatch) return null;
    const title = titleMatch[1];

    // This regex matches PM- followed by letters/dashes/numbers, then an underscore or dash, then numbers
    const pmIdMatch = title.match(/(PM-[A-Z0-9\-]+-\d+)/i);
    return pmIdMatch ? pmIdMatch[1] : null;
  } catch (err) {
    console.error("Failed to fetch JIRA page:", err);
    return null;
  }
}
async function autoAdd(jiraLink) {
  const match = jiraLink.match(/\/browse\/([A-Z0-9\-]+)/i);
  const ticket = {
    jiraLink: jiraLink,
    id: match ? match[1] : "",
    name: ticketName.value.trim(),
    veevaPMLink: veevaPMLink.value.trim(),
    veevaPMID: await getPmIdFromJira(jiraLink),
    veevaBinderID: veevaBinderID.value.trim(),
    veevaBinderLink: veevaBinderLink.value.trim(),
    folderPath: folderPath.value.trim(),
    manual: false,
    archived: false,
  }

  if (!ticket.id) {
    showToast("At least the ticket ID is required!");
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
    openTicketTab(selectedTicketIndex);
  }
  updateView();
}
async function manualAdd() {
  const ticket = {
    jiraLink: jiraLink.value.trim(),
    id: ticketIdInput.value.trim(),
    name: ticketName.value.trim(),
    veevaPMLink: veevaPMLink.value.trim(),
    veevaPMID: veevaPMID.value.trim(),
    veevaBinderID: veevaBinderID.value.trim(),
    veevaBinderLink: veevaBinderLink.value.trim(),
    folderPath: folderPath.value.trim(),
    manual: true,
    archived: false,
  };

  if (!ticket.id || !ticket.name) {
    showToast("At least the ticket ID and name are required!");
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
    openTicketTab(selectedTicketIndex);
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

async function copyTextToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    console.log('Text copied to clipboard');
  } catch (err) {
    console.error('Failed to copy text: ', err);
  }
}

function generateMessage(index) {
  const currticket = tickets[index];
  const message = `Hello @! \n\nThe task has been completed and the ticket can be moved to [next process].\n
  \nTicket Name: ${currticket.name}
  \nTicket ID: ${currticket.id}
  \nMCP Number: ${currticket.veevaPMID || 'N/A'}
  \n\nThank you!\n\ncc @`;
  copyTextToClipboard(message);
  showToast('📝 Message copied to clipboard!');
}

generateMessageBtn.addEventListener('click', () => {
  if (selectedTicketIndex !== -1) {
    generateMessage(selectedTicketIndex);
    hideContextMenu();
  }
});

function showToast(message, duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'custom-toast';
  toast.textContent = message;

  // Optional: Add some basic styling
  toast.style.background = '#252526';
  toast.style.color = '#fff';
  toast.style.padding = '12px 24px';
  toast.style.marginTop = '8px';
  toast.style.borderRadius = '4px';
  toast.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
  toast.style.fontSize = '15px';
  toast.style.opacity = '0';
  toast.style.transition = 'opacity 0.2s';

  container.appendChild(toast);

  // Fade in
  setTimeout(() => { toast.style.opacity = '1'; }, 10);

  // Remove after duration
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 200);
  }, duration);
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
  if (confirm('Are you sure you want to delete this ticket?')) {
    console.log('deleting ticket at index: ', index);
    showToast('🗑️ Ticket deleted successfully!');
    tickets.splice(index, 1);
    renderTicketList();
    updateView();

    window.electronAPI.saveTickets(tickets)
      .catch((err) => {
        console.error("Failed to save after deletion", err);
      });
    if (selectedTicketIndex === index) {
      document.getElementById("ticket-dashboard").classList.add("hidden");
      selectedTicketIndex = null;
    } else if (selectedTicketIndex > index) {
      // Adjust selection if needed
      selectedTicketIndex--;
    }
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
  a.onclick = (e) => {
    e.preventDefault();
    window.electronAPI.openLink(url);
  };
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
      const binderIcon = createLinkIcon(ticket.veevaBinderLink, "Veeva Binder", "assets/icons/veeva-binder-icon-1.png");
      binderIcon.querySelector('img').classList.add('binder-icon');
      icons.appendChild(binderIcon);
    }
    if (ticket.folderPath) {
      const qrLink = document.createElement("a");
      qrLink.href = "#";
      qrLink.title = "Show QR code for this ticket";

      const qrImg = document.createElement("img");
      qrImg.src = "assets/icons/qr-icon.png";
      qrImg.alt = "QR";
      qrImg.classList.add("link-icon");

      qrLink.appendChild(qrImg);

      qrLink.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        showQrForTicket(ticket);
      };

      icons.appendChild(qrLink);
    }

    // Assemble header
    header.appendChild(title);
    header.appendChild(icons);
    li.appendChild(header);

    // Interaction events
    li.onclick = () => openTicketTab(index);
    li.addEventListener('contextmenu', (e) => showContextMenu(e, index));

    list.appendChild(li);
  });

  emptyState.style.display = tickets.length > 0 ? 'none' : 'flex';
}
function isValidHttpUrl(str) {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) {
    return false;
  }
}

// Usage in createLinkIcon
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
  a.onclick = (e) => {
    e.preventDefault();
    if (isValidHttpUrl(url)) {
      window.electronAPI.openLink(url);
    } else {
      showToast("Invalid or empty link. Please enter a valid URL.");
    }
  };
  return a;
}

function openTicketTab(index) {
  selectedTicketIndex = index;
  const ticket = tickets[index];
  if (!ticket) return;

  document.getElementById("ticket-dashboard").classList.remove("hidden");
  emptyState.style.display = "none";

  // Render sub-tabs
  document.getElementById("ticket-dashboard").innerHTML = `
    <div class="dashboard-tab-bar">
        <button class="dashboard-tab active" data-tab="overview">Overview</button>
        <button class="dashboard-tab" data-tab="preview">Preview</button>
    </div>
    <div class="dashboard-tab-content" id="dashboard-overview">
        <h2 id="dashboard-title">${ticket.name || "(Untitled)"}</h2>
        <div class="dashboard-section">
        <button class="primary-button" id="edit-files">✏️ Edit in VS Code</button>
        <button id="metadata-check" class="primary-button">🔍 Check Metadata</button>
        <button id="create-smart-eda" class="primary-button">🤖 Create Smart EDA</button>
        <button id="Generate Thumbnails" class="primary-button"">📷 Generate Thumbnails</button>
        <button id="Generate ZIPs" class="primary-button">🗂️ Generate ZIPs</button>
        </div>
        <div class="dashboard-section">
            <strong>Folder Contents: <button id="open-folder">📁 Open</button><br><br></strong>
            <div id="file-list" class="file-list"></div>
        </div>
        <div class="dashboard-section">
            <strong>ID:</strong> <span id="dashboard-id">${ticket.id || ""}</span>
        </div>
        <!--div class="dashboard-section">
            <strong>Folder Path:</strong>
            <span id="dashboard-folder">${ticket.folderPath || "(none)"}</span>
            <button id="open-folder">📁 Open</button>
        </div-->
    </div>
    <div class="dashboard-tab-content hidden" id="dashboard-preview">
        <div id="preview-thumbnails" class="preview-thumbnails"></div>
    </div>
`;

  const tabButtons = document.querySelectorAll('.dashboard-tab');
  tabButtons.forEach(btn => {
    btn.onclick = () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.dashboard-tab-content').forEach(tabContent => {
        tabContent.classList.add('hidden');
      });
      document.getElementById(`dashboard-${btn.dataset.tab}`).classList.remove('hidden');

      if (btn.dataset.tab === 'preview') {
        loadPreviewThumbnails(ticket);
      }
    };
  });
  document.getElementById('edit-files').onclick = () => {
    if (ticket.folderPath) {
      window.electronAPI.openInVSCode(ticket.folderPath);
    } else {
      showToast("No folder path set for this ticket.");
    }
  };

  const metadataCheckBtn = document.getElementById('metadata-check');
  if (metadataCheckBtn) {
    metadataCheckBtn.onclick = () => {
      window.electronAPI.openLink(metadataCheckLink);
    };
  }


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
          window.electronAPI.openFolder(file.fullPath);
        };

        fileListContainer.appendChild(el);
      });

    });
  } else {
    fileListContainer.textContent = "(No folder selected)";
  }

}

function loadPreviewThumbnails(ticket) {
  const container = document.getElementById('preview-thumbnails');
  container.innerHTML = '';
  if (!ticket.folderPath) {
    container.textContent = '(No folder selected)';
    return;
  }
  window.electronAPI.getFolderContents(ticket.folderPath).then(files => {
    const folders = files.filter(f => f.isDir);
    if (!folders.length) {
      container.textContent = '(No subfolders found)';
      return;
    }

    // Collect all thumbs first
    let thumbInfos = [];
    let processed = 0;

    folders.forEach((folder, idx) => {
      window.electronAPI.getFolderContents(folder.fullPath).then(subFiles => {
        const thumb = subFiles.find(f => !f.isDir && f.name.toLowerCase() === 'thumb.png');
        if (thumb) {
          // Label extraction logic (from previous answer)
          let label = folder.name;
          const lower = folder.name.toLowerCase();
          if (lower === 'shared') {
            label = 'shared';
          } else {
            let match = folder.name.match(/_(\d+)$/);
            if (match) {
              label = match[1];
            } else {
              match = folder.name.match(/_vertical$/i);
              if (match) {
                label = 'VERTICAL';
              }
            }
          }
          thumbInfos.push({ label, fullPath: thumb.fullPath });
        }
        processed++;
        if (processed === folders.length) {
          // All folders processed, now render
          if (!thumbInfos.length) {
            container.textContent = '(No thumbnails found)';
            return;
          }
          thumbInfos.forEach((info, i) => {
            const thumbDiv = document.createElement('div');
            thumbDiv.className = 'thumbnail-container';
            thumbDiv.innerHTML = `
                          <div class="thumbnail-label">${info.label}</div>
                          <img src="file://${info.fullPath}" class="thumbnail-img" alt="Thumbnail for ${info.label}">
                      `;
            // Click to open carousel
            thumbDiv.querySelector('.thumbnail-img').onclick = () => {
              openThumbnailCarousel(thumbInfos, i);
            };
            container.appendChild(thumbDiv);
          });
        }
      });
    });
  });
}

// Modal state
let carouselThumbnails = [];
let carouselIndex = 0;

function openThumbnailCarousel(thumbnails, startIdx) {
  carouselThumbnails = thumbnails;
  carouselIndex = startIdx;

  const modal = document.getElementById('thumbnail-modal');
  const imagesDiv = modal.querySelector('.carousel-images');
  imagesDiv.innerHTML = '';

  thumbnails.forEach((thumb, idx) => {
    // Wrap image and label together
    const wrapper = document.createElement('div');
    wrapper.className = 'carousel-image-wrapper';
    wrapper.style.display = idx === startIdx ? 'flex' : 'none';
    wrapper.style.flexDirection = 'column';
    wrapper.style.alignItems = 'center';

    const img = document.createElement('img');
    img.src = "file://" + thumb.fullPath;
    img.className = 'carousel-img';

    const labelDiv = document.createElement('div');
    labelDiv.className = 'carousel-label';
    labelDiv.textContent = thumb.label;

    const editBtn = document.createElement('button');
    editBtn.className = 'primary-button';
    editBtn.style.marginTop = '10px';
    editBtn.textContent = '✏️ Edit in VS Code';
    editBtn.onclick = () => {
      const folderPath = thumb.fullPath.replace(/[/\\]thumb\.png$/i, '');
      const indexPath = window.require ? window.require('path').join(folderPath, 'index.html') : folderPath + '/index.html';
      window.electronAPI.openInVSCode(indexPath);
    };



    wrapper.appendChild(img);
    wrapper.appendChild(labelDiv);
    wrapper.appendChild(editBtn);

    imagesDiv.appendChild(wrapper);
  });
  modal.classList.remove('hidden');
  updateCarousel();

  // Focus for keyboard navigation
  setTimeout(() => { modal.focus(); }, 50);
}

// Show/hide correct image
function updateCarousel() {
  const modal = document.getElementById('thumbnail-modal');
  const wrappers = modal.querySelectorAll('.carousel-image-wrapper');
  wrappers.forEach((wrapper, idx) => {
    wrapper.style.display = idx === carouselIndex ? 'flex' : 'none';
  });
}

// Close modal
function closeCarousel() {
  document.getElementById('thumbnail-modal').classList.add('hidden');
  carouselThumbnails = [];
  carouselIndex = 0;
}

// Navigation
function prevCarousel() {
  if (!carouselThumbnails.length) return;
  carouselIndex = (carouselIndex - 1 + carouselThumbnails.length) % carouselThumbnails.length;
  updateCarousel();
}
function nextCarousel() {
  if (!carouselThumbnails.length) return;
  carouselIndex = (carouselIndex + 1) % carouselThumbnails.length;
  updateCarousel();
}

// Event listeners
document.getElementById('thumbnail-modal').addEventListener('click', function (e) {
  if (e.target.classList.contains('carousel-backdrop')) closeCarousel();
});
document.querySelector('.carousel-close').onclick = closeCarousel;
document.querySelector('.carousel-arrow.left').onclick = prevCarousel;
document.querySelector('.carousel-arrow.right').onclick = nextCarousel;

// Keyboard navigation
window.addEventListener('keydown', function (e) {
  const modal = document.getElementById('thumbnail-modal');
  if (modal.classList.contains('hidden')) return;
  if (e.key === 'ArrowLeft') prevCarousel();
  else if (e.key === 'ArrowRight') nextCarousel();
  else if (e.key === 'Escape') closeCarousel();
});

async function showQrForTicket(ticket) {
  try {
    console.log("QR requested for ticket:", ticket);
    if (!ticket.folderPath) {
      showToast("No folder set for this ticket.");
      return;
    }
    const url = await window.electronAPI.getTicketPreviewUrl(ticket.id);
    const qrDataUrl = await window.electronAPI.generateQrDataUrl(url);

    // Modal or popover
    const qrModal = document.createElement('div');
    qrModal.className = 'qr-modal';
    qrModal.innerHTML = `
    <div class="qr-backdrop"></div>
    <div class="qr-content">
      <img src="${qrDataUrl}" alt="QR Code" />
      <p>Scan to open:<br><a id="preview-link" href="${url}" target="_blank">${url}</a></p>
      <script> document.getElementById('preview-link').addEventListener('click', window.electronAPI.previewUrl(url)); </script>
      <button class="qr-close primary-button">Close</button>
    </div>
  `;
    document.body.appendChild(qrModal);
    qrModal.querySelector('.qr-close').onclick = () => qrModal.remove();
    qrModal.querySelector('.qr-backdrop').onclick = () => qrModal.remove();
  } catch (err) {
    showToast("Could not generate QR code: " + err.message);
  }
}