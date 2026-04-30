const circleFill = document.querySelector('.circle-fill');
const percentageDisplay = document.getElementById('percentageDisplay');
const usedDisplay = document.getElementById('usedDisplay');
const quotaDisplay = document.getElementById('quotaDisplay');
const remainingDisplay = document.getElementById('remainingDisplay');
const storageTypeSpan = document.getElementById('storageType');
const statusDiv = document.getElementById('statusMessage');
            let db = new Localbase('db')
// Helper: Convert bytes to human readable format
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    // Show 2 decimal places for MB and up, 0 for smaller units
    const decimals = i >= 2 ? 2 : 0;
    const val = parseFloat((bytes / Math.pow(k, i)).toFixed(decimals));
    return `${val} ${sizes[i]}`;
}

// Helper: Convert bytes to MB with 1 decimal (for display inside stats)
function toMB(bytes) {
    return (bytes / 1024 / 1024).toFixed(2);
}

// Update status color and text based on usage percent
function updateStatusColor(percent, remainingMB) {
    statusDiv.classList.remove('good', 'warning', 'danger');
    
    if (percent < 50) {
        statusDiv.classList.add('good');
        statusDiv.innerHTML = `✅ Excellent! You have plenty of space left (${remainingMB} MB free). Keep building!`;
    } else if (percent < 80) {
        statusDiv.classList.add('warning');
        statusDiv.innerHTML = `⚠️ Storage is filling up (${remainingMB} MB remaining). Consider cleaning old data soon.`;
    } else {
        statusDiv.classList.add('danger');
        statusDiv.innerHTML = `🔥 Critical: Only ${remainingMB} MB left! Your app may stop saving data soon.`;
    }
}

// Check if storage is persistent
async function checkPersistence() {
    if ('storage' in navigator && 'persisted' in navigator.storage) {
        const isPersisted = await navigator.storage.persisted();
        if (isPersisted) {
            storageTypeSpan.innerHTML = 'Persistent';
            storageTypeSpan.style.color = '#276749';
        } else {
            storageTypeSpan.innerHTML = 'Temporary';
            storageTypeSpan.style.color = '#c05621';
        }
        return isPersisted;
    } else {
        storageTypeSpan.innerHTML = 'Unknown';
        return false;
    }
}

// Main function to update storage info
async function updateStorageInfo() {
    // Check if API is available
    if (!('storage' in navigator) || !('estimate' in navigator.storage)) {
        statusDiv.innerHTML = '❌ Your browser doesn\'t support the Storage API. Try Chrome, Edge, or Safari.';
        percentageDisplay.textContent = '?';
        usedDisplay.textContent = 'N/A';
        quotaDisplay.textContent = 'N/A';
        remainingDisplay.textContent = 'N/A';
        return;
    }

    try {
        // Get storage estimate
        const estimate = await navigator.storage.estimate();
        const usage = estimate.usage || 0;
        const quota = estimate.quota || 0;
        
        // Calculate values
        const usedMB = toMB(usage);
        const quotaMB = toMB(quota);
        const remaining = quota - usage;
        const remainingMB = toMB(remaining);
        const percentUsed = (usage / quota) * 100;
        
        // Update text displays
        percentageDisplay.textContent = `${Math.round(percentUsed)}%`;
        usedDisplay.textContent = `${usedMB} MB`;
        quotaDisplay.textContent = `${quotaMB} MB`;
        remainingDisplay.textContent = `${remainingMB} MB`;
        
        // Update status and color
        updateStatusColor(percentUsed, remainingMB);
        
        // Update circle progress animation
        const circumference = 2 * Math.PI * 42; // r=42, circumference = 263.89
        const offset = circumference - (percentUsed / 100) * circumference;
        circleFill.style.strokeDasharray = `${circumference}`;
        circleFill.style.strokeDashoffset = `${offset}`;
        
        // Also show IndexedDB specific usage if available
        if (estimate.usageDetails && estimate.usageDetails.indexedDB) {
            const indexedDBUsage = estimate.usageDetails.indexedDB;
            const idbMB = toMB(indexedDBUsage);
            // You could display this in a tooltip or a secondary element if desired.
        }
        
        // Check persistence status
        await checkPersistence();
        
    } catch (error) {
        console.error('Error fetching storage info:', error);
        statusDiv.innerHTML = '⚠️ Unable to read storage information. Please refresh and try again.';
        percentageDisplay.textContent = '?';
    }
}

// Initial load
updateStorageInfo();

// Optional: Auto-refresh every 10 seconds (can be removed if not needed)
setInterval(updateStorageInfo, 10000); // Refreshes every 10 seconds


async function importData(){
try{

            const datas = await db.collection("projects").orderBy('entryDate', 'desc').get()
            const projects = localStorage.getItem("project-names");
            if (!projects || projects === "undefined") {
        let projectNames = []
        datas.forEach(data => projectNames.push(data.name))
        localStorage.setItem("project-names",JSON.stringify([...projectNames]))
    }

    const orderProjects = document.querySelector(".order-projects")
if(datas.length <= 0) return 

    orderProjects.innerHTML =  `${datas.map(dat =>{
        return `
        <div class="objects">
            <div class="objects1"><img src=${dat?.object?.[0]?.backgroundImage || ""} alt="Image Not Found"></div>
            <p>${dat.name}</p>
            <div class="objects2">
                <button class="export">Export</button>
                <button class="delete">Delete</button>
            </div>
        </div>
        `
    }).join("")
}`
document.querySelectorAll(".objects").forEach(button=>{
    const name = button.querySelector("p").textContent
    button.querySelector(".export").addEventListener("click",async ()=>{
    const data = await db.collection("projects").doc({name:name}).get()
    const stringFied = JSON.stringify(data);
    
  const blob = new Blob([stringFied], { type: "application/json" });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click()
})
button.querySelector(".delete").addEventListener("click",async()=>{
    await db.collection("projects").doc({name:name}).delete()
    let projects = JSON.parse(localStorage.getItem("project-names"));
    let index = projects.indexOf(name);
    if (index > -1) {
        projects.splice(index, 1);
    }
    localStorage.setItem("project-names", JSON.stringify(projects));
    alert(`${name} has been deleted`)
})
button.addEventListener("click",async()=>{
        try {
        const encoded = encodeURIComponent(name);
        window.location.href = `project.html?data=${encoded}`;
    } catch (error) {
        console.error("Failed to encode data:", error);
    }
})
})
}
catch(error){
    console.error("Error importing data:", error);
}
}
importData()