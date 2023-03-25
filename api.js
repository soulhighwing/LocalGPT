
function makeStreamApiCall() {
	isStreaming = true;
	
	const API_KEY = document.getElementById("apikey").value;
	const API_URL = "https://api.openai.com/v1/chat/completions";
	const xhr = new XMLHttpRequest();
	xhr.open("POST", API_URL, true);
	xhr.setRequestHeader("Content-Type", "application/json");
	xhr.setRequestHeader("Authorization", `Bearer ${API_KEY}`);
	xhr.setRequestHeader('Accept', 'text/event-stream');
	const promptrole = document.getElementById('defaultselect').value;
	const promptstring=document.getElementById('predefineprompt').value;
	const userstring = document.getElementById('userinput').value;
	const reqBody = {
		messages: [
			...buildContextString(),
			{ "role": promptrole, "content": promptstring },
			{ "role": "user", "content": userstring }],
		model: document.getElementById("model").value,
		max_tokens: parseInt(document.getElementById("max_tokens").value),
		temperature: parseFloat(document.getElementById("temperature").value),
		top_p: parseFloat(document.getElementById("top_p").value),
		stream: true,
	};
	const parentresponsContainer = document.getElementById('response');

	const promptContainer = createResponse(promptrole, promptstring);
	parentresponsContainer.appendChild(promptContainer);
	parentresponsContainer.scrollTop = promptContainer.offsetTop - parentresponsContainer.offsetTop;

	const userContainer = createResponse('user', userstring);
	parentresponsContainer.appendChild(userContainer);
	parentresponsContainer.scrollTop = userContainer.offsetTop - parentresponsContainer.offsetTop;

	const responseContainer = createResponse('assistant', '...');
	parentresponsContainer.appendChild(responseContainer);
	parentresponsContainer.scrollTop = responseContainer.offsetTop - parentresponsContainer.offsetTop;

	xhr.onreadystatechange = function () {
		if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
			isStreaming = false;
			showStatus("Stream request completed successfully.");
		}

	};

	xhr.onprogress = function (event) {
		if (xhr.status === 401 || xhr.status === 429) {
			const errorinfo = JSON.parse(xhr.responseText);
			console.log(errorinfo);
			const lastChild = responseContainer.lastChild;
			lastChild.innerHTML = errorinfo.error.message;
			showStatus(xhr.status);
			isStreaming = false;
			return;
		}

		const responseText = xhr.responseText.trim();
		if (responseText.length > 0) {
			let buffer = '';
			let responseJson;
			let lines = responseText.split('\n');
			for (let i = 0; i < lines.length; i++) {
				let line = lines[i].trim();
				if (line.startsWith('data:')) {
					line = line.substring(5).trim();
					if (line != '[DONE]') {
						responseJson = JSON.parse(line);
						if (responseJson.choices[0].delta.content)
							buffer += responseJson.choices[0].delta.content;
					}
				};
			};
			const lastChild = responseContainer.lastChild;
			lastChild.innerHTML = buffer;
			//console.log(parentresponsContainer.scrollTop ,responseContainer.offsetTop , parentresponsContainer.offsetTop);
			parentresponsContainer.scrollTop = responseContainer.offsetTop - parentresponsContainer.offsetTop;

		} else {
			isStreaming = false;
			showStatus("Stream request completed.");
		}
	};

	xhr.send(JSON.stringify(reqBody));
}



function createResponse(role, context) {
	// create the container div
	const container = document.createElement('div');
	container.classList.add('LocalGPTrespons-container');

	// create the role img
	const roleImg = document.createElement('img');
	roleImg.classList.add('LocalGPTrole');
	roleImg.src = role + '.png';
	roleImg.title = role;
	roleImg.addEventListener('click', function () {
		// rotate the roles "user", "assistant", "system"
		const roles = ["user", "assistant", "system"];
		const currentRole = roles.indexOf(roleImg.title);
		const nextRole = (currentRole + 1) % roles.length;
		roleImg.title = roles[nextRole];
		roleImg.src = roles[nextRole] + '.png';
	});

	// create the context div
	const contextDiv = document.createElement('div');
	contextDiv.classList.add('LocalGPTcontext');
	contextDiv.textContent = context;


	// append the elements to the container
	container.appendChild(roleImg);
	container.appendChild(contextDiv);
	contextDiv.addEventListener('click', function (event) {
		//console.log(this, event.target.parentElement);
		// Check if the div is already selected
		if (this.style.backgroundColor === 'yellow') {
			// Switch back to original color
			this.style.backgroundColor = '';
		} else {
			// Set the background color of the clicked div
			this.style.backgroundColor = 'yellow';
		}
	});

	// return the container element
	return container;
}



