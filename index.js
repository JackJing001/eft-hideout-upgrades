const store = {
    highlightedStations: new Set(),
    clickedStation: '',

    addHighlightedStations(newHighlights) {
        newHighlights.forEach((h) => this.highlightedStations.add(h));
        if (localStorage) {
            localStorage.setItem(
                'highlightedStations',
                Array.from(this.highlightedStations).join()
            );
        }
    },

    clearHighlightedStations() {
        this.highlightedStations.clear();
        if (localStorage) {
            localStorage.setItem('highlightedStations', []);
        }
    },

    clickStation(station) {
        this.clickedStation = station;
        if (localStorage) {
            localStorage.setItem('clickedStation', station);
        }
    },
};

let localStorage = window.localStorage;
if (localStorage) {
    // load stored settings
    prevHighlighted = localStorage.getItem('highlightedStations');
    prevClicked = localStorage.getItem('clickedStation');

    if (prevClicked) {
        store.clickStation(prevClicked);
    }

    if (prevHighlighted) {
        store.addHighlightedStations(prevHighlighted.split(','));
    }
} else {
    console.log('Local storage not available. No persistence');
}

const elements = {
    container: document.getElementById('container'),
    canvas: document.getElementById('canvas'),
    summary: document.getElementById('summary'),
};

let hideout;
buildHideoutTree().then((res) => {
    const stationNodes = document.getElementsByClassName('station');
    Array.from(stationNodes).forEach((e) => {
        e.addEventListener('mouseenter', onEnterStation);
        e.addEventListener('mouseleave', onLeaveStation);
        e.addEventListener('mouseup', onClickStation);
    });
    if (store.highlightedStations.size) {
        highlight();
        showSummary();
    }
});

window.onresize = function () {
    saveNodeGeometry();
    drawLines();
};

function onEnterStation(event) {
    if (!store.clickedStation) {
        store.addHighlightedStations(
            findRequiredStations(event.currentTarget.id)
        );
        highlight();
    }
}

function onLeaveStation(event) {
    if (!store.clickedStation) {
        store.clearHighlightedStations();
        removeHighlights();
    }
}

function onClickStation(event) {
    // only lmb triggers an action
    if (event.button) return;

    clearSummary();
    removeHighlights();

    if (store.clickedStation === event.currentTarget.id) {
        store.clearHighlightedStations();
        store.clickStation('');
        event.currentTarget.dispatchEvent(new Event('mouseenter'));
    } else {
        store.clickStation(event.currentTarget.id);
        if (event.ctrlKey) {
            store.addHighlightedStations(
                findRequiredStations(store.clickedStation)
            );
        } else {
            store.clearHighlightedStations();
            store.addHighlightedStations(
                findRequiredStations(store.clickedStation)
            );
        }
        highlight();
        showSummary();
    }
}

function showSummary() {
    const items = {};
    const skills = {};
    const traders = {};

    for (const station of store.highlightedStations.values()) {
        for (const i of hideout[station].prerequisites.items) {
            if (items[i.item]) {
                items[i.item].amount += i.amount;
            } else {
                // items[i.item] = { item: i.item, amount: i.amount };
                items[i.item] = { ...i };
            }
        }

        for (const s of hideout[station].prerequisites.skills) {
            if (!skills[s.name]) {
                skills[s.name] = { ...s };
            }
            if (skills[s.name].lvl < s.lvl) {
                skills[s.name] = s;
            }
        }

        for (const t of hideout[station].prerequisites.traders) {
            if (!traders[t.name]) {
                traders[t.name] = { ...t };
            }
            if (traders[t.name].lvl < t.lvl) {
                traders[t.name] = t;
            }
        }
    }

    let lists = document.createElement('div');
    lists.classList.add('summary-lists');

    let list = document.createElement('ul');
    list.classList.add('prereq-items');

    const itemValues = Object.values(items).sort((a, b) =>
        a.amount < b.amount ? 1 : a.amount == b.amount ? 0 : -1
    );

    for (const i of itemValues) {
        const node = document.createElement('li');
        node.innerText = `${i.amount.toLocaleString('en-US')} ${i.item}`;
        list.appendChild(node);
    }
    lists.appendChild(list);

    list = document.createElement('ul');
    list.classList.add('prereq-skills');
    for (const s in skills) {
        const node = document.createElement('li');
        node.innerText = `${skills[s].name} ${skills[s].lvl}`;
        list.appendChild(node);
    }
    lists.appendChild(list);

    list = document.createElement('ul');
    list.classList.add('prereq-traders');
    for (const t in traders) {
        const node = document.createElement('li');
        node.innerText = `${traders[t].name} ${traders[t].lvl}`;
        list.appendChild(node);
    }
    lists.appendChild(list);
    elements.summary.appendChild(lists);
    elements.summary.classList.remove('hidden');
}

