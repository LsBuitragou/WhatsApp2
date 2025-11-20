function renderUserBar(user) {
    const bar = document.createElement("div");
    bar.className = "user-bar";

    const title = document.createElement("span");
    title.className = "app-name";
    title.textContent = "Wassap";

    const nameBox = document.createElement("div");
    nameBox.className = "name-box";

    const nameLabel = document.createElement("span");
    nameLabel.className = "label";
    nameLabel.textContent = "Usuario:";

    const name = document.createElement("span");
    name.className = "user-name";
    name.textContent = user.name;

    nameBox.appendChild(nameLabel);
    nameBox.appendChild(name);

    bar.appendChild(title);
    bar.appendChild(nameBox);

    return bar;
}

export default renderUserBar;