function exportContextToFile() {
	const contexts = buildContextString();
	if (contexts.length <= 0) {
		alert('Please select the context you want to save.');
		return;
	}

	const file = new Blob([JSON.stringify(contexts)], { type: 'application/json' });
	const url = URL.createObjectURL(file);

	const link = document.createElement('a');
	link.href = url;
	link.download = 'chat_history_data.json';
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}

function importContextFromFile() {
	const fileInput = document.createElement("input");
	fileInput.type = "file";
	fileInput.accept = ".json";
	fileInput.addEventListener('change', event => {
		const file = event.target.files[0];
		const reader = new FileReader();
		reader.addEventListener('load', event => {
			const newContexts = JSON.parse(reader.result);
			//console.log(newContexts);
			//load the context and append them at the end of respons area
			newContexts.forEach((context) => {
				const newchat = createResponse(context.role, context.content);
				document.getElementById('response').appendChild(newchat);
			});
		});
		reader.readAsText(file);
	});


	// Click the input element to trigger the file selection dialog
	fileInput.click();

}



function buildContextString() {
	const checkboxes = document.querySelectorAll('.LocalGPTcontext[style="background-color: yellow;"]');
	const data = [];
	if (checkboxes.length == 0) {
		return data;
	}
	checkboxes.forEach((checkbox) => {
		const container = checkbox.closest('.LocalGPTrespons-container');
		//console.log(container);
		const role = container.querySelector('.LocalGPTrole').title;
		const content = container.querySelector('.LocalGPTcontext').textContent;
		data.push({ "role": role, "content": content });
	});

	return data;

}

function showStatus(status) {
	// Display the status message
	document.getElementById('status').textContent = status;
	setTimeout(function () {
		document.getElementById('status').textContent = '';
	}, 5000);
}


document.getElementById("predefineprompt").addEventListener("input", function () {
	this.style.height = "auto";
	this.style.height = (this.scrollHeight) + "px";
});

document.getElementById("predefineprompt").addEventListener("blur", function () {
	this.style.removeProperty('height');
});

document.getElementById("predefineprompt").addEventListener("focus", function () {
	this.style.height = "auto";
	this.style.height = (this.scrollHeight) + "px";
});


function loadProfilesFromFile(filename) {
	const xhr = new XMLHttpRequest();
	xhr.open('GET', filename);
	xhr.onload = () => {
		if (xhr.status === 200) {
			const newProfiles = JSON.parse(xhr.responseText);
			//load the profiles and append them at the end of response area
			newProfiles.forEach((profile) => {
				profiles.push(profile);
			});
			//load the profiles to the select box
			profiles.forEach((profile) => {
				const option = document.createElement("option");
				option.text = profile.savecustom;
				option.value = profile.savecustom;
				select.add(option);
			});
		} else {
			console.error(`Failed to [load profiles] from ${filename}: ${xhr.status}`);
		}
	};
	xhr.send();
}


function createProfile(name, content) {
	// create the container div
	const container = document.createElement('div');
	container.classList.add('LocalGPTrespons-container');

	// create the role img
	const roleImg = document.createElement('img');
	roleImg.classList.add('LocalGPTrole');
	roleImg.src = role + '.png';
	roleImg.title = role;
	roleImg.addEventListener('click', function () {
		// rotate the roles "user", "assistant", "system"
		const roles = ["user", "assistant", "system"];
		const currentRole = roles.indexOf(roleImg.title);
		const nextRole = (currentRole + 1) % roles.length;
		roleImg.title = roles[nextRole];
		roleImg.src = roles[nextRole] + '.png';
	});

	// create the context div
	const contextDiv = document.createElement('div');
	contextDiv.classList.add('LocalGPTcontext');
	contextDiv.textContent = context;


	// append the elements to the container
	container.appendChild(roleImg);
	container.appendChild(contextDiv);
	contextDiv.addEventListener('click', function (event) {
		//console.log(this, event.target.parentElement);
		// Check if the div is already selected
		if (this.style.backgroundColor === 'yellow') {
			// Switch back to original color
			this.style.backgroundColor = '';
		} else {
			// Set the background color of the clicked div
			this.style.backgroundColor = 'yellow';
		}
	});

	// return the container element
	return container;
}