function clearSummary() {
    elements.summary.classList.add('hidden');
    while (elements.summary.childElementCount > 1) {
        elements.summary.lastElementChild.remove();
    }
}

function findRequiredStations(stationId) {
    const queue = [stationId];
    const requiredStations = [];

    while (queue.length > 0) {
        const currentStation = queue.pop();
        requiredStations.push(currentStation);
        for (const prereq of hideout[currentStation].prerequisites.stations) {
            if (!queue.includes(prereq) && !requiredStations.includes(prereq)) {
                queue.push(prereq);
            }
        }
    }

    return requiredStations;
}

function removeHighlights() {
    for (const key in hideout) {
        document.getElementById(hideout[key].id).classList.remove('fadeout');
    }
    drawLines();
}

function highlight() {
    for (const key in hideout) {
        if (!store.highlightedStations.has(key)) {
            document.getElementById(hideout[key].id).classList.add('fadeout');
        }
    }
    drawLines();
}

async function buildHideoutTree() {
    hideout = await (await fetch('./hideout.json')).json();

    for (const k in hideout) {
        const station = hideout[k];
        elements.container.appendChild(createStationNode(station));
    }

    saveNodeGeometry();
    drawLines();
}

function createStationNode(station) {
    const node = document.createElement('div'); //as HTMLDivElement;

    node.classList.add('station', `lvl${station.lvl}`);
    node.id = station.id;
    node.style.gridRow = station.geometry.gridRow;
    node.style.gridColumn = station.geometry.gridColumn;
    node.appendChild(createHeaderNode(station.name));
    node.appendChild(createPrerequisitesList(station.prerequisites));

    return node;
}

function createHeaderNode(stationName) {
    const node = document.createElement('div'); //as HTMLDivElement;
    node.innerText = stationName;
    node.classList.add('station-name');
    return node;
}

function createPrerequisitesList(prerequisites) {
    const node = document.createElement('div');
    node.classList.add('prerequisites');

    const itemList = createList(
        prerequisites.items,
        ['amount', 'item'],
        ['prereq-items']
    );
    itemList && node.appendChild(itemList);

    const skillList = createList(
        prerequisites.skills,
        ['name', 'lvl'],
        ['prereq-skills']
    );
    skillList && node.appendChild(skillList);

    const traderList = createList(
        prerequisites.traders,
        ['name', 'lvl'],
        ['prereq-traders']
    );
    traderList && node.appendChild(traderList);

    return node;
}

function createList(items, descriptionProperties, classes) {
    if (!items || items.length === 0) return;

    const node = document.createElement('ul');
    node.classList.add(...classes);

    for (const item of items) {
        const itemNode = document.createElement('li');
        for (const prop of descriptionProperties) {
            if (isNaN(item[prop])) {
                itemNode.innerText += `${item[prop]} `;
            } else {
                itemNode.innerText += `${item[prop].toLocaleString('en-US')} `;
            }
        }
        itemNode.innerText = itemNode.innerText.trimEnd();
        node.appendChild(itemNode);
    }

    return node;
}

function saveNodeGeometry() {
    let rect = elements.container.getBoundingClientRect();
    const offset = { x: rect.left, y: rect.top };

    for (const c of elements.container.querySelectorAll('div.station')) {
        rect = c.getBoundingClientRect();
        const station = hideout[c.id];
        station.geometry.x = rect.left - offset.x;
        station.geometry.y = rect.top - offset.y;
        station.geometry.width = rect.right - rect.left;
        station.geometry.height = rect.bottom - rect.top;
    }
}

function drawLines() {
    const canvas = elements.canvas;
    const ctx = canvas.getContext('2d');

    let rect = elements.container.getBoundingClientRect();
    canvas.width = rect.right - rect.left;
    canvas.height = rect.bottom - rect.top;

    for (const key in hideout) {
        const station = hideout[key];

        rect = document.getElementById(station.id).getBoundingClientRect();
        const isEndHighlighted = store.highlightedStations.has(station.id);
        const end = {
            x: Math.floor(station.geometry.x + station.geometry.width / 2),
            y: Math.floor(station.geometry.y),
        };

        for (const stationId of station.prerequisites.stations) {
            rect = document.getElementById(stationId).getBoundingClientRect();
            const start = {
                x: Math.floor(
                    hideout[stationId].geometry.x +
                        hideout[stationId].geometry.width / 2
                ),
                y: Math.ceil(
                    hideout[stationId].geometry.y +
                        hideout[stationId].geometry.height
                ),
            };

            if (!store.highlightedStations.size) {
                ctx.strokeStyle = '#fff';
            } else if (store.highlightedStations.has(stationId)) {
                if (isEndHighlighted) {
                    ctx.strokeStyle = '#fff';
                } else {
                    ctx.strokeStyle = '#060';
                }
            } else {
                ctx.strokeStyle = '#666';
            }
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
        }
    }
}
