import State from './state.js';

const ELEMENTS = {
    svg: document.getElementById('svg'),
    summary: document.getElementById('summary'),
};

const STATE = new State();
const REQUIRED_STATIONS = {};
let HIDEOUT;

loadHideoutTree().then((res) => {
    HIDEOUT = res;

    // precalculate all required stations for each station, so we dont have
    // to do it on every hover/click/etc, i.e. not only the direct
    // predecessors but all up to tier 1 stations
    for (const stationId in HIDEOUT) {
        const reqStations = findRequiredStations(stationId);
        REQUIRED_STATIONS[stationId] = reqStations;
    }

    attatchEventListeners();

    if (STATE.highlightedStations.length) {
        const stations = STATE.highlightedStations;
        highlight(stations);
        showSummary(stations);
    }
});

async function loadHideoutTree() {
    return (await fetch('./hideout.json')).json();
}

function attatchEventListeners() {
    ELEMENTS.summary
        .getElementsByTagName('h2')[0]
        .addEventListener('mouseup', (e) => {
            const reqsList =
                ELEMENTS.summary.getElementsByClassName('summary-lists')[0];
            if (reqsList.style.height === '0px') {
                reqsList.style.height = '';
            } else {
                reqsList.style.height = '0px';
            }
        });

    ELEMENTS.summary
        .getElementsByTagName('span')[0]
        .addEventListener('mouseup', (e) => {
            if (ELEMENTS.summary.style.right === '16px') {
                ELEMENTS.summary.style.left = '16px';
                ELEMENTS.summary.style.right = 'initial';
            } else {
                ELEMENTS.summary.style.left = 'initial';
                ELEMENTS.summary.style.right = '16px';
            }
        });

    const stations = Array.from(ELEMENTS.svg.getElementsByClassName('station'));
    stations.forEach((e) => {
        e.addEventListener('mouseenter', onEnterStation);
        e.addEventListener('mouseleave', onLeaveStation);
        e.addEventListener('mouseup', onClickStation);
    });
}

function onEnterStation(event) {
    if (!STATE.highlightedStations.length) {
        highlight(REQUIRED_STATIONS[event.currentTarget.id]);
    }
}

function onLeaveStation() {
    if (!STATE.highlightedStations.length) {
        removeHighlights();
    }
}

function onClickStation(event) {
    // only lmb triggers an action
    if (event.button) return;

    clearSummary();
    removeHighlights();

    if (STATE.highlightedStations.includes(event.currentTarget.id)) {
        // clicking a highlighted station again "unclicks" it, i.e. removes
        // the static highlighting and clears the summary
        STATE.clearHighlights();

        // dispatch mouse enter event to keep the hover highlights; atm identical behavior
        // as directly calling highlight(REQUIRED_STATIONS[event.currentTarget.id])
        event.currentTarget.dispatchEvent(new Event('mouseenter'));
    } else {
        if (event.ctrlKey) {
            STATE.addHighlights(REQUIRED_STATIONS[event.currentTarget.id]);
        } else {
            STATE.highlightedStations =
                REQUIRED_STATIONS[event.currentTarget.id];
        }

        const stations = STATE.highlightedStations;
        highlight(stations);
        showSummary(stations);
    }
}

function findRequiredStations(stationId) {
    const queue = [stationId];
    const requiredStations = [];

    while (queue.length > 0) {
        const currentStation = queue.pop();
        requiredStations.push(currentStation);
        for (const prereq of HIDEOUT[currentStation].prerequisites.stations) {
            if (!queue.includes(prereq) && !requiredStations.includes(prereq)) {
                queue.push(prereq);
            }
        }
    }

    return requiredStations;
}

function removeHighlights() {
    for (const key in HIDEOUT) {
        document.getElementById(HIDEOUT[key].id).classList.remove('fadeout');

        for (const reqStation of HIDEOUT[key].prerequisites.stations) {
            const edgeId = reqStation + '-' + key;
            ELEMENTS.svg.getElementById(edgeId).classList.remove('fadeout');
        }
    }
}

function highlight(stations) {
    for (const key in HIDEOUT) {
        if (!stations.includes(key)) {
            document.getElementById(HIDEOUT[key].id).classList.add('fadeout');

            for (const reqStation of HIDEOUT[key].prerequisites.stations) {
                const edgeId = reqStation + '-' + key;
                ELEMENTS.svg.getElementById(edgeId).classList.add('fadeout');
            }
        }
    }
}

function clearSummary() {
    ELEMENTS.summary.classList.add('hidden');
    while (ELEMENTS.summary.childElementCount > 1) {
        ELEMENTS.summary.lastElementChild.remove();
    }
}

function showSummary(stations) {
    // get total requirements
    const reqs = totalRequirements(stations);

    // div that holds the sub-lists for items, skills and traders
    let reqLists = document.createElement('div');
    reqLists.classList.add('summary-lists');

    // required items list
    let list = document.createElement('ul');
    list.classList.add('prereq-items');

    // sort by total amount required
    const itemValues = Object.values(reqs.items).sort((a, b) =>
        a.amount < b.amount ? 1 : a.amount == b.amount ? 0 : -1
    );

    // add items to the list
    for (const i of itemValues) {
        const node = document.createElement('li');
        node.innerText = `${i.amount.toLocaleString('en-US')} ${i.item}`;
        list.appendChild(node);
    }
    reqLists.appendChild(list);

    // required skills list
    list = document.createElement('ul');
    list.classList.add('prereq-skills');
    for (const s in reqs.skills) {
        const node = document.createElement('li');
        node.innerText = `${reqs.skills[s].name} ${reqs.skills[s].lvl}`;
        list.appendChild(node);
    }
    reqLists.appendChild(list);

    // required traders list
    list = document.createElement('ul');
    list.classList.add('prereq-traders');
    for (const t in reqs.traders) {
        const node = document.createElement('li');
        node.innerText = `${reqs.traders[t].name} ${reqs.traders[t].lvl}`;
        list.appendChild(node);
    }
    reqLists.appendChild(list);

    // show summary
    ELEMENTS.summary.appendChild(reqLists);
    ELEMENTS.summary.classList.remove('hidden');
}

function totalRequirements(stations) {
    const items = {};
    const skills = {};
    const traders = {};

    for (const stationId of stations) {
        for (const i of HIDEOUT[stationId].prerequisites.items) {
            if (items[i.item]) {
                items[i.item].amount += i.amount;
            } else {
                items[i.item] = { ...i };
            }
        }

        for (const s of HIDEOUT[stationId].prerequisites.skills) {
            if (!skills[s.name]) {
                skills[s.name] = { ...s };
            }
            if (skills[s.name].lvl < s.lvl) {
                skills[s.name] = s;
            }
        }

        for (const t of HIDEOUT[stationId].prerequisites.traders) {
            if (!traders[t.name]) {
                traders[t.name] = { ...t };
            }
            if (traders[t.name].lvl < t.lvl) {
                traders[t.name] = t;
            }
        }
    }
    return { items, skills, traders };
}
