const nameDiv = document.querySelector("name")
const already = document.querySelector(".already")
const orderProjects = document.querySelector(".order-projects")
let data
window.addEventListener("load", async () => {
        let db = new Localbase('db')
            const datas = await db.collection("projects").orderBy('entryDate', 'desc').get()
                    
    if(localStorage.getItem("project-names") === "undefined" || localStorage.getItem("project-names") === "" ){
        let projectNames = []
        datas.forEach(data => projectNames.push(data.name))
        localStorage.setItem("project-names",JSON.stringify(projectNames))
    }


    orderProjects.innerHTML =  `
    ${datas.map(dat =>{
        return `
        <button>
            <div><img src=${dat.object[0].backgroundImage} alt="Image Not Found"></div>
            <p>${dat.name}</p>
        </button>
        `
    }).join("")
}
    `
    orderProjects.querySelectorAll("button").forEach(button=>{
        button.addEventListener("click",()=>{
    const name =  button.querySelector("p").textContent
    try {
        const encoded = encodeURIComponent(name);
        window.location.href = `index.html?data=${encoded}`;
    } catch (error) {
        console.error("Failed to encode data:", error);
    }
    })
    })
    
})

document.getElementById("new-project").addEventListener("click",()=>{
data = []
nameDiv.display = "flex"
})
document.querySelector("#upload-project input").addEventListener("change",async (e)=>{
  const file = e.target.files[0];
   const reader = new FileReader()
  reader.readAsText(file)
  reader.onload = async()=>{
    const jsonData = JSON.parse(reader.result)
        const projectName = file.name.trim()
        const names = JSON.parse(localStorage.getItem("project-names"))

    if(projectName === "" || names.includes(projectName)){
     data = jsonData
nameDiv.display = "flex" 
nameInput = document.getElementById("name").value = projectName
already.textContent = "Invalid Name Input Another"
return  
    }
    saveAndSend(projectName,jsonData)

  }


})
async function proceed(){
    const nameInput = document.getElementById("name").value.trim()
    if(nameInput === ""){
        already.textContent = "Input Name"
        return
    }
    const names = JSON.parse(localStorage.getItem("project-names"))
    if(names.includes(nameInput)){
        already.textContent = "Name Already Exists"
        return
    }
    saveAndSend(nameInput,data)

}
async function saveAndSend(name,data){
    const names = JSON.parse(localStorage.getItem("project-names"))
    localStorage.setItem("project-names",JSON.stringify([...names,name]))
    let db = new Localbase('db')
    await db.collection("projects").add({
        name: name,
        object: data,
        entryDate: (new Date()).getTime()
    })
    try {
        const encoded = encodeURIComponent(name);
        window.location.href = `index.html?data=${encoded}`;
    } catch (error) {
        console.error("Failed to encode data:", error);
    }
}