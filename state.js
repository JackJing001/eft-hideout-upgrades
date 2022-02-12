const LS_KEY_HIGHLIGHTS = 'highlightedStations';
const LS_KEY_CLICKED = 'clickedStation';

export class State {
    #highlightedStations = new Set();
    // #clickedStation = '';

    constructor() {
        this.load();
    }

    // get clickedStation() {
    //     return this.#clickedStation;
    // }

    // set clickedStation(stationId) {
    //     this.#clickedStation = stationId;
    //     if (localStorage) {
    //         localStorage.setItem(LS_KEY_CLICKED, stationId);
    //     }
    // }

    get highlightedStations() {
        return Array.from(this.#highlightedStations);
    }

    set highlightedStations(stations) {
        if (!(stations instanceof Array)) return;

        this.#highlightedStations = new Set(stations);

        if (localStorage) {
            localStorage.setItem(
                LS_KEY_HIGHLIGHTS,
                Array.from(this.#highlightedStations).join(',')
            );
        }
    }

    addHighlights(newHighlights) {
        newHighlights.forEach((h) => this.#highlightedStations.add(h));
        if (localStorage) {
            localStorage.setItem(
                LS_KEY_HIGHLIGHTS,
                Array.from(this.#highlightedStations).join(',')
            );
        }
    }

    clearHighlights() {
        this.#highlightedStations.clear();
        if (localStorage) {
            localStorage.setItem(LS_KEY_HIGHLIGHTS, '');
        }
    }

    load() {
        // load from localStorage, exit if no localStorage access
        if (!localStorage) return;

        // this.#clickedStation = localStorage.getItem(LS_KEY_CLICKED);

        const highlights = localStorage.getItem(LS_KEY_HIGHLIGHTS);
        if (highlights.length) {
            this.#highlightedStations = new Set(
                localStorage.getItem(LS_KEY_HIGHLIGHTS).split(',')
            );
        }
    }
}

export default State;