function appendProfilelistUI(newprofiles) {
	// Get the profile list element
	const profileList = document.getElementById('LocalGPTprofiles-list');
	// Loop through each profile and create a list item element for it
	newprofiles.forEach(function (profile, index) {
		//profie list 界面需要的内容包括以下：每个profile 包括 1. 标题 2. 内容 3. 一个删除按钮用来删除该profile，删除按钮应该在标题最右侧 点击标题，可以展开或收起关联内容，点击内容，可以直接发送到userinput
		const profileItem = document.createElement('div');
		profileItem.classList.add('LocalGPTprofiles-item');
		profileItem.id = `LocalGPTprofiles-item-${index}`;
	
		const title = document.createElement('div');
		title.classList.add('LocalGPTprofiles-title');
		title.textContent = `${profile.savecustom}`;
		const deleteButton = document.createElement('img');
		deleteButton.classList.add('LocalGPTprofiles-delete');
		deleteButton.src = 'delete.png';
		deleteButton.addEventListener('click', function (event) {
			event.stopPropagation();
			//remove the profile item from the profile list UI
			this.parentElement.parentElement.remove();

		});
		title.appendChild(deleteButton);

		title.addEventListener('click', function () {
			const content = this.nextElementSibling;
			if (content.style.display === 'none') {
				content.style.display = 'block';
			} else {
				content.style.display = 'none';
			}
		});
		profileItem.appendChild(title);

		const content = document.createElement('div');
		content.classList.add('LocalGPTprofiles-content');
		content.textContent = `${profile.saveuser}`;
		content.style.display = 'none';
		content.addEventListener('click', function () {
			document.getElementById("predefineprompt").value = profile.saveuser;
		});
		profileItem.appendChild(content);

		profileList.appendChild(profileItem);

	});
}


function exportProfiles() {
	// Get the profile list element
	const profileList = document.getElementById('LocalGPTprofiles-list');
	console.log(profileList);
	const profiles = [];
	// Loop through each profile and create a list item element for it
	Array.from(profileList.children).forEach(function (profileItem, index) {
		const title = profileItem.querySelector('.LocalGPTprofiles-title');
		const content = profileItem.querySelector('.LocalGPTprofiles-content');
		const savecustom = title.textContent;
		const saveuser = content.textContent;
		profiles.push({ savecustom, saveuser });
	});

	const file = new Blob([JSON.stringify({ profiles })], { type: 'application/json' });
	const url = URL.createObjectURL(file);

	const link = document.createElement('a');
	link.href = url;
	link.download = 'chat_profiles_data.json';
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}

function importProfiles() {
	const input = document.createElement("input");
	input.type = "file";
	input.accept = ".json,.csv";
  
	// Listen for the change event on the input element
	input.addEventListener("change", (event) => {
	  const file = event.target.files[0];
  
	  // Create a new FileReader object
	  const reader = new FileReader();
  
	  // Listen for the load event on the FileReader object
	  reader.addEventListener("load", () => {
		// Parse the data based on the file type
		let importedProfiles;
		if (file.name.endsWith(".json")) {
		  importedProfiles = JSON.parse(reader.result).profiles;
		} else if (file.name.endsWith(".csv")) {
		  importedProfiles = [];
		  const lines = reader.result.split("\n");
		  for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();
			const regex = /"([^"]*)","([^"]*)"/;
			const matches = line.match(regex);
			if (matches) {
			  const savecustom = matches[1].trim();
			  const saveuser = matches[2].trim();
			  importedProfiles.push({ savecustom, saveuser });
			};
		  }
		};
  
		// Merge the imported data into the profiles array
		//profiles = [...importedProfiles, ...profiles];
  
		// Do something with the merged profiles data
		appendProfilelistUI(importedProfiles);
	  });
  
	  // Read the contents of the selected file as a text string
	  reader.readAsText(file);
	});
  
	// Click the input element to trigger the file selection dialog
	input.click();
  }

function addNewPrompt(){
	//pop up a window to ask for the new prompt name
	const newPromptname = prompt("Please enter the new prompt name", "new prompt");
	if (newPromptname != null) {
		const profileList = document.getElementById('LocalGPTprofiles-list');
		// Loop through each profile and create a list item element for it
			const profileItem = document.createElement('div');
			profileItem.classList.add('LocalGPTprofiles-item');
		
			const title = document.createElement('div');
			title.classList.add('LocalGPTprofiles-title');
			title.textContent = newPromptname;
			const deleteButton = document.createElement('img');
			deleteButton.classList.add('LocalGPTprofiles-delete');
			deleteButton.src = 'delete.png';
			deleteButton.addEventListener('click', function (event) {
				event.stopPropagation();
				//remove the profile item from the profile list UI
				this.parentElement.parentElement.remove();
	
			});
			title.appendChild(deleteButton);
	
			title.addEventListener('click', function () {
				const content = this.nextElementSibling;
				if (content.style.display === 'none') {
					content.style.display = 'block';
				} else {
					content.style.display = 'none';
				}
			});
			profileItem.appendChild(title);
	
			const content = document.createElement('div');
			content.classList.add('LocalGPTprofiles-content');
			content.textContent = document.getElementById("predefineprompt").value;
			content.style.display = 'block';
			content.addEventListener('click', function () {
				document.getElementById("predefineprompt").value = profile.saveuser;
			});
			profileItem.appendChild(content);
	
			profileList.appendChild(profileItem);
	
		
	}
}

function cleanupChat(){
	//remove all the chat messages
	const chatList = document.getElementById('response');
	chatList.innerHTML = '';
}